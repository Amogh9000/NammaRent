'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function MetallicShieldMesh() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.5;
      meshRef.current.rotation.x = Math.sin(meshRef.current.rotation.y * 0.5) * 0.15;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Outer metallic shield disc */}
      <mesh scale={0.9}>
        <cylinderGeometry args={[1, 1, 0.2, 32]} />
        <meshStandardMaterial
          color="#10b981"
          metalness={0.9}
          roughness={0.15}
          emissive="#047857"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Golden / Emerald rim */}
      <mesh scale={0.92} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.08, 16, 32]} />
        <meshStandardMaterial
          color="#34d399"
          metalness={0.95}
          roughness={0.1}
          emissive="#059669"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Center 3D Star / Checkmark icon representation */}
      <mesh position={[0, 0, 0.12]} scale={0.45}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.9}
          roughness={0.1}
          emissive="#6ee7b7"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

export function ConfidenceBadge3D({ confidence = 95 }: { confidence?: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.15)]">
      <div className="w-6 h-6 shrink-0 relative">
        <Canvas
          camera={{ position: [0, 0, 3], fov: 40 }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[2, 3, 4]} intensity={2.5} color="#ffffff" />
          <pointLight position={[-2, -2, 2]} intensity={2} color="#10b981" />
          <MetallicShieldMesh />
        </Canvas>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-mono text-neutral-400">Confidence</span>
        <span className="text-xs font-mono font-bold text-emerald-400">{confidence}%</span>
      </div>
    </div>
  );
}
