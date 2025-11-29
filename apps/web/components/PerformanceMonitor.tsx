import { useEffect, useState } from 'react';

// Performance monitor to ensure 30+ FPS
export function PerformanceMonitor() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;

      // Update FPS every second
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
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
        pointerEvents: 'none',
      }}
    >
      {fps} FPS
    </div>
  );
}
