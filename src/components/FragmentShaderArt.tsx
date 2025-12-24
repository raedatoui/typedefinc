'use client';

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MathUtils } from 'three';

// Simplex 3D Noise
const noiseGLSL = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ ); 

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}
`;

const vertexShader = `
  ${noiseGLSL}

  uniform float uTime;
  uniform float uScramble;
  uniform vec2 uClickUv;
  uniform sampler2D uTexture;
  uniform vec2 uGridSize;

  attribute vec3 aGridPos; 
  attribute vec2 aInstanceUV; 

  varying vec2 vUv;
  varying float vBrightness;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  #define PI 3.14159265359

  void main() {
    vUv = aInstanceUV;

    // Sample texture
    vec4 texColor = texture2D(uTexture, vUv);
    float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    vBrightness = brightness;

    // Scale Logic:
    float scale = 0.4 + 0.6 * brightness; 
    
    // Original Position (Flat Grid)
    vec3 originalPos = aGridPos;
    
    // Spherical Target Construction
    // Map UVs to Spherical Coordinates
    // Theta: 0 to 2*PI (around Y axis)
    // Phi: 0 to PI (top to bottom)
    float theta = vUv.x * 2.0 * PI;
    float phi = vUv.y * PI;
    float radius = 4.0; 

    // Convert Spherical to Cartesian
    vec3 sphereBase = vec3(
      radius * sin(phi) * cos(theta),
      radius * sin(phi) * sin(theta),
      radius * cos(phi)
    );

    // 3D Noise on the sphere
    // We use sphereBase for noise lookup to keep it coherent on the surface
    float n = snoise(vec3(sphereBase * 0.6 + uTime * 0.4));
    
    // Displace along the radius (normal of the sphere)
    vec3 sphereNormal = normalize(sphereBase);
    vec3 sphereDisplaced = sphereBase + sphereNormal * n * 2.5;

    // Add some extra "cloudy" floating movement
    sphereDisplaced += vec3(
        sin(uTime * 0.8 + sphereBase.y),
        cos(uTime * 0.7 + sphereBase.x),
        sin(uTime * 0.6 + sphereBase.z)
    ) * 0.5;
    
    // Interpolate between Flat and Spherical
    // Calculate distance from the click point (in UV space)
    float dist = distance(aInstanceUV, uClickUv);
    
    // Create a wave/expansion mask based on uScramble
    // When uScramble is 0, effect is 0.
    // As uScramble increases, the radius of effect increases.
    // 2.5 is a multiplier to ensure it covers the whole grid (max dist ~1.41)
    float expansion = smoothstep(0.0, 1.0, (uScramble * 2.5) - dist);
    
    vec3 finalPos = mix(originalPos, sphereDisplaced, expansion);
    
    vec3 transformed = position * scale;

    // Rotate cubes at rest (fade out when expanding to sphere)
    if (expansion < 1.0) {
        float rotTime = uTime * 0.5;
        // Generate random axis based on UV
        vec3 axis = normalize(vec3(
            snoise(vec3(aInstanceUV * 5.0, 10.0)),
            snoise(vec3(aInstanceUV * 5.0, 20.0)),
            snoise(vec3(aInstanceUV * 5.0, 30.0))
        ));
        // Generate random speed
        float speed = 1.0 + snoise(vec3(aInstanceUV * 5.0, 40.0));
        float angle = rotTime * speed * (1.0 - expansion); // Fade rotation as it expands

        // Rodrigues' rotation formula
        transformed = transformed * cos(angle) + cross(axis, transformed) * sin(angle) + axis * dot(axis, transformed) * (1.0 - cos(angle));
    }

    transformed += finalPos;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Lighting Varyings
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -mvPosition.xyz;
  }
`;

const fragmentShader = `
  ${noiseGLSL}

  varying vec2 vUv;
  varying float vBrightness;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  uniform vec3 uBG;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    
    // 1. Background (Matte/Liquid) Normal
    // Used for both background and deriving the inverted text color to ensure continuity
    float matteNoise = snoise(vec3(vUv * 3.0, uTime * 0.15)); 
    vec3 matteNormal = normalize(vNormal + vec3(matteNoise * 0.3));

    // 2. Lighting based on Matte Normal
    float fresnel = pow(1.0 - max(0.0, dot(viewDir, matteNormal)), 3.0);
    vec3 ref = reflect(-viewDir, matteNormal);
    float reflection = smoothstep(-0.2, 0.5, ref.y); 
    float sideLight = smoothstep(0.8, 0.95, dot(ref, normalize(vec3(1.0, 0.5, 1.0))));

    // 3. Metallic Surface Color
    // Randomize noise more in 2D space using domain warping and layered frequencies
    vec2 distortedUv = vUv + 0.1 * vec2(
        snoise(vec3(vUv * 1.5, uTime * 0.1)),
        snoise(vec3(vUv * 1.5 + 20.0, uTime * 0.1))
    );
    
    float n1 = snoise(vec3(distortedUv * 2.5, uTime * 0.3));
    float n2 = snoise(vec3(distortedUv * 5.0, uTime * 0.5));
    float blobNoise = n1 * 0.7 + n2 * 0.3;
    
    float baseVal = 0.5 + 0.5 * blobNoise; 
    
    vec3 surfaceColor = mix(uColor1, uColor2, baseVal); 
    surfaceColor += reflection * 0.5; // Toned down highlights
    surfaceColor += sideLight * 0.6;  
    surfaceColor += fresnel * 0.5;    

    // 4. Final Mix: Invert the surface color for the text
    float mask = smoothstep(0.15, 0.45, vBrightness);
    vec3 finalColor = mix(surfaceColor, vec3(1.0) - surfaceColor, mask);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// "Blue" palette 
