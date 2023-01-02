/// <reference types="@webgpu/types" />
import { Vector3 } from '../Vector3'
import type { Camera } from '../Camera'
import { Mesh, Mode } from '../Mesh'
import type { Object3D } from '../Object3D'
import type { RenderTarget } from '../RenderTarget'
import { Compiled } from '../_utils'
import { AttributeData, Geometry } from '../Geometry'
import { Material, Side, Uniform } from '../Material'
import { Texture } from '../Texture'

const GPU_CULL_SIDES: Record<Side, string> = {
  front: 'back',
  back: 'front',
  both: 'none',
} as const

const GPU_DRAW_MODES: Record<Mode, string> = {
  points: 'point-list',
  lines: 'line-list',
  triangles: 'triangle-list',
} as const

// Pad to 16 byte chunks of 2, 4 (std140 layout)
const pad2 = (n: number) => n + (n % 2)
const pad4 = (n: number) => n + ((4 - (n % 4)) % 4)

/**
 * Packs uniforms into a std140 compliant array buffer.
 */
const std140 = (uniforms: Uniform[], buffer?: Float32Array) => {
  const values = uniforms as Exclude<Uniform, Texture>[]
  // Init buffer
  if (!buffer) {
    const length = pad4(
      values.reduce(
        (n: number, u) => n + (typeof u === 'number' ? 1 : u.length <= 2 ? pad2(u.length) : pad4(u.length)),
        0,
      ),
    )
    buffer = new Float32Array(length)
  }
  // Pack buffer
  let offset = 0
  for (const value of values) {
    if (typeof value === 'number') {
      buffer[offset] = value
      offset += 1 // leave empty space to stack primitives
    } else {
      const pad = value.length <= 2 ? pad2 : pad4
      offset = pad(offset) // fill in empty space
      buffer.set(value, offset)
      offset += pad(value.length)
    }
  }
  return buffer
}

/**
 * Returns a list of used uniforms from shader uniform structs.
 */
const parseUniforms = (...shaders: string[]): string[] => {
  // Filter to most complete definition
  if (shaders.length > 1) {
    const definitions = shaders.map((shader) => parseUniforms(shader))
    return definitions.filter(Boolean).sort((a: any, b: any) => b.length - a.length)[0]
  }

  // Remove comments for parsing
  const shader = shaders[0].replace(/\/\*(?:[^*]|\**[^*/])*\*+\/|\/\/.*/g, '')

  // Bail if no uniforms defined
  if (!shader.includes('uniform ') && !shader.includes('var<uniform>')) return []

  // Detect and parse shader layout
  const selector = shader.match(/var<uniform>[^;]+(?:\s|:)(\w+);/)?.[1] ?? 'uniform '
  const layout = shader.match(new RegExp(`${selector}[^\\{]+\\{([^\\}]+)\\}`))?.[1]
  if (!layout) return []

  // Parse definitions
  const names = Array.from(layout.match(/\w+(?=[;:])/g)!)

  return names
}

/**
 * {@link WebGPURenderer} constructor parameters.
 */
export interface WebGPURendererOptions {
  /**
   * An optional canvas element to draw to.
   */
  canvas: HTMLCanvasElement
  /**
   * An optional WebGPU context to draw with.
   */
  context: GPUCanvasContext
  /**
   * An optional WebGPU device to request from.
   */
  device: GPUDevice
  /**
   * An optional GPUFormat to create texture views with.
   */
  format: GPUTextureFormat
  /**
   * Whether to enable antialiasing. Creates a multisampled rendertarget under the hood. Default is `true`.
   */
  antialias: boolean
  /**
   * Whether to prioritize rendering performance or power efficiency.
   */
  powerPreference: 'high-performance' | 'low-power'
  /**
   * Will fail device initialization if a feature is not met.
   */
  requiredFeatures: Iterable<GPUFeatureName>
  /**
   * Will fail device initialization if a limit is not met.
   */
  requiredLimits: Record<string, GPUSize64>
}

/**
 * Constructs a WebGPU renderer object. Can be extended to draw to a canvas.
 */
export class WebGPURenderer {
  /**
   * Output {@link HTMLCanvasElement} to draw to.
   */
  readonly canvas: HTMLCanvasElement
  public device!: GPUDevice
  /**
   * Internal {@link GPUCanvasContext} to draw with.
   */
  public context!: GPUCanvasContext
  public format!: GPUTextureFormat
  /**
   * Whether to clear the drawing buffer between renders. Default is `true`.
   */
  public autoClear = true

  private _params: Partial<Omit<WebGPURendererOptions, 'canvas'>>
  private _buffers = new Compiled<AttributeData, GPUBuffer>()
  private _geometry = new Compiled<Geometry, true>()
  private _UBOs = new Compiled<Material, { data: Float32Array; buffer: GPUBuffer }>()
  private _pipelines = new Compiled<Mesh, GPURenderPipeline>()
  private _depthTexture!: GPUTexture
  private _depthTextureView!: GPUTextureView
  private _commandEncoder!: GPUCommandEncoder
  private _passEncoder!: GPURenderPassEncoder
  private _renderTarget: RenderTarget | null = null
  private _v = new Vector3()

