import { useEffect, useRef } from 'react';
import { useVisemeStore } from '../state/visemeStore';
import type { OVRViseme } from 'shared';

// Fake viseme generator for testing animation pipeline
// Cycles through visemes to validate morph target blending
export function FakeVisemeGenerator() {
  const setViseme = useVisemeStore((state) => state.setViseme);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Sequence of visemes to test all mouth shapes
    const visemeSequence: OVRViseme[] = [
      'aa', // open mouth
      'e', // wide
      'ih', // slightly open
      'oh', // rounded
      'ou', // pursed
      'sil', // neutral
      'fv', // f/v
      'm', // lips together
      'l', // tongue up
      's', // teeth together
      'sil', // pause
    ];

    let currentIndex = 0;

    intervalRef.current = setInterval(() => {
      const viseme = visemeSequence[currentIndex];
      setViseme(viseme, 0.8); // 80% weight for smooth blending

      currentIndex = (currentIndex + 1) % visemeSequence.length;
    }, 400); // Change viseme every 400ms

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setViseme]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        padding: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderRadius: '4px',
        zIndex: 1000,
      }}
    >
      <div>
        <strong>V0.1 - Fake Viseme Test</strong>
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
        Current: {useVisemeStore.getState().currentViseme} (
        {Math.round(useVisemeStore.getState().weight * 100)}%)
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.5 }}>
        Placeholder model - will be replaced in V0.1b
      </div>
    </div>
  );
}
