import type { Vector3 } from './Vector3'
import type { Quaternion } from './Quaternion'

/**
 * Calculates a 4x4 matrix.
 */
export class Matrix4 extends Array {
  constructor(
    m00 = 1,
    m01 = 0,
    m02 = 0,
    m03 = 0,
    m10 = 0,
    m11 = 1,
    m12 = 0,
    m13 = 0,
    m20 = 0,
    m21 = 0,
    m22 = 1,
    m23 = 0,
    m30 = 0,
    m31 = 0,
    m32 = 0,
    m33 = 1,
  ) {
    super(16)
    this.set(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33)
  }

  /**
   * Sets this matrix's elements.
   */
  set(
    ...m: [
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
  ): this {
    for (let i = 0; i < 16; i++) {
      this[i] = m[i]
    }

    return this
  }

  /**
   * Copies properties from another {@link Matrix4}.
   */
  copy(m: Matrix4): this {
    return this.set(
      ...(m as unknown as [
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
      ]),
    )
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
      this.set(
        this[0] * t[0] + this[4] * t[1] + this[8] * t[2] + this[12] * t[3],
        this[1] * t[0] + this[5] * t[1] + this[9] * t[2] + this[13] * t[3],
        this[2] * t[0] + this[6] * t[1] + this[10] * t[2] + this[14] * t[3],
        this[3] * t[0] + this[7] * t[1] + this[11] * t[2] + this[15] * t[3],
        this[0] * t[4] + this[4] * t[5] + this[8] * t[6] + this[12] * t[7],
        this[1] * t[4] + this[5] * t[5] + this[9] * t[6] + this[13] * t[7],
        this[2] * t[4] + this[6] * t[5] + this[10] * t[6] + this[14] * t[7],
        this[3] * t[4] + this[7] * t[5] + this[11] * t[6] + this[15] * t[7],
        this[0] * t[8] + this[4] * t[9] + this[8] * t[10] + this[12] * t[11],
        this[1] * t[8] + this[5] * t[9] + this[9] * t[10] + this[13] * t[11],
        this[2] * t[8] + this[6] * t[9] + this[10] * t[10] + this[14] * t[11],
        this[3] * t[8] + this[7] * t[9] + this[11] * t[10] + this[15] * t[11],
        this[0] * t[12] + this[4] * t[13] + this[8] * t[14] + this[12] * t[15],
        this[1] * t[12] + this[5] * t[13] + this[9] * t[14] + this[13] * t[15],
        this[2] * t[12] + this[6] * t[13] + this[10] * t[14] + this[14] * t[15],
        this[3] * t[12] + this[7] * t[13] + this[11] * t[14] + this[15] * t[15],
      )
    }

    return this
  }

  /**
   * Returns the determinant of this matrix.
   */
  determinant(): number {
    const b0 = this[0] * this[5] - this[1] * this[4]
    const b1 = this[0] * this[6] - this[2] * this[4]
    const b2 = this[1] * this[6] - this[2] * this[5]
    const b3 = this[8] * this[13] - this[9] * this[12]
    const b4 = this[8] * this[14] - this[10] * this[12]
    const b5 = this[9] * this[14] - this[10] * this[13]
    const b6 = this[0] * b5 - this[1] * b4 + this[2] * b3
    const b7 = this[4] * b5 - this[5] * b4 + this[6] * b3
    const b8 = this[8] * b2 - this[9] * b1 + this[10] * b0
    const b9 = this[12] * b2 - this[13] * b1 + this[14] * b0

    return this[7] * b6 - this[3] * b7 + this[15] * b8 - this[11] * b9
  }

  /**
   * Transposes this matrix in place over its diagonal.
   */
  transpose(): this {
    return this.set(
      this[0],
      this[4],
      this[8],
      this[12],
      this[1],
      this[5],
      this[9],
      this[13],
      this[2],
      this[6],
      this[10],
      this[14],
      this[3],
      this[7],
      this[11],
      this[15],
    )
  }

  /**
   * Calculates the inverse of this matrix.
   */
  invert(): this {
    const b00 = this[0] * this[5] - this[1] * this[4]
    const b01 = this[0] * this[6] - this[2] * this[4]
    const b02 = this[0] * this[7] - this[3] * this[4]
    const b03 = this[1] * this[6] - this[2] * this[5]
    const b04 = this[1] * this[7] - this[3] * this[5]
    const b05 = this[2] * this[7] - this[3] * this[6]
    const b06 = this[8] * this[13] - this[9] * this[12]
    const b07 = this[8] * this[14] - this[10] * this[12]
    const b08 = this[8] * this[15] - this[11] * this[12]
    const b09 = this[9] * this[14] - this[10] * this[13]
    const b10 = this[9] * this[15] - this[11] * this[13]
    const b11 = this[10] * this[15] - this[11] * this[14]

    // Make sure we're not dividing by zero
    const det = this.determinant()
    if (!det) return this

    const invDet = 1 / det

    return this.set(
      this[5] * b11 - this[6] * b10 + this[7] * b09,
      this[2] * b10 - this[1] * b11 - this[3] * b09,
      this[13] * b05 - this[14] * b04 + this[15] * b03,
      this[10] * b04 - this[9] * b05 - this[11] * b03,
      this[6] * b08 - this[4] * b11 - this[7] * b07,
      this[0] * b11 - this[2] * b08 + this[3] * b07,
      this[14] * b02 - this[12] * b05 - this[15] * b01,
      this[8] * b05 - this[10] * b02 + this[11] * b01,
      this[4] * b10 - this[5] * b08 + this[7] * b06,
      this[1] * b08 - this[0] * b10 - this[3] * b06,
      this[12] * b04 - this[13] * b02 + this[15] * b00,
      this[9] * b02 - this[8] * b04 - this[11] * b00,
      this[5] * b07 - this[4] * b09 - this[6] * b06,
      this[0] * b09 - this[1] * b07 + this[2] * b06,
      this[13] * b01 - this[12] * b03 - this[14] * b00,
      this[8] * b03 - this[9] * b01 + this[10] * b00,
    ).multiply(invDet)
  }

