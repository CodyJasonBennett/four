import { Object3D } from './Object3D'
import { Matrix4 } from './Matrix4'

/**
 * Represents a camera clipping space.
 */
export type CameraClippingSpace = 'webgl' | 'webgpu'

/**
 * Constructs a camera object. Can be extended to calculate projection matrices.
 */
export class Camera extends Object3D {
  /**
   * A projection matrix. Useful for projecting transforms.
   */
  readonly projectionMatrix = new Matrix4()
  /**
   * A view matrix. Useful for aligning transforms with the camera.
   */
  readonly viewMatrix = new Matrix4()
  /**
   * Controls the camera's current clipping space.
   *
   * WebGL creates `[-1, 1]` clipping space, and WebGPU creates `[0, 1]` clipping space.
   */
  public clippingSpace: CameraClippingSpace = 'webgl'

  constructor(
    /** Vertical field of view in degrees. Default is `75` */
    public fov = 75,
    /** Frustum aspect ratio. Default is `1` */
    public aspect = 1,
    /** Frustum near plane (minimum). Default is `0.1` */
    public near = 0.1,
    /** Frustum far plane (maximum). Default is `1000` */
    public far = 1000,
  ) {
    super()
  }

  updateMatrix(): void {
    super.updateMatrix()
    this.viewMatrix.copy(this.matrix).invert()
  }
}
