export const ARRAY_TYPE = Array
export const EPSILON = 1e-6

export const PI = Math.PI
export const tan = Math.tan
export const hypot = Math.hypot
export const acos = Math.acos
export const sin = Math.sin
export const cos = Math.cos
export const sqrt = Math.sqrt
export const min = Math.min
export const max = Math.max
export const floor = Math.floor

/**
 * A collection of disposable objects and their compiled GPU resource.
 */
export class Compiled<K extends object, V> extends WeakMap<K, V> {
  // @ts-ignore
  set<T extends K & { dispose?: never }>(object: T, compiled: V): void
  // @ts-ignore
  set<T extends K & { dispose(): void }>(object: T, compiled: V, dispose: () => void): void
  // @ts-ignore
  set<T extends K & { dispose: never | (() => void) }>(object: T, compiled: V, dispose?: () => void): void {
    super.set(object, compiled)

    if (dispose) {
      const prevDispose = object.dispose.bind(object)
      object.dispose = (): void => {
        dispose()
        ;(object.dispose = prevDispose)()
        this.delete(object)
      }
    }
  }
}
