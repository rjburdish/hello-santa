// Microphone stream capture and processing
// Child-safety-first: audio-only (no camera), no recording

export class MicStream {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isActive = false;
  private onAudioData: ((data: Uint8Array, timestamp: number) => void) | null = null;

  async start(onAudioData: (data: Uint8Array, timestamp: number) => void) {
    this.onAudioData = onAudioData;

    try {
      // Request microphone access - AUDIO ONLY, NO CAMERA
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Request 16kHz if possible
        },
        video: false, // NEVER request camera
      });

      console.log('Microphone access granted');

      // Create audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create processor for capturing audio data
      // Buffer size: 4096 samples = ~256ms at 16kHz
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isActive) return;

        const inputData = e.inputBuffer.getChannelData(0); // Mono channel

        // Simple VAD: check if audio has meaningful energy
        if (this.hasVoiceActivity(inputData)) {
          // Convert Float32 to Int16 PCM
          const pcmData = this.float32ToInt16(inputData);
          const timestamp = Date.now();

          if (this.onAudioData) {
            this.onAudioData(pcmData, timestamp);
          }
        }
      };

      // Connect nodes
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isActive = true;
      console.log('Microphone streaming started');
    } catch (err) {
      console.error('Failed to access microphone:', err);
      throw err;
    }
  }

  stop() {
    this.isActive = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    console.log('Microphone streaming stopped');
  }

  private hasVoiceActivity(samples: Float32Array): boolean {
    // Simple energy-based VAD
    // Calculate RMS (root mean square) energy
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);

    // Threshold for voice activity (tune as needed)
    const threshold = 0.01;
    return rms > threshold;
  }

  private float32ToInt16(float32Array: Float32Array): Uint8Array {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit PCM
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    // Convert to Uint8Array (byte representation)
    return new Uint8Array(int16Array.buffer);
  }

  getState(): 'inactive' | 'active' {
    return this.isActive ? 'active' : 'inactive';
  }
}
