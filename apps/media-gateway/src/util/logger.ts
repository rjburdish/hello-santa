// Simple logger utility - child-safety-first: no payload/PII logging
export const logger = {
  info: (msg: string | object) => {
    console.log(JSON.stringify({ level: 'info', msg, timestamp: new Date().toISOString() }));
  },
  error: (msg: string | object | Error) => {
    const errorMsg = msg instanceof Error ? msg.message : msg;
    console.error(JSON.stringify({ level: 'error', msg: errorMsg, timestamp: new Date().toISOString() }));
  },
  warn: (msg: string | object) => {
    console.warn(JSON.stringify({ level: 'warn', msg, timestamp: new Date().toISOString() }));
  },
};
