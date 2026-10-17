import { generateMipmap } from 'webgpu-utils'
import { WebGPURenderer, PerspectiveCamera, Object3D, Geometry, Texture, Sampler, Material, Mesh } from 'four'
import { OrbitControls } from './utils/OrbitControls'
import { parseAccessor, parseGLB, parseTexture } from './utils/GLTFLoader'

const gltf = await parseGLB('/sponza-uncompressed.glb')
console.log(gltf)

const renderer = new WebGPURenderer()
document.body.appendChild(renderer.canvas)

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

const sampler = new Sampler({
  anisotropy: 16,
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

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // @ts-ignore
              const target = renderer._textures.get(texture)
              if (target && 'mipLevelCount' in target && target.mipLevelCount > 1) {
                generateMipmap(renderer.device, target)
              }
            })
          })
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

          albedoTexture: albedoTexture ?? EMPTY_PIXEL,
          metallicRoughnessTexture: metallicRoughnessTexture ?? EMPTY_PIXEL,
          normalTexture: normalTexture ?? EMPTY_PIXEL,
          occlusionTexture: occlusionTexture ?? EMPTY_PIXEL,
          emissiveTexture: emissiveTexture ?? EMPTY_PIXEL,

          alphaCutoff: materialProperties.alphaMode === 'MASK' ? (materialProperties.alphaCutoff ?? 0.5) : 0,
        },
        side: materialProperties.doubleSided ? 'both' : 'front',
        vertex: /* wgsl */ `
          struct SceneUniforms {
            modelMatrix: mat4x4<f32>,
            viewMatrix: mat4x4<f32>,
            projectionMatrix: mat4x4<f32>,
          };

          @group(0) @binding(0)
          var<uniform> scene: SceneUniforms;

          struct VertexInput {
            @location(0) position: vec3<f32>,
            @location(1) normal: vec3<f32>,
            @location(2) uv: vec2<f32>,
          };

          struct VertexOutput {
            @builtin(position) clipPosition: vec4<f32>,
            @location(0) worldPosition: vec3<f32>,
            @location(1) worldNormal: vec3<f32>,
            @location(2) uv: vec2<f32>,
          };

          // Christian Schüler 2006, "Normal Mapping without Precomputed Tangents"
          fn adjugate(m: mat4x4<f32>) -> mat3x3<f32> {
            return mat3x3<f32>(
              cross(m[1].xyz, m[2].xyz),
              cross(m[2].xyz, m[0].xyz),
              cross(m[0].xyz, m[1].xyz)
            );
          }

          @vertex
          fn main(input: VertexInput) -> VertexOutput {
            let worldPosition = scene.modelMatrix * vec4<f32>(input.position, 1.0);
            let viewPosition = scene.viewMatrix * worldPosition;
            let clipPosition = scene.projectionMatrix * viewPosition;

            let normalMatrix = adjugate(scene.modelMatrix);
            let worldNormal = normalize(normalMatrix * input.normal);

            var output: VertexOutput;
            output.clipPosition = clipPosition;
            output.worldPosition = worldPosition.xyz;
            output.worldNormal = worldNormal;
            output.uv = input.uv;

            return output;
          }
        `,
        fragment: /* wgsl */ `
          const DOUBLE_SIDED: bool = ${materialProperties.doubleSided};
          const ALPHA_MASK: bool = ${materialProperties.alphaMode === 'MASK'};
          const USE_ALBEDO_TEXTURE: bool = ${!!albedoTexture};
          const USE_METALLIC_ROUGHNESS_TEXTURE: bool = ${!!metallicRoughnessTexture};
          const USE_NORMAL_TEXTURE: bool = ${!!normalTexture};
          const USE_OCCLUSION_TEXTURE: bool = ${!!occlusionTexture};
          const USE_EMISSIVE_TEXTURE: bool = ${!!emissiveTexture};

          const EXPOSURE: f32 = 1.0;

          // ACES input: sRGB -> XYZ -> D60/AP1.
          const ACES_INPUT_MAT: mat3x3<f32> = mat3x3<f32>(
            vec3<f32>(0.59719, 0.07600, 0.02840),
            vec3<f32>(0.35458, 0.90834, 0.13383),
            vec3<f32>(0.04823, 0.01566, 0.83777)
          );

          // ACES output: AP1 -> XYZ -> D65/sRGB.
          const ACES_OUTPUT_MAT: mat3x3<f32> = mat3x3<f32>(
            vec3<f32>( 1.60475, -0.10208, -0.00327),
            vec3<f32>(-0.53108,  1.10813, -0.07276),
            vec3<f32>(-0.07367, -0.00605,  1.07602)
          );

          struct MaterialUniforms {
            // Unused but necessary for current packing
            modelMatrix: mat4x4<f32>,
            viewMatrix: mat4x4<f32>,
            projectionMatrix: mat4x4<f32>,

            color: vec4<f32>,
            metallicFactor: f32,
            roughnessFactor: f32,

            emissiveFactor: vec3<f32>,
            emissiveStrength: f32,

            normalScale: f32,
            occlusionStrength: f32,
            alphaCutoff: f32,
          };

          @group(0) @binding(0) var<uniform> material: MaterialUniforms;

          @group(0) @binding(1) var albedoSampler: sampler;
          @group(0) @binding(2) var albedoTexture: texture_2d<f32>;

          @group(0) @binding(3) var metallicRoughnessSampler: sampler;
          @group(0) @binding(4) var metallicRoughnessTexture: texture_2d<f32>;

          @group(0) @binding(5) var normalSampler: sampler;
          @group(0) @binding(6) var normalTexture: texture_2d<f32>;

          @group(0) @binding(7) var occlusionSampler: sampler;
          @group(0) @binding(8) var occlusionTexture: texture_2d<f32>;

          @group(0) @binding(9) var emissiveSampler: sampler;
          @group(0) @binding(10) var emissiveTexture: texture_2d<f32>;

          struct FragmentInput {
            @location(0) worldPosition: vec3<f32>,
            @location(1) worldNormal: vec3<f32>,
            @location(2) uv: vec2<f32>,
            @builtin(front_facing) frontFacing: bool,
          };

          // Christian Schüler 2006, "Normal Mapping without Precomputed Tangents"
          fn getTangentFrame(
            eyePos: vec3<f32>,
            surfaceNormal: vec3<f32>,
            uv: vec2<f32>
          ) -> mat3x3<f32> {
            let q0 = dpdx(eyePos);
            let q1 = dpdy(eyePos);
            let st0 = dpdx(uv);
            let st1 = dpdy(uv);

            let N = surfaceNormal;

            let q1perp = cross(q1, N);
            let q0perp = cross(N, q0);

            let T = q1perp * st0.x + q0perp * st1.x;
            let B = q1perp * st0.y + q0perp * st1.y;

            let det = max(dot(T, T), dot(B, B));

            var scale: f32 = 0.0;
            if (det != 0.0) {
              scale = inverseSqrt(det);
            }

            return mat3x3<f32>(T * scale, B * scale, N);
          }

          // ACES tonemapping fit for the sRGB color space
          // https://github.com/TheRealMJP/BakingLab/blob/master/BakingLab/ACES.hlsl
          fn tonemapACES(inputColor: vec3<f32>) -> vec3<f32> {
            var color = ACES_INPUT_MAT * inputColor;

            // Apply RRT and ODT
            let a = color * (color + vec3<f32>(0.0245786)) - vec3<f32>(0.000090537);
            let b = color * 0.983729 + vec3<f32>(0.4329510);

            let denominator = color * b + vec3<f32>(0.238081);
            color = a / denominator;

            color = ACES_OUTPUT_MAT * color;

            // Clamp to [0, 1]
            return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
          }

          fn sRGBTransferEOTF(color: vec3<f32>) -> vec3<f32> {
            let nonlinear = pow(
              color * 0.9478672986 + vec3<f32>(0.0521327014),
              vec3<f32>(2.4)
            );
            let linear = color * 0.0773993808;

            return select(
              nonlinear,
              linear,
              color <= vec3<f32>(0.04045)
            );
          }

          fn sRGBTransferOETF(color: vec3<f32>) -> vec3<f32> {
            let nonlinear = pow(color, vec3<f32>(0.41666)) * 1.055 - vec3<f32>(0.055);
            let linear = color * 12.92;

            return select(
              nonlinear,
              linear,
              color <= vec3<f32>(0.0031308)
            );
          }

          @fragment
          fn main(input: FragmentInput) -> @location(0) vec4<f32> {
            var diffuseColor = material.color;

            if (USE_ALBEDO_TEXTURE) {
              var diffuseColorSample = textureSample(albedoTexture, albedoSampler, input.uv);

              diffuseColorSample = vec4<f32>(
                sRGBTransferEOTF(diffuseColorSample.rgb),
                diffuseColorSample.a
              );

              diffuseColor *= diffuseColorSample;

              if (ALPHA_MASK && diffuseColor.a < material.alphaCutoff) {
                discard;
              }
            }

            var metallic = material.metallicFactor;
            var roughness = material.roughnessFactor;

            if (USE_METALLIC_ROUGHNESS_TEXTURE) {
              let mr = textureSample(
                metallicRoughnessTexture,
                metallicRoughnessSampler,
                input.uv
              );

              roughness *= mr.g;
              metallic *= mr.b;
            }

            var occlusion: f32 = 1.0;

            if (USE_OCCLUSION_TEXTURE) {
              let ao = textureSample(
                occlusionTexture,
                occlusionSampler,
                input.uv
              ).r;

              occlusion = mix(
                1.0,
                ao,
                material.occlusionStrength
              );
            }

            var emissive = material.emissiveFactor;

            if (USE_EMISSIVE_TEXTURE) {
              var emissiveSample = textureSample(
                emissiveTexture,
                emissiveSampler,
                input.uv
              ).rgb;

              emissiveSample = sRGBTransferEOTF(emissiveSample);
              emissive *= emissiveSample;
            }

            emissive *= material.emissiveStrength;

            diffuseColor = vec4<f32>(diffuseColor.rgb + emissive, diffuseColor.a);

            var normal = normalize(input.worldNormal);
            var faceDirection: f32 = 1.0;

            if (DOUBLE_SIDED) {
              faceDirection = select(-1.0, 1.0, input.frontFacing);
              normal *= faceDirection;
            }

            if (USE_NORMAL_TEXTURE) {
              var tbn = getTangentFrame(
                -input.worldPosition,
                normal,
                input.uv
              );

              if (DOUBLE_SIDED) {
                tbn = mat3x3<f32>(
                  tbn[0] * faceDirection,
                  tbn[1] * faceDirection,
                  tbn[2]
                );
              }

              let normalMap = textureSample(normalTexture, normalSampler, input.uv).rgb * 2.0 - 1.0;
              normal = normalize(tbn * normalMap);
            }

            var luminance = diffuseColor.rgb;
            luminance *= exp2(EXPOSURE);
            luminance = tonemapACES(luminance);
            luminance = sRGBTransferOETF(luminance);

            return vec4<f32>(luminance, diffuseColor.a);
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
