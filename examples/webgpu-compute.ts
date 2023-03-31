import { WebGPURenderer, Geometry, Material, Mesh } from 'four'

const renderer = new WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

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

mesh.material = new Material({
  uniforms: {
    time: 0,
  },
  vertex: /* wgsl */ `
    struct VertexIn {
      @location(0) position: vec3<f32>,
      @location(1) uv: vec2<f32>,
    };

    struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    };

    @vertex
    fn main(input: VertexIn) -> VertexOut {
      var out: VertexOut;
      out.position = vec4(input.position, 1.0);
      out.uv = input.uv;
      return out;
    }
  `,
  fragment: /* wgsl */ `
    struct Uniforms {
      time: f32,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @fragment
    fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
      return vec4(vec3(.8, .7, 1) + .3 * cos(uv.xyx + uniforms.time), 1);
    }
  `,
})

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
})

function animate(time: DOMHighResTimeStamp) {
  requestAnimationFrame(animate)
  mesh.material.uniforms.time = time / 1000
  renderer.render(mesh)
}
requestAnimationFrame(animate)
