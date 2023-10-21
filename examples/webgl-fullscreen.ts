import { WebGLRenderer, Material, Mesh, Texture } from 'four'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const material = new Material({
  uniforms: {
    time: 0,
    color: new Texture(new ImageData(new Uint8ClampedArray([76, 51, 128, 255]), 1, 1)),
  },
  vertex: /* glsl */ `#version 300 es
    out vec2 vUv;
  
    void main() {
      vUv = vec2(gl_VertexID << 1 & 2, gl_VertexID & 2);
      gl_Position = vec4(vUv * 2.0 - 1.0, 0, 1);
    }
  `,
  fragment: /* glsl */ `#version 300 es
    precision lowp float;

    uniform float time;
    uniform sampler2D color;

    in vec2 vUv;
    out vec4 pc_fragColor;

    void main() {
      pc_fragColor = vec4(0.5 + 0.3 * cos(vUv.xyx + time), 0.0) + texture(color, vUv);
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
