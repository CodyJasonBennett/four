import { WebGLRenderer, Geometry, Material, Mesh } from 'four'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

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

mesh.material = new Material({
  uniforms: {
    time: 0,
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

    in vec2 vUv;
    out vec4 pc_fragColor;

    void main() {
      pc_fragColor = vec4(vec3(.8, .7, 1) + .3 * cos(vUv.xyx + time), 1);
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
