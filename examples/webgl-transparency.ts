import { WebGLRenderer, PerspectiveCamera, Geometry, Material, Mesh } from 'four'
import { OrbitControls } from './utils/OrbitControls'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight)
camera.position.z = 10

const controls = new OrbitControls(camera)
controls.connect(renderer.canvas)
controls.enableZoom = false
controls.enableKeys = false

const geometry = new Geometry({
  position: {
    size: 3,
    data: new Float32Array([
      // bottom left quad
      0, 0, -1, -2, 0, -1, -2, -2, -1, 0, 0, -1, -2, -2, -1, 0, -2, -1,
      // center quad
      1, 1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0,
      // top right quad
      2, 2, 1, 0, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1,
    ]),
  },
  color: {
    size: 3,
    data: new Float32Array([
      // red
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      // yellow
      1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0,
      // blue
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]),
  },
})

const material = new Material({
  transparent: true,
  depthWrite: false,
  vertex: /* glsl */ `#version 300 es
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;

    in vec3 position;
    in vec3 color;
    out vec3 vColor;

    void main() {
      vColor = color;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: /* glsl */ `#version 300 es
    precision lowp float;

    in vec3 vColor;
    out vec4 pc_fragColor;

    void main() {
      pc_fragColor = vec4(vColor, 0.5);
    }
  `,
  side: 'both',
})

const mesh = new Mesh(geometry, material)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
})

const animate = () => {
  requestAnimationFrame(animate)
  renderer.render(mesh, camera)
}
requestAnimationFrame(animate)
