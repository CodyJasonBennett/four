import { WebGPURenderer, Geometry, Material, Mesh, Texture } from 'four/webgpu'

const renderer = await new WebGPURenderer().init()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const geometry = new Geometry({
  position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
})

const material = new Material({
  uniforms: {
    time: 0,
    color: new Texture({
      image: await createImageBitmap(new ImageData(new Uint8ClampedArray([76, 51, 128, 255]), 1, 1)),
    }),
  },
  vertex: /* wgsl */ `
    struct Uniforms {
      time: f32,
    };
    @binding(0) @group(0) var<uniform> uniforms: Uniforms;

    struct VertexIn {
      @location(0) position: vec3<f32>,
      @location(1) uv: vec2<f32>,
    };

    struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
      @location(1) uv: vec2<f32>,
    };

    @vertex
    fn main(input: VertexIn) -> VertexOut {
      var out: VertexOut;
      out.position = vec4(input.position, 1.0);
      out.color = vec4(0.5 + 0.3 * cos(vec3(input.uv, 0.0) + uniforms.time), 0.0);
      out.uv = input.uv;
      return out;
    }
  `,
  fragment: /* wgsl */ `
    @binding(1) @group(0) var sample: sampler;
    @binding(2) @group(0) var color: texture_2d<f32>;

    struct FragmentIn {
      @location(0) color: vec4<f32>,
      @location(1) uv: vec2<f32>,
    };

    struct FragmentOut {
      @location(0) color: vec4<f32>,
    };

    @fragment
    fn main(input: FragmentIn) -> FragmentOut {
      var out: FragmentOut;
      out.color = input.color + textureSample(color, sample, input.uv);
      return out;
    }
  `,
})

const mesh = new Mesh(geometry, material)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
})

function animate(time: DOMHighResTimeStamp) {
  requestAnimationFrame(animate)
  mesh.material.uniforms.time = time / 1000
  renderer.render(mesh)
}
requestAnimationFrame(animate)
