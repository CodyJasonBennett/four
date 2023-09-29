import { WebGPURenderer, Geometry, Material, Mesh, Texture } from 'four'

const renderer = new WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const material = new Material({
  uniforms: {
    time: 0,
    color: new Texture(await createImageBitmap(new ImageData(new Uint8ClampedArray([76, 51, 128, 255]), 1, 1))),
  },
  vertex: /* wgsl */ `
    struct Uniforms {
      time: f32,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
      @location(1) uv: vec2<f32>,
    };

    @vertex
    fn main(@builtin(vertex_index) i: u32) -> VertexOut {
      var out: VertexOut;
      out.uv = vec2<f32>(vec2((i << 1) & 2, i & 2));
      out.position = vec4(out.uv * 2 - 1, 0, 1);
      out.color = vec4(0.5 + 0.3 * cos(vec3(out.uv, 0.0) + uniforms.time), 0.0);
      return out;
    }
  `,
  fragment: /* wgsl */ `
    @group(0) @binding(1) var sample: sampler;
    @group(0) @binding(2) var color: texture_2d<f32>;

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

const mesh = new Mesh()
mesh.material = material
mesh.geometry.drawRange.count = 3

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
})

function animate(time: DOMHighResTimeStamp) {
  requestAnimationFrame(animate)
  mesh.material.uniforms.time = time / 1000
  renderer.render(mesh)
}
requestAnimationFrame(animate)
