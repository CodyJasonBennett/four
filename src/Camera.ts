import { mat4 } from 'gl-matrix'
import { Object3D } from './Object3D'

/**
 * Constructs a camera object implementing a perspective matrix.
 */
export class Camera extends Object3D {
  /**
   * A projection matrix. Useful for projecting transforms.
   */
  readonly projectionMatrix = mat4.create()
  /**
   * A camera inverse matrix. Useful for aligning transforms with the camera.
   */
  readonly viewMatrix = mat4.create()

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

    if (this.matrixAutoUpdate) {
      mat4.perspectiveNO(this.projectionMatrix, this.fov * (Math.PI / 180), this.aspect, this.near, this.far)
      mat4.copy(this.viewMatrix, this.matrix)
      mat4.invert(this.viewMatrix, this.viewMatrix)
    }
  }
}
