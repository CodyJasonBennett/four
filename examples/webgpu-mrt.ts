import { WebGPURenderer, Geometry, Material, Mesh, RenderTarget } from 'four'

const renderer = new WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const triangleGeometry = new Geometry({
  position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
})

const compute = new Mesh(
  triangleGeometry,
  new Material({
    vertex: /* wgsl */ `
      struct VertexIn {
        @location(0) position: vec3<f32>,
      };

      struct VertexOut {
        @builtin(position) position: vec4<f32>,
      };

      @vertex
      fn main(input: VertexIn) -> VertexOut {
        var out: VertexOut;
        out.position = vec4(input.position, 1.0);
        return out;
      }
    `,
    fragment: /* wgsl */ `
      struct FragmentOut {
        @location(0) color0: vec4<f32>,
        @location(1) color1: vec4<f32>,
        @location(2) color2: vec4<f32>,
        @location(3) color3: vec4<f32>,
      };

      @fragment
      fn main() -> FragmentOut {
        var out: FragmentOut;
        out.color0 = vec4(0.9, 0.3, 0.4, 1.0);
        out.color1 = vec4(1.0, 0.8, 0.4, 1.0);
        out.color2 = vec4(0.0, 0.8, 0.6, 1.0);
        out.color3 = vec4(0.0, 0.5, 0.7, 1.0);
        return out;
      }
    `,
  }),
)

const renderTarget = new RenderTarget(1, 1, 4)

renderer.setRenderTarget(renderTarget)
renderer.render(compute)
renderer.setRenderTarget(null)

const composite = new Mesh(
  triangleGeometry,
  new Material({
    uniforms: {
      texture0: renderTarget.textures[0],
      texture1: renderTarget.textures[1],
      texture2: renderTarget.textures[2],
      texture3: renderTarget.textures[3],
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
      @group(0) @binding(0) var sampler0: sampler;
      @group(0) @binding(1) var texture0: texture_2d<f32>;

      @group(0) @binding(2) var sampler1: sampler;
      @group(0) @binding(3) var texture1: texture_2d<f32>;

      @group(0) @binding(4) var sampler2: sampler;
      @group(0) @binding(5) var texture2: texture_2d<f32>;

      @group(0) @binding(6) var sampler3: sampler;
      @group(0) @binding(7) var texture3: texture_2d<f32>;

      struct FragmentIn {
        @location(0) uv: vec2<f32>,
      };

      struct FragmentOut {
        @location(0) color: vec4<f32>,
      };

      @fragment
      fn main(input: FragmentIn) -> FragmentOut {
        var out: FragmentOut;

        var color0 = textureSample(texture0, sampler0, input.uv);
        var color1 = textureSample(texture1, sampler1, input.uv);
        var color2 = textureSample(texture2, sampler2, input.uv);
        var color3 = textureSample(texture3, sampler3, input.uv);

        var top = mix(color0, color1, step(0.5, input.uv.x));
        var bottom = mix(color2, color3, step(0.5, input.uv.x));

        out.color = mix(bottom, top, step(0.5, input.uv.y));

        return out;
      }
    `,
  }),
)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.render(composite)
})

renderer.render(composite)
