/**
 * Represents a texel filter.
 */
export type Filter = 'nearest' | 'linear'

/**
 * Represents a wrapping mode.
 */
export type Wrapping = 'clamp' | 'repeat' | 'mirror'

/**
 * Sampler constructor parameters. Accepts various filtering options.
 */
export interface SamplerOptions {
  /**
   * How to sample when a texel is more than 1 pixel. Default is `nearest`.
   */
  magFilter: Filter
  /**
   * How to sample when a texel is less than 1 pixel. Default is `nearest`.
   */
  minFilter: Filter
  /**
   * Horizontal UV wrapping. Default is `clamp`.
   */
  wrapS: Wrapping
  /**
   * Vertical UV wrapping. Default is `clamp`.
   */
  wrapT: Wrapping
  /**
   * Number of samples for anisotropic filtering. Reduces aliasing at oblique angles. Default is `1`.
   */
  anisotropy: number
  /**
   * Flags this sampler for update. Default is `true`.
   */
  needsUpdate: boolean
  /**
   * Whether to generate mipmaps for increased perceived quality (WebGL only). Default is `true`.
   *
   * **Note**: this is not implemented in WebGPU. See https://github.com/gpuweb/gpuweb/issues/386.
   */
  generateMipmaps: boolean
}

/**
 * Constructs a Sampler. Useful for configuring texel filtering and transforms.
 */
export class Sampler implements SamplerOptions {
  public magFilter: Filter = 'nearest'
  public minFilter: Filter = 'nearest'
  public wrapS: Wrapping = 'clamp'
  public wrapT: Wrapping = 'clamp'
  public anisotropy: number = 1
  public generateMipmaps: boolean = true
  public needsUpdate: boolean = true

  constructor(options?: Partial<SamplerOptions>) {
    if (options) Object.assign(this, options)
  }
}
