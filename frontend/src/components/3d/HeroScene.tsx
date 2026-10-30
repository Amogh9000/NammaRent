'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function BalanceMesh() {
  const outerRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Subtle continuous rotation
  useFrame((state, delta) => {
    if (outerRef.current) {
      outerRef.current.rotation.y += delta * 0.25;
      outerRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y -= delta * 0.4;
      coreRef.current.rotation.z += delta * 0.2;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8}>
      <group ref={outerRef} position={[0, 0, 0]}>
        {/* Core Glass Octahedron (Legal Balance representation) */}
        <mesh ref={coreRef} scale={1.8}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            roughness={0.1}
            transmission={0.85}
            thickness={1.5}
            transparent={true}
            opacity={0.7}
            reflectivity={0.9}
            ior={1.5}
            color="#38bdf8"
            wireframe={false}
          />
        </mesh>

        {/* Inner Faceted Lattice */}
        <mesh scale={1.79}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            wireframe={true}
            color="#60a5fa"
            transparent={true}
            opacity={0.35}
          />
        </mesh>

        {/* Orbiting Thin Balance Ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]} scale={2.5}>
          <torusGeometry args={[1, 0.02, 16, 64]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.6}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      </group>
    </Float>
  );
}

export function Hero3DBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.6} />
        {/* Subtle electric blue point lights */}
        <pointLight position={[5, 4, 3]} intensity={18} color="#0284c7" distance={20} />
        <pointLight position={[-5, -3, 2]} intensity={15} color="#38bdf8" distance={20} />
        <pointLight position={[0, -4, -2]} intensity={10} color="#6366f1" distance={15} />

        <BalanceMesh />
      </Canvas>
      {/* Subtle depth gradient overlay to blend seamlessly into UI */}
      <div className="absolute inset-0 bg-radial-vignette bg-gradient-to-b from-[#0A0A0A]/40 via-transparent to-[#0A0A0A] pointer-events-none" />
    </div>
  );
}
