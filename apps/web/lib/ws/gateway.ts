// WebSocket client for gateway communication
// Child-safety-first: secure WSS, no recording, safe error handling
import type { GatewayClientMsg, GatewayServerMsg } from 'shared';
import { useVisemeStore } from '../../state/visemeStore';

export class GatewayClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onAudioChunk: ((audio: Uint8Array, tsFirstSample: number) => void) | null = null;

  constructor(private url: string) {}

  connect(onAudioChunk: (audio: Uint8Array, tsFirstSample: number) => void) {
    this.onAudioChunk = onAudioChunk;

    try {
      // Use WS for local dev, WSS for production
      const wsUrl = this.url.replace('http://', 'ws://').replace('https://', 'wss://');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Gateway connected');
        // Send start control message
        this.sendMessage({ type: 'control.start' });
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
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('Failed to connect to gateway:', err);
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: GatewayServerMsg) {
    switch (message.type) {
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
        break;

      case 'metrics':
        console.log('Server metrics:', message.data);
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
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Reconnect after 3 seconds
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect...');
      if (this.onAudioChunk) {
        this.connect(this.onAudioChunk);
      }
    }, 3000);
  }

  sendAudioChunk(bytes: Uint8Array, timestamp: number) {
    this.sendMessage({
      type: 'audio.chunk',
      ts: timestamp,
      bytes,
    });
  }

  stop() {
    this.sendMessage({ type: 'control.stop' });
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
