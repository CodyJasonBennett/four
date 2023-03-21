import { WebGLRenderer, Geometry, Material, Mesh } from 'four'

const renderer = new WebGLRenderer()

const geometry = new Geometry({
  source: {
    data: new Float32Array([0, 1, 2, 3, 4]),
    size: 1,
  },
  result: {
    data: new Float32Array(5),
    size: 1,
  },
})

const material = new Material({
  compute: /* glsl */ `#version 300 es
    in float source;
    out float result;
    void main() {
      result = source + float(gl_VertexID);
    }
  `,
})

const mesh = new Mesh(geometry, material)

renderer.compute(mesh)

console.log(geometry.attributes.result.data)
