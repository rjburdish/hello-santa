// WebSocket handler stub - will be implemented in V0.2
import type { WebSocket } from 'ws';
import { logger } from './util/logger';

export function handleConnection(ws: WebSocket) {
  logger.info('WebSocket connection established');

  ws.on('message', (data) => {
    logger.info('Received message');
    // Message handling will be implemented in V0.2
  });

  ws.on('close', () => {
    logger.info('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    logger.error(error);
  });
}
