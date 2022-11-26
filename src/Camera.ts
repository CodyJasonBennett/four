import { Object3D } from './Object3D'
import { Matrix4 } from './Matrix4'
import type { Mesh } from './Mesh'

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
  readonly planes: number[] = []

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
    this.updateFrustum()
  }

  /**
   * Updates camera's frustum planes.
   */
  updateFrustum(): void {
    const [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33] = this.projectionViewMatrix
      .copy(this.projectionMatrix)
      .multiply(this.viewMatrix)

    // http://cs.otago.ac.nz/postgrads/alexis/planeExtraction.pdf
    this.planes.splice(
      0,
      24,
      // Left clipping plane
      m03 - m00,
      m13 - m10,
      m23 - m20,
      m33 - m30,
      // Right clipping plane
      m03 + m00,
      m13 + m10,
      m23 + m20,
      m33 + m30,
      // Top clipping plane
      m03 + m01,
      m13 + m11,
      m23 + m21,
      m33 + m31,
      // Bottom clipping plane
      m03 - m01,
      m13 - m11,
      m23 - m21,
      m33 - m31,
      // Near clipping plane
      m03 - m02,
      m13 - m12,
      m23 - m22,
      m33 - m32,
      // Far clipping plane
      m03 + m02,
      m13 + m12,
      m23 + m22,
      m33 + m32,
    )
  }

  /**
   * Checks whether a mesh is in view.
   */
  frustumContains(mesh: Mesh): boolean {
    const { position } = mesh.geometry.attributes
    const vertices = position.data.length / position.size

    let radius = 0

    for (let i = 0; i < vertices; i += position.size) {
      let vertexLengthSquared = 0
      for (let vi = i; vi < i + position.size; vi++) vertexLengthSquared += position.data[vi] ** 2
      radius = Math.max(radius, Math.sqrt(vertexLengthSquared))
    }

    radius *= Math.max(...mesh.scale)

    for (let i = 0; i < 6; i++) {
      const offset = i * 4
      const distance =
        this.planes[offset] * mesh.matrix[12] +
        this.planes[offset + 1] * mesh.matrix[13] +
        this.planes[offset + 2] * mesh.matrix[14] +
        this.planes[offset + 3]

      if (distance <= -radius) return false
    }

    return true
  }
}
