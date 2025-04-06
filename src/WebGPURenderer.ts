/// <reference types="@webgpu/types" />
import { Vector3 } from './Vector3'
import type { Camera } from './Camera'
import { Mesh, type Mode } from './Mesh'
import type { Object3D } from './Object3D'
import { type RenderTarget } from './RenderTarget'
import { Compiled, min } from './_utils'
import type { Attribute, AttributeData, Geometry } from './Geometry'
import type { Material, Side, Uniform } from './Material'
import { Texture } from './Texture'
import type { Wrapping, Sampler } from './Sampler'

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

const GPU_WRAPPING: Record<Wrapping, string> = {
  clamp: 'clamp-to-edge',
  repeat: 'repeat',
  mirror: 'mirror-repeat',
}

const GPU_BUFFER_USAGE_COPY_DST = 0x8
const GPU_BUFFER_USAGE_INDEX = 0x10
const GPU_BUFFER_USAGE_VERTEX = 0x20
const GPU_BUFFER_USAGE_UNIFORM = 0x40
const GPU_BUFFER_USAGE_STORAGE = 0x80

const GPU_TEXTURE_USAGE_COPY_SRC = 0x1
const GPU_TEXTURE_USAGE_COPY_DST = 0x2
const GPU_TEXTURE_USAGE_TEXTURE_BINDING = 0x4
const GPU_TEXTURE_USAGE_RENDER_ATTACHMENT = 0x10

const GPU_COLOR_WRITE_ALL = 0xf

// Pad to 16 byte chunks of 2, 4 (std140 layout)
const pad2 = (n: number) => n + (n % 2)
const pad4 = (n: number) => n + ((4 - (n % 4)) % 4)

/**
 * Packs uniforms into a std140 compliant array buffer.
 */
function std140(uniforms: Uniform[], buffer?: Float32Array): Float32Array {
  const values = uniforms as Exclude<Uniform, Texture>[]

  // Init buffer
  let offset = 0
  if (!buffer) {
    for (const value of values) {
      if (typeof value === 'number') {
        offset++ // leave empty space to stack primitives
      } else {
        const pad = value.length <= 2 ? pad2 : pad4
        offset = pad(offset) // fill in empty space
        offset += pad(value.length)
      }
    }
    offset = pad4(offset) // align to 4 bytes
    buffer = new Float32Array(offset)
  }

  // Pack buffer
  offset = 0
  for (const value of values) {
    if (typeof value === 'number') {
      buffer[offset++] = value
    } else {
      const pad = value.length <= 2 ? pad2 : pad4
      buffer.set(value, (offset = pad(offset)))
      offset += pad(value.length)
    }
  }

  return buffer
}

/**
 * Returns a list of used uniforms from shader uniform structs.
 */
function parseUniforms(...shaders: string[]): string[] | undefined {
  shaders = shaders.filter(Boolean)

  // Filter to most complete definition
  if (shaders.length > 1) {
    const definitions = shaders.map((shader) => parseUniforms(shader))
    return definitions.filter(Boolean).sort((a: any, b: any) => b.length - a.length)[0]
  }

  // Remove comments for parsing
  const shader = shaders[0].replace(/\/\*(?:[^*]|\**[^*/])*\*+\/|\/\/.*/g, '')

  // Detect and parse shader layout
  const selector = shader.match(/var\s*<\s*uniform\s*>[^;]+(?:\s|:)(\w+);/)?.[1]
  const layout = shader.match(new RegExp(`${selector}[^\\{]+\\{([^\\}]+)\\}`))?.[1]

  // Parse definitions
  if (layout) return Array.from(layout.match(/\w+(?=[;:])/g)!)
}

/**
 * Matches against WGSL storage bindings.
 */
const STORAGE_REGEX = /var\s*<\s*storage[^>]+>\s*(\w+)/g

/**
 * Matches against WGSL workgroup attributes.
 */
const WORKGROUP_REGEX = /@workgroup_size\s*\(([^)]+)\)/

