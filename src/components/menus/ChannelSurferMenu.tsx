import React, { useState, useEffect } from "react";
import { RomItem } from "../../types";
import { Tv, Play, Radio, Volume2, Search, X } from "lucide-react";

interface ChannelSurferMenuProps {
  roms: RomItem[];
  selectedRom: RomItem | null;
  onSelectRom: (rom: RomItem) => void;
  onLaunchRom: (rom: RomItem) => void;
  isLoading: boolean;
}

export const ChannelSurferMenu: React.FC<ChannelSurferMenuProps> = ({
  roms,
  selectedRom,
  onSelectRom,
  onLaunchRom,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const cleanQuery = searchQuery.trim().toLowerCase();
  const filteredRoms = roms.filter((r) => {
    if (!cleanQuery) return true;
    return (
      r.title.toLowerCase().includes(cleanQuery) ||
      r.genre?.toLowerCase().includes(cleanQuery) ||
      r.year?.toLowerCase().includes(cleanQuery) ||
      r.tags?.some((t) => t.toLowerCase().includes(cleanQuery))
    );
  });

  const activeIndex = filteredRoms.findIndex((r) => r.id === selectedRom?.id);

  // Auto-select first matching channel if current selection is filtered out
  useEffect(() => {
    if (filteredRoms.length > 0) {
      const hasSelected = filteredRoms.some((r) => r.id === selectedRom?.id);
      if (!hasSelected) {
        onSelectRom(filteredRoms[0]);
      }
    }
  }, [cleanQuery, filteredRoms, selectedRom, onSelectRom]);

  // Keyboard navigation for channels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (filteredRoms.length === 0) return;
      if (e.key === "ArrowDown") {
        const next = (activeIndex + 1) % filteredRoms.length;
        onSelectRom(filteredRoms[next]);
      } else if (e.key === "ArrowUp") {
        const prev = (activeIndex - 1 + filteredRoms.length) % filteredRoms.length;
        onSelectRom(filteredRoms[prev]);
      } else if (e.key === "Enter") {
        if (selectedRom) onLaunchRom(selectedRom);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filteredRoms, selectedRom, onSelectRom, onLaunchRom]);

  return (
    <div className="w-full h-full bg-[#000d26] text-white flex flex-col select-none overflow-hidden text-base p-0">
      {/* Top 45%: TV Broadcast Tuner Preview & Channel Info */}
      <div className="h-[46%] grid grid-cols-1 md:grid-cols-12 border-b-4 border-[#eab308] bg-gradient-to-b from-[#001f54] to-[#000d26] p-2.5 sm:p-3 gap-3">
        {/* Left: TV Test Card / Game Preview Box */}
        <div className="md:col-span-6 relative rounded-xl border-2 border-[#eab308] bg-black overflow-hidden flex flex-col justify-between p-3.5 shadow-xl">
          {selectedRom ? (
            <>
              {/* Channel & Live Broadcast Banner */}
              <div className="flex justify-between items-center z-10">
                <span className="bg-[#eab308] text-black px-2.5 py-0.5 font-grotesk font-black tracking-widest text-xs uppercase rounded-md shadow-sm">
                  CHANNEL {String((activeIndex >= 0 ? activeIndex : 0) + 3).padStart(2, "0")}
                </span>
                <span className="flex items-center gap-1.5 text-red-500 font-grotesk font-black text-xs uppercase tracking-wider animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  LIVE BROADCAST
                </span>
              </div>

              {/* Title display */}
              <div className="my-auto text-center z-10 px-2">
                <h3 className="text-xl sm:text-2xl text-yellow-300 font-display font-black uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {selectedRom.title}
                </h3>
                <p className="text-xs text-sky-200 font-grotesk font-semibold uppercase tracking-wider mt-1">
                  {selectedRom.genre} • {selectedRom.year} • {selectedRom.players === 2 ? "2-Player Co-Op" : "Single Player"}
                </p>
              </div>

              {/* Quick Launch prompt */}
              <div className="flex justify-between items-center z-10 pt-1.5 border-t border-yellow-900/50">
                <span className="text-[11px] font-grotesk font-bold text-zinc-400 uppercase tracking-wider">PRESS [ENTER] TO TUNE IN</span>
                <button
                  onClick={() => onLaunchRom(selectedRom)}
                  className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-display font-black text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>WATCH & PLAY</span>
                </button>
              </div>

              {/* Scanline pattern inside preview */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none" />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-yellow-500 font-display font-black text-sm uppercase tracking-wider">
              SELECT A CHANNEL BELOW
            </div>
          )}
        </div>

        {/* Right: Station ID & Synopsis */}
        <div className="md:col-span-6 flex flex-col justify-between p-1.5">
          <div>
            <div className="flex items-center gap-2 text-yellow-400">
              <Radio className="w-5 h-5 text-yellow-400" />
              <span className="font-display font-black text-sm sm:text-base uppercase tracking-tight">NES PARTY BROADCAST NETWORK</span>
            </div>
            <p className="text-xs text-zinc-300 font-grotesk font-medium mt-1">
              Serving retro party game feeds 24 hours a day across UHF/VHF frequencies.
            </p>
          </div>

          {selectedRom && (
            <div className="bg-[#00173d] p-3 rounded-xl border border-blue-900 text-xs leading-snug">
              <div className="text-yellow-400 font-grotesk font-black text-[11px] uppercase tracking-wider mb-1">PROGRAM SYNOPSIS:</div>
              <p className="text-zinc-200 font-grotesk font-normal line-clamp-3">
                {selectedRom.description || "Classic NES broadcast transmission ready for player controllers."}
              </p>
            </div>
          )}

          <div className="flex justify-between text-[11px] text-sky-300 font-grotesk font-bold uppercase tracking-wider pt-1">
            <span>TIME: 8:00 PM EST</span>
            <span>FREQ: 61.25 MHz</span>
            <span>STEREO APU</span>
          </div>
        </div>
      </div>

      {/* Bottom 50%: The Electronic Program Guide Grid */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#001433]">
        {/* Table Header with Quick Channel Search */}
        <div className="bg-[#002b66] border-b-2 border-[#eab308] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-grotesk font-black uppercase tracking-wider text-[#eab308]">
              ELECTRONIC PROGRAM GUIDE ({filteredRoms.length} CHANNELS)
            </span>
          </div>

          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-yellow-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") setSearchQuery("");
              }}
              onKeyUp={(e) => e.stopPropagation()}
              placeholder="Search channels..."
              className="bg-[#00173d] text-yellow-200 placeholder-yellow-500/60 pl-8 pr-7 py-1 text-xs font-grotesk font-semibold rounded-lg border border-yellow-600/50 focus:border-yellow-400 outline-none w-48 sm:w-60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-yellow-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Columns sub-header */}
        <div className="grid grid-cols-12 bg-[#00214d] text-sky-300 px-3 py-1 border-b border-blue-900 text-[11px] font-grotesk font-black uppercase tracking-wider">
          <div className="col-span-2 sm:col-span-2">CH #</div>
          <div className="col-span-2 sm:col-span-2">NETWORK</div>
          <div className="col-span-5 sm:col-span-6">FEATURED TITLE</div>
          <div className="col-span-3 sm:col-span-2 text-right">GENRE / MODE</div>
        </div>

        {/* Scrollable Channel Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredRoms.length === 0 ? (
            <div className="py-10 text-center text-yellow-400 font-grotesk font-bold text-xs uppercase tracking-wider">
              No broadcast channels match "{searchQuery}"
            </div>
          ) : (
            filteredRoms.map((rom, idx) => {
              const channelNum = idx + 3;
              const isSelected = selectedRom?.id === rom.id;
              return (
                <div
                  key={rom.id}
                  onClick={() => onSelectRom(rom)}
                  onDoubleClick={() => onLaunchRom(rom)}
                  className={`grid grid-cols-12 px-3 py-2 border-b border-blue-950/60 cursor-pointer items-center transition-colors text-sm font-grotesk font-semibold ${
                    isSelected
                      ? "bg-[#eab308] text-black font-bold shadow-lg"
                      : "hover:bg-[#00224d] text-sky-100"
                  }`}
                >
                  <div className="col-span-2 sm:col-span-2 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-display font-black uppercase ${isSelected ? "bg-black text-yellow-400" : "bg-blue-900 text-yellow-300"}`}>
                      CH {String(channelNum).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-2 text-xs truncate uppercase font-grotesk font-bold opacity-80">
                    {rom.tags?.[0] || "NES-TV"}
                  </div>

                  <div className="col-span-5 sm:col-span-6 truncate font-display font-black uppercase text-sm">
                    {isSelected ? `▶ ${rom.title}` : rom.title}
                  </div>

                  <div className="col-span-3 sm:col-span-2 text-right text-xs truncate font-grotesk font-bold uppercase">
                    {rom.players === 2 ? "2P CO-OP" : rom.genre?.slice(0, 14)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Scrolling Retro Ticker */}
        <div className="bg-[#000d26] border-t-2 border-[#eab308] px-2.5 py-1 flex items-center gap-2 overflow-hidden text-xs">
          <span className="bg-red-600 text-white font-grotesk font-black uppercase tracking-wider px-2.5 py-0.5 rounded text-[10px] flex-shrink-0 animate-pulse">
            PARTY BULLETIN
          </span>
          <div className="whitespace-nowrap overflow-hidden text-yellow-300 font-grotesk font-bold text-xs uppercase tracking-wider animate-marquee">
            SCAN QR CODE ON TOP TO JOIN WITH YOUR PHONE • CONTROLLER 1 & CONTROLLER 2 SYNCED IN REAL-TIME • 60 FPS CYCLE-ACCURATE NES CHIP EMULATION • PRESS ANY ARROW KEY TO BROWSE CHANNELS
          </div>
        </div>
      </div>
    </div>
  );
};
