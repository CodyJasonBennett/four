import { Vector3 } from './Vector3'
import type { Camera } from './Camera'
import type { Attribute, Geometry } from './Geometry'
import type { BlendFactor, BlendOperation, Side, Blending, Uniform, Material } from './Material'
import { Mesh, type Mode } from './Mesh'
import type { Object3D } from './Object3D'
import type { RenderTarget } from './RenderTarget'
import { Texture } from './Texture'
import type { Filter, Wrapping, Sampler } from './Sampler'
import { min, max, floor, Compiled } from './_utils'

const GL_FRAMEBUFFER = 0x8d40
const GL_COLOR_ATTACHMENT0 = 0x8ce0
const GL_TEXTURE_2D = 0x0de1
const GL_TEXTURE_MAG_FILTER = 0x2800
const GL_TEXTURE_MIN_FILTER = 0x2801
const GL_TEXTURE_WRAP_S = 0x2802
const GL_TEXTURE_WRAP_T = 0x2803
const GL_RGBA = 0x1908
const GL_DEPTH_TEST = 0x0b71
const GL_CULL_FACE = 0x0b44
const GL_BLEND = 0x0be2
const GL_UNPACK_ALIGNMENT = 0x0cf5
const GL_VERTEX_SHADER = 0x8b31
const GL_FRAGMENT_SHADER = 0x8b30
const GL_ELEMENT_ARRAY_BUFFER = 0x8893
const GL_ARRAY_BUFFER = 0x8892
const GL_STATIC_DRAW = 0x88e4
const GL_DYNAMIC_DRAW = 0x88e8
const GL_COLOR_BUFFER_BIT = 0x00004000
const GL_DEPTH_BUFFER_BIT = 0x00000100
const GL_STENCIL_BUFFER_BIT = 0x00000400
const GL_LESS = 0x0201
const GL_FRONT = 0x0404
const GL_BACK = 0x0405
const GL_TEXTURE0 = 0x84c0
const GL_POINTS = 0x0000
const GL_TRANSFORM_FEEDBACK = 0x8e22
const GL_TRANSFORM_FEEDBACK_BUFFER = 0x8c8e
const GL_SEPARATE_ATTRIBS = 0x8c8d
const GL_RASTERIZER_DISCARD = 0x8c89

const GL_NEAREST = 0x2600
const GL_LINEAR = 0x2601

const GL_FILTERS: Record<Filter, number> = {
  nearest: GL_NEAREST,
  linear: GL_LINEAR,
} as const

const GL_LINEAR_MIPMAP_NEAREST = 0x2701
const GL_NEAREST_MIPMAP_LINEAR = 0x2702

const GL_MIPMAP_FILTERS: Record<Filter, number> = {
  nearest: GL_LINEAR_MIPMAP_NEAREST,
  linear: GL_NEAREST_MIPMAP_LINEAR,
} as const

const GL_REPEAT = 0x2901
const GL_CLAMP_TO_EDGE = 0x812f
const GL_MIRRORED_REPEAT = 0x8370

const GL_WRAPPINGS: Record<Wrapping, number> = {
  repeat: GL_REPEAT,
  clamp: GL_CLAMP_TO_EDGE,
  mirror: GL_MIRRORED_REPEAT,
} as const

const GL_ZERO = 0
const GL_ONE = 1
const GL_SRC_COLOR = 0x0300
const GL_ONE_MINUS_SRC_COLOR = 0x0301
const GL_SRC_ALPHA = 0x0302
const GL_ONE_MINUS_SRC_ALPHA = 0x0303
const GL_DST_COLOR = 0x0306
const GL_DST_ALPHA = 0x0304
const GL_ONE_MINUS_DST_ALPHA = 0x0305
const GL_ONE_MINUS_DST_COLOR = 0x0307
const GL_SRC_ALPHA_SATURATE = 0x0308
const GL_CONSTANT_COLOR = 0x8001
const GL_ONE_MINUS_CONSTANT_COLOR = 0x8002

