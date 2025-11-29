// WebSocket handler - V0.4 implementation
// Full ASR → LLM → TTS pipeline with child-safety
import type { WebSocket } from 'ws';
import type { FastifyRequest } from 'fastify';
import type { GatewayClientMsg, GatewayServerMsg, OVRViseme } from 'shared';
import { logger } from './util/logger';
import { RateLimiter } from './util/rateLimit';
import { WhisperASR } from './adapters/asr/whisper';
import { SantaLLM } from './adapters/llm/santa';
import { OpenAITTS } from './adapters/tts/openai-tts';

// Rate limiter: 100 messages per 60 seconds per client
const rateLimiter = new RateLimiter(100, 60000);

// Track active connections for metrics
let activeConnections = 0;

// Heartbeat configuration
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const IDLE_TIMEOUT = 120000; // 2 minutes

export function handleConnection(ws: WebSocket, req: FastifyRequest) {
  const clientId = req.ip || 'unknown';
  activeConnections++;

  logger.info(
    `WebSocket connection established - activeConnections: ${activeConnections}, clientId: ${clientId}`
  );

  // Initialize adapters for this connection
  const asr = new WhisperASR();
  const llm = new SantaLLM();
  const tts = new OpenAITTS();

  // Heartbeat tracking
  let lastActivity = Date.now();
  let heartbeatInterval: NodeJS.Timeout | null = null;

  // Start heartbeat check
  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    if (now - lastActivity > IDLE_TIMEOUT) {
      logger.warn(`Closing idle connection - clientId: ${clientId}`);
      ws.close(1000, 'Idle timeout');
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  ws.on('message', async (data: Buffer) => {
    // Update last activity timestamp
    lastActivity = Date.now();

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

        case 'ping':
          // Respond with pong
          const pongMsg: GatewayServerMsg = {
            type: 'pong',
            ts: message.ts,
          };
          ws.send(JSON.stringify(pongMsg));
          break;

        case 'audio.chunk':
          // V0.4: Full ASR → LLM → TTS pipeline
          logger.info(`Audio chunk received - bytes type: ${typeof message.bytes}, length: ${message.bytes?.length || 0}`);

          if (message.bytes && message.bytes.length > 0) {
            try {
              // Step 1: ASR - Convert audio to text
              const transcript = await asr.transcribe(new Uint8Array(message.bytes as any));

              if (transcript) {
                logger.info(`Child said: "${transcript}"`);

                // Send transcript to client (for UI display)
                const asrMsg: GatewayServerMsg = {
                  type: 'asr.final',
                  text: transcript,
                };
                ws.send(JSON.stringify(asrMsg));

                // Step 2: LLM - Generate Santa's response
                const santaResponse = await llm.generateResponse(transcript);

                if (santaResponse) {
                  logger.info(`Santa says: "${santaResponse}"`);

                  // Send Santa's transcript to client
                  const santaMsg: GatewayServerMsg = {
                    type: 'santa.response',
                    text: santaResponse,
                  };
                  ws.send(JSON.stringify(santaMsg));

                  // Step 3: TTS - Convert text to speech with visemes
                  await tts.synthesize(
                    santaResponse,
                    (audioChunk, timestamp) => {
                      // Send audio to client
                      const audioMsg: GatewayServerMsg = {
                        type: 'tts.audio',
                        codec: 'pcm',
                        tsFirstSample: timestamp,
                        bytes: audioChunk as any,
                      };
                      ws.send(JSON.stringify(audioMsg));
                    },
                    (viseme: OVRViseme, startMs, endMs) => {
                      // Send viseme to client
                      const visemeMsg: GatewayServerMsg = {
                        type: 'viseme',
                        id: viseme,
                        startMs,
                        endMs,
                        strength: 0.8,
                      };
                      ws.send(JSON.stringify(visemeMsg));
                    }
                  );
                }
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger.error(`Pipeline error: ${errorMessage}`);

              // Send detailed error to client
              let userMessage = 'Failed to process audio';
              let errorCode = 'PIPELINE_ERROR';

              if (errorMessage.includes('429') || errorMessage.includes('quota')) {
                userMessage = 'OpenAI API quota exceeded. Please check your billing.';
                errorCode = 'QUOTA_EXCEEDED';
              } else if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
                userMessage = 'API authentication failed. Please check your API key.';
                errorCode = 'AUTH_ERROR';
              }

              const errorMsg: GatewayServerMsg = {
                type: 'error',
                message: userMessage,
                code: errorCode,
              };
              ws.send(JSON.stringify(errorMsg));
            }
          }
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

  ws.on('error', (error) => {
    logger.error(`WebSocket error - client: ${clientId}, error: ${error.message}`);
  });

  ws.on('close', () => {
    activeConnections--;
    logger.info(
      `WebSocket connection closed - activeConnections: ${activeConnections}, clientId: ${clientId}`
    );

    // Clean up heartbeat interval
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Clean up adapters
    asr.reset();
    llm.reset();
  });
}
