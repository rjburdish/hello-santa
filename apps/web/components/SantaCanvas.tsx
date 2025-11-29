import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SantaHead } from './SantaHead';
import { PerformanceMonitor } from './PerformanceMonitor';

export function SantaCanvas() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{ antialias: true }}
      >
        {/* Lighting setup - ambient + key light for head/shoulders */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 3, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-2, 1, -3]} intensity={0.3} />

        {/* Placeholder Santa head */}
        <SantaHead />

        {/* Performance monitor */}
        <PerformanceMonitor />

        {/* Dev controls - can remove later */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={2}
          maxDistance={5}
        />
      </Canvas>
    </div>
  );
}
