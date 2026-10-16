import { WebGLRenderer, PerspectiveCamera, Object3D, Geometry, Texture, Sampler, Material, Mesh } from 'four'
import { OrbitControls } from './utils/OrbitControls'
import { parseAccessor, parseGLB, parseTexture } from './utils/GLTFLoader'

const gltf = await parseGLB('/sponza-uncompressed.glb')
console.log(gltf)

const renderer = new WebGLRenderer({ antialias: true, alpha: false })
document.body.appendChild(renderer.canvas)

renderer.gl.enable(renderer.gl.SAMPLE_ALPHA_TO_COVERAGE)

const camera = new PerspectiveCamera(95, 1, 0.1, 1000)
camera.position.set(-0.8706605684028507, 2.2165019092459364, 3.070496327098717)

const controls = new OrbitControls(camera)
controls.center.set(-0.5092487010358047, 1.097776895374574, -0.3392563821659754)
controls.connect(renderer.canvas)
controls.enableZoom = false
controls.enableKeys = false
controls.update()

const scene = new Object3D()
scene.matrixAutoUpdate = false

const DEFAULT_ALBEDO_COLOR: [number, number, number, number] = [1, 1, 1, 1]
const EMPTY_PIXEL = new Texture(new ImageData(new Uint8ClampedArray([0, 0, 0, 0]), 1, 1))