  constructor({ canvas, context, format, device, antialias = true, ...params }: Partial<WebGPURendererOptions> = {}) {
    this.canvas = canvas ?? document.createElement('canvas')
    this.context = context ?? this.canvas.getContext('webgpu')!
    this.format = format ?? navigator.gpu.getPreferredCanvasFormat()

    this.device = device!
    this._params = { antialias, ...params }
  }

  /**
   * Sets the canvas size.
   */
  setSize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height

    // Resize swap chain after init
    if (this.device) {
      this.context.configure({
        device: this.device,
        format: this.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        alphaMode: 'premultiplied',
      })

      if (this._depthTexture) this._depthTexture.destroy()
      this._depthTexture = this.device.createTexture({
        size: [width, height, 1],
        format: 'depth24plus-stencil8',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })
      this._depthTextureView = this._depthTexture.createView()
    }
  }

  /**
   * Initializes the internal WebGPU context and swapchain.
   */
  async init(): Promise<this> {
    if (!this.device) {
      const adapter = await navigator.gpu.requestAdapter(this._params)
      this.device = await adapter!.requestDevice(this._params)
    }

    // Resize swapchain
    this.setSize(this.canvas.width, this.canvas.height)

    return this
  }

  private _createBuffer(data: AttributeData, usage: GPUBufferUsageFlags): GPUBuffer {
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    })

    new (data.constructor as Float32ArrayConstructor)(buffer.getMappedRange()).set(data)
    buffer.unmap()

    return buffer
  }

  private _writeBuffer(
    buffer: GPUBuffer,
    data: AttributeData,
    byteLength = data.byteLength,
    srcByteOffset = 0,
    dstByteOffset = data.byteOffset,
  ): void {
    const size = data.BYTES_PER_ELEMENT
    this.device.queue.writeBuffer(buffer, dstByteOffset, data, srcByteOffset / size, byteLength / size)
  }

  compile(mesh: Mesh, camera?: Camera): void {
    mesh.material.uniforms.modelMatrix = mesh.matrix

    if (camera) {
      mesh.material.uniforms.projectionMatrix = camera.projectionMatrix
      mesh.material.uniforms.viewMatrix = camera.viewMatrix
      mesh.material.uniforms.normalMatrix = mesh.normalMatrix
      mesh.material.uniforms.modelViewMatrix = mesh.modelViewMatrix

      mesh.modelViewMatrix.copy(camera.viewMatrix).multiply(mesh.matrix)
      mesh.normalMatrix.normal(mesh.modelViewMatrix)
    }

    const buffers: GPUVertexBufferLayout[] = []

    let shaderLocation = 0
    for (const key in mesh.geometry.attributes) {
      const attribute = mesh.geometry.attributes[key]
      if (key === 'index') continue

      buffers.push({
        arrayStride: attribute.size * attribute.data.BYTES_PER_ELEMENT,
        attributes: [
          {
            shaderLocation: shaderLocation++,
            offset: 0,
            format: `float32x${attribute.size}`,
          },
        ] as Iterable<GPUVertexAttribute>,
      })
    }

    const transparent = mesh.material.transparent
    const cullMode = GPU_CULL_SIDES[mesh.material.side] as GPUCullMode
    const topology = GPU_DRAW_MODES[mesh.mode] as GPUPrimitiveTopology
    const depthWriteEnabled = mesh.material.depthWrite
    const depthCompare = (mesh.material.depthTest ? 'less' : 'always') as GPUCompareFunction
    const blending = mesh.material.blending
    const colorAttachments = this._renderTarget?.count ?? 1

    const pipelineCacheKey = JSON.stringify([
      transparent,
      cullMode,
      topology,
      depthWriteEnabled,
      depthCompare,
      buffers,
      blending,
      colorAttachments,
    ])

    let pipeline = this._pipelines.get(mesh)
    if (!pipeline || pipeline.label !== pipelineCacheKey) {
      pipeline = this.device.createRenderPipeline({
        label: pipelineCacheKey,
        vertex: {
          module: this.device.createShaderModule({ code: mesh.material.vertex }),
          entryPoint: 'main',
          buffers,
        },
        fragment: {
          module: this.device.createShaderModule({ code: mesh.material.fragment }),
          entryPoint: 'main',
          targets: Array<GPUColorTargetState>(colorAttachments).fill({
            format: this.format,
            blend: mesh.material.blending,
            writeMask: GPUColorWrite.ALL,
          }),
        },
        primitive: {
          frontFace: 'ccw',
          cullMode,
          topology,
        },
        depthStencil: {
          depthWriteEnabled,
          depthCompare,
          format: 'depth24plus-stencil8',
        },
        layout: 'auto',
      })
      this._pipelines.set(mesh, pipeline)
    }
    this._passEncoder.setPipeline(pipeline)

    let slot = 0
    for (const key in mesh.geometry.attributes) {
      const attribute = mesh.geometry.attributes[key]
      const isIndex = key === 'index'

      let buffer = this._buffers.get(attribute.data)
      if (!buffer) {
        buffer = this._createBuffer(attribute.data, GPUBufferUsage[isIndex ? 'INDEX' : 'VERTEX'])
        this._buffers.set(attribute.data, buffer)
        attribute.needsUpdate = false
      }

      if (attribute.needsUpdate) {
        this._writeBuffer(buffer, attribute.data)
        attribute.needsUpdate = false
      }

      if (isIndex) {
        this._passEncoder.setIndexBuffer(buffer, 'uint32')
      } else {
        this._passEncoder.setVertexBuffer(slot++, buffer)
      }
    }

    if (!this._geometry.get(mesh.geometry)) {
      this._geometry.set(mesh.geometry, true, () => {
        for (const key in mesh.geometry.attributes) {
          const attribute = mesh.geometry.attributes[key]
          const buffer = this._buffers.get(attribute.data)!
          buffer.destroy()
          this._buffers.delete(attribute.data)
          attribute.needsUpdate = true
        }
      })
    }

    let UBO = this._UBOs.get(mesh.material)
    const uniforms = parseUniforms(mesh.material.vertex, mesh.material.fragment).map(
      (key) => mesh.material.uniforms[key],
    )
    if (!UBO) {
      const data = std140(uniforms)
      const buffer = this._createBuffer(data, GPUBufferUsage.UNIFORM)
      UBO = { data, buffer }
      this._UBOs.set(mesh.material, UBO, () => buffer.destroy())
    } else {
      this._writeBuffer(UBO.buffer, std140(uniforms, UBO.data))
    }

    const entries: GPUBindGroupEntry[] = [{ binding: 0, resource: UBO! }]
    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries,
    })
    this._passEncoder.setBindGroup(0, bindGroup)
  }

  /**
   * Sets the current {@link RenderTarget} to render into.
   */
  setRenderTarget(renderTarget: RenderTarget | null): void {
    this._renderTarget = renderTarget
  }

  /**
   * Returns a list of visible meshes. Will frustum cull and depth-sort with a camera if available.
   */
  sort(scene: Object3D, camera?: Camera): Mesh[] {
    const renderList: Mesh[] = []

    scene.traverse((node) => {
      // Skip invisible nodes
      if (!node.visible) return true

      // Filter to meshes
      if (!(node instanceof Mesh)) return

      // Frustum cull if able
      if (camera && node.frustumCulled) {
        const inFrustum = camera.frustum.contains(node)
        if (!inFrustum) return true
      }

      renderList.push(node)
    })

    return renderList.sort(
      (a, b) =>
        // Push UI to front
        (b.material.depthTest as unknown as number) - (a.material.depthTest as unknown as number) ||
        // Depth sort with a camera if able
        (!!camera &&
          this._v.set(b.matrix[12], b.matrix[13], b.matrix[14]).applyMatrix4(camera.projectionViewMatrix).z -
            this._v.set(a.matrix[12], a.matrix[13], a.matrix[14]).applyMatrix4(camera.projectionViewMatrix).z) ||
        // Reverse painter's sort transparent
        (a.material.transparent as unknown as number) - (b.material.transparent as unknown as number),
    )
  }

  /**
   * Renders a scene of objects with an optional camera.
   */
  render(scene: Object3D, camera?: Camera): void {
    camera?.updateMatrix()
    scene.updateMatrix()

    const renderViews = [this.context.getCurrentTexture().createView()]
    const depthView = this._depthTextureView
    const loadOp: GPULoadOp = this.autoClear ? 'clear' : 'load'

    this._commandEncoder = this.device.createCommandEncoder()
    this._passEncoder = this._commandEncoder.beginRenderPass({
      colorAttachments: renderViews.map<GPURenderPassColorAttachment>((view) => ({
        view,
        loadOp,
        storeOp: 'store',
      })),
      depthStencilAttachment: {
        view: depthView,
        depthClearValue: 1,
        depthLoadOp: loadOp,
        depthStoreOp: 'store',
        stencilClearValue: 0,
        stencilLoadOp: loadOp,
        stencilStoreOp: 'store',
      },
    })

    this._passEncoder.setViewport(0, 0, this.canvas.width, this.canvas.height, 0, 1)

    const renderList = this.sort(scene, camera)
    for (const node of renderList) {
      this.compile(node, camera)

      // Alternate drawing for indexed and non-indexed children
      const { index, position } = node.geometry.attributes
      if (index) {
        this._passEncoder.drawIndexed(index.data.length / index.size, node.instances)
      } else {
        this._passEncoder.draw(position.data.length / position.size, node.instances)
      }
    }

    // Cleanup frame, submit GL commands
    this._passEncoder.end()
    this.device.queue.submit([this._commandEncoder.finish()])
  }
}