const palette = {
    BG: new THREE.Color('#5963fa'),
    sin: {
        c0: new THREE.Color(0.3568627450980392, 0.26666666666666666, 0.023529411764705882),
        c1: new THREE.Color(0.59, 0.66, 1),
        c2: new THREE.Color(0.61, 0.5, 0.4),
        c3: new THREE.Color(0.02, 0.45, 0.85),
    },
};

interface FragmentShaderArtProps {
    active: boolean;
}

export default function FragmentShaderArt({ active }: FragmentShaderArtProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { size } = useThree();
    const texture = useLoader(THREE.TextureLoader, '/10.png');

    // Grid Configuration
    const gridSize = 300; 
    const count = gridSize * gridSize;

    const { aGridPos, aInstanceUV } = useMemo(() => {
        const gridPos = new Float32Array(count * 3);
        const uvs = new Float32Array(count * 2);
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const index = i * gridSize + j;
                
                const x = (j / gridSize) - 0.5;
                const y = (i / gridSize) - 0.5;
                
                gridPos[index * 3] = x * 4.0; 
                gridPos[index * 3 + 1] = y * 4.0; 
                gridPos[index * 3 + 2] = 0;

                uvs[index * 2] = j / gridSize;
                uvs[index * 2 + 1] = i / gridSize;
            }
        }
        return { aGridPos: gridPos, aInstanceUV: uvs };
    }, []);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uScramble: { value: 0 },
            uClickUv: { value: new THREE.Vector2(0.5, 0.5) },
            uTexture: { value: texture },
            uBG: { value: palette.BG },
            uColor1: { value: new THREE.Color(0, 0, 0) },
            uColor2: { value: new THREE.Color(1, 1, 1) },
            c0: { value: palette.sin.c0 },
            c1: { value: palette.sin.c1 },
            c2: { value: palette.sin.c2 },
            c3: { value: palette.sin.c3 },
        }),
        [texture]
    );

    useFrame((state, delta) => {
        if (meshRef.current) {
            const mat = meshRef.current.material as THREE.ShaderMaterial;
            mat.uniforms.uTime.value += delta * 1.5;

            // Animate Colors
            const time = state.clock.elapsedTime;
            mat.uniforms.uColor1.value.setRGB(
                Math.sin(time * 0.1) * 0.5 + 0.5,
                Math.sin(time * 0.2 + 2.0) * 0.5 + 0.5,
                Math.sin(time * 0.3 + 4.0) * 0.5 + 0.5
            );
            mat.uniforms.uColor2.value.setRGB(
                Math.sin(time * 0.15 + 1.0) * 0.5 + 0.5,
                Math.sin(time * 0.25 + 3.0) * 0.5 + 0.5,
                Math.sin(time * 0.35 + 5.0) * 0.5 + 0.5
            );
            
            // Interaction Logic
            const targetScramble = active ? 1.0 : 0.0;
            const current = mat.uniforms.uScramble.value;
            const speed = active ? 4.0 : 3.0; 
            
            // Smoothly interpolate scrambling
            mat.uniforms.uScramble.value = MathUtils.lerp(current, targetScramble, delta * speed);
        }
    });

    return (
        <instancedMesh 
            ref={meshRef} 
            args={[undefined, undefined, count]}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}
            onPointerMove={(e) => {
                if (!active && e.uv) {
                    uniforms.uClickUv.value.copy(e.uv);
                }
            }}
        >
            <boxGeometry args={[0.06, 0.06, 0.06]}> 
                <instancedBufferAttribute attach="attributes-aGridPos" args={[aGridPos, 3]} />
                <instancedBufferAttribute attach="attributes-aInstanceUV" args={[aInstanceUV, 2]} />
            </boxGeometry>
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
            />
        </instancedMesh>
    );
}