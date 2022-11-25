import { Vector3 } from './Vector3'
import type { Camera } from './Camera'
import type { Attribute } from './Geometry'
import type { BlendFactor, BlendOperation, Side, Blending, Uniform } from './Material'
import { Mesh, type Mode } from './Mesh'
import type { Object3D } from './Object3D'
import type { RenderTarget } from './RenderTarget'
import { Texture } from './Texture'

const GL_BLEND_FACTORS: Record<BlendFactor, number> = {
  zero: 0,
  one: 1,
  src: 768,
  'one-minus-src': 769,
  'src-alpha': 770,
  'one-minus-src-alpha': 771,
  dst: 774,
  'one-minus-dst': 775,
  'dst-alpha': 772,
  'one-minus-dst-alpha': 773,
  'src-alpha-saturated': 776,
  constant: 32769,
  'one-minus-constant': 32770,
} as const

const GL_BLEND_OPERATIONS: Record<BlendOperation, number> = {
  add: 32774,
  subtract: 32778,
  'reverse-subtract': 32779,
  min: 32775,
  max: 32776,
} as const

/**
 * Adds line numbers to a string with an optional starting offset.
 */
const lineNumbers = (source: string, offset = 0): string => source.replace(/^/gm, () => `${offset++}:`)

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
 * Constructs a renderer object. Can be extended to draw to a canvas.
 */
export class Renderer {
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
  private _renderTarget: RenderTarget | null = null
  private _compiled = new WeakMap<Mesh, Compiled>()
  private _buffers = new WeakMap<Attribute, WebGLBuffer>()
  private _textures = new WeakMap<Texture, WebGLTexture>()
  private _FBOs = new WeakMap<RenderTarget, WebGLFramebuffer>()
  private _textureIndex = 0
  private _a = new Vector3()
  private _b = new Vector3()
  private _c = new Vector3()

