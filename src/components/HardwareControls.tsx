import React from 'react';
import { DemodMode, SDRDeviceConfig } from '../types/radio';
import { Search } from 'lucide-react';

interface HardwareControlsProps {
  currentMode: DemodMode;
  filterBwHz: number;
  squelchDbm: number;
  rfGain: number;
  volume: number;
  isVadActive: boolean;
  isScanning: boolean;
  isRecording: boolean;
  recordingSeconds: number;
  deviceConfig: SDRDeviceConfig;
  onChangeMode: (mode: DemodMode) => void;
  onChangeFilterBw: (bwHz: number) => void;
  onChangeSquelch: (dbm: number) => void;
  onChangeRfGain: (gain: number) => void;
  onChangeVolume: (vol: number) => void;
  onToggleScan: () => void;
  onToggleRecord: () => void;
  onToggleNoiseBlanker: () => void;
  onToggleNoiseReduction: () => void;
  onCycleAgc: () => void;
  onCycleAttenuator: () => void;
  onToggleAfc: () => void;
}

export const HardwareControls: React.FC<HardwareControlsProps> = ({
  currentMode,
  filterBwHz,
  squelchDbm,
  rfGain,
  volume,
  isVadActive,
  isScanning,
  isRecording,
  recordingSeconds,
  deviceConfig,
  onChangeMode,
  onChangeFilterBw,
  onChangeSquelch,
  onChangeRfGain,
  onChangeVolume,
  onToggleScan,
  onToggleRecord,
  onToggleNoiseBlanker,
  onToggleNoiseReduction,
  onCycleAgc,
  onCycleAttenuator,
  onToggleAfc,
}) => {
  const MODES: DemodMode[] = ['AM', 'FM', 'NFM', 'WFM', 'LSB', 'USB', 'CW', 'DMR'];

  return (
    <div className="bg-[#161c24] border border-[#2d3846] rounded p-2 md:p-3 flex flex-col gap-2 select-none shrink-0">
      {/* 1. Demodulation Mode Chips (Single compact row) */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
        {MODES.map((mode) => {
          const isSelected = currentMode === mode;
          return (
            <button
              key={mode}
              onClick={() => onChangeMode(mode)}
              className={`py-1.5 text-xs font-bold font-mono rounded transition-all text-center ${
                isSelected
                  ? 'border border-[#10b981] text-[#10b981] bg-[#10b981]/15 glow-emerald'
                  : 'border border-[#2d3846] bg-[#212b36] text-[#94a3b8] active:bg-[#2d3846]'
              }`}
            >
              {mode}
            </button>
          );
        })}
      </div>

      {/* 2. Core Touch Triggers: REC, SCAN, VAD, SQUELCH & GAIN */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {/* REC */}
        <button
          onClick={onToggleRecord}
          className={`h-10 rounded border font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
            isRecording
              ? 'bg-[#ef4444] text-white border-[#ef4444] glow-red animate-pulse'
              : 'bg-[#212b36] border-[#2d3846] text-[#dde3ee] active:bg-[#2d3846]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-[#ef4444]'}`}></span>
          <span>{isRecording ? `${recordingSeconds}s` : 'REC'}</span>
        </button>

        {/* SCAN */}
        <button
          onClick={onToggleScan}
          className={`h-10 rounded border font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
            isScanning
              ? 'border-[#06b6d4] bg-[#06b6d4]/20 text-[#06b6d4]'
              : 'bg-[#212b36] border-[#2d3846] text-[#dde3ee] active:bg-[#2d3846]'
          }`}
        >
          <Search className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'SCAN...' : 'SCAN'}</span>
        </button>

        {/* VAD State Indicator */}
        <div
          className={`h-10 rounded border font-bold text-xs flex items-center justify-center transition-all ${
            isVadActive
              ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b] glow-amber'
              : 'bg-[#161c24] border-[#2d3846] text-[#475569]'
          }`}
        >
          <span>VAD</span>
        </div>

        {/* NB */}
        <button
          onClick={onToggleNoiseBlanker}
          className={`h-10 rounded font-mono text-xs font-bold border transition-colors ${
            deviceConfig.noiseBlanker
              ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
              : 'bg-[#212b36] border-[#2d3846] text-[#94a3b8]'
          }`}
        >
          NB: {deviceConfig.noiseBlanker ? 'ON' : 'OFF'}
        </button>

        {/* AGC */}
        <button
          onClick={onCycleAgc}
          className="h-10 rounded font-mono text-xs font-bold bg-[#212b36] border border-[#2d3846] text-[#dde3ee] flex items-center justify-center"
        >
          AGC: <span className="text-[#10b981] ml-1">{deviceConfig.agc}</span>
        </button>

        {/* ATT */}
        <button
          onClick={onCycleAttenuator}
          className="h-10 rounded font-mono text-xs font-bold bg-[#212b36] border border-[#2d3846] text-[#dde3ee] flex items-center justify-center"
        >
          ATT: <span className="text-[#ffb95f] ml-1">{deviceConfig.attenuator}dB</span>
        </button>
      </div>

      {/* 3. Essential Sliders: Squelch & RF Gain (side by side, ultra clean) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#1a2028] border border-[#2d3846] rounded p-2 text-xs">
        {/* Squelch Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#94a3b8]">SQL</span>
            <span className="font-mono text-[#f59e0b] font-bold">{squelchDbm} dBm</span>
          </div>
          <input
            type="range"
            min="-120"
            max="-30"
            step="1"
            value={squelchDbm}
            onChange={(e) => onChangeSquelch(parseInt(e.target.value))}
            className="accent-[#f59e0b] cursor-pointer h-2 bg-[#0b0f14] rounded"
          />
        </div>

        {/* RF Gain Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#94a3b8]">RF GAIN</span>
            <span className="font-mono text-[#06b6d4] font-bold">{rfGain} dB</span>
          </div>
          <input
            type="range"
            min="0"
            max="49.6"
            step="0.5"
            value={rfGain}
            onChange={(e) => onChangeRfGain(parseFloat(e.target.value))}
            className="accent-[#06b6d4] cursor-pointer h-2 bg-[#0b0f14] rounded"
          />
        </div>

        {/* IF Filter Bandwidth Slider (hidden on smallest viewports, shown on sm) */}
        <div className="hidden sm:flex flex-col gap-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#94a3b8]">IF BW</span>
            <span className="font-mono text-[#10b981] font-bold">{(filterBwHz / 1000).toFixed(1)}k</span>
          </div>
          <input
            type="range"
            min="500"
            max="250000"
            step="500"
            value={filterBwHz}
            onChange={(e) => onChangeFilterBw(parseInt(e.target.value))}
            className="accent-[#10b981] cursor-pointer h-2 bg-[#0b0f14] rounded"
          />
        </div>
      </div>
    </div>
  );
};
