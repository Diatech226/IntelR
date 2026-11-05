import React, { useEffect, useRef, useState } from 'react';
import { DemodMode, StepSize, PresetChannel, InterceptLog, AudioRecording, SDRDeviceConfig } from './types/radio';
import { INITIAL_PRESETS } from './data/presetChannels';
import { audioEngine } from './services/audioEngine';
import { signalEngine, PassbandTelemetry } from './services/signalEngine';
import { TopNav } from './components/TopNav';
import { VfoDisplay } from './components/VfoDisplay';
import { SpectrumWaterfall } from './components/SpectrumWaterfall';
import { HardwareControls } from './components/HardwareControls';
import { MemoryChannels } from './components/MemoryChannels';
import { SignalDecoder } from './components/SignalDecoder';
import { ScannerPanel } from './components/ScannerPanel';
import { RecordingDrawer } from './components/RecordingDrawer';
import { DeviceConfigModal } from './components/DeviceConfigModal';
import { Radio, Terminal, Bookmark } from 'lucide-react';

export default function App() {
  // Core RF & Receiver State
  const [frequencyHz, setFrequencyHz] = useState<number>(144800000); // 144.800 MHz APRS
  const [stepSize, setStepSize] = useState<StepSize>(12500);
  const [currentMode, setCurrentMode] = useState<DemodMode>('NFM');
  const [filterBwHz, setFilterBwHz] = useState<number>(12500);
  const [squelchDbm, setSquelchDbm] = useState<number>(-85);
  const [rfGain, setRfGain] = useState<number>(32);
  const [volume, setVolume] = useState<number>(0.65);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  // Live Telemetry
  const [telemetry, setTelemetry] = useState<PassbandTelemetry>({
    rssiDbm: -112,
    snrDb: 0,
    carrierLocked: false,
    activeSignal: null,
    sUnits: 'S1',
  });
  const [isVadActive, setIsVadActive] = useState<boolean>(false);

  // Data Stores
  const [channels, setChannels] = useState<PresetChannel[]>(INITIAL_PRESETS);
  const [logs, setLogs] = useState<InterceptLog[]>([]);
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<'MEMORY' | 'RANGE'>('MEMORY');
  const [rangeStartHz, setRangeStartHz] = useState<number>(144000000);
  const [rangeEndHz, setRangeEndHz] = useState<number>(148000000);
  const [dwellTimeSec, setDwellTimeSec] = useState<number>(3);
  const [scanIndex, setScanIndex] = useState<number>(0);

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isRecordingsOpen, setIsRecordingsOpen] = useState<boolean>(false);

  // Hardware SDR Device Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [deviceConfig, setDeviceConfig] = useState<SDRDeviceConfig>({
    model: 'RTL-SDR Blog v4',
    sampleRate: 2400000,
    biasT: false,
    directSampling: false,
    ppmCorrection: 0,
    antenna: 'ANT-2 (VHF/UHF)',
    agc: 'MED',
    rfGain: 32,
    noiseBlanker: false,
    noiseReduction: false,
    attenuator: 0,
    afc: true,
  });

  // Active Screen Tab (Optimized for 6" display)
  const [activeTab, setActiveTab] = useState<'console' | 'banks' | 'decoder'>('console');

  const lastInterceptSigIdRef = useRef<string | null>(null);
  const scanDwellTimerRef = useRef<number>(0);

  const handleToggleMute = () => {
    audioEngine.init();
    const newMuted = !isAudioMuted;
    setIsAudioMuted(newMuted);
    audioEngine.setMute(newMuted);
  };

  const handleChangeVolume = (vol: number) => {
    setVolume(vol);
    audioEngine.setVolume(vol);
  };

  const handleChangeMode = (mode: DemodMode) => {
    setCurrentMode(mode);
    let defaultBw = 12500;
    switch (mode) {
      case 'CW': defaultBw = 500; break;
      case 'AM': defaultBw = 8333; break;
      case 'USB': case 'LSB': defaultBw = 2800; break;
      case 'WFM': defaultBw = 180000; break;
      case 'DMR': defaultBw = 12500; break;
      default: defaultBw = 12500; break;
    }
    setFilterBwHz(defaultBw);
    audioEngine.updateMode(mode, defaultBw);
  };

  const handleTuneFrequency = (newFreqHz: number) => {
    const clamped = Math.max(100000, Math.min(6000000000, newFreqHz));
    setFrequencyHz(clamped);
  };

  const handleStepDelta = (deltaHz: number) => {
    handleTuneFrequency(frequencyHz + deltaHz);
  };

  const handleTuneChannel = (channel: PresetChannel) => {
    setFrequencyHz(channel.frequencyHz);
    setCurrentMode(channel.mode);
    setFilterBwHz(channel.bandwidthHz);
    audioEngine.updateMode(channel.mode, channel.bandwidthHz);
    setActiveTab('console'); // auto-switch back to console to view signal
  };

  const handleSelectBandPreset = (name: string, freqHz: number, mode: DemodMode) => {
    setFrequencyHz(freqHz);
    handleChangeMode(mode);
    setActiveTab('console');
  };

  const handleSaveCurrentToMemory = (name: string, category: string, tag: string) => {
    const newChannel: PresetChannel = {
      id: `usr-${Date.now()}`,
      name,
      frequencyHz,
      mode: currentMode,
      bandwidthHz: filterBwHz,
      category,
      tag,
      isFavorite: true,
    };
    setChannels((prev) => [newChannel, ...prev]);
  };

  const handleDeleteChannel = (id: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleFavorite = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
  };

  // Recording
  const handleToggleRecord = async () => {
    if (!isRecording) {
      audioEngine.init();
      if (isAudioMuted) {
        setIsAudioMuted(false);
        audioEngine.setMute(false);
      }
      const success = audioEngine.startRecording();
      if (success) {
        setIsRecording(true);
        setRecordingSeconds(0);
      }
    } else {
      const result = await audioEngine.stopRecording();
      setIsRecording(false);
      if (result) {
        const newRec: AudioRecording = {
          id: `rec-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          frequencyHz,
          mode: currentMode,
          durationSec: result.durationSec,
          blobUrl: result.blobUrl,
          fileName: `sdr_${(frequencyHz / 1e6).toFixed(3)}MHz_${Date.now()}.webm`,
        };
        setRecordings((prev) => [newRec, ...prev]);
        setIsRecordingsOpen(true);
      }
    }
  };

  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  // Telemetry Loop (80ms)
  useEffect(() => {
    const interval = setInterval(() => {
      const telem = signalEngine.getPassbandTelemetry(frequencyHz, filterBwHz, rfGain);
      setTelemetry(telem);

      const isOverThreshold = telem.rssiDbm >= squelchDbm;
      setIsVadActive(isOverThreshold);

      let sigType: string | undefined = undefined;
      let isCw = false;

      if (telem.activeSignal) {
        if (telem.activeSignal.mode === 'CW' || telem.activeSignal.morseText) isCw = true;
        else if (telem.activeSignal.name.includes('APRS')) sigType = 'APRS';
        else if (telem.activeSignal.name.includes('FT8')) sigType = 'FT8';
        else if (telem.activeSignal.name.includes('WWV')) sigType = 'WWV';

        if (isOverThreshold && lastInterceptSigIdRef.current !== telem.activeSignal.id) {
          lastInterceptSigIdRef.current = telem.activeSignal.id;
          const logEntry = signalEngine.createInterceptEntry(
            telem.activeSignal,
            frequencyHz,
            currentMode,
            telem.rssiDbm
          );
          setLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
        }
      } else {
        lastInterceptSigIdRef.current = null;
      }

      audioEngine.setSquelchState(isOverThreshold, telem.rssiDbm, currentMode, sigType, isCw);
    }, 80);

    return () => clearInterval(interval);
  }, [frequencyHz, filterBwHz, squelchDbm, rfGain, currentMode]);

  // Scanner Loop
  useEffect(() => {
    if (!isScanning) return;

    const scanInterval = setInterval(() => {
      if (isVadActive) {
        scanDwellTimerRef.current += 0.25;
        if (scanDwellTimerRef.current < dwellTimeSec) {
          return;
        }
      }
      scanDwellTimerRef.current = 0;

      if (scanMode === 'MEMORY') {
        if (channels.length === 0) return;
        setScanIndex((prev) => {
          const next = (prev + 1) % channels.length;
          const target = channels[next];
          handleTuneChannel(target);
          return next;
        });
      } else {
        setFrequencyHz((prev) => {
          let next = prev + stepSize;
          if (next > rangeEndHz) next = rangeStartHz;
          return next;
        });
      }
    }, 250);

    return () => clearInterval(scanInterval);
  }, [isScanning, isVadActive, scanMode, channels, dwellTimeSec, rangeStartHz, rangeEndHz, stepSize]);

  return (
    <div className="h-screen w-screen bg-[#0b0f14] text-[#dde3ee] flex flex-col font-sans select-none overflow-hidden">
      {/* 1. Slim Top Navigation Bar */}
      <TopNav
        deviceConfig={deviceConfig}
        isAudioMuted={isAudioMuted}
        volume={volume}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onToggleMute={handleToggleMute}
        onChangeVolume={handleChangeVolume}
        onToggleRecord={handleToggleRecord}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRecordings={() => setIsRecordingsOpen(true)}
        onSelectBandPreset={handleSelectBandPreset}
      />

      {/* 2. Top Switcher Tabs (Perfect for 6" screen navigation) */}
      <div className="h-8 bg-[#161c24] border-b border-[#2d3846] px-2 flex items-center gap-1 text-[11px] shrink-0 font-bold">
        <button
          onClick={() => setActiveTab('console')}
          className={`flex-1 h-6 rounded flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'console'
              ? 'bg-[#10b981] text-[#003824]'
              : 'text-[#94a3b8] hover:text-[#dde3ee]'
          }`}
        >
          <Radio className="w-3 h-3" />
          <span>CONSOLE</span>
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`flex-1 h-6 rounded flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'banks'
              ? 'bg-[#10b981] text-[#003824]'
              : 'text-[#94a3b8] hover:text-[#dde3ee]'
          }`}
        >
          <Bookmark className="w-3 h-3" />
          <span>BANKS ({channels.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('decoder')}
          className={`flex-1 h-6 rounded flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'decoder'
              ? 'bg-[#06b6d4] text-[#003640]'
              : 'text-[#94a3b8] hover:text-[#dde3ee]'
          }`}
        >
          <Terminal className="w-3 h-3" />
          <span>DECODER ({logs.length})</span>
        </button>
      </div>

      {/* 3. Main Dynamic Content Area (Fits 6" display without scrolling) */}
      <main className="flex-1 p-1 sm:p-2 flex flex-col gap-1.5 overflow-hidden">
        {activeTab === 'console' && (
          <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
            {/* VFO Frequency Readout */}
            <VfoDisplay
              frequencyHz={frequencyHz}
              filterBwHz={filterBwHz}
              stepSize={stepSize}
              carrierLocked={telemetry.carrierLocked}
              rssiDbm={telemetry.rssiDbm}
              snrDb={telemetry.snrDb}
              sUnits={telemetry.sUnits}
              mode={currentMode}
              onChangeFrequency={handleTuneFrequency}
              onChangeStepSize={setStepSize}
              onStepDelta={handleStepDelta}
            />

            {/* Spectrum & Waterfall Display */}
            <SpectrumWaterfall
              centerHz={frequencyHz}
              filterBwHz={filterBwHz}
              squelchDbm={squelchDbm}
              rfGain={rfGain}
              onTune={handleTuneFrequency}
              onChangeSquelch={setSquelchDbm}
            />

            {/* Hardware Controls */}
            <HardwareControls
              currentMode={currentMode}
              filterBwHz={filterBwHz}
              squelchDbm={squelchDbm}
              rfGain={rfGain}
              volume={volume}
              isVadActive={isVadActive}
              isScanning={isScanning}
              isRecording={isRecording}
              recordingSeconds={recordingSeconds}
              deviceConfig={deviceConfig}
              onChangeMode={handleChangeMode}
              onChangeFilterBw={setFilterBwHz}
              onChangeSquelch={setSquelchDbm}
              onChangeRfGain={setRfGain}
              onChangeVolume={handleChangeVolume}
              onToggleScan={() => setIsScannerOpen(true)}
              onToggleRecord={handleToggleRecord}
              onToggleNoiseBlanker={() =>
                setDeviceConfig((prev) => ({ ...prev, noiseBlanker: !prev.noiseBlanker }))
              }
              onToggleNoiseReduction={() =>
                setDeviceConfig((prev) => ({ ...prev, noiseReduction: !prev.noiseReduction }))
              }
              onCycleAgc={() => {
                const seq: SDRDeviceConfig['agc'][] = ['OFF', 'SLOW', 'MED', 'FAST'];
                setDeviceConfig((prev) => ({
                  ...prev,
                  agc: seq[(seq.indexOf(prev.agc) + 1) % seq.length],
                }));
              }}
              onCycleAttenuator={() => {
                const seq: (0 | 10 | 20)[] = [0, 10, 20];
                setDeviceConfig((prev) => ({
                  ...prev,
                  attenuator: seq[(seq.indexOf(prev.attenuator) + 1) % seq.length],
                }));
              }}
              onToggleAfc={() => setDeviceConfig((prev) => ({ ...prev, afc: !prev.afc }))}
            />
          </div>
        )}

        {activeTab === 'banks' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <MemoryChannels
              channels={channels}
              currentFrequencyHz={frequencyHz}
              onTuneChannel={handleTuneChannel}
              onSaveCurrentToMemory={handleSaveCurrentToMemory}
              onDeleteChannel={handleDeleteChannel}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        )}

        {activeTab === 'decoder' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <SignalDecoder
              logs={logs}
              onClearLogs={() => setLogs([])}
              onTuneToFrequency={(f) => {
                handleTuneFrequency(f);
                setActiveTab('console');
              }}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <ScannerPanel
        isOpen={isScannerOpen}
        isScanning={isScanning}
        currentFreqHz={frequencyHz}
        squelchDbm={squelchDbm}
        onClose={() => setIsScannerOpen(false)}
        onToggleScan={() => setIsScanning(!isScanning)}
        scanMode={scanMode}
        onChangeScanMode={setScanMode}
        rangeStartHz={rangeStartHz}
        rangeEndHz={rangeEndHz}
        onChangeRange={(start, end) => {
          setRangeStartHz(start);
          setRangeEndHz(end);
        }}
        dwellTimeSec={dwellTimeSec}
        onChangeDwellTime={setDwellTimeSec}
      />

      <RecordingDrawer
        isOpen={isRecordingsOpen}
        recordings={recordings}
        onClose={() => setIsRecordingsOpen(false)}
        onDeleteRecording={(id) => setRecordings((prev) => prev.filter((r) => r.id !== id))}
      />

      <DeviceConfigModal
        isOpen={isSettingsOpen}
        config={deviceConfig}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateConfig={(up) => setDeviceConfig((prev) => ({ ...prev, ...up }))}
      />
    </div>
  );
}
