import { useEffect, useRef, useState } from 'react';
import { useVisemeStore } from '../state/visemeStore';
import { GatewayClient } from '../lib/ws/gateway';
import { AudioPlayer } from '../lib/audio/Player';

// V0.2 - Server-driven visemes and audio playback
export function ServerConnection() {
  const currentViseme = useVisemeStore((state) => state.currentViseme);
  const weight = useVisemeStore((state) => state.weight);
  const [connected, setConnected] = useState(false);
  const [bufferedMs, setBufferedMs] = useState(0);
  const gatewayRef = useRef<GatewayClient | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    const gateway = new GatewayClient('http://localhost:8787/ws');
    const player = new AudioPlayer();

    gatewayRef.current = gateway;
    playerRef.current = player;

    // Initialize audio player (requires user gesture)
    const initAudio = async () => {
      await player.init();

      // Connect to gateway
      gateway.connect((audioData, timestamp) => {
        player.addChunk(audioData);
      });

      setConnected(true);

      // Update buffered audio display
      const interval = setInterval(() => {
        setBufferedMs(player.getBufferedMs());
      }, 100);

      return () => clearInterval(interval);
    };

    // Wait for user interaction before starting audio
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      gateway.disconnect();
      player.stop();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        padding: '10px',
        background: connected ? 'rgba(0,128,0,0.7)' : 'rgba(128,0,0,0.7)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderRadius: '4px',
        zIndex: 1000,
      }}
    >
      <div>
        <strong>V0.2 - Server Connection</strong>
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px' }}>
        Status: {connected ? '🟢 Connected' : '🔴 Click to connect'}
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
        Viseme: {currentViseme} ({Math.round(weight * 100)}%)
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
        Audio buffer: {Math.round(bufferedMs)}ms
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.5 }}>
        Placeholder audio - Santa voice in V0.4
      </div>
    </div>
  );
}
