import type { Quaternion } from './Quaternion'
import type { Matrix4 } from './Matrix4'
import { ARRAY_TYPE, hypot } from './_utils'

/**
 * Represents the components of a {@link Vector3}.
 */
export type Vector3Tuple = [x: number, y: number, z: number]

/**
 * Calculates a three-dimensional (x, y, z) vector.
 */
export class Vector3 extends ARRAY_TYPE<number> {
  constructor(x = 0, y = 0, z = 0) {
    super(3)
    this.set(x, y, z)
  }

  get x(): number {
    return this[0]
  }

  set x(x) {
    this[0] = x
  }

  get y(): number {
    return this[1]
  }

  set y(y) {
    this[1] = y
  }

  get z(): number {
    return this[2]
  }

  set z(z) {
    this[2] = z
  }

  /**
   * Sets this vector's x, y, and z properties.
   */
  set(...v: Vector3Tuple): this {
    for (let i = 0; i < 3; i++) {
      this[i] = v[i]
    }

    return this
  }

  /**
   * Copies properties from another {@link Vector3}.
   */
  copy(v: Vector3): this {
    return this.set(...(v as unknown as Vector3Tuple))
  }

  /**
   * Adds a scalar or {@link Vector3}.
   */
  add(t: number | Vector3): this {
    for (let i = 0; i < 3; i++) {
      this[i] += typeof t === 'number' ? t : t[i]
    }

    return this
  }

  /**
   * Subtracts a scalar or {@link Vector3}.
   */
  sub(t: number | Vector3): this {
    for (let i = 0; i < 3; i++) {
      this[i] -= typeof t === 'number' ? t : t[i]
    }

    return this
  }

  /**
   * Multiplies a scalar or {@link Vector3}.
   */
  multiply(t: number | Vector3): this {
    for (let i = 0; i < 3; i++) {
      this[i] *= typeof t === 'number' ? t : t[i]
    }

    return this
  }

  /**
   * Divides a scalar of {@link Vector3}.
   */
  divide(t: number | Vector3): this {
    for (let i = 0; i < 3; i++) {
      this[i] /= typeof t === 'number' ? t : t[i]
    }

    return this
  }

  /**
   * Negates or calculates the inverse of this vector.
   */
  invert(): this {
    return this.multiply(-1)
  }

  /**
   * Calculates the Euclidean length of this vector.
   */
  getLength(): number {
    return hypot(...this)
  }

  /**
   * Normalizes this vector.
   */
  normalize(): this {
    return this.divide(this.getLength() || 1)
  }

  /**
   * Returns the distance from another {@link Vector3}.
   */
  distanceTo(v: Vector3): number {
    return hypot(this.x - v.x, this.y - v.y, this.z - v.z)
  }

  /**
   * Calculates the dot product between another {@link Vector3}.
   */
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  /**
   * Calculates the cross product between another {@link Vector3}.
   */
  cross(v: Vector3): this {
    return this.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x)
  }

  /**
   * Lerps between another {@link Vector3} with a given alpha — `t`.
   */
  lerp(v: Vector3, t: number): this {
    return this.set(v.x - this.x, v.y - this.y, v.z - this.z).multiply(t)
  }

  /**
   * Applies rotations from a {@link Quaternion} to this vector.
   */
  applyQuaternion(q: Quaternion): this {
    // Calculate quat * vector
    const ix = q.w * this.x + q.y * this.z - q.z * this.y
    const iy = q.w * this.y + q.z * this.x - q.x * this.z
    const iz = q.w * this.z + q.x * this.y - q.y * this.x
    const iw = -q.x * this.x - q.y * this.y - q.z * this.z

    // Calculate result * inverse quat
    return this.set(
      ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
      iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
      iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
    )
  }

  /**
   * Applies transforms from a {@link Matrix4} to this vector.
   */
  applyMatrix4(m: Matrix4): this {
    const [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33] = m

    return this.set(
      m00 * this.x + m10 * this.y + m20 * this.z + m30,
      m01 * this.x + m11 * this.y + m21 * this.z + m31,
      m02 * this.x + m12 * this.y + m22 * this.z + m32,
    ).divide(m03 * this.x + m13 * this.y + m23 * this.z + m33 || 1)
  }
}
