import React, { useState } from "react";
import { RomItem } from "../../types";
import { Play, Tv, Gamepad2, Sparkles, Search, ChevronLeft, ChevronRight, Users, Calendar } from "lucide-react";
import { BoxArtImage } from "../common/BoxArtImage";

interface LivingRoomMenuProps {
  roms: RomItem[];
  selectedRom: RomItem | null;
  onSelectRom: (rom: RomItem) => void;
  onLaunchRom: (rom: RomItem) => void;
  isLoading: boolean;
}

export const LivingRoomMenu: React.FC<LivingRoomMenuProps> = ({
  roms,
  selectedRom,
  onSelectRom,
  onLaunchRom,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoms = roms.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.genre?.toLowerCase().includes(q) ||
      r.year?.includes(q)
    );
  });

  const activeIndex = filteredRoms.findIndex((r) => r.id === selectedRom?.id);
  const currentRom = selectedRom || filteredRoms[0] || null;

  const handlePrev = () => {
    if (filteredRoms.length === 0) return;
    const newIdx = activeIndex <= 0 ? filteredRoms.length - 1 : activeIndex - 1;
    onSelectRom(filteredRoms[newIdx]);
  };

  const handleNext = () => {
    if (filteredRoms.length === 0) return;
    const newIdx = activeIndex >= filteredRoms.length - 1 ? 0 : activeIndex + 1;
    onSelectRom(filteredRoms[newIdx]);
  };

  return (
    <div className="w-full h-full bg-[#18111e] text-zinc-100 flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden relative">
      {/* Retro Wall Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#24172f] via-[#150d1d] to-[#0d0714] pointer-events-none opacity-90" />
      
      {/* Top Living Room Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-600/40 flex items-center justify-center text-amber-400 shadow-md">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-wide text-white uppercase font-mono">
              RETRO LIVING ROOM
            </h1>
            <p className="text-[11px] text-zinc-400">Cozy 1988 TV console & physical cartridge stack</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-lg max-w-xs w-48 sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Search cartridges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-zinc-200 placeholder-zinc-500 w-full"
          />
        </div>
      </div>

      {/* Main Living Room Scene */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-4 overflow-hidden">
        {/* Left: TV Display Stage */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center h-full">
          <div className="relative w-full max-w-lg aspect-[4/3] bg-zinc-950 rounded-3xl border-8 border-[#3b271d] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(0,0,0,0.9)] p-4 flex flex-col justify-between overflow-hidden">
            {/* TV Screen Glass */}
            <div className="relative flex-1 rounded-2xl bg-black overflow-hidden flex items-center justify-center border border-zinc-800">
              {currentRom ? (
                <div className="w-full h-full flex items-center justify-center p-4 relative group">
                  <BoxArtImage
                    rom={currentRom}
                    className="max-h-full max-w-full object-contain rounded drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]"
                  />
                  {/* Subtle TV Scanline Line */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-4 animate-[bounce_4s_infinite] pointer-events-none" />
                </div>
              ) : (
                <div className="text-zinc-600 text-xs font-mono uppercase">NO CARTRIDGE INSERTED</div>
              )}
            </div>

            {/* TV Console Knobs & Channel Display */}
            <div className="mt-3 pt-2 border-t border-[#4a3224] flex items-center justify-between text-zinc-400 text-xs px-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span className="font-mono text-[10px] text-amber-500 font-bold">SOLID STATE TV-88</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrev}
                  className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                  title="Previous Channel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700">
                  CH {String((activeIndex % 99) + 3).padStart(2, "0")}
                </span>
                <button
                  onClick={handleNext}
                  className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                  title="Next Channel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Selected Cartridge Details & Power Button */}
        <div className="lg:col-span-5 flex flex-col justify-center h-full max-w-md mx-auto w-full">
          {currentRom ? (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-950/80 border border-red-500/50 text-red-300">
                    {currentRom.genre || "NES Classic"}
                  </span>
                  <span className="text-zinc-500 text-xs font-mono">{currentRom.year || "1988"}</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-wide">{currentRom.title}</h2>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-3 leading-relaxed">
                  {currentRom.description || "Authentic Nintendo Entertainment System classic game."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-zinc-800/80">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{currentRom.players === 2 ? "2 Players (Simultaneous)" : "1 Player"}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{currentRom.developer || "Nintendo"}</span>
                </div>
              </div>

              {/* Big Red Power / Insert Button */}
              <button
                onClick={() => onLaunchRom(currentRom)}
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_4px_20px_rgba(225,29,72,0.4)] transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isLoading ? "POWERING ON..." : "POWER ON & PLAY"}</span>
              </button>
            </div>
          ) : (
            <div className="text-center text-zinc-500 text-sm">No games match your search.</div>
          )}
        </div>
      </div>

      {/* Bottom Cartridge Stack Carousel */}
      <div className="relative z-10 border-t border-zinc-800/80 pt-3">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {filteredRoms.slice(0, 40).map((r) => {
            const isSelected = r.id === currentRom?.id;
            return (
              <button
                key={r.id}
                onClick={() => onSelectRom(r)}
                className={`flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? "bg-red-950/70 border-red-500 text-white shadow-lg"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                <div className="w-8 h-8 rounded bg-black/60 overflow-hidden flex items-center justify-center shrink-0 border border-zinc-700/50">
                  <BoxArtImage rom={r} className="w-full h-full object-cover" />
                </div>
                <div className="max-w-[130px] truncate">
                  <div className="text-xs font-semibold truncate text-zinc-100">{r.title}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{r.genre || "Classic"}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
