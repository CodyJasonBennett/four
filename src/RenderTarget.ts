import { Sampler } from './Sampler'
import { Texture } from './Texture'
import { ARRAY_TYPE } from './_utils'

/**
 * Constructs a render target to draw into.
 */
export class RenderTarget {
  /**
   * A {@link Texture} array to write color attachments to.
   */
  readonly textures: Texture[]
  /**
   * A {@link Sampler} used for sampling texture attachments.
   */
  public sampler: Sampler = new Sampler({ generateMipmaps: false })
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
    this.textures = ARRAY_TYPE.from({ length: count }, () => new Texture(undefined, this.sampler))
  }

  /**
   * Resizes the render target and its attachments.
   */
  setSize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.needsUpdate = true
  }

  /**
   * Disposes render target from GPU memory.
   */
  dispose(): void {
    // Implemented by renderer
  }
}
