import type { Quaternion } from './Quaternion'
import type { Matrix4 } from './Matrix4'
import { ARRAY_TYPE, hypot, sqrt } from './_shared'

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
    return hypot(this.x, this.y, this.z)
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
    const x = this.x - v.x
    const y = this.x - v.y
    const z = this.x - v.z
    return sqrt(x * x + y * y + z * z)
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
    const w = m[3] * this.x + m[7] * this.y + m[11] * this.z + m[15] || 1

    return this.set(
      m[0] * this.x + m[4] * this.y + m[8] * this.z + m[12],
      m[1] * this.x + m[5] * this.y + m[9] * this.z + m[13],
      m[2] * this.x + m[6] * this.y + m[10] * this.z + m[14],
    ).divide(w)
  }
}
