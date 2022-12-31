import { Matrix4 } from './Matrix4'
import { Quaternion } from './Quaternion'
import { Vector3 } from './Vector3'

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
  readonly matrix = new Matrix4()
  /**
   * Local quaternion for this object and its descendants. Default is `0, 0, 0, 1`.
   */
  readonly quaternion = new Quaternion()
  /**
   * Local position for this object and its descendants. Default is `0, 0, 0`.
   */
  readonly position = new Vector3()
  /**
   * Local scale for this object and its descendants. Default is `1, 1, 1`.
   */
  readonly scale = new Vector3(1, 1, 1)
  /**
   * Used to orient the object when using the `lookAt` method. Default is `0, 1, 0`.
   */
  readonly up = new Vector3(0, 1, 0)
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
   * Whether to cull from rendering when out of view of a camera, if able. Default is `true`.
   */
  public frustumCulled = true

  /**
   * Rotates to face a point in world space.
   */
  lookAt(target: Vector3): void {
    this.quaternion.lookAt(this.position, target, this.up)
  }

  /**
   * Used internally to calculate matrix transforms.
   */
  updateMatrix(): void {
    if (this.matrixAutoUpdate) {
      this.matrix.compose(this.position, this.quaternion, this.scale)
      if (this.parent) this.matrix.multiply(this.parent.matrix)
      for (const child of this.children) child.updateMatrix()
    }
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
