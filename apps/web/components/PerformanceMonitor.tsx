import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

// Performance monitor to ensure 30+ FPS
export function PerformanceMonitor() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    const elapsed = currentTime - lastTime.current;

    // Update FPS every second
    if (elapsed >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / elapsed));
      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        padding: '10px',
        background: fps >= 30 ? 'rgba(0,128,0,0.7)' : 'rgba(128,0,0,0.7)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        fontWeight: 'bold',
        borderRadius: '4px',
        zIndex: 1000,
      }}
    >
      {fps} FPS
    </div>
  );
}
