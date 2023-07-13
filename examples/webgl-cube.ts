import { WebGLRenderer, PerspectiveCamera, Geometry, Material, Mesh } from 'four'
import { OrbitControls } from './utils/OrbitControls'

const renderer = new WebGLRenderer()
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
  vertex: /* glsl */ `#version 300 es
    uniform mat4 normalMatrix;
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    in vec3 position;
    in vec3 normal;
    out vec3 vNormal;

    void main() {
      vNormal = (normalMatrix * vec4(normal, 0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: /* glsl */ `#version 300 es
    precision lowp float;

    uniform vec3 color;
    in vec3 vNormal;
    out vec4 pc_fragColor;

    void main() {
      float lighting = dot(vNormal, normalize(vec3(10)));
      pc_fragColor = vec4(color + lighting * 0.1, 1.0);
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
