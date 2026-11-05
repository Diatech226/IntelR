import React, { useEffect, useRef, useState } from 'react';
import { WaterfallPalette } from '../types/radio';
import { signalEngine } from '../services/signalEngine';
import { Play, Pause, Palette } from 'lucide-react';

interface SpectrumWaterfallProps {
  centerHz: number;
  filterBwHz: number;
  squelchDbm: number;
  rfGain: number;
  onTune: (freqHz: number) => void;
  onChangeSquelch: (dbm: number) => void;
}

export const SpectrumWaterfall: React.FC<SpectrumWaterfallProps> = ({
  centerHz,
  filterBwHz,
  squelchDbm,
  rfGain,
  onTune,
  onChangeSquelch,
}) => {
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waterfallCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [spanHz, setSpanHz] = useState<number>(500000);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [palette, setPalette] = useState<WaterfallPalette>('tactical-cyan');
  const [minDbm] = useState<number>(-115);
  const [maxDbm] = useState<number>(-35);
  const [isDraggingSquelch, setIsDraggingSquelch] = useState(false);

  const peakHoldRef = useRef<Float32Array | null>(null);
  const lastWaterfallTimeRef = useRef<number>(Date.now());

  const SPANS = [
    { label: '100k', value: 100000 },
    { label: '250k', value: 250000 },
    { label: '500k', value: 500000 },
    { label: '1M', value: 1000000 },
    { label: '2M', value: 2000000 },
  ];

  const getPaletteRgb = (norm: number, pal: WaterfallPalette): [number, number, number] => {
    const val = Math.max(0, Math.min(1, norm));
    if (pal === 'thermal-emerald') {
      if (val < 0.25) {
        const t = val / 0.25;
        return [0, Math.round(t * 70), Math.round(t * 40)];
      } else if (val < 0.65) {
        const t = (val - 0.25) / 0.4;
        return [Math.round(t * 16), Math.round(70 + t * 115), Math.round(40 + t * 89)];
      } else if (val < 0.88) {
        const t = (val - 0.65) / 0.23;
        return [Math.round(16 + t * 229), Math.round(185 - t * 27), Math.round(129 - t * 118)];
      } else {
        const t = (val - 0.88) / 0.12;
        return [245 + Math.round(t * 10), 158 + Math.round(t * 97), 11 + Math.round(t * 244)];
      }
    } else if (pal === 'night-vision') {
      return [0, Math.round(val * 240 + 15), Math.round(val * 110)];
    } else if (pal === 'turbo') {
      if (val < 0.3) {
        const t = val / 0.3;
        return [Math.round(10 * (1 - t)), Math.round(t * 180), Math.round(120 + t * 135)];
      } else if (val < 0.65) {
        const t = (val - 0.3) / 0.35;
        return [Math.round(t * 240), Math.round(180 + t * 60), Math.round(255 * (1 - t))];
      } else {
        const t = (val - 0.65) / 0.35;
        return [240 + Math.round(t * 15), Math.round(240 * (1 - t)), 10];
      }
    } else {
      if (val < 0.3) {
        const t = val / 0.3;
        return [Math.round(11 + t * 15), Math.round(15 + t * 35), Math.round(20 + t * 65)];
      } else if (val < 0.75) {
        const t = (val - 0.3) / 0.45;
        return [Math.round(26 + t * 60), Math.round(50 + t * 132), Math.round(85 + t * 127)];
      } else {
        const t = (val - 0.75) / 0.25;
        return [Math.round(86 + t * 169), Math.round(182 + t * 73), Math.round(212 + t * 43)];
      }
    }
  };

  useEffect(() => {
    let animFrameId: number;

    const render = () => {
      const specCanvas = spectrumCanvasRef.current;
      const wfCanvas = waterfallCanvasRef.current;

      if (specCanvas && wfCanvas) {
        const specWidth = specCanvas.width;
        const specHeight = specCanvas.height;
        const wfWidth = wfCanvas.width;
        const wfHeight = wfCanvas.height;

        const specCtx = specCanvas.getContext('2d');
        const wfCtx = wfCanvas.getContext('2d');

        if (specCtx && wfCtx) {
          const binsCount = specWidth;
          const fftData = signalEngine.generateFftData(centerHz, spanHz, binsCount, rfGain, minDbm);

          if (!peakHoldRef.current || peakHoldRef.current.length !== binsCount) {
            peakHoldRef.current = new Float32Array(fftData);
          } else {
            for (let i = 0; i < binsCount; i++) {
              if (fftData[i] > peakHoldRef.current[i]) {
                peakHoldRef.current[i] = fftData[i];
              } else {
                peakHoldRef.current[i] -= 0.2;
              }
            }
          }

          // Spectrum Canvas
          specCtx.fillStyle = '#0b0f14';
          specCtx.fillRect(0, 0, specWidth, specHeight);

          // Grid & dBm ticks
          specCtx.strokeStyle = 'rgba(45, 56, 70, 0.35)';
          specCtx.lineWidth = 1;
          specCtx.font = '9px "Space Mono", monospace';
          specCtx.fillStyle = '#475569';

          const dbmRange = maxDbm - minDbm;
          const dbmStep = 25;
          for (let db = Math.ceil(minDbm / dbmStep) * dbmStep; db <= maxDbm; db += dbmStep) {
            const y = specHeight - ((db - minDbm) / dbmRange) * specHeight;
            specCtx.beginPath();
            specCtx.moveTo(0, y);
            specCtx.lineTo(specWidth, y);
            specCtx.stroke();
            specCtx.fillText(`${db}`, 4, y - 2);
          }

          // Vertical Frequency Grid Lines
          const freqStart = centerHz - spanHz / 2;
          const numFreqTicks = 4;
          const tickStepHz = spanHz / numFreqTicks;

          for (let i = 1; i < numFreqTicks; i++) {
            const tickFreq = freqStart + i * tickStepHz;
            const x = (i / numFreqTicks) * specWidth;
            specCtx.beginPath();
            specCtx.moveTo(x, 0);
            specCtx.lineTo(x, specHeight);
            specCtx.stroke();
            const mhzLabel = (tickFreq / 1e6).toFixed(3);
            specCtx.fillText(mhzLabel, x - 22, specHeight - 4);
          }

          // Passband Shadow
          const centerX = specWidth / 2;
          const passbandPx = Math.max(4, (filterBwHz / spanHz) * specWidth);
          specCtx.fillStyle = 'rgba(6, 182, 212, 0.12)';
          specCtx.fillRect(centerX - passbandPx / 2, 0, passbandPx, specHeight);

          // Peak Hold
          if (peakHoldRef.current) {
            specCtx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
            specCtx.lineWidth = 1;
            specCtx.beginPath();
            for (let i = 0; i < binsCount; i++) {
              const val = peakHoldRef.current[i];
              const y = specHeight - ((val - minDbm) / dbmRange) * specHeight;
              if (i === 0) specCtx.moveTo(0, y);
              else specCtx.lineTo(i, y);
            }
            specCtx.stroke();
          }

          // FFT Fill
          const gradient = specCtx.createLinearGradient(0, 0, 0, specHeight);
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.55)');
          gradient.addColorStop(0.7, 'rgba(6, 182, 212, 0.15)');
          gradient.addColorStop(1, 'rgba(11, 15, 20, 0)');

          specCtx.beginPath();
          specCtx.moveTo(0, specHeight);
          for (let i = 0; i < binsCount; i++) {
            const val = fftData[i];
            const y = specHeight - ((val - minDbm) / dbmRange) * specHeight;
            specCtx.lineTo(i, y);
          }
          specCtx.lineTo(specWidth, specHeight);
          specCtx.closePath();
          specCtx.fillStyle = gradient;
          specCtx.fill();

          // FFT Stroke
          specCtx.strokeStyle = '#06b6d4';
          specCtx.lineWidth = 1.5;
          specCtx.beginPath();
          for (let i = 0; i < binsCount; i++) {
            const val = fftData[i];
            const y = specHeight - ((val - minDbm) / dbmRange) * specHeight;
            if (i === 0) specCtx.moveTo(0, y);
            else specCtx.lineTo(i, y);
          }
          specCtx.stroke();

          // Center Cursor
          specCtx.strokeStyle = '#10b981';
          specCtx.lineWidth = 1.5;
          specCtx.beginPath();
          specCtx.moveTo(centerX, 0);
          specCtx.lineTo(centerX, specHeight);
          specCtx.stroke();

          // Squelch Line
          const squelchY = specHeight - ((squelchDbm - minDbm) / dbmRange) * specHeight;
          specCtx.strokeStyle = '#f59e0b';
          specCtx.lineWidth = 1.5;
          specCtx.beginPath();
          specCtx.moveTo(0, squelchY);
          specCtx.lineTo(specWidth, squelchY);
          specCtx.stroke();

          // Squelch Handle Badge
          specCtx.fillStyle = '#f59e0b';
          specCtx.fillRect(specWidth - 48, squelchY - 7, 46, 14);
          specCtx.fillStyle = '#0b0f14';
          specCtx.font = 'bold 8px "Space Mono", monospace';
          specCtx.fillText(`${squelchDbm}d`, specWidth - 42, squelchY + 3);

          // Waterfall Frame
          const now = Date.now();
          if (!isPaused && now - lastWaterfallTimeRef.current >= 50) {
            lastWaterfallTimeRef.current = now;
            wfCtx.drawImage(wfCanvas, 0, 0, wfWidth, wfHeight - 1, 0, 1, wfWidth, wfHeight - 1);

            const rowData = wfCtx.createImageData(wfWidth, 1);
            const pixels = rowData.data;

            for (let x = 0; x < wfWidth; x++) {
              const binIdx = Math.floor((x / wfWidth) * binsCount);
              const val = fftData[binIdx];
              const norm = (val - minDbm) / dbmRange;
              const [r, g, b] = getPaletteRgb(norm, palette);

              const pIdx = x * 4;
              pixels[pIdx] = r;
              pixels[pIdx + 1] = g;
              pixels[pIdx + 2] = b;
              pixels[pIdx + 3] = 255;
            }

            wfCtx.putImageData(rowData, 0, 0);

            wfCtx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            wfCtx.lineWidth = 1;
            wfCtx.beginPath();
            wfCtx.moveTo(centerX, 0);
            wfCtx.lineTo(centerX, 2);
            wfCtx.stroke();
          }
        }
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId);
  }, [centerHz, spanHz, filterBwHz, squelchDbm, rfGain, minDbm, maxDbm, palette, isPaused]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dbmRange = maxDbm - minDbm;
    const squelchY = canvas.height - ((squelchDbm - minDbm) / dbmRange) * canvas.height;

    if (Math.abs(y - squelchY) < 12) {
      setIsDraggingSquelch(true);
      return;
    }

    const freqStart = centerHz - spanHz / 2;
    const clickedFreq = freqStart + (x / canvas.width) * spanHz;
    onTune(Math.round(clickedFreq));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingSquelch) return;
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const dbmRange = maxDbm - minDbm;
    const currentDbm = minDbm + ((canvas.height - y) / canvas.height) * dbmRange;
    const clampedDbm = Math.max(-118, Math.min(-30, Math.round(currentDbm)));
    onChangeSquelch(clampedDbm);
  };

  const handleWaterfallClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waterfallCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const freqStart = centerHz - spanHz / 2;
    const clickedFreq = freqStart + (x / canvas.width) * spanHz;
    onTune(Math.round(clickedFreq));
  };

  return (
    <div className="bg-[#161c24] border border-[#2d3846] rounded flex flex-col flex-1 overflow-hidden select-none min-h-[260px]">
      {/* Slim Viewport Bar */}
      <div className="h-7 bg-[#1a2028] border-b border-[#2d3846] px-2 flex items-center justify-between text-[11px] shrink-0">
        {/* Left: Active span */}
        <div className="flex items-center gap-1 font-mono text-[10px] text-[#dde3ee]">
          <span className="text-[#06b6d4]">SPAN</span>
          {SPANS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSpanHz(s.value)}
              className={`px-1.5 py-0.5 rounded text-[9px] ${
                spanHz === s.value ? 'bg-[#06b6d4] text-[#003640] font-bold' : 'text-[#94a3b8]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Right: Palette & Pause */}
        <div className="flex items-center gap-1">
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value as WaterfallPalette)}
            className="bg-[#0b0f14] border border-[#2d3846] text-[#dde3ee] font-mono text-[9px] rounded px-1 py-0.5 outline-none cursor-pointer"
          >
            <option value="tactical-cyan">Cyan</option>
            <option value="thermal-emerald">Thermal</option>
            <option value="turbo">Turbo</option>
            <option value="night-vision">Night</option>
          </select>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-0.5 px-1 rounded border border-[#2d3846] text-[9px] ${
              isPaused ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#0b0f14] text-[#10b981]'
            }`}
          >
            {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>

      {/* Dual Display Canvas Container */}
      <div className="flex flex-col flex-1 relative bg-[#0b0f14]">
        {/* Spectrum Canvas (Top 55%) */}
        <div className="relative h-[55%] border-b border-[#2d3846]">
          <canvas
            ref={spectrumCanvasRef}
            width={720}
            height={160}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDraggingSquelch(false)}
            onMouseLeave={() => setIsDraggingSquelch(false)}
            className="w-full h-full cursor-crosshair block"
          />
        </div>

        {/* Waterfall Canvas (Bottom 45%) */}
        <div className="relative h-[45%]">
          <canvas
            ref={waterfallCanvasRef}
            width={720}
            height={130}
            onClick={handleWaterfallClick}
            className="w-full h-full cursor-crosshair block"
          />
        </div>
      </div>
    </div>
  );
};
