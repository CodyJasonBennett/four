import { Camera } from './Camera'

/**
 * Constructs a camera with an orthographic projection. Useful for 2D and isometric rendering.
 */
export class OrthographicCamera extends Camera {
  constructor(
    /** Frustum near plane (minimum). Default is `0.1` */
    public near = 0.1,
    /** Frustum far plane (maximum). Default is `1000` */
    public far = 1000,
    /** Frustum left plane. Default is `-1` */
    public left = -1,
    /** Frustum right plane. Default is `1` */
    public right = 1,
    /** Frustum bottom plane. Default is `-1` */
    public bottom = -1,
    /** Frustum top plane. Default is `1` */
    public top = 1,
  ) {
    super()
  }

  updateMatrix(): void {
    super.updateMatrix()
    if (this.matrixAutoUpdate)
      this.projectionMatrix.orthogonal(this.left, this.right, this.bottom, this.top, this.near, this.far)
  }
}
