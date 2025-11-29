// WebSocket message contracts for gateway communication
// Child-safety-first: secure transport, no recording in V0

// Client -> Server messages
export type GatewayClientMsg =
  | { type: 'control.start' }
  | { type: 'control.stop' }
  | { type: 'audio.chunk'; ts: number; bytes: Uint8Array }
  | { type: 'ping'; ts: number };

// Server -> Client messages
export type GatewayServerMsg =
  | { type: 'asr.partial'; text: string }
  | { type: 'asr.final'; text: string }
  | { type: 'santa.response'; text: string }
  | {
      type: 'tts.audio';
      codec: string;
      tsFirstSample: number;
      bytes: Uint8Array;
    }
  | {
      type: 'viseme';
      id: string;
      startMs: number;
      endMs: number;
      strength: number;
    }
  | { type: 'error'; message: string; code?: string }
  | { type: 'metrics'; data: Record<string, number> }
  | { type: 'pong'; ts: number };
