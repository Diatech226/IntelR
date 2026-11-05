import { SIMULATED_SIGNALS } from '../data/presetChannels';
import { DemodMode, InterceptLog, RadioSignal } from '../types/radio';

export interface PassbandTelemetry {
  rssiDbm: number;
  snrDb: number;
  carrierLocked: boolean;
  activeSignal: RadioSignal | null;
  sUnits: string; // e.g. "S9" or "S9+20"
}

export class SignalEngine {
  private signals: RadioSignal[] = [...SIMULATED_SIGNALS];
  private noiseFloorBase = -115; // dBm
  private timeOffset = 0;

  constructor() {
    this.timeOffset = Date.now();
  }

  public getSignals(): RadioSignal[] {
    return this.signals;
  }

  public addSignal(signal: RadioSignal) {
    this.signals.push(signal);
  }

  // Generates 512 FFT spectrum amplitude bins (dBm) across visible span [centerHz - spanHz/2, centerHz + spanHz/2]
  public generateFftData(
    centerHz: number,
    spanHz: number,
    binsCount: number = 512,
    rfGain: number = 30,
    noiseFloorDbm: number = -112
  ): Float32Array {
    const data = new Float32Array(binsCount);
    const startHz = centerHz - spanHz / 2;
    const binWidthHz = spanHz / binsCount;
    const now = Date.now();

    // Generate base thermal noise floor with subtle ripple
    for (let i = 0; i < binsCount; i++) {
      // Gaussian-like noise distribution
      const u1 = Math.max(0.0001, Math.random());
      const u2 = Math.random();
      const randNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      
      // Slight atmospheric curvature across band
      const relPos = (i - binsCount / 2) / (binsCount / 2);
      const bandShape = -0.5 * (relPos * relPos);

      // Noise floor adjusted by RF gain (higher gain brings up baseline)
      const adjustedFloor = noiseFloorDbm + (rfGain - 30) * 0.15;
      data[i] = adjustedFloor + bandShape + randNormal * 2.2;
    }

    // Overlay active RF signals
    for (const sig of this.signals) {
      // Periodic transmitter check
      let isActive = sig.isTransmitting;
      if (sig.transmittingSchedule === 'periodic') {
        // e.g. APRS packet every 8 seconds, lasting 1.2s
        const periodSec = 9;
        const phase = ((now - this.timeOffset) / 1000) % periodSec;
        isActive = phase < 1.4;
      } else if (sig.transmittingSchedule === 'random') {
        // Intermittent speech traffic
        const cycle = ((now - this.timeOffset) / 1000 + sig.frequencyHz % 100) % 20;
        isActive = cycle < 11;
      }

      if (!isActive) continue;

      const sigOffsetHz = sig.frequencyHz - startHz;
      const centerBin = sigOffsetHz / binWidthHz;
      const sigBinWidth = Math.max(2, sig.bandwidthHz / binWidthHz);

      // Skip if signal is completely outside visible spectrum
      if (centerBin < -sigBinWidth * 3 || centerBin > binsCount + sigBinWidth * 3) {
        continue;
      }

      // QSB (fading) modulation
      const qsb = Math.sin((now / 1500) + (sig.frequencyHz % 10)) * 2.5;
      const peakPower = sig.nominalDbm + qsb;

      // Draw signal envelope across bins
      const halfBw = Math.max(1, sigBinWidth / 2);
      const minBin = Math.max(0, Math.floor(centerBin - halfBw * 2.5));
      const maxBin = Math.min(binsCount - 1, Math.ceil(centerBin + halfBw * 2.5));

      for (let b = minBin; b <= maxBin; b++) {
        const dist = Math.abs(b - centerBin);
        const normDist = dist / halfBw;
        // Filter skirt rolloff (steep Gaussian/Butterworth shape)
        const attenuation = Math.exp(-2.2 * normDist * normDist);
        const powerAtBin = peakPower * attenuation + (noiseFloorDbm * (1 - attenuation));

        if (powerAtBin > data[b]) {
          data[b] = powerAtBin;
        }
      }
    }

    return data;
  }

