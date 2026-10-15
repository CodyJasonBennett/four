class Queue {
  private activeCount = 0
  private queue: (() => void)[] = []

  constructor(private maxConcurrent: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve))
    }
    this.activeCount++
    try {
      return await task()
    } finally {
      this.activeCount--
      this.queue.shift()?.()
    }
  }
}

const networkQueue = new Queue(15)

function batchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return networkQueue.run(() => fetch(input, init))
}

const enum GL {
  BYTE = 5120,
  UNSIGNED_BYTE = 5121,
  SHORT = 5122,
  UNSIGNED_SHORT = 5123,
  UNSIGNED_INT = 5125,
  FLOAT = 5126,
}

export type GLTFComponentType = GL.BYTE | GL.UNSIGNED_BYTE | GL.SHORT | GL.UNSIGNED_SHORT | GL.UNSIGNED_INT | GL.FLOAT
export type GLTFType = 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT4'

export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Uint32Array | Float32Array
export type TypedArrayConstructor = { new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): TypedArray }

export interface TextureInfo {
  index: number
  texCoord?: number
}

// TODO: meshopt compression
export interface GLTF {
  asset: {
    version: '2.0'
    generator?: string
  }

  buffers: {
    byteLength: number
    uri?: string
  }[]

  bufferViews: {
    buffer: number
    byteOffset?: number
    byteLength: number
    byteStride?: number
    target?: number // ARRAY_BUFFER / ELEMENT_ARRAY_BUFFER
  }[]

  accessors: {
    bufferView: number
    byteOffset?: number
    componentType: GLTFComponentType
    count: number
    type: GLTFType
    normalized?: boolean
    min?: number[]
    max?: number[]
  }[]

  meshes?: {
    name?: string
    primitives: {
      attributes: Record<string, number> // POSITION, NORMAL, TEXCOORD_0
      indices?: number
      material?: number
      mode?: number // TRIANGLES = 4
      targets?: Record<string, number>[] // morph targets
    }[]
  }[]

  nodes?: {
    name?: string
    mesh?: number
    children?: number[]
    translation?: [number, number, number]
    rotation?: [number, number, number, number]
    scale?: [number, number, number]
    matrix?: number[] // 16 elements
  }[]

  scenes?: {
    name?: string
    nodes: number[]
  }[]

  scene?: number

  materials?: {
    name?: string
    pbrMetallicRoughness?: {
      baseColorFactor?: [number, number, number, number]
      baseColorTexture?: TextureInfo
      metallicFactor?: number
      roughnessFactor?: number
      metallicRoughnessTexture?: TextureInfo
    }
    normalTexture?: TextureInfo & { scale?: number }
    occlusionTexture?: TextureInfo & { strength?: number }
    emissiveTexture?: TextureInfo
    emissiveFactor?: [number, number, number]
    alphaMode?: 'OPAQUE' | 'MASK' | 'BLEND'
    alphaCutoff?: number
    doubleSided?: boolean
    extensions?: Record<string, { emissiveStrength?: number }>
  }[]

  textures?: {
    sampler?: number
    source?: number
    name?: string
    extensions?: {
      EXT_texture_webp?: {
        source: number
      }
    }
  }[]

  samplers?: {
    magFilter?: number
    minFilter?: number
    wrapS?: number
    wrapT?: number
  }[]

  images?: {
    uri?: string
    bufferView?: number
    mimeType?: string
    name?: string
  }[]

  extensionsUsed?: string[]
  extensionsRequired?: string[]
  extensions?: Record<string, any>
  extras?: any

  // non-standard but helps for streaming
  url: string
  binOffset: number
}

const enum GLB {
  MAGIC = 0x46546c67, // 'glTF'
  VERSION = 2,

  HEADER_SIZE = 12,
  CHUNK_HEADER_SIZE = 8,

  CHUNK_TYPE_JSON = 0x4e4f534a, // 'JSON'
  CHUNK_TYPE_BIN = 0x004e4942, // 'BIN\0'
}

// [12B header]
// [8B JSON header][JSON data]
// [8B BIN header][BIN data]
export async function parseGLB(url: string): Promise<GLTF> {
  // Fetch a conservative header size
  const head = await batchedFetch(url, {
    headers: { Range: 'bytes=0-2047' },
    cache: 'no-store',
  }).then((r) => r.arrayBuffer())

  // Validate GLB header
  const view = new DataView(head)
  if (view.getUint32(0, true) !== GLB.MAGIC || view.getUint32(4, true) !== GLB.VERSION) {
    throw new Error('Invalid GLB')
  }

  let offset = GLB.HEADER_SIZE

  // Validate JSON header
  const jsonLength = view.getUint32(offset, true)
  const jsonType = view.getUint32(offset + 4, true)
  offset += GLB.CHUNK_HEADER_SIZE

  if (jsonType !== GLB.CHUNK_TYPE_JSON) {
    throw new Error('Expected first glTF chunk to be JSON')
  }

  // Parse JSON
  const gltf: GLTF = await batchedFetch(url, {
    headers: {
      Range: `bytes=${offset}-${offset + jsonLength - 1}`,
    },
    cache: 'no-store',
  }).then((r) => r.json())

  const binOffset = offset + jsonLength + GLB.CHUNK_HEADER_SIZE // skip BIN header

  gltf.url = url
  gltf.binOffset = binOffset

  return gltf
}

const COMPONENT_ARRAY: Record<GLTFComponentType, TypedArrayConstructor> = {
  [GL.BYTE]: Int8Array,
  [GL.UNSIGNED_BYTE]: Uint8Array,
  [GL.SHORT]: Int16Array,
  [GL.UNSIGNED_SHORT]: Uint16Array,
  [GL.UNSIGNED_INT]: Uint32Array,
  [GL.FLOAT]: Float32Array,
} as const

const TYPE_SIZE: Record<GLTFType, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
} as const

export async function parseAccessor<T extends TypedArray>(gltf: GLTF, index: number): Promise<T> {
  const accessor = gltf.accessors[index]
  const bufferView = gltf.bufferViews[accessor.bufferView]

  const ArrayType = COMPONENT_ARRAY[accessor.componentType]
  const components = TYPE_SIZE[accessor.type]

  const bytesPerComponent = ArrayType.prototype.BYTES_PER_ELEMENT
  const elementCount = accessor.count * components
  const byteLength = elementCount * bytesPerComponent

  const byteStart = gltf.binOffset + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)

  const buffer = await batchedFetch(gltf.url, {
    headers: {
      Range: `bytes=${byteStart}-${byteStart + byteLength - 1}`,
    },
    cache: 'no-store',
  }).then((res) => res.arrayBuffer())

  return new ArrayType(buffer, 0, elementCount) as T
}

export async function parseTexture(gltf: GLTF, index: number): Promise<ImageBitmap> {
  const texture = gltf.textures![index]
  const source = texture.extensions?.['EXT_texture_webp']?.source ?? texture.source! // TODO: support KTX2 and Binomial EXR
  const image = gltf.images![source]
  const bufferView = gltf.bufferViews[image.bufferView!]

  const byteStart = gltf.binOffset + (bufferView.byteOffset ?? 0)
  const buffer = await batchedFetch(gltf.url, {
    headers: {
      Range: `bytes=${byteStart}-${byteStart + bufferView.byteLength - 1}`,
    },
    cache: 'no-store',
  }).then((res) => res.arrayBuffer())

  const blob = new Blob([buffer], { type: image.mimeType })
  return createImageBitmap(blob, { colorSpaceConversion: 'none' }) // TODO: make color-space configurable?
}
