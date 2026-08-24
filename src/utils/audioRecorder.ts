/**
 * Utility for capturing real audio from the device / phone microphone
 * using the Web MediaRecorder API and Web Audio API Analyser for real-time waveform.
 */

export interface RecordingResult {
  blob: Blob;
  dataUrl: string;
  duration: number;
}

export class RealAudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private startTime: number = 0;
  private animationFrameId: number | null = null;

  public isRecording: boolean = false;
  public onVolumeChange?: (volume: number, frequencyData: number[]) => void;

  async start(): Promise<void> {
    this.audioChunks = [];
    this.isRecording = true;
    this.startTime = Date.now();

    // 1. Request microphone access from user's phone / device
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      this.isRecording = false;
      throw new Error('Não foi possível acessar o microfone. Verifique as permissões do dispositivo.');
    }

    // 2. Set up Web Audio API Analyser for real live waveform from cell phone mic
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolumeLoop = () => {
        if (!this.isRecording || !this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        const normalizedBars: number[] = [];
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
          normalizedBars.push(Math.round((dataArray[i] / 255) * 100));
        }
        const avg = sum / bufferLength;
        const normalizedVolume = Math.min(100, Math.round((avg / 255) * 100));

        if (this.onVolumeChange) {
          this.onVolumeChange(normalizedVolume, normalizedBars.slice(0, 16));
        }

        this.animationFrameId = requestAnimationFrame(updateVolumeLoop);
      };

      this.animationFrameId = requestAnimationFrame(updateVolumeLoop);
    } catch (e) {
      console.warn('AudioContext analyser could not be initialized:', e);
    }

    // 3. Initialize MediaRecorder with supported mimeType
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/aac',
    ];
    let selectedMimeType = '';
    for (const mime of mimeTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        break;
      }
    }

    const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
    this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // chunk every 100ms
  }

  async stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        reject(new Error('Nenhuma gravação ativa.'));
        return;
      }

      const durationSecs = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        // Convert to Base64 data URL so it can be stored and played anywhere
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          this.cleanup();
          resolve({
            blob: audioBlob,
            dataUrl: base64Data,
            duration: durationSecs,
          });
        };
        reader.onerror = () => {
          this.cleanup();
          reject(new Error('Erro ao processar gravação de áudio.'));
        };
        reader.readAsDataURL(audioBlob);
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  cancel(): void {
    this.isRecording = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isRecording = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
      this.analyser = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.audioChunks = [];
  }
}
