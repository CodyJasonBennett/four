import { Vector3 } from './Vector3'
import type { Camera } from './Camera'
import type { Attribute, Geometry } from './Geometry'
import type { BlendFactor, BlendOperation, Side, Blending, Uniform, Material } from './Material'
import { Mesh, type Mode } from './Mesh'
import type { Object3D } from './Object3D'
import type { RenderTarget } from './RenderTarget'
import { Texture } from './Texture'
import { min, max, floor } from './_shared'

const GL_FRAMEBUFFER = 0x8d40
const GL_COLOR_ATTACHMENT0 = 0x8ce0
const GL_TEXTURE_2D = 0x0de1
const GL_TEXTURE_MIN_FILTER = 0x2801
const GL_LINEAR = 0x2601
const GL_NEAREST = 0x2600
const GL_RGBA = 0x1908
const GL_UNSIGNED_BYTE = 0x1401
const GL_DEPTH_TEST = 0x0b71
const GL_CULL_FACE = 0x0b44
const GL_BLEND = 0x0be2
const GL_UNPACK_ALIGNMENT = 0x0cf5
const GL_VERTEX_SHADER = 0x8b31
const GL_FRAGMENT_SHADER = 0x8b30
const GL_ELEMENT_ARRAY_BUFFER = 0x8893
const GL_ARRAY_BUFFER = 0x8892
const GL_STATIC_DRAW = 0x88e4
const GL_FLOAT = 0x1406
const GL_DYNAMIC_DRAW = 0x88e8
const GL_COLOR_BUFFER_BIT = 0x00004000
const GL_DEPTH_BUFFER_BIT = 0x00000100
const GL_STENCIL_BUFFER_BIT = 0x00000400
const GL_UNSIGNED_INT = 0x1405
const GL_LESS = 0x0201
const GL_FRONT = 0x0404
const GL_BACK = 0x0405
const GL_TEXTURE0 = 0x84c0

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

/**
 * Represents WebGL compiled {@link Mesh} state.
 */
export interface Compiled {
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
 * Constructs a renderer object. Can be extended to draw to a canvas.
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
  protected _compiled = new WeakMap<Mesh, Compiled>()
  protected _programs = new WeakMap<Material, WebGLProgram>()
  protected _VAOs = new WeakMap<Geometry, WebGLVertexArrayObject>()
  protected _buffers = new WeakMap<Attribute, WebGLBuffer>()
  protected _textures = new WeakMap<Texture, WebGLTexture>()
  protected _FBOs = new WeakMap<RenderTarget, WebGLFramebuffer>()
  protected _textureIndex = 0
  protected _v = new Vector3()

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

