export type DemodMode = 'AM' | 'FM' | 'NFM' | 'WFM' | 'LSB' | 'USB' | 'CW' | 'DMR';

export type WaterfallPalette = 'tactical-cyan' | 'thermal-emerald' | 'turbo' | 'night-vision';

export type StepSize = 100 | 500 | 1000 | 5000 | 6250 | 8333 | 10000 | 12500 | 25000 | 100000;

export interface RadioSignal {
  id: string;
  frequencyHz: number; // e.g. 144800000
  name: string;
  category: 'Tactical' | 'Amateur' | 'Aviation' | 'Weather' | 'Marine' | 'Utility' | 'Emergency';
  mode: DemodMode;
  bandwidthHz: number;
  nominalDbm: number; // Peak signal strength, e.g. -65
  isTransmitting: boolean;
  transmittingSchedule?: 'continuous' | 'periodic' | 'burst' | 'random';
  description: string;
  callsign?: string;
  decodedSample?: string;
  morseText?: string;
}

export interface PresetChannel {
  id: string;
  name: string;
  frequencyHz: number;
  mode: DemodMode;
  bandwidthHz: number;
  category: string;
  tag: string;
  notes?: string;
  isFavorite?: boolean;
}

export interface InterceptLog {
  id: string;
  timestamp: string;
  frequencyHz: number;
  mode: DemodMode;
  rssiDbm: number;
  durationSec: number;
  callsign?: string;
  decodedContent: string;
  decoderType: 'APRS' | 'ACARS' | 'WEATHER' | 'MORSE' | 'VOICE' | 'DMR';
  audioBlobUrl?: string;
}

export interface AudioRecording {
  id: string;
  timestamp: string;
  frequencyHz: number;
  mode: DemodMode;
  durationSec: number;
  blobUrl: string;
  fileName: string;
}

export interface SDRDeviceConfig {
  model: string;
  sampleRate: number; // e.g. 2400000
  biasT: boolean;
  directSampling: boolean;
  ppmCorrection: number;
  antenna: 'ANT-1 (HF)' | 'ANT-2 (VHF/UHF)';
  agc: 'OFF' | 'SLOW' | 'MED' | 'FAST';
  rfGain: number; // 0 to 50 dB
  noiseBlanker: boolean;
  noiseReduction: boolean;
  attenuator: 0 | 10 | 20; // dB
  afc: boolean;
}
