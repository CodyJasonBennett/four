import { Sampler } from './Sampler'

/**
 * Represents a texture image source.
 */
export type ImageRepresentation = ImageBitmap | HTMLCanvasElement | HTMLVideoElement | OffscreenCanvas

/**
 * Texture constructor parameters. Accepts an image source and various data options.
 */
export interface TextureOptions {
  /**
   * An image source to set this texture to.
   */
  image: ImageRepresentation
  /**
   * An optional sampler object to configure texel filtering and transforms.
   */
  sampler: Sampler
  /**
   * Internal texture format. Default is `GL_RGBA`.
   */
  format: number
  /**
   * Internal texture type. Default is `GL_UNSIGNED_BYTE`.
   */
  type: number
  /**
   * Flags this texture for update. Default is `true`.
   */
  needsUpdate: boolean
}

/**
 * Constructs a texture. Useful for displaying and storing image data.
 */
export class Texture {
  public image?: ImageRepresentation
  public sampler = new Sampler()
  public format?: number
  public type?: number
  public needsUpdate = true

  constructor(options?: Partial<TextureOptions>) {
    if (options) Object.assign(this, options)
  }

  /**
   * Disposes texture from GPU memory.
   */
  dispose(): void {
    // Implemented by renderer
  }
}