const GL_BLEND_FACTORS: Record<BlendFactor, number> = {
  zero: GL_ZERO,
  one: GL_ONE,
  src: GL_SRC_COLOR,
  'one-minus-src': GL_ONE_MINUS_SRC_COLOR,
  'src-alpha': GL_SRC_ALPHA,
  'one-minus-src-alpha': GL_ONE_MINUS_SRC_ALPHA,
  'dst-alpha': GL_DST_ALPHA,
  'one-minus-dst-alpha': GL_ONE_MINUS_DST_ALPHA,
  dst: GL_DST_COLOR,
  'one-minus-dst': GL_ONE_MINUS_DST_COLOR,
  'src-alpha-saturated': GL_SRC_ALPHA_SATURATE,
  constant: GL_CONSTANT_COLOR,
  'one-minus-constant': GL_ONE_MINUS_CONSTANT_COLOR,
} as const

const GL_FUNC_ADD = 0x8006
const GL_FUNC_SUBSTRACT = 0x800a
const GL_FUNC_REVERSE_SUBTRACT = 0x800b
const GL_MIN = 0x8007
const GL_MAX = 0x8008

const GL_BLEND_OPERATIONS: Record<BlendOperation, number> = {
  add: GL_FUNC_ADD,
  subtract: GL_FUNC_SUBSTRACT,
  'reverse-subtract': GL_FUNC_REVERSE_SUBTRACT,
  min: GL_MIN,
  max: GL_MAX,
} as const

const GL_FLOAT = 0x1406
const GL_BYTE = 0x1400
const GL_SHORT = 0x1402
const GL_INT = 0x1404
const GL_UNSIGNED_BYTE = 0x1401
const GL_UNSIGNED_SHORT = 0x1403
const GL_UNSIGNED_INT = 0x1405

/**
 * Gets the appropriate WebGL data type for a data view.
 */
const getDataType = (data: ArrayBufferView): number | null => {
  switch (data.constructor) {
    case Float32Array:
      return GL_FLOAT
    case Int8Array:
      return GL_BYTE
    case Int16Array:
      return GL_SHORT
    case Int32Array:
      return GL_INT
    case Uint8Array:
    case Uint8ClampedArray:
      return GL_UNSIGNED_BYTE
    case Uint16Array:
      return GL_UNSIGNED_SHORT
    case Uint32Array:
      return GL_UNSIGNED_INT
    default:
      return null
  }
}

/**
 * Matches against GLSL shader outputs.
 */
const VARYING_REGEX = /[^\w](?:varying|out)\s+\w+\s+(\w+)\s*;/g

/**
 * Represents WebGL compiled {@link Mesh} state.
 */
export interface WebGLCompiled {
  /**
   * The {@link WebGLProgram} for compiled {@link Material} program state.
   */
  program: WebGLProgram
  /**
   * The {@link WebGLVertexArrayObject} for e compiled {@link Geometry} buffer state.
   */
  VAO: WebGLVertexArrayObject
}

/**
 * {@link WebGLRenderer} constructor parameters.
 */
export interface WebGLRendererOptions {
  /**
   * An optional canvas element to draw to.
   */
  canvas: HTMLCanvasElement
  /**
   * An optional WebGL2 context to draw with.
   */
  context: WebGL2RenderingContext
  /**
   * Whether to draw with a transparent background. Default is `true`.
   */
  alpha: boolean
  /**
   * Whether to enable anti-aliasing for sharp corners. Default is `false`.
   */
  antialias: boolean
  /**
   * Whether to create a depth buffer to depth test with. Default is `true`.
   */
  depth: boolean
  /**
   * Whether to create a stencil buffer. Useful for masking, reflections, and per-pixel optimizations. Default is `false`.
   */
  stencil: boolean
  /**
   * Whether to bail if on a low-end system or if no dedicated GPU is available. Default is `false`.
   */
  failIfMajorPerformanceCaveat: boolean
  /**
   * Whether to fade out colors with transparency. Default is `true`.
   */
  premultipliedAlpha: boolean
  /**
   * Whether to copy the drawing buffer to screen instead of swapping at the expense of performance. Default is `false`.
   */
  preserveDrawingBuffer: boolean
  /**
   * Whether to prioritize rendering performance or power efficiency. Defaults to `default` to automatically balance.
   */
  powerPreference: 'default' | 'high-performance' | 'low-power'
}