const _adapter = typeof navigator !== 'undefined' ? await navigator.gpu?.requestAdapter() : null
const _device = await (_adapter as GPUAdapter | null)?.requestDevice()

/**
 * {@link WebGPURenderer} constructor parameters.
 */
export interface WebGPURendererOptions {
  /**
   * An optional {@link HTMLCanvasElement} to draw to.
   */
  canvas: HTMLCanvasElement
  /**
   * An optional {@link GPUCanvasContext} to draw with.
   */
  context: GPUCanvasContext
  /**
   * An optional {@link GPUDevice} to send GPU commands to.
   */
  device: GPUDevice
  /**
   * An optional {@link GPUTextureFormat} to create texture views with.
   */
  format: GPUTextureFormat
}

/**
 * Constructs a WebGPU renderer object. Can be extended to draw to a canvas.
 */
export class WebGPURenderer {
  /**
   * Output {@link HTMLCanvasElement} to draw to.
   */
  readonly canvas: HTMLCanvasElement
  /**
   * Internal {@link GPUDevice} to send GPU commands to.
   */
  public device!: GPUDevice
  /**
   * Internal {@link GPUTextureFormat} to create texture views with.
   */
  public format!: GPUTextureFormat
  /**
   * Internal {@link GPUCanvasContext} to draw with.
   */
  public context!: GPUCanvasContext
  /**
   * Whether to clear the drawing buffer between renders. Default is `true`.
   */
  public autoClear = true
  /**
   * Number of samples to use for MSAA rendering. Default is `4`
   */
  public samples = 4

  private _buffers = new Compiled<Attribute, GPUBuffer>()
  private _geometry = new Compiled<Geometry, true>()
  private _UBOs = new Compiled<Mesh, { data: Float32Array; buffer: GPUBuffer }>()
  private _pipelines = new Compiled<Mesh, GPURenderPipeline | GPUComputePipeline>()
  private _textures = new Compiled<Texture, GPUTexture | GPUExternalTexture>()
  private _samplers = new Compiled<Sampler, GPUSampler>()
  private _FBOs = new Compiled<
    RenderTarget,
    { views: GPUTextureView[]; depthTexture: GPUTexture; depthTextureView: GPUTextureView }
  >()
  private _msaaTexture!: GPUTexture
  private _msaaTextureView!: GPUTextureView
  private _depthTexture!: GPUTexture
  private _depthTextureView!: GPUTextureView
  private _commandEncoder!: GPUCommandEncoder
  private _passEncoder!: GPURenderPassEncoder | GPUComputePassEncoder
  private _renderTarget: RenderTarget | null = null
  private _v = new Vector3()

  constructor({ canvas, context, format, device }: Partial<WebGPURendererOptions> = {}) {
    this.canvas = canvas ?? document.createElement('canvas')
    this.context = context ?? this.canvas.getContext('webgpu')!
    this.format = format ?? navigator.gpu.getPreferredCanvasFormat()
    this.device = device ?? _device!
    this._resizeSwapchain()
  }

