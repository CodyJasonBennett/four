import { Camera } from './Camera'

/**
 * Constructs a camera with a perspective projection. Useful for 3D rendering.
 */
export class PerspectiveCamera extends Camera {
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
  }
}
