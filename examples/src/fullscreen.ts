import { WebGLRenderer, Geometry, Material, Mesh, Texture } from 'four'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const geometry = new Geometry({
  position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
})

const material = new Material({
  uniforms: {
    time: 0,
    color: new Texture({ image: new ImageData(new Uint8ClampedArray([76, 51, 128, 255]), 1, 1) }),
  },
  vertex: /* glsl */ `#version 300 es
    in vec2 uv;
    in vec3 position;

    out vec2 vUv;
  
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1);
    }
  `,
  fragment: /* glsl */ `#version 300 es
    precision highp float;

    uniform float time;
    uniform sampler2D color;

    in vec2 vUv;
    out vec4 pc_fragColor;

    void main() {
      pc_fragColor = vec4(0.5 + 0.3 * cos(vUv.xyx + time), 0.0) + texture(color, vUv);
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
