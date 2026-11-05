import React from 'react';
import { SDRDeviceConfig } from '../types/radio';
import { Settings, Cpu, Zap, X, Check } from 'lucide-react';

interface DeviceConfigModalProps {
  isOpen: boolean;
  config: SDRDeviceConfig;
  onClose: () => void;
  onUpdateConfig: (updated: Partial<SDRDeviceConfig>) => void;
}

export const DeviceConfigModal: React.FC<DeviceConfigModalProps> = ({
  isOpen,
  config,
  onClose,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  const SDR_MODELS = [
    { name: 'RTL-SDR Blog v4 (R828D + Upconverter)', rates: [2400000, 2048000, 1024000] },
    { name: 'HackRF One (1 MHz - 6 GHz Transceiver)', rates: [20000000, 10000000, 2400000] },
    { name: 'Airspy HF+ Discovery (Dual Tuner HF/VHF)', rates: [768000, 912000, 2400000] },
    { name: 'SDRplay RSPdx (14-bit High Dynamic Range)', rates: [2000000, 2400000, 6000000] },
    { name: 'USRP B200 (Wideband Tactical SDR)', rates: [4000000, 2400000] },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-[#161c24] border border-[#2d3846] rounded p-5 shadow-2xl flex flex-col gap-4 glow-cyan">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2d3846]">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#06b6d4]" />
            <h3 className="font-bold text-sm tracking-wider uppercase text-[#f9fafb]">
              SDR Hardware & RF Front-End Config
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#94a3b8] hover:text-[#f9fafb]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase text-[#94a3b8]">Receiver Hardware</label>
          <select
            value={config.model}
            onChange={(e) => onUpdateConfig({ model: e.target.value })}
            className="w-full bg-[#0b0f14] border border-[#2d3846] rounded px-3 py-2 text-xs font-mono text-[#f9fafb] outline-none cursor-pointer focus:border-[#10b981]"
          >
            {SDR_MODELS.map((m) => (
              <option key={m.name} value={m.name} className="bg-[#161c24]">
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sample Rate */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase text-[#94a3b8]">
            I/Q Sample Rate: {(config.sampleRate / 1e6).toFixed(3)} MSPS
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[1024000, 2048000, 2400000, 3200000].map((rate) => (
              <button
                key={rate}
                onClick={() => onUpdateConfig({ sampleRate: rate })}
                className={`py-1.5 text-xs font-mono rounded border transition-colors ${
                  config.sampleRate === rate
                    ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981] font-bold'
                    : 'bg-[#212b36] border-[#2d3846] text-[#94a3b8]'
                }`}
              >
                {(rate / 1e6).toFixed(3)} MSPS
              </button>
            ))}
          </div>
        </div>

        {/* Bias-T & Direct Sampling */}
        <div className="grid grid-cols-2 gap-3">
          {/* Bias-T */}
          <div
            onClick={() => onUpdateConfig({ biasT: !config.biasT })}
            className={`p-3 rounded border cursor-pointer flex flex-col justify-between transition-colors ${
              config.biasT
                ? 'bg-[#ffb95f]/15 border-[#ffb95f] text-[#ffb95f]'
                : 'bg-[#212b36] border-[#2d3846] text-[#94a3b8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">BIAS-T (4.5V DC)</span>
              <Zap className={`w-4 h-4 ${config.biasT ? 'text-[#ffb95f]' : 'text-[#475569]'}`} />
            </div>
            <span className="text-[10px] mt-1 font-mono">
              {config.biasT ? 'ACTIVE LNA POWERED' : 'INACTIVE (PROTECTED)'}
            </span>
          </div>

          {/* Direct Sampling */}
          <div
            onClick={() => onUpdateConfig({ directSampling: !config.directSampling })}
            className={`p-3 rounded border cursor-pointer flex flex-col justify-between transition-colors ${
              config.directSampling
                ? 'bg-[#10b981]/15 border-[#10b981] text-[#10b981]'
                : 'bg-[#212b36] border-[#2d3846] text-[#94a3b8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">DIRECT SAMPLING</span>
              <Check className={`w-4 h-4 ${config.directSampling ? 'text-[#10b981]' : 'text-[#475569]'}`} />
            </div>
            <span className="text-[10px] mt-1 font-mono">
              {config.directSampling ? 'Q-BRANCH HF ACTIVE' : 'QUADRATURE MIXER'}
            </span>
          </div>
        </div>

        {/* Frequency PPM Correction */}
        <div className="flex flex-col gap-1.5 bg-[#1a2028] p-3 rounded border border-[#2d3846]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#94a3b8]">TCXO PPM OFFSET CALIBRATION</span>
            <span className="text-[#06b6d4] font-bold">{config.ppmCorrection > 0 ? `+${config.ppmCorrection}` : config.ppmCorrection} PPM</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            step="1"
            value={config.ppmCorrection}
            onChange={(e) => onUpdateConfig({ ppmCorrection: parseInt(e.target.value) })}
            className="accent-[#06b6d4] cursor-pointer h-1.5 bg-[#0b0f14] rounded"
          />
          <div className="flex justify-between font-mono text-[9px] text-[#475569]">
            <span>-50 PPM</span>
            <span>0 PPM (CALIBRATED)</span>
            <span>+50 PPM</span>
          </div>
        </div>

        {/* Antenna Port */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase text-[#94a3b8]">RF Input Connector</label>
          <div className="grid grid-cols-2 gap-2">
            {(['ANT-1 (HF)', 'ANT-2 (VHF/UHF)'] as const).map((ant) => (
              <button
                key={ant}
                onClick={() => onUpdateConfig({ antenna: ant })}
                className={`py-2 px-3 rounded text-xs font-mono font-bold border transition-colors ${
                  config.antenna === ant
                    ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#06b6d4]'
                    : 'bg-[#212b36] border-[#2d3846] text-[#94a3b8]'
                }`}
              >
                {ant}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-2 py-2 bg-[#10b981] hover:bg-[#10b981]/90 text-[#003824] font-bold text-xs uppercase tracking-wider rounded transition-colors"
        >
          APPLY HARDWARE CONFIGURATION
        </button>
      </div>
    </div>
  );
};
