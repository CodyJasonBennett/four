import { WebGLRenderer, Geometry, Material, Mesh, RenderTarget } from 'four'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const triangleGeometry = new Geometry({
  position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
})

const compute = new Mesh(
  triangleGeometry,
  new Material({
    vertex: /* glsl */ `#version 300 es
      in vec3 position;

      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragment: /* glsl */ `#version 300 es
      precision lowp float;

      layout(location = 0) out vec4 color0;
      layout(location = 1) out vec4 color1;
      layout(location = 2) out vec4 color2;
      layout(location = 3) out vec4 color3;

      void main() {
        color0 = vec4(0.9, 0.3, 0.4, 1.0);
        color1 = vec4(1.0, 0.8, 0.4, 1.0);
        color2 = vec4(0.0, 0.8, 0.6, 1.0);
        color3 = vec4(0.0, 0.5, 0.7, 1.0);
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
    vertex: /* glsl */ `#version 300 es
      in vec3 position;
      in vec2 uv;

      out vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragment: /* glsl */ `#version 300 es
      precision lowp float;

      uniform sampler2D texture0;
      uniform sampler2D texture1;
      uniform sampler2D texture2;
      uniform sampler2D texture3;

      in vec2 vUv;
      out vec4 pc_fragColor;

      void main() {
        vec4 color0 = texture(texture0, vUv);
        vec4 color1 = texture(texture1, vUv);
        vec4 color2 = texture(texture2, vUv);
        vec4 color3 = texture(texture3, vUv);

        vec4 top = mix(color0, color1, step(0.5, vUv.x));
        vec4 bottom = mix(color2, color3, step(0.5, vUv.x));

        pc_fragColor = mix(bottom, top, step(0.5, vUv.y));
      }
    `,
  }),
)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.render(composite)
})

renderer.render(composite)