        let target = this._textures.get(texture)
        if (!target) {
          target = this.gl.createTexture()!
          this.gl.bindTexture(GL_TEXTURE_2D, target)
          this.gl.texParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST)
          this._textures.set(texture, target)
          texture.needsUpdate = false
        }
        this.gl.bindTexture(GL_TEXTURE_2D, target)
        this.gl.texImage2D(
          GL_TEXTURE_2D,
          0,
          GL_RGBA,
          renderTarget.width,
          renderTarget.height,
          0,
          GL_RGBA,
          GL_UNSIGNED_BYTE,
          null,
        )

        this.gl.framebufferTexture2D(GL_FRAMEBUFFER, attachment, GL_TEXTURE_2D, target, 0)
        attachment++
      }
      this.gl.drawBuffers(attachments)
      renderTarget.needsUpdate = false

      this._FBOs.set(renderTarget, FBO)
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
  setUniform(program: WebGLProgram, name: string, value: Uniform): void {
    const location = this.gl.getUniformLocation(program, name)
    if (location === -1) return

    if (value instanceof Texture) {
      let texture = this._textures.get(value)!
      if (!texture) {
        texture = this.gl.createTexture()!
        this.gl.bindTexture(GL_TEXTURE_2D, texture)
        this.gl.pixelStorei(GL_UNPACK_ALIGNMENT, 1)
        this.gl.texParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
        this._textures.set(value, texture)
      }

      const index = this._textureIndex++
      this.gl.activeTexture(GL_TEXTURE0 + index)
      this.gl.bindTexture(GL_TEXTURE_2D, texture)
      if (value.needsUpdate) {
        this.gl.texImage2D(GL_TEXTURE_2D, 0, GL_RGBA, GL_RGBA, GL_UNSIGNED_BYTE, value.image!)
        value.needsUpdate = false
      }
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
  compile(mesh: Mesh, camera?: Camera): Compiled {
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
      this._programs.set(mesh.material, program)

      const vertexShader = this.gl.createShader(GL_VERTEX_SHADER)!
      this.gl.shaderSource(vertexShader, mesh.material.vertex)
      this.gl.compileShader(vertexShader)
      this.gl.attachShader(program, vertexShader)

      const fragmentShader = this.gl.createShader(GL_FRAGMENT_SHADER)!
      this.gl.shaderSource(fragmentShader, mesh.material.fragment)
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

    let VAO = this._VAOs.get(mesh.geometry)
    if (!VAO) {
      VAO = this.gl.createVertexArray()!
      this._VAOs.set(mesh.geometry, VAO)
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
        }

        const location = this.gl.getAttribLocation(program, key)
        if (location !== -1) {
          const slots = min(4, max(1, floor(attribute.size / 3)))

          for (let i = 0; i < slots; i++) {
            this.gl.enableVertexAttribArray(location + i)
            this.gl.vertexAttribPointer(
              location + i,
              attribute.size / slots,
              GL_FLOAT,
              false,
              attribute.data.BYTES_PER_ELEMENT * attribute.size,
              attribute.size * i,
            )
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
    for (const key in mesh.material.uniforms) this.setUniform(program, key, mesh.material.uniforms[key])

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
    const sorted: Mesh[] = []
    const unsorted: Mesh[] = []

    scene.traverse((node) => {
      // Skip invisible nodes
      if (!node.visible) return true

      // Filter to meshes
      const mesh = node as Mesh
      if (!(mesh instanceof Mesh)) return

      // Skip culling/sorting without camera
      if (!camera) return void unsorted.push(mesh)

      // Frustum cull if able
      if (mesh.frustumCulled) {
        const inFrustum = camera.frustum.contains(mesh)
        if (!inFrustum) return true
      }

      // Filter sortable objects
      if (!mesh.material.depthTest) unsorted.push(mesh)
      else sorted.push(mesh)
    })

    // Don't depth sort without camera
    if (!camera) return sorted.concat(unsorted)

    // Depth sort if able
    return sorted
      .sort(
        (a, b) =>
          this._v.set(b.matrix[12], b.matrix[13], b.matrix[14]).applyMatrix4(camera.projectionViewMatrix).z -
          this._v.set(a.matrix[12], a.matrix[13], a.matrix[14]).applyMatrix4(camera.projectionViewMatrix).z,
      )
      .concat(unsorted)
  }

  /**
   * Renders a scene of objects with an optional camera.
   */
  render(scene: Object3D, camera?: Camera): void {
    if (this.autoClear) this.clear()

    camera?.updateMatrix()
    scene.updateMatrix()

    const renderList = this.sort(scene, camera)
    for (const node of renderList) {
      this.compile(node, camera)

      this.setDepthTest(node.material.depthTest)
      this.setDepthMask(node.material.depthWrite)
      this.setCullSide(node.material.side)
      this.setBlending(node.material.blending)

      const mode = this.gl[node.mode.toUpperCase() as Uppercase<Mode>]
      const { index, position } = node.geometry.attributes
      if (index) this.gl.drawElementsInstanced(mode, index.data.length / index.size, GL_UNSIGNED_INT, 0, node.instances)
      else this.gl.drawArraysInstanced(mode, 0, position.data.length / position.size, node.instances)
    }
  }
}
