import { Vector3 } from './Vector3'
import { hypot, acos, sin, sqrt, EPSILON, ARRAY_TYPE, cos } from './_utils'

/**
 * Represents the components of a {@link Quaternion}.
 */
export type QuaternionTuple = [x: number, y: number, z: number, w: number]

/**
 * Calculates a quaternion with a defined rotation axis (x, y, z) and magnitude (w).
 */
export class Quaternion extends ARRAY_TYPE<number> {
  private _a = new Vector3()
  private _b = new Vector3()
  private _c = new Vector3()

  constructor(x = 0, y = 0, z = 0, w = 1) {
    super(4)
    this.set(x, y, z, w)
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

  get w(): number {
    return this[3]
  }

  set w(w) {
    this[3] = w
  }

  /**
   * Sets this quaternion's x, y, z, and w properties.
   */
  set(...q: QuaternionTuple): this {
    for (let i = 0; i < 4; i++) {
      this[i] = q[i]
    }

    return this
  }

  /**
   * Copies properties from another {@link Quaternion}.
   */
  copy(q: Quaternion): this {
    return this.set(...(q as unknown as QuaternionTuple))
  }

  /**
   * Resets to an identity quaternion.
   */
  identity(): this {
    return this.set(0, 0, 0, 1)
  }

  /**
   * Adds a scalar or {@link Quaternion}.
   */
  add(t: number | Quaternion): this {
    for (let i = 0; i < 4; i++) {
      this[i] += typeof t === 'number' ? t : t[i]
    }

    return this
  }

  /**
   * Subtracts a scalar or {@link Quaternion}.
   */
  sub(t: number | Quaternion): this {
    for (let i = 0; i < 4; i++) {
      this[i] -= typeof t === 'number' ? t : t[i]
    }

    return this
  }

  /**
   * Multiplies a scalar or {@link Quaternion}.
   */
  multiply(t: number | Quaternion): this {
    if (typeof t === 'number') {
      for (let i = 0; i < 4; i++) {
        this[i] *= t
      }
    } else {
      const [qx, qy, qz, qw] = this
      const [tx, ty, tz, tw] = t
      this.set(
        qx * tw + qw * tx + qy * tz - qz * ty,
        qy * tw + qw * ty + qz * tx - qx * tz,
        qz * tw + qw * tz + qx * ty - qy * tx,
        qw * tw - qx * tx - qy * ty - qz * tz,
      )
    }

    return this
  }

  /**
   * Divides a scalar or {@link Quaternion}.
   */
  divide(t: number | Quaternion): this {
    for (let i = 0; i < 4; i++) {
      this[i] /= typeof t === 'number' ? t : t[i]
    }

    return this
  }

  /**
   * Calculates the conjugate or inverse of this quaternion.
   */
  invert(): this {
    for (let i = 0; i < 4; i++) {
      this[i] *= -1
    }

    return this
  }

  /**
   * Returns the Euclidean length of this quaternion.
   */
  getLength(): number {
    return hypot(...this)
  }

  /**
   * Normalizes this quaternion.
   */
  normalize(): this {
    return this.divide(this.getLength() || 1)
  }

  /**
   * Calculates the dot product between another {@link Quaternion}.
   */
  dot(q: Quaternion): number {
    return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w
  }

  /**
   * Sets this quaternion's components from a Euler angle in radians (assumes XYZ order).
   */
  fromEuler(x: number, y: number, z: number): this {
    const sx = sin(x)
    const cx = cos(x)
    const sy = sin(y)
    const cy = cos(y)
    const sz = sin(z)
    const cz = cos(z)

    return this.set(
      sx * cy * cz + cx * sy * sz,
      cx * sy * cz - sx * cy * sz,
      cx * cy * sz + sx * sy * cz,
      cx * cy * cz - sx * sy * sz,
    )
  }

  /**
   * Slerps between another {@link Quaternion} with a given alpha — `t`.
   */
  slerp(q: Quaternion, t: number): this {
    let cosom = this.dot(q)
    if (cosom < 0) cosom *= -1

    let scale0 = 1 - t
    let scale1 = t

    if (1 - cosom > EPSILON) {
      const omega = acos(cosom)
      const sinom = sin(omega)
      scale0 = sin((1 - t) * omega) / sinom
      scale1 = sin(t * omega) / sinom
    }

    if (cosom < 0) scale1 *= -1

    return this.set(
      scale0 * this.x + scale1 * q.x,
      scale0 * this.y + scale1 * q.y,
      scale0 * this.z + scale1 * q.z,
      scale0 * this.w + scale1 * q.w,
    )
  }

  /**
   * Rotates this quaternion from `eye` to `target`, assuming `up` as world-space up.
   */
  lookAt(eye: Vector3, target: Vector3, up: Vector3): this {
    const z = this._a.copy(eye).sub(target)

    // eye and target are in the same position
    if (z.getLength() === 0) z.z = 1
    else z.normalize()

    const x = this._b.copy(up).cross(z)

    // up and z are parallel
    if (x.getLength() === 0) {
      const pup = this._c.copy(up)

      if (pup.z) pup.x += EPSILON
      else if (pup.y) pup.z += EPSILON
      else pup.y += EPSILON

      x.cross(pup)
    }
    x.normalize()

    const y = this._c.copy(z).cross(x)

    const [sm11, sm12, sm13] = x
    const [sm21, sm22, sm23] = y
    const [sm31, sm32, sm33] = z

    const trace = sm11 + sm22 + sm33

    if (trace > 0) {
      const S = sqrt(trace + 1) * 2
      return this.set((sm23 - sm32) / S, (sm31 - sm13) / S, (sm12 - sm21) / S, S / 4)
    } else if (sm11 > sm22 && sm11 > sm33) {
      const S = sqrt(1 + sm11 - sm22 - sm33) * 2
      return this.set(S / 4, (sm12 + sm21) / S, (sm31 + sm13) / S, (sm23 - sm32) / S)
    } else if (sm22 > sm33) {
      const S = sqrt(1 + sm22 - sm11 - sm33) * 2
      return this.set((sm12 + sm21) / S, S / 4, (sm23 + sm32) / S, (sm31 - sm13) / S)
    } else {
      const S = sqrt(1 + sm33 - sm11 - sm22) * 2
      return this.set((sm31 + sm13) / S, (sm23 + sm32) / S, S / 4, (sm12 - sm21) / S)
    }
  }
}
