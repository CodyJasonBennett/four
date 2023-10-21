import { Sampler } from './Sampler'

/**
 * Represents a texture image source.
 */
export type ImageRepresentation =
  | ImageBitmap
  | ImageData
  | HTMLImageElement
  | HTMLVideoElement
  | VideoFrame
  | HTMLCanvasElement
  | OffscreenCanvas

/**
 * Constructs a texture. Useful for displaying and storing image data.
 */
export class Texture {
  constructor(
    /**
     * An image source to set this texture to.
     */
    public image?: ImageRepresentation,
    /**
     * An optional sampler object to configure texel filtering and transforms.
     */
    public sampler: Sampler = new Sampler(),
    /**
     * Internal texture format. Default is `GL_RGBA` or `bgra8unorm`.
     */
    public format?: number | GPUTextureFormat,
    /**
     * Internal texture type (WebGL only). Default is `GL_UNSIGNED_BYTE`.
     */
    public type?: number,
    /**
     * Flags this texture for update. Default is `true`.
     */
    public needsUpdate: boolean = true,
  ) {}

  /**
   * Disposes texture from GPU memory.
   */
  dispose(): void {
    // Implemented by renderer
  }
}
