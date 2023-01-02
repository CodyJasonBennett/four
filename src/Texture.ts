/**
 * Represents a texture image source.
 */
export type ImageRepresentation = ImageBitmap | HTMLCanvasElement | HTMLVideoElement | OffscreenCanvas

/**
 * Represents a texture texel filter.
 */
export type TextureFilter = 'nearest' | 'linear'

/**
 * Represents a texture wrapping mode.
 */
export type TextureWrapping = 'clamp' | 'repeat' | 'mirror'

/**
 * Texture constructor parameters. Accepts an image source and various filtering options.
 */
export interface TextureOptions {
  /**
   * An image source to set this texture to.
   */
  image: ImageRepresentation
  /**
   * How to sample when a texel is more than 1 pixel. Default is `nearest`.
   */
  magFilter: TextureFilter
  /**
   * How to sample when a texel is less than 1 pixel. Default is `nearest`.
   */
  minFilter: TextureFilter
  /**
   * Horizontal UV wrapping. Default is `clamp`.
   */
  wrapS: TextureWrapping
  /**
   * Vertical UV wrapping. Default is `clamp`.
   */
  wrapT: TextureWrapping
  /**
   * Number of samples for anisotropic filtering. Eliminates aliasing at oblique angles. Default is `1`.
   */
  anisotropy: number
  /**
   * Internal texture format. Default is `GL_RGBA`.
   */
  format: number
  /**
   * Internal texture type. Default is `GL_UNSIGNED_BYTE`.
   */
  type: number
  /**
   * Flags the texture for update. Default is `true`.
   */
  needsUpdate: boolean
}

/**
 * Constructs a texture. Useful for displaying and storing image data.
 */
export class Texture {
  public image?: ImageRepresentation
  public magFilter: TextureFilter = 'nearest'
  public minFilter: TextureFilter = 'nearest'
  public wrapS: TextureWrapping = 'clamp'
  public wrapT: TextureWrapping = 'clamp'
  public anisotropy = 1
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