  /**
   * Calculates a perspective projection matrix.
   *
   * Accepts a `normalized` argument, when `true` creates an WebGL `[-1, 1]` clipping space, and when `false` creates a WebGPU `[0, 1]` clipping space.
   */
  perspective(fov: number, aspect: number, near: number, far: number, normalized: boolean): this {
    const fovRad = fov * (Math.PI / 180)
    const f = 1 / Math.tan(fovRad / 2)
    const depth = 1 / (near - far)

    this[0] = f / aspect
    this[1] = 0
    this[2] = 0
    this[3] = 0
    this[4] = 0
    this[5] = f
    this[6] = 0
    this[7] = 0
    this[8] = 0
    this[9] = 0
    this[11] = -1
    this[12] = 0
    this[13] = 0
    this[15] = 0

    if (normalized) {
      this[10] = (far + near) * depth
      this[14] = 2 * far * near * depth
    } else {
      this[10] = far * depth
      this[14] = far * near * depth
    }

    return this
  }

  /**
   * Calculates an orthographic projection matrix.
   *
   * Accepts a `normalized` argument, when `true` creates an WebGL `[-1, 1]` clipping space, and when `false` creates a WebGPU `[0, 1]` clipping space.
   */
  orthogonal(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
    normalized: boolean,
  ): this {
    const horizontal = 1 / (left - right)
    const vertical = 1 / (bottom - top)
    const depth = 1 / (near - far)

    this[0] = -2 * horizontal
    this[1] = 0
    this[2] = 0
    this[3] = 0
    this[4] = 0
    this[5] = -2 * vertical
    this[6] = 0
    this[7] = 0
    this[8] = 0
    this[9] = 0
    this[11] = 0
    this[12] = (left + right) * horizontal
    this[13] = (top + bottom) * vertical
    this[15] = 1

    if (normalized) {
      this[10] = 2 * depth
      this[14] = (far + near) * depth
    } else {
      this[10] = depth
      this[14] = near * depth
    }

    return this
  }

  /**
   * Composes this matrix's elements from position, quaternion, and scale properties.
   */
  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
    const xx = quaternion.x * (quaternion.x + quaternion.x)
    const xy = quaternion.x * (quaternion.y + quaternion.y)
    const xz = quaternion.x * (quaternion.z + quaternion.z)
    const yy = quaternion.y * (quaternion.y + quaternion.y)
    const yz = quaternion.y * (quaternion.z + quaternion.z)
    const zz = quaternion.z * (quaternion.z + quaternion.z)
    const wx = quaternion.w * (quaternion.x + quaternion.x)
    const wy = quaternion.w * (quaternion.y + quaternion.y)
    const wz = quaternion.w * (quaternion.z + quaternion.z)

    this[0] = (1 - (yy + zz)) * scale.x
    this[1] = (xy + wz) * scale.x
    this[2] = (xz - wy) * scale.x
    this[3] = 0
    this[4] = (xy - wz) * scale.y
    this[5] = (1 - (xx + zz)) * scale.y
    this[6] = (yz + wx) * scale.y
    this[7] = 0
    this[8] = (xz + wy) * scale.z
    this[9] = (yz - wx) * scale.z
    this[10] = (1 - (xx + yy)) * scale.z
    this[11] = 0
    this[12] = position.x
    this[13] = position.y
    this[14] = position.z
    this[15] = 1

    return this
  }

  /**
   * Calculates a normal matrix from a model-view matrix.
   */
  normal(m: Matrix4): this {
    const b00 = m[0] * m[5] - m[1] * m[4]
    const b01 = m[0] * m[6] - m[2] * m[4]
    const b02 = m[0] * m[7] - m[3] * m[4]
    const b03 = m[1] * m[6] - m[2] * m[5]
    const b04 = m[1] * m[7] - m[3] * m[5]
    const b05 = m[2] * m[7] - m[3] * m[6]
    const b06 = m[8] * m[13] - m[9] * m[12]
    const b07 = m[8] * m[14] - m[10] * m[12]
    const b08 = m[8] * m[15] - m[11] * m[12]
    const b09 = m[9] * m[14] - m[10] * m[13]
    const b10 = m[9] * m[15] - m[11] * m[13]
    const b11 = m[10] * m[15] - m[11] * m[14]

    // Make sure we're not dividing by zero
    const det = m.determinant()
    if (!det) return this

    const invDet = 1 / det

    return this.set(
      (m[5] * b11 - m[6] * b10 + m[7] * b09) * invDet,
      (m[2] * b10 - m[1] * b11 - m[3] * b09) * invDet,
      (m[13] * b05 - m[14] * b04 + m[15] * b03) * invDet,
      0,
      (m[6] * b08 - m[4] * b11 - m[7] * b07) * invDet,
      (m[0] * b11 - m[2] * b08 + m[3] * b07) * invDet,
      (m[14] * b02 - m[12] * b05 - m[15] * b01) * invDet,
      0,
      (m[4] * b10 - m[5] * b08 + m[7] * b06) * invDet,
      (m[1] * b08 - m[0] * b10 - m[3] * b06) * invDet,
      (m[12] * b04 - m[13] * b02 + m[15] * b00) * invDet,
      0,
      0,
      0,
      0,
      1,
    )
  }
}
