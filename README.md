[![Size](https://img.shields.io/badge/dynamic/json?label=gzip&style=flat&colorA=000000&colorB=000000&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=fourwastaken)](https://unpkg.com/fourwastaken)
[![Version](https://img.shields.io/npm/v/fourwastaken?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/fourwastaken)
[![Downloads](https://img.shields.io/npm/dt/fourwastaken.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/fourwastaken)

# four

Minimal three.js alternative.

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Object3D](#object3d)
  - [Vector3](#vector3)
  - [Quaternion](#quaternion)
  - [Matrix4](#matrix4)
- [Mesh](#mesh)
- [Geometry](#geometry)
  - [Attribute](#attribute)
- [Material](#material)
  - [Uniforms](#uniforms)
  - [Blending](#blending)
- [Texture](#texture)
  - [Sampler](#sampler)
- [RenderTarget](#rendertarget)
- [Camera](#camera)
  - [Frustum](#frustum)
  - [PerspectiveCamera](#perspectivecamera)
  - [OrthographicCamera](#orthographiccamera)
- [Rendering](#rendering)
  - [Instancing](#instancing)
  - [Compute](#compute)

## Installation

To install, use your preferred package manager or CDN:

```bash
npm install four@npm:fourwastaken
yarn add four@npm:fourwastaken
pnpm add four@npm:fourwastaken
```

```html
<script type="module">
  import * as FOUR from 'https://unpkg.com/fourwastaken'
</script>
```

> **Note**: Vite may have issues consuming WebGPU code which relies on top-level await via ESM. This is well supported since 2021, but you may need to use [vite-plugin-top-level-await](https://github.com/Menci/vite-plugin-top-level-await) to use this library with `vite.optimizeDeps`.

## Getting Started

The following creates a renderer, camera, and renders a red cube:

<details>

<summary>Show WebGL example</summary>

```ts
import { WebGLRenderer, PerspectiveCamera, Geometry, Material, Mesh } from 'four'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight)
camera.position.z = 5

const geometry = new Geometry({
  position: {
    size: 3,
    data: new Float32Array([
      0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
      -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
      0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5,
      0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
      -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5,
      -0.5, -0.5, -0.5, 0.5, -0.5,
    ]),
  },
})
const material = new Material({
  vertex: /* glsl */ `#version 300 es
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    in vec3 position;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
    }
  `,
  fragment: /* glsl */ `#version 300 es
    out lowp vec4 color;
    void main() {
      color = vec4(1, 0, 0, 1);
    }
  `,
})
const mesh = new Mesh(geometry, material)

renderer.render(mesh, camera)
```

</details>

<details>

<summary>Show WebGPU example</summary>

```ts
import { WebGPURenderer, PerspectiveCamera, Geometry, Material, Mesh } from 'four'

const renderer = new WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight)
camera.position.z = 5

const geometry = new Geometry({
  position: {
    size: 3,
    data: new Float32Array([
      0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
      -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
      0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5,
      0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
      -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5,
      -0.5, -0.5, -0.5, 0.5, -0.5,
    ]),
  },
})
const material = new Material({
  vertex: /* wgsl */ `
    struct Uniforms {
      projectionMatrix: mat4x4<f32>,
      modelViewMatrix: mat4x4<f32>,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
      return uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4(position, 1);
    }
  `,
  fragment: /* wgsl */ `
    @fragment
    fn main() -> @location(0) vec4<f32> {
      return vec4(1, 0, 0, 1);
    }
  `,
})
const mesh = new Mesh(geometry, material)

renderer.render(mesh, camera)
```

</details>

## Object3D

An `Object3D` represents a basic 3D object and its transforms. Objects are linked via their `parent` and `children` properties, constructing a rooted scene-graph.

```ts
const object = new Object3D()
object.add(new Object3D(), new Object3D())
object.traverse((node) => {
  if (node !== object) object.remove(node)
  if (!node.visible) return true
})
```

### Vector3

A `Vector3` represents a three-dimensional (x, y, z) vector and describes local position in `Object3D.position`. It is also used to control local scale in `Object3D.scale`.

```ts
object.position.set(1, 2, 3)
object.position.x = 4
object.position[0] = 5
```

### Quaternion

A `Quaternion` represents a four-dimensional vector with a rotation axis (x, y, z) and magnitude (w) and describes local orientation in `Object3D.quaternion`.

```ts
object.quaternion.set(0, 0, 0, 1)
object.quaternion.fromEuler(Math.PI / 2, 0, 0)
object.quaternion.x *= -1
object.quaternion[0] *= -1
```

### Matrix4

A `Matrix4` represents a 4x4 transformation matrix and describes world transforms in `Object3D.matrix`.

```ts
object.matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1)
object.matrix[12] = 4
object.matrix.invert()
object.matrix.identity()
```

## Mesh

A `Mesh` contains a `Geometry` and `Material` to describe visual behavior, and can be manipulated in 3D as an `Object3D`.

```ts
const geometry = new Geometry({ ... })
const material = new Material({ ... })
const mesh = new Mesh(geometry, material)
```

## Geometry

A `Geometry` contains an `Attribute` list of vertex or storage buffer data, with a GPU buffer allocated for each `Attribute`.

```ts
const geometry = new Geometry({
  position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  index: { size: 1, data: new Uint16Array([0, 1, 2]) },
})
```

A `DrawRange` can also be configured to control rendering without submitting vertex data. This is useful for GPU-computed geometry or vertex pulling, as demonstrated in the fullscreen demos.

```ts
const geometry = new Geometry()
geometry.drawRange = { start: 0, count: 3 } // renders 3 vertices at starting index 0
```

### Attribute

An `Attribute` defines a data view, its per-vertex size, and an optional per-instance divisor (see [instancing](#instancing)).

```ts
// Creates a 4x4 instance matrix for 2 instances
{
  data: new Float32Array([
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
  ]),
  size: 16,
  divisor: 1,
}
```

## Material

A `Material` describes a program or shader interface for rasterization and compute (see [compute](#compute)), defining a `vertex` and `fragment` or `compute` shader, respectively.

<details>

<summary>Show WebGL example</summary>

```ts
const material = new Material({
  vertex: /* glsl */ `#version 300 es
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    in vec3 position;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
    }
  `,
  fragment: /* glsl */ `#version 300 es
    out lowp vec4 color;
    void main() {
      color = vec4(1, 0, 0, 1);
    }
  `,
  side: 'front',
  transparent: false,
  depthTest: true,
  depthWrite: true,
})
```

</details>

<details>

<summary>Show WebGPU example</summary>

```ts
const material = new Material({
  vertex: /* wgsl */ `
    struct Uniforms {
      projectionMatrix: mat4x4<f32>,
      modelViewMatrix: mat4x4<f32>,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
      return uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4(position, 1);
    }
  `,
  fragment: /* wgsl */ `
    @fragment
    fn main() -> @location(0) vec4<f32> {
      return vec4(1, 0, 0, 1);
    }
  `,
  side: 'front',
  transparent: false,
  depthTest: true,
  depthWrite: true,
})
```

</details>

### Uniforms

The following uniforms are built-in and will be automatically populated when specified:

| Type     | Name             | Description                                        | Conversion                 |
| -------- | ---------------- | -------------------------------------------------- | -------------------------- |
| `mat4x4` | modelMatrix      | world-space mesh transform                         | local space => world space |
| `mat4x4` | projectionMatrix | clip-space camera projection                       | view space => clip space   |
| `mat4x4` | viewMatrix       | inverse camera transform                           | world space => view space  |
| `mat4x4` | modelViewMatrix  | premultiplied model-view transform                 | local space => view space  |
| `mat4x4` | normalMatrix     | isotropic inverse model-view or "normal" transform | local space => view space  |

In WebGPU, uniforms are bound to a single uniform buffer, preceded by storage buffers, and followed by sampler-texture for texture uniforms.

```wgsl
// Storage buffers
@group(0) @binding(0)
var<storage, read_write> data: array<vec2<f32>>;

// Uniform buffer
struct Uniforms {
  time: f32,
};
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

// Texture bindings
@group(0) @binding(2) var sample: sampler;
@group(0) @binding(3) var color: texture_2d<f32>;

@group(0) @binding(4) var sample_2: sampler;
@group(0) @binding(5) var color_2: texture_2d<f32>;
```

### Blending

By default, opaque meshes do not blend but replace values, and transparent meshes alpha blend by the following blend equation:

```ts
material.blending = {
  color: {
    operation: 'add',
    srcFactor: 'src-alpha',
    dstFactor: 'one-minus-src-alpha',
  },
  alpha: {
    operation: 'add',
    srcFactor: 'one',
    dstFactor: 'one-minus-src-alpha',
  },
}
```

This gets applied to the final fragment color as `src * srcFactor + dst * dstFactor`, assuming a premultiplied alpha.

Custom blending can be used for postprocessing and various VFX. The following are the most common configurations:

| Blend Mode     | BlendOperation     | BlendFactor (src)     | BlendFactor (dst) |
| -------------- | ------------------ | --------------------- | ----------------- |
| Additive       | `add`              | `src-alpha`           | `one`             |
| Subtractive    | `reverse-subtract` | `src-alpha`           | `one`             |
| Multiply       | `add`              | `dst-color`           | `zero`            |
| Screen         | `add`              | `one-minus-src-color` | `one`             |
| Maximize       | `max`              | `src-alpha`           | `dst-alpha`       |
| Custom         | `add`              | `one`                 | `one`             |
| Local Additive | `add`              | `dst-alpha`           | `one`             |
| Disabled       | `add`              | `one`                 | `zero`            |

## Texture

A `Texture` transports or stores image or video data to the GPU as well as data like normals or depth.

```ts
const pixel = new Uint8ClampedArray([76, 51, 128, 255])
const image = await createImageBitmap(new ImageData(pixel, 1, 1))
const texture = new Texture(image)
```

### Sampler

A `Sampler` configures texel filtering and transforms for a texture, and can be used to sample a texture multiple times with different configurations in a shader.

```ts
const sampler = new Sampler({
  magFilter: 'nearest',
  minFilter: 'nearest',
  wrapS: 'clamp',
  wrapT: 'clamp',
  anisotropy: 1,
})
texture.sampler = sampler
```

## RenderTarget

A `RenderTarget` constructs a frame buffer object which can be drawn to, similar to the canvas itself. Unlike the canvas, render targets can have multiple attachments or texture channels, configurable as the third argument `count`, enabling efficient use of techniques like deferred rendering and postprocessing.

```ts
// Create render target with 4 channels
const width = window.innerWidth
const height = window.innerHeight
const count = 4
const renderTarget = new RenderTarget(width, height, count)

// Resize with page
window.addEventListener('resize', () => {
  const width = window.innerWidth
  const height = window.innerHeight
  renderTarget.setSize(width, height)
})

// Bind and render to render target
renderer.setRenderTarget(renderTarget)
renderer.render(scene, camera)

// Unbind to canvas
renderer.setRenderTarget(null)
```

## Camera

A `Camera` contains matrices and a frustum for projection transforms and queries. The type of projection is defined by `Camera.projectionMatrix`.

### Frustum

A `Frustum` contains clipping planes used for frustum culling and queries, set from a projectionViewMatrix.

```ts
camera.frustum.fromMatrix4(camera.projectionViewMatrix)
if (camera.frustum.contains(mesh)) {
  // ...
}
```

### PerspectiveCamera

A `PerspectiveCamera` calculates a perspective or non-linear `projectionMatrix`, where objects appear smaller by distance.

```ts
const fov = 75
const aspect = canvas.width / canvas.height
const near = 0.1
const far = 1000
const camera = new PerspectiveCamera(fov, aspect, near, far)
```

### OrthographicCamera

An `OrthographicCamera` calculates an orthographic or linear `projectionMatrix`, where objects are unaffected by distance.

```ts
const near = 0.1
const far = 1000
const left = -(canvas.width / 2)
const right = canvas.width / 2
const bottom = -(canvas.height / 2)
const top = canvas.height / 2
const camera = new OrthographicCamera(near, far, left, right, bottom, top)
```

## Rendering

Four supports WebGL 2 and WebGPU with `WebGLRenderer` and `WebGPURenderer`, respectively, and implements a shared API for rendering and compute.

```ts
const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

//

const renderer = new WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)
```

### Instancing

Four instances by default, which better aligns with WebGPU. Instanced rendering rasterizes multiple vertex primitives with the same shader interface to render multiple meshes at the cost of one.

You can specify the number of instances to render with `Mesh.instances` and add variance or control each instance with `Attribute.divisor` to specify a per-instance divisor. A divisor of one will be used by a single instance, and a divisor greater than one will be used by multiple instances.

> **Note**: Attributes can only allocate primitive types in WebGPU ([gpuweb/gpuweb#1652](https://github.com/gpuweb/gpuweb/issues/1652)), so you must allocate and index storage or uniform buffers via the `instance_index` built-in for complex types like matrices.

<details>

<summary>Show WebGL example</summary>

```ts
const geometry = new Geometry({
  position: { size: 3, data: new Float32Array([...]) },
  instanceMatrix: { divisor: 1, size: 16, data: new Float32Array([...]) }
})

const material = new Material({
  vertex: /* glsl */`#version 300 es
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    in mat4 instanceMatrix;
    in vec3 position;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1);
    }
  `,
  fragment: /* glsl */`#version 300 es
    out lowp vec4 color;
    void main() {
      color = vec4(1, 0, 0, 1);
    }
  `
})

const mesh = new Mesh(geometry, material)
mesh.instances = 2
```

</details>

<details>

<summary>Show WebGPU example</summary>

```ts
const geometry = new Geometry({
  position: { size: 3, data: new Float32Array([...]) },
})

const material = new Material({
  uniforms: {
    instanceMatrix: new Float32Array([...]),
  },
  vertex: /* wgsl */ `
    struct Uniforms {
      projectionMatrix: mat4x4<f32>,
      modelViewMatrix: mat4x4<f32>,
      instanceMatrix: array<mat4x4<f32>, 2>,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn main(
      @builtin(instance_index) instanceID: u32,
      @location(0) position: vec3<f32>,
    ) -> @builtin(position) vec4<f32> {
      return uniforms.projectionMatrix * uniforms.modelViewMatrix * uniforms.instanceMatrix[instanceID] * vec4(position, 1.0);
    }
  `,
  fragment: /* wgsl */ `
    @fragment
    fn main() -> @location(0) vec4<f32> {
      return vec4(1, 0, 0, 1);
    }
  `,
})

const mesh = new Mesh(geometry, material)
mesh.instances = 2
```

</details>

### Compute

Four supports compute for both WebGL and WebGPU via transform feedback and compute pipelines, respectively. This can be used in lieu of pixel shaders to write directly to buffer storage without any CPU reads/writes to textures. Useful for high precision compute or large simulations where VRAM is limited.

The following populates geometry buffers on the GPU, computing a fullscreen triangle geometry:

<details>
  <summary>Show WebGL example</summary>

```ts
const geometry = new Geometry({
  position: { size: 2, data: new Float32Array(6) },
  uv: { size: 2, data: new Float32Array(6) },
})
const computeMaterial = new Material({
  compute: /* glsl */ `#version 300 es
    out vec2 position;
    out vec2 uv;

    const vec2 vertex[3] = vec2[](vec2(-1), vec2(3, -1), vec2(-1, 3));

    void main() {
      position = vertex[gl_VertexID];
      uv = abs(position) - 1.0;
    }
  `,
})
const mesh = new Mesh(geometry, computeMaterial)

renderer.compute(mesh)
```

</details>

<details>
  <summary>Show WebGPU example</summary>

```ts
const geometry = new Geometry({
  position: { size: 2, data: new Float32Array(6) },
  uv: { size: 2, data: new Float32Array(6) },
})
const computeMaterial = new Material({
  compute: /* wgsl */ `
    @group(0) @binding(0)
    var<storage, read_write> position: array<vec2<f32>>;

    @group(0) @binding(1)
    var<storage, read_write> uv: array<vec2<f32>>;

    const vertex = array<vec2<f32>, 3>(vec2(-1), vec2(3, -1), vec2(-1, 3));

    @compute @workgroup_size(64)
    fn main(@builtin(local_invocation_index) i: u32) {
      position[i] = vertex[i];
      uv[i] = abs(vertex[i]) - 1.0;
    }
  `,
})
const mesh = new Mesh(geometry, computeMaterial)

renderer.compute(mesh)
```

</details>
