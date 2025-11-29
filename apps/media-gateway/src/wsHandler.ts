// WebSocket handler - V0.2 implementation
// Child-safety-first: rate limiting, safe logging, no payload storage
import type { WebSocket } from 'ws';
import type { FastifyRequest } from 'fastify';
import type { GatewayClientMsg, GatewayServerMsg } from 'shared';
import { logger } from './util/logger';
import { RateLimiter } from './util/rateLimit';

// Rate limiter: 100 messages per 60 seconds per client
const rateLimiter = new RateLimiter(100, 60000);

// Track active connections for metrics
let activeConnections = 0;

export function handleConnection(ws: WebSocket, req: FastifyRequest) {
  const clientId = req.ip || 'unknown';
  activeConnections++;

  logger.info(
    `WebSocket connection established - activeConnections: ${activeConnections}, clientId: ${clientId}`
  );

  // Start fake audio/viseme stream immediately on connection
  startFakeStream(ws);

  ws.on('message', (data: Buffer) => {
    // Rate limit check
    if (!rateLimiter.checkLimit(clientId)) {
      logger.warn(`Rate limit exceeded for client: ${clientId}`);
      const errorMsg: GatewayServerMsg = {
        type: 'error',
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
      };
      ws.send(JSON.stringify(errorMsg));
      ws.close(1008, 'Rate limit exceeded');
      return;
    }

    try {
      const message = JSON.parse(data.toString()) as GatewayClientMsg;

      // Safe logging - no payloads
      logger.info(`Message received - type: ${message.type}, client: ${clientId}`);

      // Handle different message types
      switch (message.type) {
        case 'control.start':
          logger.info('Client started session');
          break;

        case 'control.stop':
          logger.info('Client stopped session');
          break;

        case 'audio.chunk':
          // V0.2: discard audio chunks, just log count
          // Real processing will be in V0.4
          break;

        default:
          logger.warn(`Unknown message type: ${(message as any).type}`);
      }
    } catch (err) {
      logger.error(`Failed to parse message: ${err}`);
      const errorMsg: GatewayServerMsg = {
        type: 'error',
        message: 'Invalid message format',
        code: 'PARSE_ERROR',
      };
      ws.send(JSON.stringify(errorMsg));
    }
  });

  ws.on('close', () => {
    activeConnections--;
    logger.info(
      `WebSocket connection closed - activeConnections: ${activeConnections}, clientId: ${clientId}`
    );
  });

  ws.on('error', (error) => {
    logger.error(`WebSocket error - client: ${clientId}, error: ${error.message}`);
  });
}

// Fake audio/viseme stream generator for V0.2 testing
// Placeholder - will be replaced with real TTS in V0.4
function startFakeStream(ws: WebSocket) {
  const visemeSequence = ['aa', 'e', 'ih', 'oh', 'ou', 'sil', 'fv', 'm', 'l', 's', 'sil'];
  let visemeIndex = 0;
  let audioTimeMs = 0;

  const interval = setInterval(() => {
    if (ws.readyState !== ws.OPEN) {
      clearInterval(interval);
      return;
    }

    // Send fake viseme event
    const viseme = visemeSequence[visemeIndex];
    const visemeMsg: GatewayServerMsg = {
      type: 'viseme',
      id: viseme,
      startMs: audioTimeMs,
      endMs: audioTimeMs + 300,
      strength: 0.8,
    };
    ws.send(JSON.stringify(visemeMsg));

    // Send fake audio chunk (simple sine wave as base64)
    // In reality, this would be actual TTS audio
    const fakeAudioChunk = generateFakeAudioChunk(200); // 200ms chunk
    const audioMsg: GatewayServerMsg = {
      type: 'tts.audio',
      codec: 'pcm',
      tsFirstSample: audioTimeMs,
      bytes: fakeAudioChunk,
    };
    ws.send(JSON.stringify(audioMsg));

    visemeIndex = (visemeIndex + 1) % visemeSequence.length;
    audioTimeMs += 300;
  }, 300); // Send every 300ms

  // Cleanup on disconnect
  ws.on('close', () => clearInterval(interval));
}

// Generate fake audio chunk (simple sine wave)
// Placeholder for real TTS audio in V0.4
function generateFakeAudioChunk(durationMs: number): Uint8Array {
  const sampleRate = 16000; // 16kHz mono
  const samples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new Uint8Array(samples * 2); // 16-bit PCM
  const frequency = 200; // Low frequency for "voice-like" sound

  for (let i = 0; i < samples; i++) {
    const value = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3;
    const sample = Math.floor(value * 32767);
    buffer[i * 2] = sample & 0xff;
    buffer[i * 2 + 1] = (sample >> 8) & 0xff;
  }

  return buffer;
}
