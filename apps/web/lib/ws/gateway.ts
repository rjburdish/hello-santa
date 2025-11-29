// WebSocket client for gateway communication
// Child-safety-first: secure WSS, no recording, safe error handling
import type { GatewayClientMsg, GatewayServerMsg } from 'shared';
import { useVisemeStore } from '../../state/visemeStore';

export class GatewayClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private onAudioChunk: ((audio: Uint8Array, tsFirstSample: number) => void) | null = null;
  private onTranscript: ((speaker: 'child' | 'santa', text: string) => void) | null = null;
  private onError: ((message: string, code?: string) => void) | null = null;
  private onRttUpdate: ((rtt: number) => void) | null = null;
  private lastPingTs: number = 0;

  constructor(private url: string) {}

  connect(
    onAudioChunk: (audio: Uint8Array, tsFirstSample: number) => void,
    onTranscript?: (speaker: 'child' | 'santa', text: string) => void,
    onError?: (message: string, code?: string) => void,
    onRttUpdate?: (rtt: number) => void
  ) {
    this.onAudioChunk = onAudioChunk;
    this.onTranscript = onTranscript || null;
    this.onError = onError || null;
    this.onRttUpdate = onRttUpdate || null;

    try {
      // Use WS for local dev, WSS for production
      const wsUrl = this.url.replace('http://', 'ws://').replace('https://', 'wss://');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Gateway connected');
        // Send start control message
        this.sendMessage({ type: 'control.start' });

        // Start ping interval (every 20 seconds)
        this.pingInterval = setInterval(() => {
          const ts = Date.now();
          this.lastPingTs = ts;
          this.sendMessage({ type: 'ping', ts });
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: GatewayServerMsg = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error('Failed to parse server message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Gateway disconnected');

        // Clean up ping interval immediately
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('Failed to connect to gateway:', err);
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: GatewayServerMsg) {
    console.log('Received message:', message.type, message);

    switch (message.type) {
      case 'asr.final':
        // Child's transcript
        console.log('ASR final:', message.text);
        if (this.onTranscript) {
          this.onTranscript('child', message.text);
        }
        break;

      case 'santa.response':
        // Santa's transcript
        console.log('Santa response:', message.text);
        if (this.onTranscript) {
          this.onTranscript('santa', message.text);
        }
        break;

      case 'viseme':
        // Update viseme store with server-driven visemes
        useVisemeStore.getState().setViseme(message.id as any, message.strength);
        break;

      case 'tts.audio':
        // Pass audio chunk to player
        if (this.onAudioChunk && message.bytes) {
          // Convert array/object back to Uint8Array
          let audioData: Uint8Array;
          if (message.bytes instanceof Uint8Array) {
            audioData = message.bytes;
          } else if (Array.isArray(message.bytes)) {
            audioData = new Uint8Array(message.bytes);
          } else if (typeof message.bytes === 'object') {
            // Handle object with numeric keys
            const values = Object.values(message.bytes as any);
            audioData = new Uint8Array(values as number[]);
          } else {
            console.error('Invalid audio data format:', typeof message.bytes);
            break;
          }
          this.onAudioChunk(audioData, message.tsFirstSample);
        }
        break;

      case 'error':
        console.error('Server error:', message.message, message.code);
        if (this.onError) {
          this.onError(message.message, message.code);
        }
        break;

      case 'metrics':
        console.log('Server metrics:', message.data);
        break;

      case 'pong':
        // Calculate RTT
        const rtt = Date.now() - message.ts;
        if (this.onRttUpdate) {
          this.onRttUpdate(rtt);
        }
        break;

      default:
        console.warn('Unknown server message type:', (message as any).type);
    }
  }

  private sendMessage(message: GatewayClientMsg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private scheduleReconnect() {
    // Only reconnect if callbacks are still registered (prevents zombie state)
    if (!this.onAudioChunk) {
      console.log('No callbacks registered, skipping reconnect');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Clean up old WebSocket before reconnecting
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws = null;
    }

    // Reconnect after 3 seconds
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect(
        this.onAudioChunk!,
        this.onTranscript || undefined,
        this.onError || undefined,
        this.onRttUpdate || undefined
      );
    }, 3000);
  }

  sendAudioChunk(bytes: Uint8Array, timestamp: number) {
    this.sendMessage({
      type: 'audio.chunk',
      ts: timestamp,
      bytes: Array.from(bytes), // Convert Uint8Array to regular array for JSON serialization
    });
  }

  stop() {
    this.sendMessage({ type: 'control.stop' });
  }

  disconnect() {
    // Clear all callbacks to prevent zombie reconnects
    this.onAudioChunk = null;
    this.onTranscript = null;
    this.onError = null;
    this.onRttUpdate = null;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      // Clean up event handlers before closing
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
