import { ARRAY_TYPE, max, sqrt } from './_utils'
import { Matrix4 } from './Matrix4'
import type { Mesh } from './Mesh'

/**
 * Represents the components of a {@link Frustum}.
 */
export type FrustumTuple = [
  lx: number,
  ly: number,
  lz: number,
  lw: number,
  rx: number,
  ry: number,
  rz: number,
  rw: number,
  tx: number,
  ty: number,
  tz: number,
  tw: number,
  bx: number,
  by: number,
  bz: number,
  bw: number,
  nx: number,
  ny: number,
  nz: number,
  nw: number,
  fx: number,
  fy: number,
  fz: number,
  fw: number,
]

/**
 * Constructs a camera frustum. Used to calculate and test against frustum planes.
 */
export class Frustum extends ARRAY_TYPE<number> {
  private _projectionViewMatrix = new Matrix4()

  constructor() {
    super(24)
  }

  /**
   * Sets this frustum's elements.
   */
  set(...f: FrustumTuple): this {
    for (let i = 0; i < 24; i++) {
      this[i] = f[i]
    }

    return this
  }

  /**
   * Copies properties from another {@link Frustum}.
   */
  copy(f: Frustum): this {
    return this.set(...(f as unknown as FrustumTuple))
  }

  /**
   * Updates frustum planes from a projection-view matrix.
   */
  fromMatrix4(projectionViewMatrix: Matrix4): void {
    const [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33] =
      this._projectionViewMatrix.copy(projectionViewMatrix)

    // http://cs.otago.ac.nz/postgrads/alexis/planeExtraction.pdf
    this.set(
      // Left clipping plane
      m03 - m00,
      m13 - m10,
      m23 - m20,
      m33 - m30,
      // Right clipping plane
      m03 + m00,
      m13 + m10,
      m23 + m20,
      m33 + m30,
      // Top clipping plane
      m03 + m01,
      m13 + m11,
      m23 + m21,
      m33 + m31,
      // Bottom clipping plane
      m03 - m01,
      m13 - m11,
      m23 - m21,
      m33 - m31,
      // Near clipping plane
      m03 - m02,
      m13 - m12,
      m23 - m22,
      m33 - m32,
      // Far clipping plane
      m03 + m02,
      m13 + m12,
      m23 + m22,
      m33 + m32,
    )
  }

  /**
   * Checks whether a mesh is in view.
   */
  contains(mesh: Mesh): boolean {
    const { position } = mesh.geometry.attributes
    const vertices = position.data.length / position.size

    let radius = 0

    for (let i = 0; i < vertices; i += position.size) {
      let vertexLengthSquared = 0
      for (let vi = i; vi < i + position.size; vi++) vertexLengthSquared += position.data[vi] ** 2
      radius = max(radius, sqrt(vertexLengthSquared))
    }

    radius *= max(...mesh.scale)

    for (let i = 0; i < 6; i++) {
      const offset = i * 4
      const distance =
        this[offset] * mesh.matrix[12] +
        this[offset + 1] * mesh.matrix[13] +
        this[offset + 2] * mesh.matrix[14] +
        this[offset + 3]

      if (distance <= -radius) return false
    }

    return true
  }

  /**
   * Converts from a WebGL NDC space `[-1, 1]` to a WebGPU `[0, 1]` NDC space.
   */
  normalNDC(): this {
    const m = this._projectionViewMatrix
    this[20] -= m[3]
    this[21] -= m[7]
    this[22] -= m[11]
    this[23] -= m[15]

    return this
  }
}
