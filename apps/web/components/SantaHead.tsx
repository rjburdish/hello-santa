import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisemeStore } from '../state/visemeStore';

// Placeholder Santa head with mock morph targets
// Will be replaced with real Santa GLB model in V0.1b
export function SantaHead() {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentViseme = useVisemeStore((state) => state.currentViseme);
  const visemeWeight = useVisemeStore((state) => state.weight);

  // Smooth interpolation for morph target animation (critically damped)
  const targetScale = useRef({ x: 1, y: 1, z: 1 });
  const currentScale = useRef({ x: 1, y: 1, z: 1 });
  const velocity = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    // Map viseme to simple scale animation (placeholder for actual morph targets)
    const scaleMap: Record<string, { x: number; y: number; z: number }> = {
      aa: { x: 1.1, y: 1.2, z: 1.0 }, // open mouth
      e: { x: 1.15, y: 1.0, z: 1.0 }, // wide mouth
      ih: { x: 1.05, y: 1.1, z: 1.0 }, // slightly open
      oh: { x: 1.0, y: 1.15, z: 1.1 }, // rounded
      ou: { x: 0.95, y: 1.2, z: 1.15 }, // pursed
      fv: { x: 1.1, y: 0.95, z: 1.0 }, // bottom lip
      m: { x: 1.0, y: 0.9, z: 1.0 }, // lips together
      sil: { x: 1.0, y: 1.0, z: 1.0 }, // neutral
    };

    const targetMorph = scaleMap[currentViseme] || scaleMap.sil;
    targetScale.current = {
      x: 1.0 + (targetMorph.x - 1.0) * visemeWeight,
      y: 1.0 + (targetMorph.y - 1.0) * visemeWeight,
      z: 1.0 + (targetMorph.z - 1.0) * visemeWeight,
    };
  }, [currentViseme, visemeWeight]);

  // Critically damped spring for smooth animation (V0.5 improved)
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Critically damped spring parameters
    const omega = 15.0; // Angular frequency (controls speed)
    const zeta = 1.0; // Damping ratio (1.0 = critically damped)

    // Clamp delta to prevent instability
    const clampedDelta = Math.min(delta, 0.1);

    // Apply critically damped spring to each axis
    ['x', 'y', 'z'].forEach((axis) => {
      const target = targetScale.current[axis as keyof typeof targetScale.current];
      const current = currentScale.current[axis as keyof typeof currentScale.current];
      const vel = velocity.current[axis as keyof typeof velocity.current];

      // Spring force: F = -k * displacement - damping * velocity
      const displacement = current - target;
      const springForce = -omega * omega * displacement;
      const dampingForce = -2.0 * zeta * omega * vel;
      const acceleration = springForce + dampingForce;

      // Update velocity and position
      velocity.current[axis as keyof typeof velocity.current] += acceleration * clampedDelta;
      currentScale.current[axis as keyof typeof currentScale.current] += velocity.current[axis as keyof typeof velocity.current] * clampedDelta;

      // Clamp mouth openness (y-axis) to prevent unrealistic deformation
      if (axis === 'y') {
        currentScale.current.y = Math.max(0.85, Math.min(1.3, currentScale.current.y));
      }
    });

    meshRef.current.scale.set(
      currentScale.current.x,
      currentScale.current.y,
      currentScale.current.z
    );

    // Gentle idle breathing animation
    const breathe = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    meshRef.current.position.y = breathe;
  });

  return (
    <group>
      {/* Placeholder head - simple sphere for now */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#ffccaa" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Placeholder eyes */}
      <mesh position={[-0.3, 0.2, 0.85]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.3, 0.2, 0.85]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Placeholder nose */}
      <mesh position={[0, 0, 1]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ffaa88" />
      </mesh>

      {/* Note: In V0.1b, this entire component will load a GLB model
          with proper OVR viseme morph targets instead of scale-based animation */}
    </group>
  );
}