/**
 * Constructs a WebGL renderer object. Can be extended to draw to a canvas.
 */
export class WebGLRenderer {
  /**
   * Output {@link HTMLCanvasElement} to draw to.
   */
  readonly canvas: HTMLCanvasElement
  /**
   * Internal {@link WebGL2RenderingContext} to draw with.
   */
  readonly gl: WebGL2RenderingContext
  /**
   * Whether to clear the drawing buffer between renders. Default is `true`.
   */
  public autoClear = true
  private _compiled = new Compiled<Mesh, WebGLCompiled>()
  private _programs = new Compiled<Material, WebGLProgram>()
  private _geometry = new Compiled<Geometry, WebGLVertexArrayObject>()
  private _buffers = new Compiled<Attribute, WebGLBuffer>()
  private _textures = new Compiled<Texture, WebGLTexture>()
  private _samplers = new Compiled<Sampler, WebGLSampler>()
  private _FBOs = new Compiled<RenderTarget, WebGLFramebuffer>()
  private _transformFeedback?: WebGLTransformFeedback
  private _textureIndex = 0
  private _v = new Vector3()

  constructor({ canvas, context, ...rest }: Partial<WebGLRendererOptions> = {}) {
    this.canvas = canvas ?? document.createElement('canvas')
    this.gl =
      context ??
      this.canvas.getContext('webgl2', {
        alpha: true,
        depth: true,
        premultipliedAlpha: true,
        ...rest,
      })!
  }

