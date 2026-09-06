import React, { useState, useEffect } from "react";
import { RomItem } from "../../types";
import { Zap, Play, Flame, Users, Search, X, QrCode, Upload, BookOpen, LayoutGrid, Columns, Smartphone } from "lucide-react";

interface PowerGridMenuProps {
  roms: RomItem[];
  selectedRom: RomItem | null;
  onSelectRom: (rom: RomItem) => void;
  onLaunchRom: (rom: RomItem) => void;
  isLoading: boolean;
  roomId?: string;
  onOpenQrModal?: () => void;
  onOpenUploadModal?: () => void;
  onOpenDocsModal?: () => void;
  onOpenLayoutModal?: () => void;
  onToggleSplitTest?: () => void;
}


const DOT_PALETTE = [
  "#10b981", // emerald green
  "#10b981", // emerald green
  "#38bdf8", // sky blue
  "#a855f7", // purple
  "#f97316", // orange
  "#3b82f6", // blue
  "#10b981", // emerald
  "#10b981", // emerald
  "#10b981", // emerald
  "#10b981", // emerald
  "#f97316", // orange
  "#f97316", // orange
];

export const PowerGridMenu: React.FC<PowerGridMenuProps> = ({
  roms,
  selectedRom,
  onSelectRom,
  onLaunchRom,
  isLoading,
  roomId,
  onOpenQrModal,
  onOpenUploadModal,
  onOpenDocsModal,
  onOpenLayoutModal,
  onToggleSplitTest,
}) => {

  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredRoms = roms.filter((r) => {
    if (cleanQuery) {
      const match =
        r.title.toLowerCase().includes(cleanQuery) ||
        r.genre?.toLowerCase().includes(cleanQuery) ||
        r.year?.toLowerCase().includes(cleanQuery) ||
        r.tags?.some((t) => t.toLowerCase().includes(cleanQuery));
      if (!match) return false;
    }

    if (filter === "2p") return r.players === 2;
    if (filter === "top") return r.year && parseInt(r.year) >= 1988;
    return true;
  });

  // Auto-select first matching ROM if current selection is filtered out
  useEffect(() => {
    if (filteredRoms.length > 0) {
      const hasSelected = filteredRoms.some((r) => r.id === selectedRom?.id);
      if (!hasSelected) {
        onSelectRom(filteredRoms[0]);
      }
    }
  }, [cleanQuery, filter, filteredRoms, selectedRom, onSelectRom]);

  return (
    <div className="w-full h-full bg-[#0d0714] text-white flex flex-col p-3 sm:p-4 select-none overflow-hidden font-sans">
      {/* Power Header */}
      <div className="flex flex-col gap-2 pb-2.5 border-b border-fuchsia-950/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-fuchsia-600 to-cyan-400 rounded-xl shadow-md">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <div>
              <h2 className="font-display font-black text-base sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-cyan-400 uppercase tracking-tight">
                POWER GRID '89
              </h2>
              <p className="text-[11px] sm:text-xs text-fuchsia-200/80 font-grotesk font-semibold uppercase tracking-wider mt-0.5">
                Top Arcade & Home Cartridge Showcase ({filteredRoms.length} games)
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-fuchsia-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") setSearchQuery("");
                }}
                onKeyUp={(e) => e.stopPropagation()}
                placeholder="Search games..."
                className="bg-zinc-900/90 text-white placeholder-fuchsia-400/50 pl-8 pr-7 py-1.5 text-xs font-grotesk font-semibold rounded-xl border border-fuchsia-900/60 focus:border-fuchsia-500 outline-none w-40 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-fuchsia-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-fuchsia-900/60 text-xs">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-lg font-grotesk font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-fuchsia-600 text-white shadow-[0_0_10px_#c026d3]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setFilter("2p")}
                className={`px-3 py-1 rounded-lg font-grotesk font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  filter === "2p"
                    ? "bg-cyan-500 text-black shadow-[0_0_10px_#06b6d4]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Users className="w-3 h-3" />
                <span>2P</span>
              </button>
              <button
                onClick={() => setFilter("top")}
                className={`px-3 py-1 rounded-lg font-grotesk font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  filter === "top"
                    ? "bg-amber-500 text-black shadow-[0_0_10px_#f59e0b]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>PICKS</span>
              </button>
            </div>

            {/* Prominent Connect Phone Button */}
            {onOpenQrModal && roomId && (
              <button
                onClick={onOpenQrModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 border border-red-400/50"
                title="Connect Phone as Controller"
              >
                <Smartphone className="w-3.5 h-3.5 animate-pulse" />
                <span>CONNECT PHONE</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-mono text-amber-300">
                  {roomId}
                </span>
              </button>
            )}

            {onOpenUploadModal && (
              <button
                onClick={onOpenUploadModal}
                className="hidden sm:flex p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-emerald-400 rounded-xl border border-zinc-700/60 transition-all cursor-pointer"
                title="Upload Custom NES ROM"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            )}

            {onOpenLayoutModal && (
              <button
                onClick={onOpenLayoutModal}
                className="hidden md:flex p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 rounded-xl border border-zinc-700/60 transition-all cursor-pointer"
                title="Switch Menu Layout (4 Designs)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            )}

            {onToggleSplitTest && (
              <button
                onClick={onToggleSplitTest}
                className="hidden lg:flex p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-purple-400 rounded-xl border border-zinc-700/60 transition-all cursor-pointer"
                title="Dual Screen Controller Test on PC"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            )}

            {onOpenDocsModal && (
              <button
                onClick={onOpenDocsModal}
                className="hidden sm:flex p-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-sky-400 rounded-xl border border-zinc-700/60 transition-all cursor-pointer"
                title="System Specs & Controls"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Main Grid + Inspector */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 mt-2.5 min-h-0 overflow-hidden">
        {/* Left: 3-column Card Grid with Orange Scrollbar */}
        <div className="md:col-span-8 overflow-y-auto pr-1.5 min-h-0 powergrid-scrollbar">
          {filteredRoms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Search className="w-10 h-10 text-fuchsia-600 animate-pulse" />
              <div className="text-fuchsia-300 font-display font-black text-sm uppercase tracking-wider">
                No Games Found
              </div>
              <p className="text-zinc-500 font-grotesk text-xs max-w-xs">
                No games matched "{searchQuery}". Try a different title or clear the search.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all");
                }}
                className="px-4 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredRoms.map((rom, idx) => {
                const isSelected = selectedRom?.id === rom.id;
                const dotColor = DOT_PALETTE[idx % DOT_PALETTE.length];

                return (
                  <div
                    key={rom.id}
                    onClick={() => onSelectRom(rom)}
                    onDoubleClick={() => onLaunchRom(rom)}
                    className={`group relative rounded-2xl p-3.5 cursor-pointer border transition-all duration-200 flex flex-col justify-between h-[125px] sm:h-[130px] ${
                      isSelected
                        ? "bg-gradient-to-br from-[#2a133d] to-[#150d24] border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.45)] scale-[1.01]"
                        : "bg-[#13111c] border border-zinc-800/80 hover:border-fuchsia-700/60 hover:bg-[#181525]"
                    }`}
                  >
                    {/* Top Bar inside Card: Dot + Players */}
                    <div className="flex items-center justify-between">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="px-2 py-0.5 bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 rounded-md text-[9px] font-black uppercase tracking-wider">
                        {rom.players === 2 ? "2 PLAYERS" : "2 PLAYERS"}
                      </span>
                    </div>

                    {/* Title & Genre */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-display font-black uppercase tracking-tight leading-tight line-clamp-1 text-zinc-100 group-hover:text-cyan-300 transition-colors">
                        {rom.title}
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-1 truncate">
                        {rom.genre || "Arcade / Classic"}
                      </p>
                    </div>

                    {/* Bottom footer in card */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider border-t border-zinc-800/80 pt-1.5 mt-auto">
                      <span>{rom.year || "1988"}</span>
                      <span className="text-fuchsia-400 group-hover:text-fuchsia-300 font-black">
                        SELECT ▶
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Featured Holographic Box Art & Quick Play Deck */}
        <div className="md:col-span-4 flex flex-col justify-between bg-[#120a1c]/90 rounded-2xl border border-fuchsia-900/40 p-3 sm:p-4 relative overflow-hidden shadow-2xl">
          {selectedRom ? (
            <>
              <div>
                {/* Holographic Box Art Container */}
                <div
                  className="w-full h-48 sm:h-52 rounded-xl relative overflow-hidden border-2 border-cyan-400 shadow-[0_0_22px_rgba(6,182,212,0.4)] p-4 flex flex-col justify-between mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${selectedRom.primaryColor || "#054a3e"} 0%, #0d2822 45%, #071311 100%)`,
                  }}
                >
                  <div className="flex justify-between items-start z-10">
                    <span className="bg-[#06241a] text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                      NES CARTRIDGE
                    </span>
                    <span className="bg-amber-400 text-black px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-sm">
                      HOT PICK
                    </span>
                  </div>

                  <div className="z-10 my-auto">
                    <h3 className="font-display font-black text-base sm:text-xl text-white uppercase tracking-tight drop-shadow-md leading-tight">
                      {selectedRom.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-cyan-300 font-bold uppercase tracking-wider mt-1 drop-shadow">
                      {selectedRom.genre}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-zinc-300 font-bold uppercase tracking-wider z-10 pt-2 border-t border-white/15">
                    <span>YEAR: {selectedRom.year || "1985"}</span>
                    <span>{selectedRom.players === 2 ? "2-PLAYER CO-OP" : "2-PLAYER CO-OP"}</span>
                  </div>

                  {/* Shimmer line */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none transform -skew-x-12 animate-pulse" />
                </div>

                {/* Briefing */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 my-3 text-xs text-zinc-300 space-y-1">
                  <div className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">
                    POWER REPORT:
                  </div>
                  <p className="leading-relaxed text-xs font-normal text-zinc-300">
                    {selectedRom.description || "Fully emulated 8-bit classic game ready for tournament action."}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  id="powergrid-play-btn"
                  onClick={() => onLaunchRom(selectedRom)}
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 active:scale-[0.98] text-black font-display font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(217,70,239,0.5)] flex items-center justify-center gap-2.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>LOAD GAME NOW</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500">
              <Zap className="w-10 h-10 mb-2 text-fuchsia-700 animate-bounce" />
              <p className="font-display font-black text-xs uppercase tracking-wider">CHOOSE A TITLE FROM THE GRID</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

