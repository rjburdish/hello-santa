import { useEffect, useRef, useState } from 'react';
import { useVisemeStore } from '../state/visemeStore';
import { GatewayClient } from '../lib/ws/gateway';
import { AudioPlayer } from '../lib/audio/Player';
import { MicStream } from '../lib/audio/MicStream';

// V0.3 - Server-driven visemes, audio playback, and mic capture
export function ServerConnection() {
  const currentViseme = useVisemeStore((state) => state.currentViseme);
  const weight = useVisemeStore((state) => state.weight);
  const [connected, setConnected] = useState(false);
  const [bufferedMs, setBufferedMs] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const gatewayRef = useRef<GatewayClient | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const micRef = useRef<MicStream | null>(null);

  useEffect(() => {
    const gateway = new GatewayClient('http://localhost:8787/ws');
    const player = new AudioPlayer();
    const mic = new MicStream();

    gatewayRef.current = gateway;
    playerRef.current = player;
    micRef.current = mic;

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
      mic.stop();
    };
  }, []);

  const handleStartMic = async () => {
    const mic = micRef.current;
    const gateway = gatewayRef.current;

    if (!mic || !gateway) return;

    try {
      let sentCount = 0;
      await mic.start((audioData, timestamp) => {
        gateway.sendAudioChunk(audioData, timestamp);
        sentCount++;
        setFramesSent(sentCount);
      });

      setMicActive(true);
    } catch (err) {
      console.error('Failed to start microphone:', err);
      alert('Microphone access denied. Please allow microphone permission.');
    }
  };

  const handleStopMic = () => {
    const mic = micRef.current;
    const gateway = gatewayRef.current;

    if (!mic || !gateway) return;

    mic.stop();
    gateway.stop();
    setMicActive(false);
  };

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
        <strong>V0.3 - Mic Capture</strong>
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px' }}>
        Server: {connected ? '🟢 Connected' : '🔴 Click to connect'}
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px' }}>
        Mic: {micActive ? '🎤 Recording' : '⭕ Inactive'}
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
        Viseme: {currentViseme} ({Math.round(weight * 100)}%)
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
        Audio buffer: {Math.round(bufferedMs)}ms
      </div>
      {micActive && (
        <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
          Frames sent: {framesSent}
        </div>
      )}
      <div style={{ marginTop: '10px' }}>
        {!micActive ? (
          <button
            onClick={handleStartMic}
            disabled={!connected}
            style={{
              padding: '8px 16px',
              background: connected ? '#4CAF50' : '#666',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: connected ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            Start Chat
          </button>
        ) : (
          <button
            onClick={handleStopMic}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            Stop Chat
          </button>
        )}
      </div>
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.5 }}>
        Audio-only (no camera) • No recording
      </div>
    </div>
  );
}