  /**
   * Sets the canvas size.
   */
  setSize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.gl.viewport(0, 0, width, height)
  }

  /**
   * Updates sampler parameters.
   */
  private _updateSampler(sampler: Sampler): WebGLSampler {
    let target = this._samplers.get(sampler)!
    if (!target) {
      target = this.gl.createSampler()!
      this._samplers.set(sampler, target)
      sampler.needsUpdate = true
    }

    if (sampler.needsUpdate) {
      if (sampler.anisotropy) {
        const anisotropyExt = this.gl.getExtension('EXT_texture_filter_anisotropic')
        if (anisotropyExt)
          this.gl.samplerParameteri(target, anisotropyExt.TEXTURE_MAX_ANISOTROPY_EXT, sampler.anisotropy)
      }

      const MIN_FILTERS = sampler.generateMipmaps ? GL_MIPMAP_FILTERS : GL_FILTERS
      this.gl.samplerParameteri(target, GL_TEXTURE_MAG_FILTER, GL_FILTERS[sampler.magFilter])
      this.gl.samplerParameteri(target, GL_TEXTURE_MIN_FILTER, MIN_FILTERS[sampler.minFilter])

      this.gl.samplerParameteri(target, GL_TEXTURE_WRAP_S, GL_WRAPPINGS[sampler.wrapS])
      this.gl.samplerParameteri(target, GL_TEXTURE_WRAP_T, GL_WRAPPINGS[sampler.wrapT])

      sampler.needsUpdate = false
    }

    return target
  }

  /**
   * Updates a texture with an optional `width` and `height`.
   */
  private _updateTexture(texture: Texture, width = 0, height = 0): WebGLTexture {
    let target = this._textures.get(texture)!
    if (!target) {
      target = this.gl.createTexture()!
      this._textures.set(texture, target, () => this.gl.deleteTexture(target))
      texture.needsUpdate = true
    }

    this.gl.bindTexture(GL_TEXTURE_2D, target)

    if (texture.needsUpdate) {
      this.gl.pixelStorei(GL_UNPACK_ALIGNMENT, 1)

      const format = (texture.format as number | undefined) ?? GL_RGBA
      const type = texture.type ?? GL_UNSIGNED_BYTE
      if (texture.image) {
        this.gl.texImage2D(GL_TEXTURE_2D, 0, format, format, type, texture.image)
      } else {
        this.gl.texImage2D(GL_TEXTURE_2D, 0, format, width, height, 0, format, type, null)
      }

      if (!(texture.image instanceof HTMLVideoElement)) texture.needsUpdate = false
    }

    if (texture.needsUpdate || texture.sampler.needsUpdate) {
      if (texture.sampler.generateMipmaps) this.gl.generateMipmap(GL_TEXTURE_2D)

      this._updateSampler(texture.sampler)
    }

    return target
  }

  /**
   * Sets the current {@link RenderTarget} to render into.
   */
  setRenderTarget(renderTarget: RenderTarget | null): void {
    if (!renderTarget) {
      this.gl.bindFramebuffer(GL_FRAMEBUFFER, null)
      return this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }

    let FBO = this._FBOs.get(renderTarget)
    if (!FBO || renderTarget.needsUpdate) {
      if (FBO) this.gl.deleteFramebuffer(FBO)
      FBO = this.gl.createFramebuffer()!
      this.gl.bindFramebuffer(GL_FRAMEBUFFER, FBO)

      const attachments: number[] = []

      let attachment = GL_COLOR_ATTACHMENT0
      for (const texture of renderTarget.textures) {
        attachments.push(attachment)
        const target = this._updateTexture(texture, renderTarget.width, renderTarget.height)
        this.gl.framebufferTexture2D(GL_FRAMEBUFFER, attachment, GL_TEXTURE_2D, target, 0)
        attachment++
      }
      this.gl.drawBuffers(attachments)
      renderTarget.needsUpdate = false

      this._FBOs.set(renderTarget, FBO, () => this.gl.deleteFramebuffer(FBO!))
    }

    this.gl.bindFramebuffer(GL_FRAMEBUFFER, FBO)
    this.gl.viewport(0, 0, renderTarget.width, renderTarget.height)
  }

  /**
   * Enables depth test. Useful for toggling testing against the depth buffer.
   */
  setDepthTest(enabled: boolean, depthFunc = GL_LESS): void {
    if (enabled) {
      this.gl.enable(GL_DEPTH_TEST)
      this.gl.depthFunc(depthFunc)
    } else {
      this.gl.disable(GL_DEPTH_TEST)
    }
  }

  /**
   * Enables depthmask. Useful for toggling writing to the depth buffer.
   */
  setDepthMask(enabled: boolean): void {
    this.gl.depthMask(enabled)
  }

  /**
   * Sets the current visible {@link Side}. Will cull other sides.
   */
  setCullSide(side: Side = 'both'): void {
    if (side === 'both') {
      this.gl.disable(GL_CULL_FACE)
      this.gl.disable(GL_DEPTH_TEST)
    } else {
      this.gl.enable(GL_CULL_FACE)
      this.gl.cullFace(side === 'front' ? GL_BACK : GL_FRONT)
    }
  }

  /**
   * Configures color and alpha {@link Blending}.
   */
  setBlending(blending?: Blending): void {
    if (blending) {
      this.gl.enable(GL_BLEND)
      this.gl.blendFuncSeparate(
        GL_BLEND_FACTORS[blending.color.srcFactor!],
        GL_BLEND_FACTORS[blending.color.dstFactor!],
        GL_BLEND_FACTORS[blending.alpha.srcFactor!],
        GL_BLEND_FACTORS[blending.alpha.dstFactor!],
      )
      this.gl.blendEquationSeparate(
        GL_BLEND_OPERATIONS[blending.color.operation!],
        GL_BLEND_OPERATIONS[blending.alpha.operation!],
      )
    } else {
      this.gl.disable(GL_BLEND)
    }
  }

  /**
   * Sets a {@link Uniform} outside of std140 for a {@link WebGLProgram} by name.
   */
  private _setUniform(program: WebGLProgram, name: string, value: Uniform): void {
    const location = this.gl.getUniformLocation(program, name)
    if (location === -1) return

    if (value instanceof Texture) {
      const index = this._textureIndex++
      this.gl.activeTexture(GL_TEXTURE0 + index)
      const sampler = this._samplers.get(value.sampler)
      if (sampler) this.gl.bindSampler(index, sampler)
      this._updateTexture(value)
      return this.gl.uniform1i(location, index)
    }

    if (typeof value === 'number') return this.gl.uniform1f(location, value)
    switch (value.length) {
      case 2:
        return this.gl.uniform2fv(location, value)
      case 3:
        return this.gl.uniform3fv(location, value)
      case 4:
        return this.gl.uniform4fv(location, value)
      case 9:
        return this.gl.uniformMatrix3fv(location, false, value)
      case 16:
        return this.gl.uniformMatrix4fv(location, false, value)
    }
  }

  /**
   * Compiles a mesh or program and sets initial uniforms.
   */
  compile(mesh: Mesh, camera?: Camera): WebGLCompiled {
    mesh.material.uniforms.modelMatrix = mesh.matrix

    if (camera) {
      mesh.material.uniforms.projectionMatrix = camera.projectionMatrix
      mesh.material.uniforms.viewMatrix = camera.viewMatrix
      mesh.material.uniforms.normalMatrix = mesh.normalMatrix
      mesh.material.uniforms.modelViewMatrix = mesh.modelViewMatrix

      mesh.modelViewMatrix.copy(camera.viewMatrix).multiply(mesh.matrix)
      mesh.normalMatrix.normal(mesh.modelViewMatrix)
    }

    let compiled = this._compiled.get(mesh)

    let program = this._programs.get(mesh.material)
    if (!program) {
      program = this.gl.createProgram()!
      this._programs.set(mesh.material, program, () => this.gl.deleteProgram(program!))

      const vertexShader = this.gl.createShader(GL_VERTEX_SHADER)!
      this.gl.shaderSource(vertexShader, mesh.material.vertex ?? mesh.material.compute)
      this.gl.compileShader(vertexShader)
      this.gl.attachShader(program, vertexShader)

      const fragmentShader = this.gl.createShader(GL_FRAGMENT_SHADER)!
      this.gl.shaderSource(fragmentShader, mesh.material.fragment ?? '#version 300 es\nvoid main(){}')
      this.gl.compileShader(fragmentShader)
      this.gl.attachShader(program, fragmentShader)

      this.gl.linkProgram(program)

      for (const shader of [vertexShader, fragmentShader]) {
        const error = this.gl.getShaderInfoLog(shader)
        if (error) throw `${error}\n${this.gl.getShaderSource(shader)!}`
      }

      const error = this.gl.getProgramInfoLog(program)
      if (error) throw `${this.gl.getProgramInfoLog(program)}`

      this.gl.deleteShader(vertexShader)
      this.gl.deleteShader(fragmentShader)
    }

    let VAO = this._geometry.get(mesh.geometry)
    if (!VAO) {
      VAO = this.gl.createVertexArray()!
      this._geometry.set(mesh.geometry, VAO, () => this.gl.deleteVertexArray(VAO!))
    }

    this.gl.useProgram(program)
    this.gl.bindVertexArray(VAO)

    for (const key in mesh.geometry.attributes) {
      const attribute = mesh.geometry.attributes[key]
      const type = key === 'index' ? GL_ELEMENT_ARRAY_BUFFER : GL_ARRAY_BUFFER

      let buffer = this._buffers.get(attribute)

      if (!buffer || program !== compiled?.program || VAO !== compiled?.VAO) {
        if (!buffer) {
          buffer = this.gl.createBuffer()!
          this._buffers.set(attribute, buffer)
          this.gl.bindBuffer(type, buffer)
          this.gl.bufferData(type, attribute.data, GL_STATIC_DRAW)
          attribute.needsUpdate = false
        } else {
          this.gl.bindBuffer(type, buffer)
        }

        const location = this.gl.getAttribLocation(program, key)
        if (location !== -1) {
          const slots = min(4, max(1, floor(attribute.size / 3)))

          for (let i = 0; i < slots; i++) {
            this.gl.enableVertexAttribArray(location + i)
            const type = getDataType(attribute.data)!
            const stride = attribute.size * attribute.data.BYTES_PER_ELEMENT
            const offset = attribute.size * i
            if (type === GL_FLOAT) {
              this.gl.vertexAttribPointer(location, attribute.size, type, false, stride, offset)
            } else {
              this.gl.vertexAttribIPointer(location, attribute.size, type, stride, offset)
            }
            if (attribute.divisor) this.gl.vertexAttribDivisor(location + i, attribute.divisor)
          }
        }
      }

      if (attribute.needsUpdate) {
        this.gl.bindBuffer(type, buffer)
        this.gl.bufferData(type, attribute.data, GL_DYNAMIC_DRAW)
        attribute.needsUpdate = false
      }
    }

    this._textureIndex = 0
    for (const key in mesh.material.uniforms) this._setUniform(program, key, mesh.material.uniforms[key])

    if (!compiled) {
      compiled = { program, VAO }
      this._compiled.set(mesh, compiled)
    }

    return compiled
  }

  /**
   * Clears color and depth buffers.
   */
  clear(bits = GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT): void {
    this.gl.clear(bits)
  }

  /**
   * Returns a list of visible meshes. Will frustum cull and depth-sort with a camera if available.
   */
  sort(scene: Object3D, camera?: Camera): Mesh[] {
    const renderList: Mesh[] = []

    if (camera?.matrixAutoUpdate) {
      camera.projectionViewMatrix.copy(camera.projectionMatrix).multiply(camera.viewMatrix)
      camera.frustum.fromMatrix4(camera.projectionViewMatrix)
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
    if (this.autoClear) this.clear()

    scene.updateMatrix()
    camera?.updateMatrix()

    const renderList = this.sort(scene, camera)
    for (const node of renderList) {
      this.compile(node, camera)

      this.setDepthTest(node.material.depthTest)
      this.setDepthMask(node.material.depthWrite)
      this.setCullSide(node.material.side)
      this.setBlending(node.material.blending)

      const mode = this.gl[node.mode.toUpperCase() as Uppercase<Mode>]
      const { index, position } = node.geometry.attributes
      const { start, count } = node.geometry.drawRange
      if (index)
        this.gl.drawElementsInstanced(
          mode,
          min(count, index.data.length / index.size),
          getDataType(index.data)!,
          start,
          node.instances,
        )
      else if (position)
        this.gl.drawArraysInstanced(mode, start, min(count, position.data.length / position.size), node.instances)
      else this.gl.drawArraysInstanced(mode, 0, 3, node.instances)
    }
  }

  /**
   * Performs GPU compute on a given mesh.
   */
  compute(node: Mesh): void {
    const compiled = this.compile(node)
    this.gl.bindVertexArray(null)
    this.gl.bindBuffer(GL_ARRAY_BUFFER, null)

    const transformFeedback = (this._transformFeedback ??= this.gl.createTransformFeedback()!)
    this.gl.bindTransformFeedback(GL_TRANSFORM_FEEDBACK, transformFeedback)

    let length = 0
    const outputs: string[] = []
    for (const [, output] of node.material.compute!.matchAll(VARYING_REGEX)) {
      const attribute = node.geometry.attributes[output]
      const buffer = this._buffers.get(attribute)!
      this.gl.bindBufferBase(GL_TRANSFORM_FEEDBACK_BUFFER, outputs.length, buffer)
      length = Math.max(length, attribute.data.length / attribute.size)
      outputs.push(output)
    }
    this.gl.transformFeedbackVaryings(compiled.program, outputs, GL_SEPARATE_ATTRIBS)
    this.gl.linkProgram(compiled.program)

    const mode = GL_POINTS

    this.gl.enable(GL_RASTERIZER_DISCARD)
    this.gl.beginTransformFeedback(mode)
    this.gl.bindVertexArray(compiled.VAO)

    if (length) this.gl.drawArraysInstanced(mode, 0, length, node.instances)
    else this.gl.drawArraysInstanced(mode, 0, node.instances, 1)

    this.gl.bindVertexArray(null)
    this.gl.endTransformFeedback()
    this.gl.disable(GL_RASTERIZER_DISCARD)
    this.gl.bindTransformFeedback(GL_TRANSFORM_FEEDBACK, null)
  }
}
