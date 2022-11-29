import type { Vector3 } from './Vector3'
import type { Quaternion } from './Quaternion'
import { ARRAY_TYPE, PI, tan } from './_utils'

/**
 * Represents the components of a {@link Matrix4}.
 */
export type Matrix4Tuple = [
  m00: number,
  m01: number,
  m02: number,
  m03: number,
  m10: number,
  m11: number,
  m12: number,
  m13: number,
  m20: number,
  m21: number,
  m22: number,
  m23: number,
  m30: number,
  m31: number,
  m32: number,
  m33: number,
]

/**
 * Calculates a 4x4 matrix.
 */
export class Matrix4 extends ARRAY_TYPE<number> {
  constructor() {
    super(16)
    this.identity()
  }

  /**
   * Sets this matrix's elements.
   */
  set(...m: Matrix4Tuple): this {
    for (let i = 0; i < 16; i++) {
      this[i] = m[i]
    }

    return this
  }

  /**
   * Copies properties from another {@link Matrix4}.
   */
  copy(m: Matrix4): this {
    return this.set(...(m as unknown as Matrix4Tuple))
  }

  /**
   * Resets to an identity matrix.
   */
  identity(): this {
    return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
  }

  /**
   * Multiplies a scalar or {@link Matrix4}.
   */
  multiply(t: number | Matrix4): this {
    if (typeof t === 'number') {
      for (let i = 0; i < 16; i++) {
        this[i] *= t
      }
    } else {
      const [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33] = this
      const [t00, t01, t02, t03, t10, t11, t12, t13, t20, t21, t22, t23, t30, t31, t32, t33] = t
      this.set(
        m00 * t00 + m10 * t01 + m20 * t02 + m30 * t03,
        m01 * t00 + m11 * t01 + m21 * t02 + m31 * t03,
        m02 * t00 + m12 * t01 + m22 * t02 + m32 * t03,
        m03 * t00 + m13 * t01 + m23 * t02 + m33 * t03,
        m00 * t10 + m10 * t11 + m20 * t12 + m30 * t13,
        m01 * t10 + m11 * t11 + m21 * t12 + m31 * t13,
        m02 * t10 + m12 * t11 + m22 * t12 + m32 * t13,
        m03 * t10 + m13 * t11 + m23 * t12 + m33 * t13,
        m00 * t20 + m10 * t21 + m20 * t22 + m30 * t23,
        m01 * t20 + m11 * t21 + m21 * t22 + m31 * t23,
        m02 * t20 + m12 * t21 + m22 * t22 + m32 * t23,
        m03 * t20 + m13 * t21 + m23 * t22 + m33 * t23,
        m00 * t30 + m10 * t31 + m20 * t32 + m30 * t33,
        m01 * t30 + m11 * t31 + m21 * t32 + m31 * t33,
        m02 * t30 + m12 * t31 + m22 * t32 + m32 * t33,
        m03 * t30 + m13 * t31 + m23 * t32 + m33 * t33,
      )
    }

    return this
  }

  /**
   * Returns the determinant of this matrix.
   */
  determinant(): number {
    const [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33] = this

    const b0 = m00 * m11 - m01 * m10
    const b1 = m00 * m12 - m02 * m10
    const b2 = m01 * m12 - m02 * m11
    const b3 = m20 * m31 - m21 * m30
    const b4 = m20 * m32 - m22 * m30
    const b5 = m21 * m32 - m22 * m31
    const b6 = m00 * b5 - m01 * b4 + m02 * b3
    const b7 = m10 * b5 - m11 * b4 + m12 * b3
    const b8 = m20 * b2 - m21 * b1 + m22 * b0
    const b9 = m30 * b2 - m31 * b1 + m32 * b0

    return m13 * b6 - m03 * b7 + m33 * b8 - m23 * b9
  }

  /**
   * Transposes this matrix in place over its diagonal.
   */
  transpose(): this {
    const [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33] = this
    return this.set(m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33)
  }