  // Calculate telemetry at the exact tuned VFO center & filter passband
  public getPassbandTelemetry(
    vfoHz: number,
    filterBwHz: number,
    rfGain: number = 30
  ): PassbandTelemetry {
    const now = Date.now();
    let maxSignalPower = -120;
    let matchingSig: RadioSignal | null = null;

    const passbandMin = vfoHz - filterBwHz / 2;
    const passbandMax = vfoHz + filterBwHz / 2;

    for (const sig of this.signals) {
      // Check active state
      let isActive = sig.isTransmitting;
      if (sig.transmittingSchedule === 'periodic') {
        const periodSec = 9;
        const phase = ((now - this.timeOffset) / 1000) % periodSec;
        isActive = phase < 1.4;
      } else if (sig.transmittingSchedule === 'random') {
        const cycle = ((now - this.timeOffset) / 1000 + sig.frequencyHz % 100) % 20;
        isActive = cycle < 11;
      }

      if (!isActive) continue;

      const sigMin = sig.frequencyHz - sig.bandwidthHz / 2;
      const sigMax = sig.frequencyHz + sig.bandwidthHz / 2;

      // Overlap check
      if (passbandMax >= sigMin && passbandMin <= sigMax) {
        // Overlapping passband
        const freqDelta = Math.abs(vfoHz - sig.frequencyHz);
        const overlapRatio = Math.max(0, 1 - (freqDelta / (sig.bandwidthHz / 2 + filterBwHz / 2)));
        const qsb = Math.sin((now / 1500) + (sig.frequencyHz % 10)) * 2;
        const currentPower = sig.nominalDbm + qsb - (1 - overlapRatio) * 15;

        if (currentPower > maxSignalPower) {
          maxSignalPower = currentPower;
          matchingSig = sig;
        }
      }
    }

    const noiseFloor = this.noiseFloorBase + (rfGain - 30) * 0.15 + (Math.random() * 2 - 1);
    const finalRssi = Math.max(noiseFloor, maxSignalPower);
    const snr = Math.max(0, finalRssi - noiseFloor);
    const carrierLocked = snr > 8 && matchingSig !== null;

    // S-meter calculation: S9 = -73 dBm on HF / -93 dBm on VHF. 6dB per S-unit.
    let sUnits = 'S1';
    if (finalRssi <= -115) sUnits = 'S1';
    else if (finalRssi <= -109) sUnits = 'S2';
    else if (finalRssi <= -103) sUnits = 'S3';
    else if (finalRssi <= -97) sUnits = 'S4';
    else if (finalRssi <= -91) sUnits = 'S5';
    else if (finalRssi <= -85) sUnits = 'S6';
    else if (finalRssi <= -79) sUnits = 'S7';
    else if (finalRssi <= -73) sUnits = 'S8';
    else if (finalRssi <= -67) sUnits = 'S9';
    else if (finalRssi <= -57) sUnits = 'S9+10';
    else if (finalRssi <= -47) sUnits = 'S9+20';
    else sUnits = 'S9+30';

    return {
      rssiDbm: Math.round(finalRssi * 10) / 10,
      snrDb: Math.round(snr * 10) / 10,
      carrierLocked,
      activeSignal: matchingSig,
      sUnits,
    };
  }

  // Create an intercept log entry when a signal breaks squelch
  public createInterceptEntry(
    sig: RadioSignal,
    vfoHz: number,
    mode: DemodMode,
    rssiDbm: number
  ): InterceptLog {
    let decoderType: InterceptLog['decoderType'] = 'VOICE';
    if (sig.callsign?.includes('APRS') || sig.name.includes('APRS')) decoderType = 'APRS';
    else if (sig.name.includes('ACARS') || sig.decodedSample?.includes('ACARS')) decoderType = 'ACARS';
    else if (sig.category === 'Weather' || sig.decodedSample?.includes('ALERT')) decoderType = 'WEATHER';
    else if (sig.mode === 'CW' || sig.morseText) decoderType = 'MORSE';
    else if (sig.mode === 'DMR') decoderType = 'DMR';

    const date = new Date();
    const timeStr = date.toTimeString().split(' ')[0] + '.' + Math.floor(date.getMilliseconds() / 100);

    return {
      id: `int-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: timeStr,
      frequencyHz: vfoHz,
      mode,
      rssiDbm,
      durationSec: Math.floor(Math.random() * 6) + 3,
      callsign: sig.callsign || 'UNKNOWN',
      decodedContent: sig.decodedSample || `Carrier intercepted at ${(vfoHz / 1e6).toFixed(4)} MHz`,
      decoderType,
    };
  }
}

export const signalEngine = new SignalEngine();
