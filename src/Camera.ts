import { Object3D } from './Object3D'
import { Matrix4 } from './Matrix4'

/**
 * Constructs a camera object implementing a perspective matrix.
 */
export class Camera extends Object3D {
  /**
   * A projection matrix. Useful for projecting transforms.
   */
  readonly projectionMatrix = new Matrix4()
  /**
   * A camera inverse matrix. Useful for aligning transforms with the camera.
   */
  readonly viewMatrix = new Matrix4()

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

    if (this.matrixAutoUpdate) this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far)
    this.viewMatrix.copy(this.matrix).invert()
  }
}
