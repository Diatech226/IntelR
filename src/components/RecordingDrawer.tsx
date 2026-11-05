import React from 'react';
import { AudioRecording } from '../types/radio';
import { Disc, Play, Pause, Download, Trash2, X, Music } from 'lucide-react';

interface RecordingDrawerProps {
  isOpen: boolean;
  recordings: AudioRecording[];
  onClose: () => void;
  onDeleteRecording: (id: string) => void;
}

export const RecordingDrawer: React.FC<RecordingDrawerProps> = ({
  isOpen,
  recordings,
  onClose,
  onDeleteRecording,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-[#161c24] border border-[#2d3846] rounded p-5 shadow-2xl flex flex-col gap-4 max-h-[80vh] glow-cyan">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2d3846]">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-[#ef4444]" />
            <h3 className="font-bold text-sm tracking-wider uppercase text-[#f9fafb]">
              Demodulated RF Audio Captures
            </h3>
            <span className="font-mono text-xs text-[#94a3b8]">({recordings.length})</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#94a3b8] hover:text-[#f9fafb]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {recordings.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#475569] flex flex-col items-center gap-2">
              <Disc className="w-8 h-8 opacity-30 text-[#94a3b8]" />
              <span>No audio captures recorded yet.</span>
              <span className="text-[11px] text-[#94a3b8]">
                Click the <strong>REC</strong> button on the toolbar to record live RF demodulation!
              </span>
            </div>
          ) : (
            recordings.map((rec) => (
              <div
                key={rec.id}
                className="p-3 bg-[#0b0f14] border border-[#2d3846] rounded flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-[#06b6d4]" />
                    <span className="font-bold font-mono text-xs text-[#f9fafb]">
                      {(rec.frequencyHz / 1e6).toFixed(4)} MHz
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#161c24] text-[10px] font-mono text-[#10b981]">
                      {rec.mode}
                    </span>
                    <span className="text-[10px] text-[#94a3b8] font-mono">{rec.durationSec}s</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={rec.blobUrl}
                      download={rec.fileName}
                      className="p-1.5 rounded bg-[#212b36] hover:bg-[#2d3846] text-[#06b6d4] text-xs transition-colors"
                      title="Download Recording File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => onDeleteRecording(rec.id)}
                      className="p-1.5 rounded bg-[#212b36] hover:bg-[#2d3846] text-[#ef4444] text-xs transition-colors"
                      title="Delete Recording"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Built-in Audio Player */}
                <audio controls src={rec.blobUrl} className="w-full h-8 mt-1 accent-[#10b981]" />

                <div className="text-[9px] font-mono text-[#475569] flex justify-between">
                  <span>Captured: {rec.timestamp}</span>
                  <span>Format: WebM / OPUS / WAV</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
