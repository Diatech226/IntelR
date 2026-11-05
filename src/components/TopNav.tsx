import React, { useEffect, useState } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Minimize2,
  Layers,
  FolderOpen
} from 'lucide-react';
import { SDRDeviceConfig } from '../types/radio';

interface TopNavProps {
  deviceConfig: SDRDeviceConfig;
  isAudioMuted: boolean;
  volume: number;
  isRecording: boolean;
  recordingSeconds: number;
  onToggleMute: () => void;
  onChangeVolume: (v: number) => void;
  onToggleRecord: () => void;
  onOpenSettings: () => void;
  onOpenRecordings: () => void;
  onSelectBandPreset: (name: string, freqHz: number, mode: any) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  deviceConfig,
  isAudioMuted,
  volume,
  isRecording,
  recordingSeconds,
  onToggleMute,
  onChangeVolume,
  onToggleRecord,
  onOpenSettings,
  onOpenRecordings,
  onSelectBandPreset,
}) => {
  const [utcTime, setUtcTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBandMenuOpen, setIsBandMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().slice(11, 19) + 'Z');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const bandPresets = [
    { label: 'Air Emergency 121.5', freq: 121500000, mode: 'AM' },
    { label: 'APRS Telemetry 144.8', freq: 144800000, mode: 'NFM' },
    { label: 'Ham Calling 146.52', freq: 146520000, mode: 'NFM' },
    { label: 'Marine Ch16 156.8', freq: 156800000, mode: 'NFM' },
    { label: 'NOAA Weather 162.55', freq: 162550000, mode: 'NFM' },
    { label: 'FRS / GMRS 462.562', freq: 462562500, mode: 'NFM' },
    { label: '20m FT8 14.074', freq: 14074000, mode: 'USB' },
    { label: '40m CW 7.040', freq: 7040000, mode: 'CW' },
    { label: 'WWV Time 10.0', freq: 10000000, mode: 'AM' },
  ];

  return (
    <header className="h-11 bg-[#161c24] border-b border-[#2d3846] px-2 md:px-3 flex items-center justify-between text-xs select-none z-30 shrink-0">
      {/* Brand & Time */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-[#212b36] border border-[#2d3846] flex items-center justify-center text-[#10b981]">
          <Radio className="w-3.5 h-3.5" />
        </div>
        <span className="font-bold text-xs tracking-wider text-[#f9fafb]">
          TAC SDR
        </span>
        <span className="text-[#475569]">|</span>
        <span className="font-mono text-[11px] text-[#06b6d4]">
          {utcTime}
        </span>
      </div>

      {/* Center: Quick Presets */}
      <div className="relative">
        <button
          onClick={() => setIsBandMenuOpen(!isBandMenuOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[#212b36] hover:bg-[#2d3846] border border-[#2d3846] text-[#dde3ee] font-medium text-[11px] transition-colors"
        >
          <Layers className="w-3 h-3 text-[#06b6d4]" />
          <span>PRESETS</span>
          <span className="text-[9px] text-[#94a3b8]">▼</span>
        </button>

        {isBandMenuOpen && (
          <div
            className="absolute left-1/2 -translate-x-1/2 mt-1 w-52 bg-[#161c24] border border-[#2d3846] rounded shadow-2xl py-1 z-50 glow-cyan"
            onMouseLeave={() => setIsBandMenuOpen(false)}
          >
            {bandPresets.map((bp) => (
              <button
                key={bp.label}
                onClick={() => {
                  onSelectBandPreset(bp.label, bp.freq, bp.mode);
                  setIsBandMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1 text-[11px] text-[#dde3ee] hover:bg-[#212b36] hover:text-[#10b981] flex items-center justify-between"
              >
                <span className="truncate">{bp.label}</span>
                <span className="font-mono text-[9px] text-[#06b6d4]">{bp.mode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: Audio, REC, Tools */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Audio Toggle & Compact Slider */}
        <div className="flex items-center bg-[#212b36] border border-[#2d3846] rounded px-1.5 py-0.5 gap-1">
          <button
            onClick={onToggleMute}
            className={`p-1 rounded ${
              isAudioMuted ? 'text-[#ef4444]' : 'text-[#10b981]'
            }`}
            title={isAudioMuted ? 'Unmute' : 'Mute'}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="w-12 md:w-16 accent-[#10b981] cursor-pointer h-1 bg-[#0b0f14] rounded"
          />
        </div>

        {/* REC Button */}
        <button
          onClick={onToggleRecord}
          className={`h-7 px-2.5 rounded flex items-center gap-1.5 font-bold text-[11px] tracking-wide transition-all ${
            isRecording
              ? 'bg-[#ef4444] text-white glow-red animate-pulse'
              : 'bg-[#212b36] hover:bg-[#2d3846] border border-[#2d3846] text-[#dde3ee]'
          }`}
          title="Record Demod Audio"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-white' : 'bg-[#ef4444]'}`}></span>
          <span className="font-mono">{isRecording ? `${recordingSeconds}s` : 'REC'}</span>
        </button>

        {/* Vault Button */}
        <button
          onClick={onOpenRecordings}
          className="p-1.5 rounded bg-[#212b36] hover:bg-[#2d3846] border border-[#2d3846] text-[#dde3ee]"
          title="Recordings"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded bg-[#212b36] hover:bg-[#2d3846] border border-[#2d3846] text-[#dde3ee]"
          title="Hardware Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded bg-[#212b36] hover:bg-[#2d3846] border border-[#2d3846] text-[#dde3ee]"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
