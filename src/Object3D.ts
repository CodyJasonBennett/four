import { mat4, quat, vec3 } from 'gl-matrix'

/**
 * Represents an Object3D traversal callback.
 */
export type TraverseCallback = (object: Object3D) => boolean | void

/**
 * Constructs a 3D object. Useful for calculating transform matrices.
 */
export class Object3D {
  /**
   * Combined transforms of the object in world space.
   */
  readonly matrix = mat4.create()
  /**
   * Local quaternion for this object and its descendants. Default is `0, 0, 0, 1`.
   */
  readonly quaternion = quat.create()
  /**
   * Local position for this object and its descendants. Default is `0, 0, 0`.
   */
  readonly position = vec3.create()
  /**
   * Local scale for this object and its descendants. Default is `1, 1, 1`.
   */
  readonly scale = vec3.set(vec3.create(), 1, 1, 1)
  /**
   * Used to orient the object when using the `lookAt` method. Default is `0, 1, 0`.
   */
  readonly up = vec3.set(vec3.create(), 0, 1, 0)
  /**
   * An array of child objects in the scene graph.
   */
  readonly children: Object3D[] = []
  /**
   * The current parent in the scene graph. Default is `null`.
   */
  public parent: Object3D | null = null
  /**
   * Whether to automatically update transform matrices for this object and its descendants. Default is `true`.
   */
  public matrixAutoUpdate = true
  /**
   * Whether object should be rendered. Default is `true`.
   */
  public visible = true

  /**
   * Rotates to face a point in world space.
   */
  lookAt(target: vec3): void {
    mat4.lookAt(this.matrix, this.position, target, this.up)
    mat4.getRotation(this.quaternion, this.matrix)
  }

  /**
   * Used internally to calculate matrix transforms.
   */
  updateMatrix(): void {
    if (this.matrixAutoUpdate)
      mat4.fromRotationTranslationScale(this.matrix, this.quaternion, this.position, this.scale)
    if (this.parent) mat4.multiply(this.matrix, this.matrix, this.parent.matrix)
    for (const child of this.children) child.updateMatrix()
  }

  /**
   * Adds objects as children.
   */
  add(...children: Object3D[]): void {
    for (const child of children) {
      this.children.push(child)
      child.parent = this
    }
  }

  /**
   * Removes objects as children.
   */
  remove(...children: Object3D[]): void {
    for (const child of children) {
      const childIndex = this.children.indexOf(child)
      if (childIndex !== -1) this.children.splice(childIndex, 1)
      child.parent = null
    }
  }

  /**
   * Traverses through children and executes a callback. Return `true` to stop traversing.
   */
  traverse(callback: TraverseCallback): void {
    if (callback(this)) return
    for (const child of this.children) child.traverse(callback)
  }
}
