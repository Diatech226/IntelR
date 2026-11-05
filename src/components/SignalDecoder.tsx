import React, { useState } from 'react';
import { InterceptLog } from '../types/radio';
import { Terminal, Download, Trash2 } from 'lucide-react';

interface SignalDecoderProps {
  logs: InterceptLog[];
  onClearLogs: () => void;
  onTuneToFrequency: (freqHz: number) => void;
}

export const SignalDecoder: React.FC<SignalDecoderProps> = ({
  logs,
  onClearLogs,
  onTuneToFrequency,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = logs.filter((l) => {
    if (filterType === 'ALL') return true;
    return l.decoderType === filterType;
  });

  const exportLogsAsCsv = () => {
    if (logs.length === 0) return;
    const header = 'Timestamp,MHz,Mode,RSSI,Callsign,Decoded\n';
    const rows = logs
      .map(
        (l) =>
          `"${l.timestamp}","${(l.frequencyHz / 1e6).toFixed(4)}","${l.mode}","${l.rssiDbm}","${
            l.callsign || ''
          }","${l.decodedContent.replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sdr_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'APRS': return 'bg-[#10b981]/20 text-[#10b981]';
      case 'ACARS': return 'bg-[#06b6d4]/20 text-[#06b6d4]';
      case 'WEATHER': return 'bg-[#ffb95f]/20 text-[#ffb95f]';
      case 'MORSE': return 'bg-[#a855f7]/20 text-[#a855f7]';
      default: return 'bg-[#212b36] text-[#94a3b8]';
    }
  };

  return (
    <div className="bg-[#161c24] border border-[#2d3846] rounded p-2 flex flex-col h-full select-none text-xs">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#2d3846]">
        <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#f9fafb]">
          <Terminal className="w-3.5 h-3.5 text-[#06b6d4]" />
          <span>DECODER ({logs.length})</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={exportLogsAsCsv}
            disabled={logs.length === 0}
            className="p-1 rounded bg-[#212b36] text-[#06b6d4] disabled:opacity-40"
            title="Export CSV"
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="p-1 rounded bg-[#212b36] text-[#ef4444] disabled:opacity-40"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1 mb-1.5 overflow-x-auto pb-0.5 text-[10px] font-mono scrollbar-none">
        {['ALL', 'APRS', 'ACARS', 'WEATHER', 'MORSE'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-1.5 py-0.5 rounded ${
              filterType === type
                ? 'bg-[#06b6d4] text-[#003640] font-bold'
                : 'bg-[#212b36] text-[#94a3b8]'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Logs Feed */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 font-mono text-[11px]">
        {filteredLogs.length === 0 ? (
          <div className="py-6 text-center text-[#475569] text-xs">
            Waiting for signals to break squelch...
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => onTuneToFrequency(log.frequencyHz)}
              className="p-1.5 rounded bg-[#0b0f14] border border-[#2d3846] cursor-pointer flex flex-col gap-0.5"
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1 rounded text-[9px] font-bold ${getBadgeColor(log.decoderType)}`}>
                    {log.decoderType}
                  </span>
                  <span className="text-[#10b981] font-bold">
                    {(log.frequencyHz / 1e6).toFixed(3)}
                  </span>
                </div>
                <span className="text-[#94a3b8] text-[9px]">{log.timestamp}</span>
              </div>
              <div className="text-[10px] text-[#f9fafb] break-all">
                {log.decodedContent}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
