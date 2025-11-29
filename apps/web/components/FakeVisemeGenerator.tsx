import { useEffect, useRef, useState } from 'react';
import { useVisemeStore } from '../state/visemeStore';
import { GatewayClient } from '../lib/ws/gateway';
import { AudioPlayer } from '../lib/audio/Player';
import { MicStream } from '../lib/audio/MicStream';

interface TranscriptEntry {
  speaker: 'child' | 'santa';
  text: string;
  timestamp: number;
}

// V0.5 - Real-time optimizations: telemetry, heartbeat, better visemes
export function ServerConnection() {
  const currentViseme = useVisemeStore((state) => state.currentViseme);
  const weight = useVisemeStore((state) => state.weight);
  const [connected, setConnected] = useState(false);
  const [bufferedMs, setBufferedMs] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<
    'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'
  >('idle');
  const [fps, setFps] = useState(0);
  const [rtt, setRtt] = useState(0);
  const gatewayRef = useRef<GatewayClient | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const micRef = useRef<MicStream | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fpsFramesRef = useRef<number[]>([]);
  const lastPingRef = useRef<number>(0);

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

      // Connect to gateway with transcript, error, and RTT callbacks
      gateway.connect(
        (audioData, timestamp) => {
          player.addChunk(audioData);
          setPipelineStatus('speaking');
          // Auto-reset to listening after audio finishes
          if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
          statusTimeoutRef.current = setTimeout(() => setPipelineStatus('listening'), 1000);
        },
        (speaker, text) => {
          setTranscript((prev) => [...prev, { speaker, text, timestamp: Date.now() }]);
          if (speaker === 'child') {
            setPipelineStatus('thinking');
          }
        },
        (message, code) => {
          console.error(`Gateway error [${code}]:`, message);
          setLastError(`${code ? `[${code}] ` : ''}${message}`);
          setPipelineStatus('idle');
        },
        (rttMs) => {
          setRtt(rttMs);
        }
      );

      setConnected(true);

      // Update buffered audio display and FPS
      const interval = setInterval(() => {
        setBufferedMs(player.getBufferedMs());

        // Calculate FPS
        const now = performance.now();
        fpsFramesRef.current.push(now);
        fpsFramesRef.current = fpsFramesRef.current.filter((t) => now - t < 1000);
        setFps(fpsFramesRef.current.length);
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
      setPipelineStatus('listening');
    } catch (err) {
      console.error('Failed to start microphone:', err);
      alert('Microphone access denied. Please allow microphone permission.');
      setPipelineStatus('idle');
    }
  };

  const handleStopMic = () => {
    const mic = micRef.current;
    const gateway = gatewayRef.current;

    if (!mic || !gateway) return;

    mic.stop();
    gateway.stop();
    setMicActive(false);
    setPipelineStatus('idle');
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
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
        <strong>V0.5 - Performance & Reliability</strong>
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

      {/* Pipeline Status Indicator */}
      {micActive && (
        <div
          style={{
            marginTop: '8px',
            padding: '6px 8px',
            background:
              pipelineStatus === 'listening'
                ? 'rgba(100,150,255,0.5)'
                : pipelineStatus === 'thinking'
                  ? 'rgba(255,200,50,0.5)'
                  : pipelineStatus === 'speaking'
                    ? 'rgba(255,100,100,0.5)'
                    : 'rgba(128,128,128,0.5)',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {pipelineStatus === 'listening' && '🎤 Listening...'}
          {pipelineStatus === 'transcribing' && '📝 Transcribing...'}
          {pipelineStatus === 'thinking' && '🤔 Santa is thinking...'}
          {pipelineStatus === 'speaking' && '🎅 Santa is speaking...'}
        </div>
      )}

      {/* Error Display */}
      {lastError && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px',
            background: 'rgba(255,50,50,0.8)',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          ⚠️ {lastError}
        </div>
      )}

      {/* Telemetry Overlay - V0.5 */}
      {connected && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px',
            background: 'rgba(50,50,50,0.7)',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Telemetry:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <div>FPS: {fps}</div>
            <div>RTT: {rtt}ms</div>
            <div>Buffer: {Math.round(bufferedMs)}ms</div>
            <div>Viseme: {currentViseme}</div>
          </div>
        </div>
      )}

      {/* Transcript Display - Always visible */}
      <div
        style={{
          marginTop: '10px',
          padding: '8px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '4px',
          maxHeight: '200px',
          minHeight: '80px',
          overflowY: 'auto',
          fontSize: '11px',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Conversation:</div>
        {transcript.length === 0 ? (
          <div style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '10px' }}>
            Start chatting to see the conversation here...
          </div>
        ) : (
          transcript.map((entry, idx) => (
            <div
              key={idx}
              style={{
                marginTop: idx > 0 ? '5px' : 0,
                padding: '4px',
                background:
                  entry.speaker === 'child' ? 'rgba(100,150,255,0.3)' : 'rgba(255,100,100,0.3)',
                borderRadius: '3px',
              }}
            >
              <strong>{entry.speaker === 'child' ? '👦 Child' : '🎅 Santa'}:</strong> {entry.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