  /**
   * Calculates the inverse of this matrix.
   */
  invert(): this {
    const [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33] = this

    const b00 = m00 * m11 - m01 * m10
    const b01 = m00 * m12 - m02 * m10
    const b02 = m00 * m13 - m03 * m10
    const b03 = m01 * m12 - m02 * m11
    const b04 = m01 * m13 - m03 * m11
    const b05 = m02 * m13 - m03 * m12
    const b06 = m20 * m31 - m21 * m30
    const b07 = m20 * m32 - m22 * m30
    const b08 = m20 * m33 - m23 * m30
    const b09 = m21 * m32 - m22 * m31
    const b10 = m21 * m33 - m23 * m31
    const b11 = m22 * m33 - m23 * m32

    // Make sure we're not dividing by zero
    const det = this.determinant()
    if (!det) return this

    return this.set(
      m11 * b11 - m12 * b10 + m13 * b09,
      m02 * b10 - m01 * b11 - m03 * b09,
      m31 * b05 - m32 * b04 + m33 * b03,
      m22 * b04 - m21 * b05 - m23 * b03,
      m12 * b08 - m10 * b11 - m13 * b07,
      m00 * b11 - m02 * b08 + m03 * b07,
      m32 * b02 - m30 * b05 - m33 * b01,
      m20 * b05 - m22 * b02 + m23 * b01,
      m10 * b10 - m11 * b08 + m13 * b06,
      m01 * b08 - m00 * b10 - m03 * b06,
      m30 * b04 - m31 * b02 + m33 * b00,
      m21 * b02 - m20 * b04 - m23 * b00,
      m11 * b07 - m10 * b09 - m12 * b06,
      m00 * b09 - m01 * b07 + m02 * b06,
      m31 * b01 - m30 * b03 - m32 * b00,
      m20 * b03 - m21 * b01 + m22 * b00,
    ).multiply(1 / det)
  }

  /**
   * Calculates a perspective projection matrix.
   */
  perspective(fov: number, aspect: number, near: number, far: number): this {
    const fovRad = fov * (PI / 180)
    const f = 1 / tan(fovRad / 2)
    const depth = 1 / (near - far)

    return this.set(f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * depth, -1, 0, 0, 2 * far * near * depth, 0)
  }

  /**
   * Calculates an orthographic projection matrix.
   */
  orthogonal(left: number, right: number, bottom: number, top: number, near: number, far: number): this {
    const horizontal = 1 / (left - right)
    const vertical = 1 / (bottom - top)
    const depth = 1 / (near - far)

    return this.set(
      -2 * horizontal,
      0,
      0,
      0,
      0,
      -2 * vertical,
      0,
      0,
      0,
      0,
      2 * depth,
      0,
      (left + right) * horizontal,
      (top + bottom) * vertical,
      (far + near) * depth,
      1,
    )
  }

  /**
   * Composes this matrix's elements from position, quaternion, and scale properties.
   */
  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
    const xx = 2 * quaternion.x * quaternion.x
    const xy = 2 * quaternion.y * quaternion.x
    const xz = 2 * quaternion.z * quaternion.x
    const yy = 2 * quaternion.y * quaternion.y
    const yz = 2 * quaternion.z * quaternion.y
    const zz = 2 * quaternion.z * quaternion.z
    const wx = 2 * quaternion.x * quaternion.w
    const wy = 2 * quaternion.y * quaternion.w
    const wz = 2 * quaternion.z * quaternion.w

    return this.set(
      (1 - (yy + zz)) * scale.x,
      (xy + wz) * scale.x,
      (xz - wy) * scale.x,
      0,
      (xy - wz) * scale.y,
      (1 - (xx + zz)) * scale.y,
      (yz + wx) * scale.y,
      0,
      (xz + wy) * scale.z,
      (yz - wx) * scale.z,
      (1 - (xx + yy)) * scale.z,
      0,
      position.x,
      position.y,
      position.z,
      1,
    )
  }

  /**
   * Calculates a normal matrix from a model-view matrix.
   */
  normal(m: Matrix4): this {
    const [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33] = m

    const b00 = m00 * m11 - m01 * m10
    const b01 = m00 * m12 - m02 * m10
    const b02 = m00 * m13 - m03 * m10
    const b03 = m01 * m12 - m02 * m11
    const b04 = m01 * m13 - m03 * m11
    const b05 = m02 * m13 - m03 * m12
    const b06 = m20 * m31 - m21 * m30
    const b07 = m20 * m32 - m22 * m30
    const b08 = m20 * m33 - m23 * m30
    const b09 = m21 * m32 - m22 * m31
    const b10 = m21 * m33 - m23 * m31
    const b11 = m22 * m33 - m23 * m32

    // Make sure we're not dividing by zero
    const det = m.determinant()
    if (!det) return this

    return this.set(
      m11 * b11 - m12 * b10 + m13 * b09,
      m02 * b10 - m01 * b11 - m03 * b09,
      m31 * b05 - m32 * b04 + m33 * b03,
      0,
      m12 * b08 - m10 * b11 - m13 * b07,
      m00 * b11 - m02 * b08 + m03 * b07,
      m32 * b02 - m30 * b05 - m33 * b01,
      0,
      m10 * b10 - m11 * b08 + m13 * b06,
      m01 * b08 - m00 * b10 - m03 * b06,
      m30 * b04 - m31 * b02 + m33 * b00,
      0,
      0,
      0,
      0,
      1,
    ).multiply(1 / det)
  }

  /**
   * Converts from a WebGL NDC space `[-1, 1]` to a WebGPU `[0, 1]` NDC space.
   */
  normalNDC(): this {
    this[8] += this[12] /= 2
    this[9] += this[13] /= 2
    this[10] += this[14] /= 2
    this[11] += this[15] /= 2

    return this
  }
}
