import { DemodMode } from '../types/radio';

class SdrAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private signalGain: GainNode | null = null;
  private bandpassFilter: BiquadFilterNode | null = null;
  private toneOsc: OscillatorNode | null = null;
  private toneGain: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private isInitialized = false;
  private isMuted = false;
  private volume = 0.65;
  private isSquelchOpen = false;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime = 0;
  private morseIntervalId: any = null;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      // Media Destination for Recording
      this.mediaStreamDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.mediaStreamDest);
      this.masterGain.connect(this.ctx.destination);

      // Noise Subsystem (White noise looped buffer)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.15;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      // Bandpass Filter
      this.bandpassFilter = this.ctx.createBiquadFilter();
      this.bandpassFilter.type = 'bandpass';
      this.bandpassFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.bandpassFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.noiseNode.connect(this.bandpassFilter);
      this.bandpassFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);

      this.noiseNode.start();

      // Signal Generator Subsystem
      this.signalGain = this.ctx.createGain();
      this.signalGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.signalGain.connect(this.masterGain);

      // Demodulated Tone / Carrier
      this.toneOsc = this.ctx.createOscillator();
      this.toneOsc.type = 'sine';
      this.toneOsc.frequency.setValueAtTime(700, this.ctx.currentTime);

      this.toneGain = this.ctx.createGain();
      this.toneGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.toneOsc.connect(this.toneGain);
      this.toneGain.connect(this.signalGain);
      this.toneOsc.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
  }

  public getIsMuted() {
    return this.isMuted;
  }

  public getVolume() {
    return this.volume;
  }

  public isReady() {
    return this.isInitialized && this.ctx?.state === 'running';
  }

  // Set filter bandwidth & mode characteristics
  public updateMode(mode: DemodMode, bandwidthHz: number) {
    if (!this.bandpassFilter || !this.ctx) return;
    const now = this.ctx.currentTime;
    
    switch (mode) {
      case 'CW':
        this.bandpassFilter.frequency.setTargetAtTime(700, now, 0.05);
        this.bandpassFilter.Q.setTargetAtTime(6.0, now, 0.05);
        if (this.toneOsc) this.toneOsc.frequency.setTargetAtTime(700, now, 0.05);
        break;
      case 'AM':
        this.bandpassFilter.frequency.setTargetAtTime(1500, now, 0.05);
        this.bandpassFilter.Q.setTargetAtTime(0.8, now, 0.05);
        break;
      case 'USB':
        this.bandpassFilter.frequency.setTargetAtTime(1700, now, 0.05);
        this.bandpassFilter.Q.setTargetAtTime(1.5, now, 0.05);
        break;
      case 'LSB':
        this.bandpassFilter.frequency.setTargetAtTime(1200, now, 0.05);
        this.bandpassFilter.Q.setTargetAtTime(1.5, now, 0.05);
        break;
      case 'WFM':
        this.bandpassFilter.frequency.setTargetAtTime(3500, now, 0.05);
        this.bandpassFilter.Q.setTargetAtTime(0.5, now, 0.05);
        break;
      default: // NFM, DMR, FM
        this.bandpassFilter.frequency.setTargetAtTime(1800, now, 0.05);
        this.bandpassFilter.Q.setTargetAtTime(1.2, now, 0.05);
        break;
    }
  }

  // Squelch click and gate handling
  public setSquelchState(
    open: boolean, 
    signalStrengthDbm: number, 
    mode: DemodMode, 
    activeSignalType?: string,
    isCwStation: boolean = false
  ) {
    if (!this.ctx || !this.signalGain || !this.noiseGain) return;
    const now = this.ctx.currentTime;

    if (open !== this.isSquelchOpen) {
      // Tactical squelch click
      this.playSquelchClick(open);
      this.isSquelchOpen = open;
    }

    if (open) {
      // In NFM/FM with strong carrier, noise floor drops dramatically (quieting)
      const quieting = Math.min(0.85, Math.max(0.1, (signalStrengthDbm + 110) / 70));
      this.noiseGain.gain.setTargetAtTime(0.015 * (1 - quieting * 0.8), now, 0.05);

      // Signal level proportional to RSSI
      const sigGain = Math.min(0.4, Math.max(0.05, (signalStrengthDbm + 120) / 100));
      this.signalGain.gain.setTargetAtTime(sigGain, now, 0.05);

      if (isCwStation) {
        this.startCwBeep();
      } else if (activeSignalType === 'APRS') {
        this.startPacketTones();
      } else if (activeSignalType === 'FT8') {
        this.startFt8Tones();
      } else if (activeSignalType === 'WWV') {
        this.startWwvTicks();
      } else {
        this.startVoiceSimulation();
      }
    } else {
      // Squelch closed: mute signal, set quiet standby or noise floor
      this.signalGain.gain.setTargetAtTime(0, now, 0.04);
      // Closed squelch means silence or very faint background hiss
      this.noiseGain.gain.setTargetAtTime(0.005, now, 0.05);
      this.stopCustomTones();
    }
  }

  private playSquelchClick(opening: boolean) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(opening ? 850 : 320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (_) {}
  }

  private startCwBeep() {
    if (this.morseIntervalId) return;
    if (!this.toneGain || !this.ctx) return;
    
    // Pattern: CQ (...-.-)
    const pattern = [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0];
    let step = 0;
    this.morseIntervalId = setInterval(() => {
      if (!this.toneGain || !this.ctx) return;
      const on = pattern[step % pattern.length];
      const now = this.ctx.currentTime;
      this.toneGain.gain.setTargetAtTime(on ? 0.35 : 0, now, 0.008);
      step++;
    }, 90);
  }

  private startPacketTones() {
    if (this.morseIntervalId) return;
    if (!this.toneGain || !this.toneOsc || !this.ctx) return;

    // AFSK 1200 / 2200 Hz bursts
    let step = 0;
    this.morseIntervalId = setInterval(() => {
      if (!this.toneGain || !this.toneOsc || !this.ctx) return;
      const now = this.ctx.currentTime;
      const freq = step % 2 === 0 ? 1200 : 2200;
      this.toneOsc.frequency.setValueAtTime(freq, now);
      this.toneGain.gain.setTargetAtTime(0.2, now, 0.005);
      step++;
      if (step > 25 && step < 50) {
        this.toneGain.gain.setTargetAtTime(0, now, 0.01);
      }
      if (step >= 50) step = 0;
    }, 45);
  }

  private startFt8Tones() {
    if (this.morseIntervalId) return;
    if (!this.toneGain || !this.toneOsc || !this.ctx) return;

    const tones = [1264, 1312, 1375, 1420, 1480, 1540, 1600];
    let step = 0;
    this.morseIntervalId = setInterval(() => {
      if (!this.toneGain || !this.toneOsc || !this.ctx) return;
      const now = this.ctx.currentTime;
      const f = tones[step % tones.length];
      this.toneOsc.frequency.setValueAtTime(f, now);
      this.toneGain.gain.setTargetAtTime(0.18, now, 0.01);
      step++;
    }, 160);
  }

  private startWwvTicks() {
    if (this.morseIntervalId) return;
    if (!this.toneGain || !this.toneOsc || !this.ctx) return;

    this.morseIntervalId = setInterval(() => {
      if (!this.toneGain || !this.toneOsc || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.toneOsc.frequency.setValueAtTime(1000, now);
      this.toneGain.gain.setValueAtTime(0.3, now);
      this.toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }, 1000);
  }

  private startVoiceSimulation() {
    if (!this.toneGain || !this.toneOsc || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Low voice frequency modulation formant simulation
    this.toneOsc.frequency.setValueAtTime(450, now);
    this.toneGain.gain.setTargetAtTime(0.06, now, 0.05);
  }

  private stopCustomTones() {
    if (this.morseIntervalId) {
      clearInterval(this.morseIntervalId);
      this.morseIntervalId = null;
    }
    if (this.toneGain && this.ctx) {
      this.toneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    }
  }

  // Audio Recording Capability
  public startRecording(): boolean {
    if (!this.mediaStreamDest) return false;
    try {
      this.recordedChunks = [];
      this.recordingStartTime = Date.now();
      
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const options = selectedMime ? { mimeType: selectedMime } : undefined;
      this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(250);
      return true;
    } catch (e) {
      console.error('Failed to start recording:', e);
      return false;
    }
  }

  public stopRecording(): Promise<{ blobUrl: string; durationSec: number } | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const durationSec = Math.max(1, Math.round((Date.now() - this.recordingStartTime) / 1000));
        this.recordedChunks = [];
        resolve({ blobUrl, durationSec });
      };

      this.mediaRecorder.stop();
    });
  }

  public isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}

export const audioEngine = new SdrAudioEngine();
