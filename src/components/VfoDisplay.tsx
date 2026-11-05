import React, { useState } from 'react';
import { StepSize } from '../types/radio';
import { ChevronUp, ChevronDown, Lock, Unlock, Hash, Plus, Minus } from 'lucide-react';

interface VfoDisplayProps {
  frequencyHz: number;
  filterBwHz: number;
  stepSize: StepSize;
  carrierLocked: boolean;
  rssiDbm: number;
  snrDb: number;
  sUnits: string;
  mode: string;
  onChangeFrequency: (newFreqHz: number) => void;
  onChangeStepSize: (newStep: StepSize) => void;
  onStepDelta: (deltaHz: number) => void;
}

export const VfoDisplay: React.FC<VfoDisplayProps> = ({
  frequencyHz,
  filterBwHz,
  stepSize,
  carrierLocked,
  rssiDbm,
  snrDb,
  sUnits,
  mode,
  onChangeFrequency,
  onChangeStepSize,
  onStepDelta,
}) => {
  const [isDirectEntryOpen, setIsDirectEntryOpen] = useState(false);
  const [directFreqInput, setDirectFreqInput] = useState('');
  const [hoveredDigitIndex, setHoveredDigitIndex] = useState<number | null>(null);

  const STEP_OPTIONS: { label: string; value: StepSize }[] = [
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1k', value: 1000 },
    { label: '5k', value: 5000 },
    { label: '6.25k', value: 6250 },
    { label: '8.33k', value: 8333 },
    { label: '10k', value: 10000 },
    { label: '12.5k', value: 12500 },
    { label: '25k', value: 25000 },
    { label: '100k', value: 100000 },
  ];

  const formatDigits = (hz: number) => {
    const raw = Math.max(0, Math.min(6000000000, hz));
    return raw.toString().padStart(9, '0');
  };

  const digitsStr = formatDigits(frequencyHz);

  const digitWeights = [
    100000000, // 0: 100 MHz
    10000000,  // 1: 10 MHz
    1000000,   // 2: 1 MHz
    100000,    // 3: 100 kHz
    10000,     // 4: 10 kHz
    1000,      // 5: 1 kHz
    100,       // 6: 100 Hz
    10,        // 7: 10 Hz
    1,         // 8: 1 Hz
  ];

  const handleDigitScroll = (index: number, e: React.WheelEvent) => {
    e.preventDefault();
    const weight = digitWeights[index];
    const direction = e.deltaY < 0 ? 1 : -1;
    const newFreq = Math.max(100000, Math.min(6000000000, frequencyHz + direction * weight));
    onChangeFrequency(newFreq);
  };

  const handleDigitClick = (index: number, delta: number) => {
    const weight = digitWeights[index];
    const newFreq = Math.max(100000, Math.min(6000000000, frequencyHz + delta * weight));
    onChangeFrequency(newFreq);
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directFreqInput.trim();
    if (!clean) return;

    let targetHz = 0;
    if (clean.includes('.')) {
      targetHz = Math.round(parseFloat(clean) * 1e6);
    } else {
      const num = parseFloat(clean);
      if (num < 6000) {
        targetHz = Math.round(num * 1e6);
      } else {
        targetHz = num > 1e7 ? Math.round(num) : Math.round(num * 1000);
      }
    }

    if (!isNaN(targetHz) && targetHz > 0) {
      onChangeFrequency(targetHz);
      setIsDirectEntryOpen(false);
      setDirectFreqInput('');
    }
  };

  const sMeterPct = Math.max(0, Math.min(100, ((rssiDbm + 120) / 90) * 100));

  return (
    <div className="bg-[#161c24] border border-[#2d3846] rounded p-2 md:p-3 relative select-none shrink-0">
      {/* Top telemetry bar */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        {/* Left: Lock + S-meter */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
              carrierLocked
                ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                : 'bg-[#212b36] text-[#94a3b8] border-[#2d3846]'
            }`}
          >
            {carrierLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5 text-[#475569]" />}
            <span>{carrierLocked ? 'LOCK' : 'ACQ'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-[#dde3ee]">{sUnits}</span>
            <div className="w-16 sm:w-24 h-2 bg-[#0b0f14] border border-[#2d3846] rounded-xs overflow-hidden">
              <div
                className={`h-full ${
                  rssiDbm > -67 ? 'bg-[#ef4444]' : rssiDbm > -85 ? 'bg-[#ffb95f]' : 'bg-[#10b981]'
                }`}
                style={{ width: `${sMeterPct}%` }}
              ></div>
            </div>
            <span className="font-mono text-[10px] text-[#94a3b8]">{rssiDbm.toFixed(0)} dBm</span>
          </div>
        </div>

        {/* Right: BW + Direct */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-[#06b6d4]">
            BW {(filterBwHz / 1000).toFixed(1)}k
          </span>
          <button
            onClick={() => setIsDirectEntryOpen(!isDirectEntryOpen)}
            className="p-1 px-1.5 rounded bg-[#212b36] hover:bg-[#2d3846] border border-[#2d3846] text-[#dde3ee] text-[10px] font-mono"
            title="Direct Frequency"
          >
            <Hash className="w-3 h-3 text-[#06b6d4]" />
          </button>
        </div>
      </div>

      {/* Direct Entry Bar */}
      {isDirectEntryOpen && (
        <form onSubmit={handleDirectSubmit} className="mb-2 p-1.5 bg-[#0b0f14] border border-[#06b6d4]/50 rounded flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            placeholder="MHz (e.g. 144.8)"
            value={directFreqInput}
            onChange={(e) => setDirectFreqInput(e.target.value)}
            className="flex-1 bg-[#161c24] border border-[#2d3846] text-[#f9fafb] px-2 py-1 font-mono text-xs rounded outline-none"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-[#10b981] text-[#003824] font-bold text-xs rounded"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setIsDirectEntryOpen(false)}
            className="px-2 py-1 bg-[#212b36] text-[#94a3b8] text-xs rounded"
          >
            ✕
          </button>
        </form>
      )}

      {/* Core VFO Readout with large touch Step buttons */}
      <div className="bg-[#0b0f14] border border-[#2d3846] rounded px-2 py-2 flex items-center justify-between">
        {/* Step Down Button */}
        <button
          onClick={() => onStepDelta(-stepSize)}
          className="w-11 h-11 rounded bg-[#212b36] active:bg-[#10b981]/20 border border-[#2d3846] text-[#f9fafb] flex items-center justify-center shrink-0"
          title="Step Down"
        >
          <Minus className="w-5 h-5 text-[#94a3b8]" />
        </button>

        {/* Digits Display */}
        <div className="flex items-baseline font-mono select-none px-1">
          {/* MHz */}
          <div className="flex items-center">
            {[0, 1, 2].map((idx) => {
              const digit = digitsStr[idx];
              const isLeadingZero = idx === 0 && digit === '0';
              return (
                <div
                  key={idx}
                  onWheel={(e) => handleDigitScroll(idx, e)}
                  onClick={() => handleDigitClick(idx, 1)}
                  className="relative cursor-pointer flex flex-col items-center"
                >
                  <span
                    className={`text-2xl sm:text-4xl font-bold tracking-tight px-0.5 ${
                      isLeadingZero ? 'text-[#475569]' : 'text-[#f9fafb]'
                    }`}
                  >
                    {digit}
                  </span>
                </div>
              );
            })}
          </div>

          <span className="text-2xl sm:text-4xl font-bold text-[#06b6d4]">.</span>

          {/* kHz */}
          <div className="flex items-center">
            {[3, 4, 5].map((idx) => {
              const digit = digitsStr[idx];
              return (
                <div
                  key={idx}
                  onWheel={(e) => handleDigitScroll(idx, e)}
                  onClick={() => handleDigitClick(idx, 1)}
                  className="relative cursor-pointer flex flex-col items-center"
                >
                  <span className="text-2xl sm:text-4xl font-bold tracking-tight px-0.5 text-[#f9fafb]">
                    {digit}
                  </span>
                </div>
              );
            })}
          </div>

          <span className="text-2xl sm:text-4xl font-bold text-[#06b6d4]">.</span>

          {/* Hz */}
          <div className="flex items-center">
            {[6, 7, 8].map((idx) => {
              const digit = digitsStr[idx];
              return (
                <div
                  key={idx}
                  onWheel={(e) => handleDigitScroll(idx, e)}
                  onClick={() => handleDigitClick(idx, 1)}
                  className="relative cursor-pointer flex flex-col items-center"
                >
                  <span className="text-2xl sm:text-4xl font-bold tracking-tight px-0.5 text-[#94a3b8]">
                    {digit}
                  </span>
                </div>
              );
            })}
          </div>

          <span className="text-xs sm:text-sm font-bold text-[#06b6d4] ml-1.5">MHz</span>
        </div>

        {/* Step Up Button */}
        <button
          onClick={() => onStepDelta(stepSize)}
          className="w-11 h-11 rounded bg-[#212b36] active:bg-[#10b981]/20 border border-[#2d3846] text-[#f9fafb] flex items-center justify-center shrink-0"
          title="Step Up"
        >
          <Plus className="w-5 h-5 text-[#94a3b8]" />
        </button>
      </div>

      {/* Step Buttons (Compact touch row) */}
      <div className="mt-1.5 flex items-center justify-between gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {STEP_OPTIONS.map((step) => {
          const isSelected = stepSize === step.value;
          return (
            <button
              key={step.value}
              onClick={() => onChangeStepSize(step.value)}
              className={`flex-1 py-1 text-[10px] font-mono rounded text-center transition-colors min-w-[28px] ${
                isSelected
                  ? 'bg-[#10b981] text-[#003824] font-bold'
                  : 'bg-[#212b36] text-[#94a3b8] border border-[#2d3846]'
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
