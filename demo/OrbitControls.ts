import { vec3, quat } from 'gl-matrix'
import type { Camera } from 'four'

// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
enum BUTTONS {
  NONE = 0,
  LEFT = 1,
  RIGHT = 2,
}

const KEYBOARD_ZOOM_SPEED = 0.04
const KEYBOARD_MOVE_SPEED = Math.PI * 4

const _v = vec3.create()

/**
 * Orbital controls that revolve a camera around a point.
 */
export class OrbitControls {
  /** The center point to orbit around. Default is `0, 0, 0` */
  readonly center = vec3.create()
  /** The speed factor for panning and orbiting. Default is `1` */
  public speed = 1
  /** Whether to enable scroll to zoom. Default is `true` */
  public enableZoom = true
  /** Whether to enable camera panning. Default is `true` */
  public enablePan = true
  /** Whether to enable key controls. Default is `true` */
  public enableKeys = true
  /** Minimum zoom radius. Default is `0` */
  public minRadius = 0
  /** Maximum zoom radius. Default is `Infinity` */
  public maxRadius = Infinity
  /** Minimum theta (horizontal) angle. Default is `-Infinity` */
  public minTheta = -Infinity
  /** Maximum theta (horizontal) angle. Default is `Infinity` */
  public maxTheta = Infinity
  /** Minimum phi (vertical) angle. Default is `0` */
  public minPhi = 0
  /** Maximum phi (vertical) angle. Default is `Math.PI` */
  public maxPhi = Math.PI
  private _camera: Camera
  private _element: HTMLElement | null = null
  private _pointers = new Map<number, PointerEvent>()

  private get _focused(): boolean {
    return document.activeElement === this._element
  }

  constructor(camera: Camera) {
    this._camera = camera

    // Ensure methods don't descope and re-inherit `this`
    const properties = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
    for (const property of properties) {
      // @ts-ignore
      if (typeof this[property] === 'function') this[property] = this[property].bind(this)
    }
  }

  /**
   * Adjusts camera orbital zoom.
   */
  zoom(scale: number): void {
    const radius = vec3.length(vec3.sub(this._camera.position, this._camera.position, this.center))
    vec3.scale(
      this._camera.position,
      this._camera.position,
      scale * (Math.min(this.maxRadius, Math.max(this.minRadius, radius * scale)) / (radius * scale)),
    )
    vec3.add(this._camera.position, this._camera.position, this.center)
  }

  /**
   * Adjusts camera orbital position.
   */
  orbit(deltaX: number, deltaY: number): void {
    const offset = vec3.sub(this._camera.position, this._camera.position, this.center)
    const radius = vec3.length(offset)

    const deltaPhi = deltaY * (this.speed / this._element!.clientHeight)
    const deltaTheta = deltaX * (this.speed / this._element!.clientHeight)

    const phi = Math.min(this.maxPhi, Math.max(this.minPhi, Math.acos(offset[1] / radius) - deltaPhi)) || Number.EPSILON
    const theta =
      Math.min(this.maxTheta, Math.max(this.minTheta, Math.atan2(offset[2], offset[0]) + deltaTheta)) || Number.EPSILON

    vec3.set(this._camera.position, Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
    vec3.scale(this._camera.position, this._camera.position, radius)

    vec3.add(this._camera.position, this._camera.position, this.center)
    this._camera.lookAt(this.center)
    quat.invert(this._camera.quaternion, this._camera.quaternion)
  }

  /**
   * Adjusts orthogonal camera pan.
   */
  pan(deltaX: number, deltaY: number): void {
    vec3.sub(this._camera.position, this._camera.position, this.center)

    vec3.set(_v, -deltaX, deltaY, 0)
    vec3.transformQuat(_v, _v, this._camera.quaternion)
    vec3.scale(_v, _v, this.speed / this._element!.clientHeight)

    vec3.add(this.center, this.center, _v)
    vec3.add(this._camera.position, this._camera.position, this.center)
  }

  private _onContextMenu(event: MouseEvent): void {
    event.preventDefault()
  }

  private _onScroll(event: WheelEvent): void {
    if (!this.enableZoom || !this._focused) return

    event.preventDefault()
    this.zoom(1 + event.deltaY / 720)
  }

  private _onPointerMove(event: PointerEvent): void {
    if (!this._focused) return

    const prevPointer = this._pointers.get(event.pointerId)!
    if (prevPointer) {
      const deltaX = (event.pageX - prevPointer.pageX) / this._pointers.size
      const deltaY = (event.pageY - prevPointer.pageY) / this._pointers.size

      const type = event.pointerType === 'touch' ? this._pointers.size : event.buttons
      if (type === BUTTONS.LEFT) this.orbit(deltaX, deltaY)
      else if (type === BUTTONS.RIGHT && this.enablePan) this.pan(deltaX, deltaY)
    } else if (event.pointerType !== 'touch') {
      this._element!.setPointerCapture(event.pointerId)
    }

    this._pointers.set(event.pointerId, event)
  }

  private _onPointerUp(event: PointerEvent): void {
    this._element!.style.touchAction = this.enableZoom || this.enablePan ? 'none' : 'pinch-zoom'
    if (event.pointerType !== 'touch') this._element!.releasePointerCapture(event.pointerId)
    this._pointers.delete(event.pointerId)
  }

  private _onKeyDown(event: KeyboardEvent): void {
    if (!this.enableKeys) return

    const move = event.shiftKey && this.enablePan ? this.pan : this.orbit
    const moveModifier = event.ctrlKey ? 10 : 1

    switch (event.code) {
      case 'Minus':
        if (!event.ctrlKey || !this.enableZoom) return
        event.preventDefault()
        return this.zoom(1 + KEYBOARD_ZOOM_SPEED)
      case 'Equal':
        if (!event.ctrlKey || !this.enableZoom) return
        event.preventDefault()
        return this.zoom(1 - KEYBOARD_ZOOM_SPEED)
      case 'ArrowUp':
        event.preventDefault()
        return move(0, -KEYBOARD_MOVE_SPEED * moveModifier)
      case 'ArrowDown':
        event.preventDefault()
        return move(0, KEYBOARD_MOVE_SPEED * moveModifier)
      case 'ArrowLeft':
        event.preventDefault()
        return move(-KEYBOARD_MOVE_SPEED * moveModifier, 0)
      case 'ArrowRight':
        event.preventDefault()
        return move(KEYBOARD_MOVE_SPEED * moveModifier, 0)
    }
  }

  /**
   * Connects controls' event handlers, enabling interaction.
   */
  connect(element: HTMLElement): void {
    if (this._element) this.disconnect(this._element)
    element.addEventListener('contextmenu', this._onContextMenu)
    element.addEventListener('wheel', this._onScroll)
    element.addEventListener('pointermove', this._onPointerMove)
    element.addEventListener('pointerup', this._onPointerUp)
    element.addEventListener('keydown', this._onKeyDown)
    element.tabIndex = 0
    this._element = element
  }

  /**
   * Disconnects controls' event handlers, disabling interaction.
   */
  disconnect(element: HTMLElement): void {
    element.removeEventListener('contextmenu', this._onContextMenu)
    element.removeEventListener('wheel', this._onScroll)
    element.removeEventListener('pointermove', this._onPointerMove)
    element.removeEventListener('pointerup', this._onPointerUp)
    element.removeEventListener('keydown', this._onKeyDown)
    this._pointers.forEach(this._onPointerUp)
    element.style.touchAction = ''
    this._element = null
  }

  /**
   * Forcibly disconnects and disposes of the controls.
   */
  dispose(): void {
    if (this._element) this.disconnect(this._element)
  }
}
