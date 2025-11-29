// OpenAI TTS adapter with estimated viseme generation
// Uses 'onyx' voice (deep male) as closest to Santa
import OpenAI from 'openai';
import { logger } from '../../util/logger';
import type { OVRViseme } from 'shared';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAITTS {
  async synthesize(
    text: string,
    onAudioChunk: (audio: Buffer, timestamp: number) => void,
    onViseme: (viseme: OVRViseme, startMs: number, endMs: number) => void
  ): Promise<void> {
    try {
      // Generate speech with OpenAI TTS
      const response = await openai.audio.speech.create({
        model: 'tts-1', // Fast model
        voice: 'onyx', // Deep male voice (closest to Santa)
        input: text,
        response_format: 'pcm', // 16-bit PCM
        speed: 0.95, // Slightly slower for Santa's deliberate speech
      });

      // Get audio buffer
      const buffer = Buffer.from(await response.arrayBuffer());

      // Estimate visemes based on text
      // NOTE: This is a simple estimation. V0.5+ could use Azure TTS or phoneme library
      const visemeSequence = estimateVisemesFromText(text);
      const audioDurationMs = (buffer.length / 2 / 24000) * 1000; // 24kHz mono 16-bit PCM
      const msPerViseme = audioDurationMs / visemeSequence.length;

      // Send viseme events with timing
      visemeSequence.forEach((viseme, index) => {
        const startMs = index * msPerViseme;
        const endMs = (index + 1) * msPerViseme;
        setTimeout(() => {
          onViseme(viseme, startMs, endMs);
        }, startMs);
      });

      // Send audio in chunks (~200ms each)
      const chunkSize = 9600; // 200ms at 24kHz * 2 bytes
      let offset = 0;
      let timestamp = 0;

      while (offset < buffer.length) {
        const chunk = buffer.slice(offset, offset + chunkSize);
        setTimeout(() => {
          onAudioChunk(chunk, timestamp);
        }, timestamp);

        offset += chunkSize;
        timestamp += 200;
      }

      logger.info(`TTS completed: ${text.length} chars, ${audioDurationMs.toFixed(0)}ms`);
    } catch (error) {
      logger.error(`TTS synthesis failed: ${error}`);
      throw error;
    }
  }
}

// Simple viseme estimation based on text analysis
// Maps common phoneme patterns to OVR visemes
function estimateVisemesFromText(text: string): OVRViseme[] {
  const visemes: OVRViseme[] = [];
  const words = text.toLowerCase().split(/\s+/);

  for (const word of words) {
    // Break word into rough phoneme-like segments
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const nextChar = word[i + 1];

      // Map characters to visemes (simplified)
      if ('aeiou'.includes(char)) {
        if (char === 'a') visemes.push('aa');
        else if (char === 'e') visemes.push('e');
        else if (char === 'i') visemes.push('ih');
        else if (char === 'o') visemes.push('oh');
        else if (char === 'u') visemes.push('ou');
      } else if ('fv'.includes(char)) {
        visemes.push('fv');
      } else if ('lr'.includes(char)) {
        visemes.push(char === 'l' ? 'l' : 'rr');
      } else if ('mn'.includes(char)) {
        visemes.push(char === 'm' ? 'm' : 'n');
      } else if ('sz'.includes(char) || (char === 'c' && nextChar === 'h')) {
        visemes.push(char === 'c' ? 'ch' : 's');
      } else if (char === 't' && nextChar === 'h') {
        visemes.push('th');
      } else {
        visemes.push('sil'); // Consonants default to minimal movement
      }
    }

    // Add brief silence between words
    visemes.push('sil');
  }

  return visemes;
}
