import Fastify from 'fastify';
import { logger } from './util/logger';

const fastify = Fastify({
  logger: true,
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8787;
const HOST = process.env.HOST || '0.0.0.0';

fastify.get('/health', async () => {
  return { status: 'ok', service: 'media-gateway' };
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    logger.info(`media-gateway listening on ${HOST}:${PORT}`);
  } catch (err) {
    logger.error(err as Error);
    process.exit(1);
  }
};

start();
