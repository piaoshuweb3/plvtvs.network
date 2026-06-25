'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * PLVTVS Core — Quantum Avatar Particle Field
 * Implements the GLSL shaders described in the whitepaper:
 * - uTime: breathing / rotation
 * - uExplode: ritual phase detonation
 * - uMouse: magnetic field disturbance
 */
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uExplode;
  uniform vec2 uMouse;
  attribute float aRandom;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vColor = aColor;
    vec3 pos = position;

    // 1. Quantum breathing
    float wave = sin(uTime * 1.5 + position.y * 2.0) * 0.08;
    pos.x += wave * sin(aRandom * 6.28);
    pos.z += wave * cos(aRandom * 6.28);

    // 2. Mouse magnetic field
    float distToMouse = distance(pos.xy, uMouse * 2.0);
    if (distToMouse < 1.0) {
      float force = (1.0 - distToMouse) * 0.15;
      pos.xyz += vec3(sin(uTime * 5.0), cos(uTime * 5.0), 0.0) * force;
    }

    // 3. Detonation explosion
    if (uExplode > 0.0) {
      vec3 dir = normalize(position + vec3(0.001));
      dir += vec3(hash(aRandom), hash(aRandom + 1.0), hash(aRandom + 2.0)) * 0.5;
      pos += dir * uExplode * 12.0;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float size = 12.0 / -mvPosition.z;
    gl_PointSize = size * (1.0 + uExplode * 2.0) * (0.8 + 0.4 * aRandom);

    vAlpha = 1.0 - uExplode * 0.7;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uExplode;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    float strength = 1.0 - dist * 2.0;
    strength = pow(strength, 1.5);

    vec3 color = vColor;

    // Glitch lines
    float glitch = sin(gl_FragCoord.y * 0.5 + uTime * 20.0);
    if (glitch > 0.98) color += vec3(0.3);

    float alpha = strength * vAlpha;
    gl_FragColor = vec4(color, alpha);
  }
`;

interface ParticleAvatarProps {
  exploded: boolean;
  mousePos?: { x: number; y: number };
}

function ParticleSystem({
  exploded,
  mousePos,
}: {
  exploded: boolean;
  mousePos: { x: number; y: number };
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const explodeRef = useRef(0);

  const { positions, randoms, colors } = useMemo(() => {
    const count = 18000;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const cyan = new THREE.Color('#00FFCC');
    const blue = new THREE.Color('#0066FF');
    const gold = new THREE.Color('#FFCC00');

    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let x: number, y: number, z: number;

      if (r < 0.45) {
        // Head
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const headRadius = 0.75;
        x = headRadius * Math.sin(phi) * Math.cos(theta);
        y = headRadius * Math.cos(phi) + 1.4;
        z = headRadius * Math.sin(phi) * Math.sin(theta) * 0.9;
      } else if (r < 0.75) {
        // Shoulders
        const theta = Math.random() * Math.PI * 2;
        const shoulderY = (Math.random() - 0.5) * 0.5;
        const shoulderWidth = 1.4 - Math.abs(shoulderY) * 0.3;
        x = Math.cos(theta) * shoulderWidth;
        y = shoulderY + 0.3;
        z = Math.sin(theta) * (0.55 - Math.abs(shoulderY) * 0.1);
      } else {
        // Torso
        const tt = Math.random();
        const torsoY = -tt * 1.8;
        const torsoRadius = (1.3 - tt * 0.6) * Math.sqrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        x = Math.cos(theta) * torsoRadius;
        y = torsoY - 0.2;
        z = Math.sin(theta) * torsoRadius * 0.65;
      }

      const noise = 0.04;
      x += (Math.random() - 0.5) * noise;
      y += (Math.random() - 0.5) * noise;
      z += (Math.random() - 0.5) * noise;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      randoms[i] = Math.random();

      const colorPick = Math.random();
      let c: THREE.Color;
      if (colorPick < 0.05) {
        c = gold;
      } else if (colorPick < 0.5) {
        c = cyan;
      } else {
        c = blue;
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, randoms, colors };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uExplode: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
      const target = exploded ? 1.0 : 0.0;
      explodeRef.current += (target - explodeRef.current) * Math.min(delta * 1.2, 1);
      matRef.current.uniforms.uExplode.value = explodeRef.current;
      const current = matRef.current.uniforms.uMouse.value as THREE.Vector2;
      current.x += (mousePos.x - current.x) * 0.05;
      current.y += (mousePos.y - current.y) * 0.05;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.18;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          args={[randoms, 1]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function ParticleAvatar({ exploded, mousePos }: ParticleAvatarProps) {
  return (
    <div className="w-full h-full" style={{ contain: 'strict' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
        onError={(e) => console.warn('[ParticleAvatar] Canvas error:', e)}
        fallback={<div className="w-full h-full" />}
      >
        <ParticleSystem
          exploded={exploded}
          mousePos={mousePos ?? { x: 0, y: 0 }}
        />
      </Canvas>
    </div>
  );
}
