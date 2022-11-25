/**
 * Represents a texture image source.
 */
export type ImageRepresentation = ImageBitmap | HTMLCanvasElement | ImageData | HTMLImageElement | HTMLVideoElement

/**
 * Constructs a texture. Useful for displaying and storing image data.
 */
export class Texture {
  /**
   * Flags the texture for update. Default is `true`.
   */
  public needsUpdate = true

  constructor(
    /**
     * An image source to set this texture to.
     */
    public image?: ImageRepresentation,
  ) {}
}
