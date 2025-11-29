// OpenAI Whisper ASR adapter
// Converts audio chunks to text transcripts
import OpenAI from 'openai';
import { logger } from '../../util/logger';
import { Readable } from 'stream';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class WhisperASR {
  private audioBuffer: Buffer[] = [];
  private isProcessing = false;

  async transcribe(audioChunk: Uint8Array): Promise<string | null> {
    // Accumulate audio chunks
    this.audioBuffer.push(Buffer.from(audioChunk));

    // Wait for ~2 seconds of audio before transcribing (16kHz * 2s * 2 bytes = 64KB)
    const totalSize = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);

    if (totalSize < 64000 || this.isProcessing) {
      return null; // Not enough audio yet or already processing
    }

    this.isProcessing = true;

    try {
      // Combine all buffered audio
      const combinedBuffer = Buffer.concat(this.audioBuffer);
      this.audioBuffer = []; // Clear buffer

      // Convert PCM to WAV format for Whisper
      const wavBuffer = pcmToWav(combinedBuffer, 16000, 1);

      // Create a stream from the buffer
      const audioStream = Readable.from(wavBuffer);
      (audioStream as any).path = 'audio.wav'; // Whisper needs a filename hint

      // Call Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioStream,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
      });

      logger.info(`Transcription: "${transcription}"`);
      return transcription.trim();
    } catch (error) {
      logger.error(`Whisper transcription failed: ${error}`);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  reset() {
    this.audioBuffer = [];
    this.isProcessing = false;
  }
}

// Convert raw PCM to WAV format
function pcmToWav(pcmBuffer: Buffer, sampleRate: number, channels: number): Buffer {
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const wavBuffer = Buffer.alloc(headerSize + dataSize);

  // WAV header
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + dataSize, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16); // PCM format chunk size
  wavBuffer.writeUInt16LE(1, 20); // Audio format (1 = PCM)
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(sampleRate * channels * 2, 28); // Byte rate
  wavBuffer.writeUInt16LE(channels * 2, 32); // Block align
  wavBuffer.writeUInt16LE(16, 34); // Bits per sample
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);

  // Copy PCM data
  pcmBuffer.copy(wavBuffer, headerSize);

  return wavBuffer;
}
