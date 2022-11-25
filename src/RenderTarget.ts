import { Texture } from './Texture'

/**
 * Constructs a render target to draw into.
 */
export class RenderTarget {
  /**
   * A {@link Texture} array to write color attachments to.
   */
  readonly textures: Texture[]
  /**
   * Used internally to flag for update on resize. Default is `true`.
   */
  public needsUpdate = true

  constructor(
    /**
     * Drawing buffer width.
     */
    public width: number,
    /**
     * Drawing buffer height.
     */
    public height: number,
    /**
     * Number of color attachments to create. Default is `1`.
     */
    readonly count: number = 1,
  ) {
    this.textures = Array.from({ length: count }, () => new Texture())
  }

  /**
   * Resizes the render target and its attachments.
   */
  setSize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.needsUpdate = true
  }
}
