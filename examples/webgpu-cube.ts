import { WebGPURenderer, PerspectiveCamera, Geometry, Material, Mesh } from 'four'
import { OrbitControls } from './utils/OrbitControls'

const renderer = new WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight)
camera.position.z = 5

const controls = new OrbitControls(camera)
controls.connect(renderer.canvas)
controls.enableZoom = false
controls.enableKeys = false

const geometry = new Geometry({
  position: {
    size: 3,
    data: new Float32Array([
      0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
      -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
      -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
      0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
    ]),
  },
  normal: {
    size: 3,
    data: new Float32Array([
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]),
  },
  uv: {
    size: 2,
    data: new Float32Array([
      0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0,
      1, 0, 0, 1, 1, 1, 0, 0, 1, 0,
    ]),
  },
  index: {
    size: 1,
    data: new Uint16Array([
      0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22,
      21, 22, 23, 21,
    ]),
  },
})

const material = new Material({
  uniforms: {
    color: [1, 0.4, 0.7],
  },
  vertex: /* wgsl */ `
    struct Uniforms {
      projectionMatrix: mat4x4<f32>,
      modelViewMatrix: mat4x4<f32>,
      normalMatrix: mat4x4<f32>,
      color: vec3<f32>,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexIn {
      @location(0) position: vec3<f32>,
      @location(1) normal: vec3<f32>,
    };

    struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec3<f32>,
      @location(1) normal: vec3<f32>,
    };

    @vertex
    fn main(input: VertexIn) -> VertexOut {
      var out: VertexOut;
      out.position = uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4(input.position, 1.0);
      out.color = uniforms.color;
      out.normal = (uniforms.normalMatrix * vec4(input.normal, 0.0)).xyz;
      return out;
    }
  `,
  fragment: /* wgsl */ `
    struct FragmentIn {
      @location(0) color: vec3<f32>,
      @location(1) normal: vec3<f32>,
    };

    struct FragmentOut {
      @location(0) color: vec4<f32>,
    };

    @fragment
    fn main(input: FragmentIn) -> FragmentOut {
      var out: FragmentOut;
      var lighting = dot(input.normal, normalize(vec3(10.0)));
      out.color = vec4(input.color + lighting * 0.1, 1.0);
      return out;
    }
  `,
})

const mesh = new Mesh(geometry, material)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
})

let touching = false

renderer.canvas.onpointerdown = () => (touching = true)
renderer.canvas.onpointerup = () => (touching = false)

let prev = performance.now()
let angle = 0

function animate(time: DOMHighResTimeStamp) {
  requestAnimationFrame(animate)

  if (!touching) angle += (time - prev) / 2500
  prev = time
  mesh.quaternion.fromEuler(0, angle, angle)

  renderer.render(mesh, camera)
}
requestAnimationFrame(animate)
