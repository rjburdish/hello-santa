import 'dotenv/config';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { logger } from './util/logger';
import { handleConnection } from './wsHandler';

const fastify = Fastify({
  logger: true,
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8787;
const HOST = process.env.HOST || '0.0.0.0';

const start = async () => {
  try {
    // Register WebSocket plugin
    await fastify.register(websocket);

    // Health check endpoint
    fastify.get('/health', async () => {
      return { status: 'ok', service: 'media-gateway' };
    });

    // WebSocket endpoint for client connections
    fastify.register(async (fastify) => {
      fastify.get('/ws', { websocket: true }, (socket, req) => {
        logger.info('New WebSocket connection');
        handleConnection(socket, req);
      });
    });

    await fastify.listen({ port: PORT, host: HOST });
    logger.info(`media-gateway listening on ${HOST}:${PORT}`);
  } catch (err) {
    logger.error(err as Error);
    process.exit(1);
  }
};

start();
