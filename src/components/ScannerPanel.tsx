import React, { useState } from 'react';
import { Search, Play, Pause, X, Sliders } from 'lucide-react';

interface ScannerPanelProps {
  isOpen: boolean;
  isScanning: boolean;
  currentFreqHz: number;
  squelchDbm: number;
  onClose: () => void;
  onToggleScan: () => void;
  scanMode: 'MEMORY' | 'RANGE';
  onChangeScanMode: (mode: 'MEMORY' | 'RANGE') => void;
  rangeStartHz: number;
  rangeEndHz: number;
  onChangeRange: (startHz: number, endHz: number) => void;
  dwellTimeSec: number;
  onChangeDwellTime: (sec: number) => void;
}

export const ScannerPanel: React.FC<ScannerPanelProps> = ({
  isOpen,
  isScanning,
  currentFreqHz,
  squelchDbm,
  onClose,
  onToggleScan,
  scanMode,
  onChangeScanMode,
  rangeStartHz,
  rangeEndHz,
  onChangeRange,
  dwellTimeSec,
  onChangeDwellTime,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#161c24] border border-[#2d3846] rounded p-5 shadow-2xl flex flex-col gap-4 glow-cyan">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2d3846]">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-[#06b6d4]" />
            <h3 className="font-bold text-sm tracking-wider uppercase text-[#f9fafb]">
              Automated Frequency Scanner
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#94a3b8] hover:text-[#f9fafb]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scan Status Box */}
        <div className="p-3 bg-[#0b0f14] border border-[#2d3846] rounded flex items-center justify-between font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#94a3b8]">CURRENT SCAN FREQ</span>
            <span className="text-xl font-bold text-[#10b981]">
              {(currentFreqHz / 1e6).toFixed(4)} MHz
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-[#10b981] animate-pulse' : 'bg-[#475569]'}`}></span>
            <span className="text-xs font-bold text-[#dde3ee]">
              {isScanning ? 'SWEEPING' : 'IDLE'}
            </span>
          </div>
        </div>

        {/* Scan Mode Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase text-[#94a3b8]">Scan Strategy</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeScanMode('MEMORY')}
              className={`py-2 px-3 rounded text-xs font-bold border transition-colors ${
                scanMode === 'MEMORY'
                  ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#06b6d4]'
                  : 'bg-[#212b36] border-[#2d3846] text-[#94a3b8]'
              }`}
            >
              MEMORY BANK SCAN
            </button>
            <button
              onClick={() => onChangeScanMode('RANGE')}
              className={`py-2 px-3 rounded text-xs font-bold border transition-colors ${
                scanMode === 'RANGE'
                  ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#06b6d4]'
                  : 'bg-[#212b36] border-[#2d3846] text-[#94a3b8]'
              }`}
            >
              VFO RANGE SWEEP
            </button>
          </div>
        </div>

        {/* Range Inputs if RANGE mode */}
        {scanMode === 'RANGE' && (
          <div className="grid grid-cols-2 gap-3 bg-[#1a2028] p-3 rounded border border-[#2d3846]">
            <div>
              <label className="text-[10px] text-[#94a3b8] font-mono">START (MHz)</label>
              <input
                type="number"
                step="0.025"
                value={(rangeStartHz / 1e6).toFixed(3)}
                onChange={(e) => onChangeRange(parseFloat(e.target.value) * 1e6, rangeEndHz)}
                className="w-full bg-[#0b0f14] border border-[#2d3846] rounded px-2.5 py-1 text-xs font-mono text-[#f9fafb] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#94a3b8] font-mono">STOP (MHz)</label>
              <input
                type="number"
                step="0.025"
                value={(rangeEndHz / 1e6).toFixed(3)}
                onChange={(e) => onChangeRange(rangeStartHz, parseFloat(e.target.value) * 1e6)}
                className="w-full bg-[#0b0f14] border border-[#2d3846] rounded px-2.5 py-1 text-xs font-mono text-[#f9fafb] outline-none"
              />
            </div>
          </div>
        )}

        {/* Dwell Time & Squelch Trigger */}
        <div className="flex flex-col gap-2 bg-[#1a2028] p-3 rounded border border-[#2d3846]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#94a3b8]">DWELL TIME ON SIGNAL</span>
            <span className="font-mono text-[#10b981] font-bold">{dwellTimeSec} SECONDS</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={dwellTimeSec}
            onChange={(e) => onChangeDwellTime(parseInt(e.target.value))}
            className="accent-[#10b981] cursor-pointer h-1.5 bg-[#0b0f14] rounded"
          />
          <div className="text-[10px] text-[#94a3b8] flex items-center justify-between font-mono">
            <span>Squelch Threshold: <strong className="text-[#f59e0b]">{squelchDbm} dBm</strong></span>
            <span>Halt on Squelch Open: <strong className="text-[#10b981]">ACTIVE</strong></span>
          </div>
        </div>

        {/* Start / Stop Trigger */}
        <button
          onClick={onToggleScan}
          className={`h-12 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isScanning
              ? 'bg-[#ef4444] text-white glow-red'
              : 'bg-[#10b981] text-[#003824] hover:bg-[#10b981]/90 glow-emerald'
          }`}
        >
          {isScanning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isScanning ? 'HALT SCANNER' : 'START AUTOMATED SCAN'}</span>
        </button>
      </div>
    </div>
  );
};