const gl = renderer.gl
const anistropyExt = gl.getExtension('EXT_texture_filter_anisotropic')
const sampler = new Sampler({
  anisotropy: anistropyExt ? gl.getParameter(anistropyExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1,
  generateMipmaps: true,
  magFilter: 'linear',
  minFilter: 'linear',
  wrapS: 'repeat',
  wrapT: 'repeat',
})

for (const node of gltf.nodes!) {
  const mesh = gltf.meshes![node.mesh!]
  if (!mesh) continue

  for (const primitive of mesh.primitives) {
    // const vertexCount = gltf.accessors![primitive.attributes['POSITION']].count
    // const indexCount = gltf.accessors[primitive.indices!].count

    Promise.all([
      parseAccessor<Float32Array>(gltf, primitive.attributes.POSITION),
      parseAccessor<Float32Array>(gltf, primitive.attributes.NORMAL),
      parseAccessor<Float32Array>(gltf, primitive.attributes.TEXCOORD_0),
      parseAccessor<Uint16Array | Uint32Array>(gltf, primitive.indices!),
    ]).then(([meshVertices, meshNormals, meshUVs, meshIndices]) => {
      const geometry = new Geometry({
        position: { size: 3, data: meshVertices },
        normal: { size: 3, data: meshNormals },
        uv: { size: 2, data: meshUVs },
        index: { size: 1, data: meshIndices },
      })

      const materialProperties = gltf.materials![primitive.material!] ?? {}
      const pbr = materialProperties.pbrMetallicRoughness

      const [albedoTexture, metallicRoughnessTexture, normalTexture, occlusionTexture, emissiveTexture] = [
        pbr?.baseColorTexture,
        pbr?.metallicRoughnessTexture,
        materialProperties.normalTexture,
        materialProperties.occlusionTexture,
        materialProperties.emissiveTexture,
      ].map((textureInfo) => {
        if (textureInfo == null) return null

        const texture = new Texture(EMPTY_PIXEL.image, sampler)

        parseTexture(gltf, textureInfo.index).then((image) => {
          texture.image = image
          texture.width = image.width
          texture.height = image.height
          texture.needsUpdate = true
        })

        return texture
      })

      const emissiveStrengthExtension = materialProperties.extensions?.KHR_materials_emissive_strength

      const material = new Material({
        uniforms: {
          color: pbr?.baseColorFactor ?? DEFAULT_ALBEDO_COLOR,

          metallicFactor: pbr?.metallicFactor ?? 1,
          roughnessFactor: pbr?.roughnessFactor ?? 1,

          emissiveFactor: materialProperties.emissiveFactor ?? [0, 0, 0],
          emissiveStrength: emissiveStrengthExtension?.emissiveStrength ?? 1,

          normalScale: materialProperties.normalTexture?.scale ?? 1,
          occlusionStrength: materialProperties.occlusionTexture?.strength ?? 1,

          ...(albedoTexture ? { albedoTexture } : {}),
          ...(metallicRoughnessTexture ? { metallicRoughnessTexture } : {}),
          ...(normalTexture ? { normalTexture } : {}),
          ...(occlusionTexture ? { occlusionTexture } : {}),
          ...(emissiveTexture ? { emissiveTexture } : {}),

          alphaCutoff: materialProperties.alphaMode === 'MASK' ? (materialProperties.alphaCutoff ?? 0.5) : 0,
        },
        side: materialProperties.doubleSided ? 'both' : 'front',
        vertex: /* glsl */ `#version 300 es
          uniform mat4 modelMatrix;
          uniform mat4 viewMatrix;
          uniform mat4 projectionMatrix;

          in vec3 position;
          in vec3 normal;
          in vec2 uv;
          out vec3 vWorldPosition;
          out vec3 vWorldNormal;
          out vec2 vUv;

          // https://terathon.com/blog/transforming-normals.html
          mat3 adjugate(mat4 m) {
            return mat3(
              cross(m[1].xyz, m[2].xyz),
              cross(m[2].xyz, m[0].xyz),
              cross(m[0].xyz, m[1].xyz)
            );
          }

          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1);
            vec4 viewPosition = viewMatrix * worldPosition;
            vec4 clipPosition = projectionMatrix * viewPosition;

            mat3 normalMatrix = adjugate(modelMatrix);
            vec3 worldNormal = normalize(normalMatrix * normal);

            vWorldPosition = worldPosition.xyz;
            vWorldNormal = worldNormal;
            vUv = uv;
            gl_Position = clipPosition;
          }
        `,
        fragment: /* glsl */ `#version 300 es
          ${materialProperties.doubleSided ? '#define DOUBLE_SIDED' : ''}
          ${albedoTexture ? '#define USE_ALBEDO_TEXTURE' : ''}
          ${metallicRoughnessTexture ? '#define USE_METALLIC_ROUGHNESS_TEXTURE' : ''}
          ${normalTexture ? '#define USE_NORMAL_TEXTURE' : ''}
          ${occlusionTexture ? '#define USE_OCCLUSION_TEXTURE' : ''}
          ${emissiveTexture ? '#define USE_EMISSIVE_TEXTURE' : ''}

          precision mediump float;

          uniform vec4 color;

          uniform float metallicFactor;
          uniform float roughnessFactor;

          uniform vec3 emissiveFactor;
          uniform float emissiveStrength;

          uniform float normalScale;
          uniform float occlusionStrength;

          #ifdef USE_ALBEDO_TEXTURE
            uniform sampler2D albedoTexture;
          #endif

          #ifdef USE_METALLIC_ROUGHNESS_TEXTURE
            uniform sampler2D metallicRoughnessTexture;
          #endif

          #ifdef USE_NORMAL_TEXTURE
            uniform sampler2D normalTexture;
          #endif

          #ifdef USE_OCCLUSION_TEXTURE
            uniform sampler2D occlusionTexture;
          #endif

          #ifdef USE_EMISSIVE_TEXTURE
            uniform sampler2D emissiveTexture;
          #endif

          uniform float alphaCutoff;

          in vec3 vWorldPosition;
          in vec3 vWorldNormal;
          in vec2 vUv;
          out vec4 pc_fragColor;

          // Christian Schüler 2006, "Normal Mapping without Precomputed Tangents"
          mat3 getTangentFrame(vec3 eyePos, vec3 surfaceNormal, vec2 uv) {
            vec3 q0 = dFdx(eyePos);
            vec3 q1 = dFdy(eyePos);
            vec2 st0 = dFdx(uv);
            vec2 st1 = dFdy(uv);

            vec3 N = surfaceNormal;

            vec3 q1perp = cross(q1, N);
            vec3 q0perp = cross(N, q0);

            vec3 T = q1perp * st0.x + q0perp * st1.x;
            vec3 B = q1perp * st0.y + q0perp * st1.y;

            float det = max(dot(T, T), dot(B, B));
            float scale = (det == 0.0) ? 0.0 : inversesqrt(det);

            return mat3(T * scale, B * scale, N);
          }

          // ACES tonemapping fit for the sRGB color space
          // https://github.com/TheRealMJP/BakingLab/blob/master/BakingLab/ACES.hlsl
          vec3 tonemapACES(vec3 color) {
            // sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT
            const mat3 acesInputMat = mat3(
              0.59719, 0.07600, 0.02840,
              0.35458, 0.90834, 0.13383,
              0.04823, 0.01566, 0.83777
            );

            // ODT_SAT => XYZ => D60_2_D65 => sRGB
            const mat3 acesOutputMat = mat3(
              1.60475, -0.10208, -0.00327,
              -0.53108,  1.10813, -0.07276,
              -0.07367, -0.00605,  1.07602
            );

            color = acesInputMat * color;

            // Apply RRT and ODT
            vec3 a = color * (color + 0.0245786) - 0.000090537;
            vec3 b = color * (0.983729 * color + 0.4329510) + 0.238081;
            color = a / b;

            color = acesOutputMat * color;

            // Clamp to [0, 1]
            return clamp(color, 0.0, 1.0);
          }

          vec3 sRGBTransferEOTF(vec3 color) {
            return mix(pow(color * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), color * 0.0773993808, vec3(lessThanEqual(color, vec3(0.04045))));
          }
          vec3 sRGBTransferOETF(vec3 color) {
            return mix(pow(color, vec3(0.41666)) * 1.055 - vec3(0.055), color * 12.92, vec3(lessThanEqual(color, vec3(0.0031308))));
          }

          const float exposure = 1.0;

          void main() {
            vec4 diffuseColor = color;

            #ifdef USE_ALBEDO_TEXTURE
              vec4 diffuseColorSample = texture(albedoTexture, vUv);
              diffuseColorSample.rgb = sRGBTransferEOTF(diffuseColorSample.rgb);
              diffuseColor *= diffuseColorSample;
            #endif
            float alphaWidth = max(fwidth(diffuseColor.a), 1e-5);
            diffuseColor.a = smoothstep(alphaCutoff - alphaWidth, alphaCutoff + alphaWidth, diffuseColor.a);

            float metallic = metallicFactor;
            float roughness = roughnessFactor;

            #ifdef USE_METALLIC_ROUGHNESS_TEXTURE
              vec4 mr = texture(metallicRoughnessTexture, vUv);
              roughness *= mr.g;
              metallic *= mr.b;
            #endif

            float occlusion = 1.0;

            #ifdef USE_OCCLUSION_TEXTURE
              float ao = texture(occlusionTexture, vUv).r;
              occlusion = mix(1.0, ao, occlusionStrength);
            #endif

            vec3 emissive = emissiveFactor;
            #ifdef USE_EMISSIVE_TEXTURE
              vec3 emissiveSample = texture(emissiveTexture, vUv).rgb;
              emissiveSample = sRGBTransferEOTF(emissiveSample);
              emissive *= emissiveSample;
            #endif
            emissive *= emissiveStrength;
            diffuseColor.rgb += emissive;

            vec3 normal = normalize(vWorldNormal);
            #ifdef DOUBLE_SIDED
              float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
              normal *= faceDirection;
            #endif

            #ifdef USE_NORMAL_TEXTURE
              mat3 tbn = getTangentFrame(-vWorldPosition, normal, vUv);
              #ifdef DOUBLE_SIDED
                tbn[0] *= faceDirection;
                tbn[1] *= faceDirection;
              #endif

              vec3 normalMap = texture(normalTexture, vUv).rgb * 2.0 - 1.0;
              normal = normalize(tbn * normalMap);
            #endif

            vec3 luminance = diffuseColor.rgb;
            luminance *= exp2(exposure);
            luminance = tonemapACES(luminance);
            luminance = sRGBTransferOETF(luminance);

            pc_fragColor = vec4(luminance, diffuseColor.a);
          }
        `,
      })

      const mesh = new Mesh(geometry, material)
      mesh.quaternion.set(
        node.rotation?.[0] ?? 0,
        node.rotation?.[1] ?? 0,
        node.rotation?.[2] ?? 0,
        node.rotation?.[3] ?? 1,
      )
      mesh.scale.set(node.scale?.[0] ?? 1, node.scale?.[1] ?? 1, node.scale?.[2] ?? 1)
      mesh.position.set(node.translation?.[0] ?? 0, node.translation?.[1] ?? 0, node.translation?.[2] ?? 0)
      mesh.updateMatrix()
      mesh.frustumCulled = false // TODO: fix culling for transformed nodes

      scene.add(mesh)
    })
  }
}

function onResize() {
  const dpr = devicePixelRatio
  const width = innerWidth
  const height = innerHeight

  renderer.setSize(Math.floor(width * dpr), Math.floor(height * dpr))
  renderer.canvas.style.width = `${width}px`
  renderer.canvas.style.height = `${height}px`
  camera.aspect = renderer.canvas.width / renderer.canvas.height
}
addEventListener('resize', onResize)
onResize()

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
requestAnimationFrame(animate)
