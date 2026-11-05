import React, { useState } from 'react';
import { PresetChannel } from '../types/radio';
import { Bookmark, Star, Plus } from 'lucide-react';

interface MemoryChannelsProps {
  channels: PresetChannel[];
  currentFrequencyHz: number;
  onTuneChannel: (channel: PresetChannel) => void;
  onSaveCurrentToMemory: (name: string, category: string, tag: string) => void;
  onDeleteChannel: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const MemoryChannels: React.FC<MemoryChannelsProps> = ({
  channels,
  currentFrequencyHz,
  onTuneChannel,
  onSaveCurrentToMemory,
  onToggleFavorite,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newCat, setNewCat] = useState('Tactical');

  const categories = ['All', 'Fav', 'Emergency', 'Ham', 'Air', 'WX', 'Marine'];

  const filteredChannels = channels.filter((ch) => {
    if (selectedCategory === 'Fav') {
      if (!ch.isFavorite) return false;
    } else if (selectedCategory === 'Ham') {
      if (ch.category !== 'Amateur') return false;
    } else if (selectedCategory === 'Air') {
      if (ch.category !== 'Aviation') return false;
    } else if (selectedCategory === 'WX') {
      if (ch.category !== 'Weather') return false;
    } else if (selectedCategory !== 'All') {
      if (ch.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ch.name.toLowerCase().includes(q) ||
        ch.tag.toLowerCase().includes(q) ||
        (ch.frequencyHz / 1e6).toFixed(3).includes(q)
      );
    }
    return true;
  });

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'AM': return 'border-l-[#ffb95f]';
      case 'NFM': return 'border-l-[#10b981]';
      case 'WFM': return 'border-l-[#06b6d4]';
      case 'CW': return 'border-l-[#a855f7]';
      case 'USB': return 'border-l-[#3b82f6]';
      default: return 'border-l-[#94a3b8]';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onSaveCurrentToMemory(newName.trim(), newCat, newTag.trim() || 'MEM');
    setNewName('');
    setNewTag('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="bg-[#161c24] border border-[#2d3846] rounded p-2 flex flex-col h-full select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#2d3846]">
        <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#f9fafb]">
          <Bookmark className="w-3.5 h-3.5 text-[#10b981]" />
          <span>BANKS ({channels.length})</span>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#212b36] text-[#10b981] text-[10px] font-bold"
        >
          <Plus className="w-3 h-3" />
          <span>ADD</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-[#10b981] text-[#003824] font-bold'
                : 'bg-[#212b36] text-[#94a3b8]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Filter MHz..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-[#0b0f14] border border-[#2d3846] rounded px-2 py-1 text-[11px] text-[#dde3ee] font-mono outline-none mb-1.5"
      />

      {/* Save VFO Form */}
      {isAddModalOpen && (
        <form onSubmit={handleSave} className="p-2 mb-1.5 bg-[#0b0f14] border border-[#10b981]/50 rounded flex flex-col gap-1.5 text-[11px]">
          <span className="font-bold text-[#10b981]">
            {(currentFrequencyHz / 1e6).toFixed(4)} MHz
          </span>
          <input
            type="text"
            required
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-[#161c24] border border-[#2d3846] rounded px-2 py-0.5 text-xs text-[#f9fafb] outline-none"
          />
          <div className="flex justify-end gap-1.5 mt-1">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-2 py-0.5 text-[#94a3b8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-0.5 bg-[#10b981] text-[#003824] font-bold rounded"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
        {filteredChannels.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#475569]">
            No channels found
          </div>
        ) : (
          filteredChannels.map((ch) => {
            const isTuned = Math.abs(ch.frequencyHz - currentFrequencyHz) < 100;
            return (
              <div
                key={ch.id}
                onClick={() => onTuneChannel(ch)}
                className={`p-1.5 rounded border border-[#2d3846]/60 border-l-4 ${getModeColor(
                  ch.mode
                )} cursor-pointer flex items-center justify-between ${
                  isTuned ? 'bg-[#10b981]/15 border-r-[#10b981]' : 'bg-[#212b36] active:bg-[#2d3846]'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="font-bold text-xs text-[#f9fafb] truncate">{ch.name}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8] font-mono">
                    <span className="text-[#10b981]">{ch.mode}</span>
                    <span>·</span>
                    <span className="text-[#06b6d4]">{ch.tag}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="font-mono text-xs font-bold text-[#dde3ee]">
                    {(ch.frequencyHz / 1e6).toFixed(3)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(ch.id);
                    }}
                    className={`p-1 ${ch.isFavorite ? 'text-[#ffb95f]' : 'text-[#475569]'}`}
                  >
                    <Star className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