  private _resizeSwapchain(): void {
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    })

    const size = [this.canvas.width, this.canvas.height, 1]
    const usage = GPU_TEXTURE_USAGE_RENDER_ATTACHMENT
    const sampleCount = this.samples

    if (this._msaaTexture) this._msaaTexture.destroy()
    this._msaaTexture = this.device.createTexture({
      format: this.format,
      size,
      usage,
      sampleCount,
    })
    this._msaaTextureView = this._msaaTexture.createView()

    if (this._depthTexture) this._depthTexture.destroy()
    this._depthTexture = this.device.createTexture({
      format: 'depth24plus-stencil8',
      size,
      usage,
      sampleCount,
    })
    this._depthTextureView = this._depthTexture.createView()
  }

  /**
   * Sets the canvas size.
   */
  setSize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this._resizeSwapchain()
  }

  /**
   * Sets the current {@link RenderTarget} to render into.
   */
  setRenderTarget(renderTarget: RenderTarget | null): void {
    this._renderTarget = renderTarget
  }

  private _createBuffer(data: AttributeData, usage: GPUBufferUsageFlags): GPUBuffer {
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage | GPU_BUFFER_USAGE_COPY_DST | GPU_BUFFER_USAGE_STORAGE,
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

  /**
   * Updates sampler parameters.
   */
  private _updateSampler(sampler: Sampler): GPUSampler {
    let target = this._samplers.get(sampler)
    if (!target || sampler.needsUpdate) {
      target = this.device.createSampler({
        addressModeU: GPU_WRAPPING[sampler.wrapS] as GPUAddressMode,
        addressModeV: GPU_WRAPPING[sampler.wrapT] as GPUAddressMode,
        magFilter: sampler.magFilter as GPUFilterMode,
        minFilter: sampler.minFilter as GPUFilterMode,
        maxAnisotropy: sampler.anisotropy,
      })
      this._samplers.set(sampler, target)
    }

    return target
  }

  /**
   * Updates a texture with an optional `width` and `height`.
   */
  private _updateTexture(
    texture: Texture,
    width = (texture.image as any)?.width ?? 0,
    height = (texture.image as any)?.height ?? 0,
  ): GPUTexture | GPUExternalTexture {
    let target = this._textures.get(texture)
    if (!target || texture.needsUpdate) {
      texture.dispose()

      if (texture.image instanceof HTMLVideoElement) {
        target = this.device.importExternalTexture({ source: texture.image })
      } else {
        target = this.device.createTexture({
          format: (texture.format as GPUTextureFormat | undefined) ?? this.format,
          dimension: '2d',
          size: [width, height, 1],
          usage:
            GPU_TEXTURE_USAGE_COPY_DST |
            GPU_TEXTURE_USAGE_TEXTURE_BINDING |
            GPU_TEXTURE_USAGE_RENDER_ATTACHMENT |
            GPU_TEXTURE_USAGE_COPY_SRC,
        })

        if (texture.image) {
          this.device.queue.copyExternalImageToTexture({ source: texture.image }, { texture: target }, [width, height])
        }

        texture.needsUpdate = false
      }

      this._textures.set(texture, target, () => (target as any).destroy?.())
    }

    this._updateSampler(texture.sampler)

    return target
  }

  /**
   * Compiles a mesh or program and sets initial uniforms.
   */
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

      const formatType = attribute.data instanceof Float32Array ? 'float' : 'uint'
      const formatBits = attribute.data.BYTES_PER_ELEMENT * 8
      const formatName = formatType + formatBits

      buffers.push({
        arrayStride: attribute.size * attribute.data.BYTES_PER_ELEMENT * (attribute.divisor || 1),
        stepMode: attribute.divisor ? 'instance' : 'vertex',
        attributes: [
          {
            shaderLocation: shaderLocation++,
            offset: 0,
            format: `${formatName}x${Math.min(attribute.size, 4)}` as GPUVertexFormat,
          },
        ] satisfies GPUVertexAttribute[] as Iterable<GPUVertexAttribute>,
      })
    }

    let pipeline = this._pipelines.get(mesh)
    if (mesh.material.compute) {
      if (!pipeline) {
        pipeline = this.device.createComputePipeline({
          compute: {
            module: this.device.createShaderModule({ code: mesh.material.compute! }),
            entryPoint: 'main',
          },
          layout: 'auto',
        })
      }
    } else {
      const transparent = mesh.material.transparent
      const cullMode = GPU_CULL_SIDES[mesh.material.side] as GPUCullMode
      const topology = GPU_DRAW_MODES[mesh.mode] as GPUPrimitiveTopology
      const depthWriteEnabled = mesh.material.depthWrite
      const depthCompare = (mesh.material.depthTest ? 'less' : 'always') as GPUCompareFunction
      const blending = mesh.material.blending
      const colorAttachments = this._renderTarget?.count ?? 1
      const samples = this.samples

      const pipelineCacheKey = JSON.stringify([
        transparent,
        cullMode,
        topology,
        depthWriteEnabled,
        depthCompare,
        buffers,
        blending,
        colorAttachments,
        samples,
      ])

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
              writeMask: GPU_COLOR_WRITE_ALL,
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
          multisample: { count: samples },
          layout: 'auto',
        })
      }
      this._pipelines.set(mesh, pipeline)
    }
    this._passEncoder.setPipeline(pipeline as any)

    let slot = 0
    for (const key in mesh.geometry.attributes) {
      const attribute = mesh.geometry.attributes[key]
      const isIndex = key === 'index'

      let buffer = this._buffers.get(attribute)
      if (!buffer) {
        buffer = this._createBuffer(attribute.data, isIndex ? GPU_BUFFER_USAGE_INDEX : GPU_BUFFER_USAGE_VERTEX)
        this._buffers.set(attribute, buffer)
      }

      if (attribute.needsUpdate) this._writeBuffer(buffer, attribute.data)
      attribute.needsUpdate = false

      if (this._passEncoder instanceof GPURenderPassEncoder) {
        if (isIndex)
          this._passEncoder.setIndexBuffer(buffer, `uint${attribute.data.BYTES_PER_ELEMENT * 8}` as GPUIndexFormat)
        else this._passEncoder.setVertexBuffer(slot++, buffer)
      }
    }

    if (!this._geometry.get(mesh.geometry)) {
      this._geometry.set(mesh.geometry, true, () => {
        for (const key in mesh.geometry.attributes) {
          const attribute = mesh.geometry.attributes[key]
          this._buffers.get(attribute)?.destroy()
          this._buffers.delete(attribute)
          attribute.needsUpdate = true
        }
      })
    }

    let binding = 0
    const entries: GPUBindGroupEntry[] = []

    const storage = mesh.material.compute?.matchAll(STORAGE_REGEX)
    if (storage) {
      for (const [, output] of storage) {
        const attribute = mesh.geometry.attributes[output]
        const buffer = this._buffers.get(attribute)!
        entries.push({ binding: binding++, resource: { buffer } })
      }
    }

    const parsed = parseUniforms(mesh.material.vertex, mesh.material.fragment, mesh.material.compute)
    if (parsed) {
      const uniforms = parsed.map((key) => mesh.material.uniforms[key])
      let UBO = this._UBOs.get(mesh)
      if (!UBO) {
        const data = std140(uniforms)
        const buffer = this._createBuffer(data, GPU_BUFFER_USAGE_UNIFORM)
        UBO = { data, buffer }
        // TODO: allow UBOs to be separated for larger scenes and global/camera/object states
        this._UBOs.set(mesh, UBO)
        // Ensure memory is destroyed with material even though we want to track it per-mesh
        this._UBOs.set(mesh.material as unknown as Mesh & { dispose: () => void }, UBO, () => {
          this._UBOs.delete(mesh)
          buffer.destroy()
        })
      } else {
        this._writeBuffer(UBO.buffer, std140(uniforms, UBO.data))
      }

      entries.push({ binding: binding++, resource: UBO })
    }

    for (const key in mesh.material.uniforms) {
      const value = mesh.material.uniforms[key]
      if (value instanceof Texture) {
        this._updateTexture(value)

        const sampler = this._samplers.get(value.sampler)
        if (sampler) entries.push({ binding: binding++, resource: sampler })

        const target = this._textures.get(value)!
        entries.push({ binding: binding++, resource: target instanceof GPUTexture ? target.createView?.() : target })
      }
    }

    if (entries.length) {
      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries,
      })
      this._passEncoder.setBindGroup(0, bindGroup)
    }
  }

  /**
   * Returns a list of visible meshes. Will frustum cull and depth-sort with a camera if available.
   */
  sort(scene: Object3D, camera?: Camera): Mesh[] {
    const renderList: Mesh[] = []

    if (camera?.matrixAutoUpdate) {
      camera.projectionViewMatrix.copy(camera.projectionMatrix).multiply(camera.viewMatrix)
      camera.frustum.fromMatrix4(camera.projectionViewMatrix)
      camera.frustum.normalNDC()
    }

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
    // Compile render target
    let FBO = this._FBOs.get(this._renderTarget!)
    if (this._renderTarget && (!FBO || this._renderTarget.needsUpdate)) {
      FBO?.depthTexture.destroy()

      const views = this._renderTarget.textures.map((texture) => {
        this._updateTexture(texture, this._renderTarget!.width, this._renderTarget!.height)
        const target = this._textures.get(texture) as GPUTexture
        return target.createView()
      })

      const depthTexture = this.device.createTexture({
        size: [this._renderTarget.width, this._renderTarget.height, 1],
        format: 'depth24plus-stencil8',
        usage: GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
      })
      const depthTextureView = depthTexture.createView()

      FBO = { views, depthTexture, depthTextureView }
      this._FBOs.set(this._renderTarget, FBO, () => depthTexture.destroy())
    }

    // FBOs don't support multisampling ATM due to the WebGL complexity
    const samples = this.samples
    if (FBO) this.samples = 1
    else if (this._msaaTexture.sampleCount !== samples) this._resizeSwapchain()

    const renderViews = FBO?.views ?? [this._msaaTextureView]
    const resolveTarget = FBO ? undefined : this.context.getCurrentTexture().createView()
    const loadOp: GPULoadOp = this.autoClear ? 'clear' : 'load'
    const storeOp: GPUStoreOp = 'store'

    this._commandEncoder = this.device.createCommandEncoder()
    this._passEncoder = this._commandEncoder.beginRenderPass({
      colorAttachments: renderViews.map<GPURenderPassColorAttachment>((view) => ({
        view,
        resolveTarget,
        loadOp,
        storeOp,
      })),
      depthStencilAttachment: {
        view: FBO?.depthTextureView ?? this._depthTextureView,
        depthClearValue: 1,
        depthLoadOp: loadOp,
        depthStoreOp: storeOp,
        stencilClearValue: 0,
        stencilLoadOp: loadOp,
        stencilStoreOp: storeOp,
      },
    })

    if (this._renderTarget)
      this._passEncoder.setViewport(0, 0, this._renderTarget.width, this._renderTarget.height, 0, 1)
    else this._passEncoder.setViewport(0, 0, this.canvas.width, this.canvas.height, 0, 1)

    scene.updateMatrix()
    camera?.updateMatrix()
    if (camera?.matrixAutoUpdate) camera.projectionViewMatrix.normalNDC()

    const renderList = this.sort(scene, camera)
    for (const node of renderList) {
      this.compile(node, camera)

      // Alternate drawing for indexed and non-indexed children
      const { index, position } = node.geometry.attributes
      const { start, count } = node.geometry.drawRange
      if (index) this._passEncoder.drawIndexed(min(count, index.data.length / index.size), node.instances, start)
      else if (position) this._passEncoder.draw(min(count, position.data.length / position.size), node.instances, start)
      else this._passEncoder.draw(3, node.instances)
    }

    // Cleanup frame, submit GPU commands
    this._passEncoder.end()
    this.device.queue.submit([this._commandEncoder.finish()])

    if (FBO) this.samples = samples
  }

  /**
   * Performs GPU compute on a given mesh.
   */
  compute(node: Mesh): void {
    this._commandEncoder = this.device.createCommandEncoder()
    this._passEncoder = this._commandEncoder.beginComputePass()

    const workgroupCount: [number, number, number] = JSON.parse(
      `[${node.material.compute!.match(WORKGROUP_REGEX)![1]}]`,
    )

    this.compile(node)
    this._passEncoder.dispatchWorkgroups(...workgroupCount)
    this._passEncoder.end()
    this.device.queue.submit([this._commandEncoder.finish()])
  }
}
