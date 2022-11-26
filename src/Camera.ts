import { Object3D } from './Object3D'
import { Matrix4 } from './Matrix4'
import { Frustum } from './Frustum'

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
   * A projection-view matrix. Used internally for checking whether objects are in view.
   */
  readonly projectionViewMatrix = new Matrix4()
  /**
   * Frustum clipping planes. Used to calculate a frustum representation.
   */
  readonly frustum = new Frustum()

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
    this.projectionViewMatrix.copy(this.projectionMatrix).multiply(this.viewMatrix)
    this.frustum.fromMatrix4(this.projectionViewMatrix)
  }
}