  constructor(canvas: HTMLCanvasElement = document.createElement('canvas')) {
    this.canvas = canvas
    this.gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    })!
  }

  /**
   * Sets the canvas size.
   */
  setSize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  /**
   * Sets the current render target to render into.
   */
  setRenderTarget(target: RenderTarget | null) {
    this._renderTarget = target
  }

  /**
   * Enables depth test. Useful for toggling testing against the depth buffer.
   */
  setDepthTest(enabled: boolean, depthFunc = this.gl.LESS): void {
    if (enabled) {
      this.gl.enable(this.gl.DEPTH_TEST)
      this.gl.depthFunc(depthFunc)
    } else {
      this.gl.disable(this.gl.DEPTH_TEST)
    }
  }

  /**
   * Enables depthmask. Useful for toggling writing to the depth buffer.
   */
  setDepthMask(enabled: boolean): void {
    this.gl.depthMask(enabled)
  }

  /**
   * Sets the current visible side. Will cull other sides.
   */
  setCullSide(side: Side = 'both'): void {
    if (side === 'both') {
      this.gl.disable(this.gl.CULL_FACE)
      this.gl.disable(this.gl.DEPTH_TEST)
    } else {
      this.gl.enable(this.gl.CULL_FACE)
      this.gl.cullFace(side === 'front' ? this.gl.BACK : this.gl.FRONT)
    }
  }

  /**
   * Configures color and alpha blending.
   */
  setBlending(blending?: Blending): void {
    if (blending) {
      this.gl.enable(this.gl.BLEND)
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
      this.gl.disable(this.gl.BLEND)
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
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)
        this.gl.generateMipmap(this.gl.TEXTURE_2D)
        this._textures.set(value, texture)
      }

      const index = this._textureIndex++
      this.gl.activeTexture(this.gl.TEXTURE0 + index)
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
      if (value.needsUpdate) {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, value.image!)
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
   * Clears color and depth buffers.
   */
  clear(bits = this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT) {
    this.gl.clear(bits)
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
    if (!compiled) {
      const program = this.gl.createProgram()!
      const VAO = this.gl.createVertexArray()!

      const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER)!
      this.gl.shaderSource(vertexShader, mesh.material.vertex)
      this.gl.compileShader(vertexShader)
      this.gl.attachShader(program, vertexShader)

      const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!
      this.gl.shaderSource(fragmentShader, mesh.material.fragment)
      this.gl.compileShader(fragmentShader)
      this.gl.attachShader(program, fragmentShader)

      this.gl.linkProgram(program)

      for (const shader of [vertexShader, fragmentShader]) {
        const error = this.gl.getShaderInfoLog(shader)
        if (error) throw `Error compiling shader: ${error}\n${lineNumbers(this.gl.getShaderSource(shader)!)}`
      }

      const error = this.gl.getProgramInfoLog(program)
      if (error) throw `Error compiling program: ${this.gl.getProgramInfoLog(program)}`

      this.gl.deleteShader(vertexShader)
      this.gl.deleteShader(fragmentShader)

      compiled = { program, VAO }
      this._compiled.set(mesh, compiled)
    }

    this.gl.bindVertexArray(compiled.VAO)
    this.gl.useProgram(compiled.program)

    for (const key in mesh.geometry.attributes) {
      const attribute = mesh.geometry.attributes[key]
      const type = key === 'index' ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER

      let buffer = this._buffers.get(attribute)
      if (!buffer) {
        buffer = this.gl.createBuffer()!
        this._buffers.set(attribute, buffer)
        this.gl.bindBuffer(type, buffer)
        this.gl.bufferData(type, attribute.data, this.gl.STATIC_DRAW)

        const location = this.gl.getAttribLocation(compiled.program, key)
        if (location !== -1) {
          const slots = Math.min(4, Math.max(1, Math.floor(attribute.size / 3)))

          for (let i = 0; i < slots; i++) {
            this.gl.enableVertexAttribArray(location + i)
            this.gl.vertexAttribPointer(
              location + i,
              attribute.size / slots,
              this.gl.FLOAT,
              false,
              attribute.data.BYTES_PER_ELEMENT * attribute.size,
              attribute.size * i,
            )
            if (attribute.divisor) this.gl.vertexAttribDivisor(location + i, attribute.divisor)
          }
        }

        attribute.needsUpdate = false
      }

      if (attribute.needsUpdate) {
        this.gl.bufferData(type, attribute.data, this.gl.DYNAMIC_DRAW)
        attribute.needsUpdate = false
      }
    }

    this._textureIndex = 0
    for (const key in mesh.material.uniforms) this.setUniform(compiled.program, key, mesh.material.uniforms[key])

    return compiled
  }

  /**
   * Returns a list of visible meshes. Will depth-sort with a camera if available.
   */
  sort(scene: Object3D, camera?: Camera): Mesh[] {
    const renderList: Mesh[] = []

    scene.traverse((node) => {
      if (!node.visible) return true
      if (node instanceof Mesh) renderList.push(node)
    })

    if (camera) this._c.set(camera.matrix[12], camera.matrix[13], camera.matrix[14])

    return renderList.sort(
      (a, b) =>
        (b.material.depthTest as unknown as number) - (a.material.depthTest as unknown as number) ||
        (!!camera &&
          this._b.set(b.matrix[12], b.matrix[13], b.matrix[14]).distanceTo(this._c) -
            this._a.set(a.matrix[12], a.matrix[13], a.matrix[14]).distanceTo(this._c)) ||
        (a.material.transparent as unknown as number) - (b.material.transparent as unknown as number),
    )
  }

  /**
   * Renders a scene of objects with an optional camera.
   */
  render(scene: Object3D, camera?: Camera): void {
    if (this._renderTarget) {
      let FBO = this._FBOs.get(this._renderTarget)
      if (!FBO || this._renderTarget.needsUpdate) {
        if (FBO) this.gl.deleteFramebuffer(FBO)
        FBO = this.gl.createFramebuffer()!
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, FBO)

        const attachments: number[] = []

        let attachment = this.gl.COLOR_ATTACHMENT0
        for (const texture of this._renderTarget.textures) {
          attachments.push(attachment)

          let target = this._textures.get(texture)
          if (!target) {
            target = this.gl.createTexture()!
            this.gl.bindTexture(this.gl.TEXTURE_2D, target)
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
            this._textures.set(texture, target)
            texture.needsUpdate = false
          }
          this.gl.bindTexture(this.gl.TEXTURE_2D, target)
          this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this._renderTarget.width,
            this._renderTarget.height,
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            null,
          )

          this.gl.framebufferTexture2D(this.gl.DRAW_FRAMEBUFFER, attachment, this.gl.TEXTURE_2D, target, 0)
          attachment++
        }
        this.gl.drawBuffers(attachments)
        this._renderTarget.needsUpdate = false

        this._FBOs.set(this._renderTarget, FBO)
      }

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, FBO)
      this.gl.viewport(0, 0, this._renderTarget.width, this._renderTarget.height)
    } else {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }

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
      if (index)
        this.gl.drawElementsInstanced(mode, index.data.length / index.size, this.gl.UNSIGNED_INT, 0, node.instances)
      else this.gl.drawArraysInstanced(mode, 0, position.data.length / position.size, node.instances)
    }
  }
}
