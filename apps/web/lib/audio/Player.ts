// WebAudio player for streaming TTS audio
// Buffers audio chunks and plays them smoothly

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private sampleRate = 16000; // 16kHz mono PCM
  private buffer: Int16Array[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;

  async init() {
    // Create AudioContext (requires user gesture)
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    await this.audioContext.resume();
    console.log('AudioPlayer initialized');
  }

  addChunk(pcmData: Uint8Array) {
    if (!this.audioContext) {
      console.warn('AudioContext not initialized');
      return;
    }

    // Validate data
    if (!pcmData || pcmData.length === 0) {
      console.warn('Received empty audio chunk');
      return;
    }

    // Convert Uint8Array (16-bit PCM) to Int16Array
    const samples = new Int16Array(
      pcmData.buffer,
      pcmData.byteOffset,
      pcmData.byteLength / 2
    );

    if (samples.length === 0) {
      console.warn('Converted samples are empty');
      return;
    }

    this.buffer.push(samples);

    // Start playing if not already
    if (!this.isPlaying) {
      this.playBuffered();
    }
  }

  private async playBuffered() {
    if (!this.audioContext || this.buffer.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    const chunk = this.buffer.shift();
    if (!chunk) {
      this.isPlaying = false;
      return;
    }

    // Convert Int16 PCM to Float32 for WebAudio
    const floatSamples = new Float32Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      floatSamples[i] = chunk[i] / 32768.0; // Normalize to -1.0 to 1.0
    }

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono
      floatSamples.length,
      this.sampleRate
    );
    audioBuffer.copyToChannel(floatSamples, 0);

    // Create source and play
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Schedule playback
    const now = this.audioContext.currentTime;
    const playTime = Math.max(now, this.nextPlayTime);
    source.start(playTime);

    // Update next play time
    this.nextPlayTime = playTime + audioBuffer.duration;

    // Schedule next chunk
    source.onended = () => {
      this.playBuffered();
    };
  }

  stop() {
    this.buffer = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }

  getBufferedMs(): number {
    if (!this.audioContext) return 0;
    const samplesBuffered = this.buffer.reduce((sum, chunk) => sum + chunk.length, 0);
    return (samplesBuffered / this.sampleRate) * 1000;
  }
}
