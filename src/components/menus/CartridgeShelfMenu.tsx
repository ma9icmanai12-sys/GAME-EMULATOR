import React, { useState, useEffect } from "react";
import { RomItem } from "../../types";
import { Sparkles, Gamepad2, Users, Calendar, Disc, Play, Search, X } from "lucide-react";

interface CartridgeShelfMenuProps {
  roms: RomItem[];
  selectedRom: RomItem | null;
  onSelectRom: (rom: RomItem) => void;
  onLaunchRom: (rom: RomItem) => void;
  isLoading: boolean;
}

export const CartridgeShelfMenu: React.FC<CartridgeShelfMenuProps> = ({
  roms,
  selectedRom,
  onSelectRom,
  onLaunchRom,
  isLoading,
}) => {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredRoms = roms.filter((r) => {
    // Search query filter
    if (cleanQuery) {
      const titleMatch = r.title.toLowerCase().includes(cleanQuery);
      const genreMatch = r.genre?.toLowerCase().includes(cleanQuery);
      const yearMatch = r.year?.toLowerCase().includes(cleanQuery);
      const descMatch = r.description?.toLowerCase().includes(cleanQuery);
      const tagMatch = r.tags?.some((t) => t.toLowerCase().includes(cleanQuery));
      const playersMatch =
        (cleanQuery === "2p" ||
          cleanQuery === "2-player" ||
          cleanQuery === "coop" ||
          cleanQuery === "multiplayer") &&
        r.players === 2;

      if (!titleMatch && !genreMatch && !yearMatch && !descMatch && !tagMatch && !playersMatch) {
        return false;
      }
    }

    if (filter === "2p") return r.players === 2;
    if (filter === "action")
      return (
        r.genre?.toLowerCase().includes("action") ||
        r.genre?.toLowerCase().includes("shmup") ||
        r.genre?.toLowerCase().includes("shooter")
      );
    return true;
  });

  const activeIndex = filteredRoms.findIndex((r) => r.id === selectedRom?.id);

  // Auto-select first matching ROM if current selection is filtered out
  useEffect(() => {
    if (filteredRoms.length > 0) {
      const hasSelected = filteredRoms.some((r) => r.id === selectedRom?.id);
      if (!hasSelected) {
        onSelectRom(filteredRoms[0]);
      }
    }
  }, [cleanQuery, filter, filteredRoms, selectedRom, onSelectRom]);

  // Keyboard navigation (ignoring typing inside inputs)
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
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        const nextIdx = (activeIndex + 1) % filteredRoms.length;
        onSelectRom(filteredRoms[nextIdx]);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        const prevIdx = (activeIndex - 1 + filteredRoms.length) % filteredRoms.length;
        onSelectRom(filteredRoms[prevIdx]);
      } else if (e.key === "Enter") {
        if (selectedRom) onLaunchRom(selectedRom);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filteredRoms, selectedRom, onSelectRom, onLaunchRom]);

  return (
    <div className="w-full h-full bg-[#0a0a0c] text-white flex flex-col p-4 sm:p-5 overflow-hidden select-none">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Disc className="w-5 h-5 text-red-500 animate-spin" />
              <h2 className="font-display font-black text-sm sm:text-base text-red-500 tracking-tight uppercase">
                CARTRIDGE RACK ARCHIVE
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-grotesk font-medium mt-0.5">
              Select a cartridge to insert into the NES deck ({filteredRoms.length} of {roms.length} games available)
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800 text-xs shrink-0">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-grotesk font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-red-600 text-white shadow-sm border border-red-400/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilter("2p")}
              className={`px-3 py-1.5 rounded-lg font-grotesk font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                filter === "2p"
                  ? "bg-red-600 text-white shadow-sm border border-red-400/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              2-PLAYER CO-OP
            </button>
            <button
              onClick={() => setFilter("action")}
              className={`px-3 py-1.5 rounded-lg font-grotesk font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                filter === "action"
                  ? "bg-red-600 text-white shadow-sm border border-red-400/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ACTION / SHOOTER
            </button>
          </div>
        </div>

        {/* ROM Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="main-menu-rom-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") setSearchQuery("");
            }}
            onKeyUp={(e) => e.stopPropagation()}
            placeholder="Search ROMs by title, genre, year, tags (e.g., Mario, Lolo, Contra, 2P)..."
            className="w-full bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-950 text-white placeholder-zinc-500 pl-10 pr-24 py-2 rounded-xl border border-zinc-750 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs font-grotesk font-semibold outline-none transition-all shadow-inner"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                title="Clear search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 bg-zinc-800 rounded-md border border-zinc-700">
              {filteredRoms.length} found
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column View: Cartridge Shelf on Left, Inspection Deck on Right */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 mt-3 min-h-0 overflow-hidden">
        {/* Left Column: Scrolling 3D Cartridge Rack */}
        <div className="md:col-span-7 flex flex-col min-h-0 bg-zinc-950/80 rounded-2xl border-2 border-zinc-800 p-3">
          <div className="text-[11px] font-grotesk font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex justify-between">
            <span>BROWSE CARTRIDGES [↑/↓ or scroll]</span>
            <span className="text-zinc-500">FORMAT: NES-NROM/MMC</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredRoms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
                <Search className="w-10 h-10 text-zinc-600 animate-pulse" />
                <div className="text-zinc-300 font-display font-black text-xs sm:text-sm uppercase tracking-wider">
                  No ROMs Found
                </div>
                <p className="text-zinc-500 font-grotesk text-xs max-w-xs">
                  No games matched "{searchQuery}". Try a different title or clear the filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                  }}
                  className="px-4 py-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              filteredRoms.map((rom, idx) => {
                const isSelected = selectedRom?.id === rom.id;
                return (
                  <div
                    key={rom.id}
                    onClick={() => onSelectRom(rom)}
                    onDoubleClick={() => onLaunchRom(rom)}
                    className={`group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                      isSelected
                        ? "bg-zinc-850 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] translate-x-1.5"
                        : "bg-zinc-900/80 border-zinc-800/90 hover:bg-zinc-850 hover:border-zinc-700"
                    }`}
                  >
                    {/* Cartridge Plastic Edge & Grip Grooves */}
                    <div className="w-9 h-12 bg-zinc-800 rounded-sm flex flex-col justify-between p-1 border-t-2 border-zinc-600 shadow-inner flex-shrink-0">
                      <div className="w-full h-1 bg-zinc-900 rounded-full" />
                      <div className="w-full h-1 bg-zinc-900 rounded-full" />
                      <div className="w-full h-1 bg-zinc-900 rounded-full" />
                      <div className="w-full h-1.5 rounded-xs" style={{ backgroundColor: rom.primaryColor || "#dc2626" }} />
                    </div>

                    {/* Title & Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-500 font-bold">#{String(idx + 1).padStart(2, "0")}</span>
                        <h3
                          className={`text-xs sm:text-sm font-display font-black uppercase tracking-tight truncate ${
                            isSelected ? "text-white" : "text-zinc-200 group-hover:text-white"
                          }`}
                        >
                          {rom.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-grotesk font-semibold uppercase tracking-wider text-zinc-400 mt-0.5">
                        <span>{rom.genre || "NES Classic"}</span>
                        <span className="text-zinc-600">•</span>
                        <span>{rom.year || "1988"}</span>
                      </div>
                    </div>

                    {/* 2P Badge */}
                    {rom.players === 2 && (
                      <span className="px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 rounded-md text-[10px] font-grotesk font-black uppercase tracking-wider whitespace-nowrap">
                        2P CO-OP
                      </span>
                    )}

                    {/* Selected Arrow */}
                    {isSelected && (
                      <span className="text-red-500 font-press-start text-[10px] animate-pulse">
                        ▶
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Cartridge Inspection & Box-Art Preview */}
        <div className="md:col-span-5 flex flex-col justify-between bg-zinc-900/90 rounded-2xl border-2 border-zinc-800 p-4 relative overflow-hidden">
          {selectedRom ? (
            <>
              {/* Top Banner with Auto-Generated Box Art */}
              <div>
                <div
                  className="w-full h-36 rounded-xl relative overflow-hidden flex flex-col justify-between p-3.5 border-2 border-zinc-700 shadow-lg mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${selectedRom.secondaryColor || "#1e1b4b"}, ${selectedRom.primaryColor || "#dc2626"})`,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 bg-black/70 rounded-md text-[10px] font-grotesk font-black uppercase tracking-wider text-amber-300 border border-amber-400/40">
                      NINTENDO ENTERTAINMENT SYSTEM
                    </span>
                    <span className="px-2 py-0.5 bg-black/70 rounded-md text-[10px] font-grotesk font-bold text-zinc-200">
                      {selectedRom.year || "1989"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display font-black text-base sm:text-lg text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight uppercase tracking-tight">
                      {selectedRom.title}
                    </h3>
                    <p className="text-[11px] text-white/90 font-grotesk font-semibold uppercase tracking-wider mt-0.5 drop-shadow">
                      {selectedRom.genre || "Action Adventure"}
                    </p>
                  </div>

                  {/* Seal of Quality simulation */}
                  <div className="absolute right-3 bottom-3 w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center rotate-12 bg-black/60 shadow-md">
                    <span className="text-[7px] text-amber-300 font-display font-black text-center leading-tight uppercase">
                      OFFICIAL<br/>SEAL
                    </span>
                  </div>
                </div>

                {/* Synopsis */}
                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="font-grotesk font-black text-zinc-400 text-[11px] uppercase tracking-wider">
                    GAME BRIEFING:
                  </div>
                  <p className="leading-relaxed bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-zinc-300 text-xs font-grotesk font-normal">
                    {selectedRom.description || "Classic 8-bit entertainment cartridge ready for party play."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-grotesk">
                    <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">PLAYERS:</span>
                      <span className="text-white font-black text-xs uppercase">{selectedRom.players === 2 ? "1 - 2 Players" : "1 Player"}</span>
                    </div>
                    <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">SOURCE:</span>
                      <span className="text-white font-black text-xs uppercase">{selectedRom.source}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Big Action Button */}
              <div className="pt-3.5 border-t border-zinc-800">
                <button
                  id="launch-selected-cartridge-btn"
                  onClick={() => onLaunchRom(selectedRom)}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer border-2 border-red-400"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>INSERT & PLAY CARTRIDGE</span>
                </button>
                <div className="text-center text-[10px] text-zinc-400 mt-2 font-grotesk font-bold uppercase tracking-wider">
                  PRESS [ENTER] OR DOUBLE-CLICK TO LAUNCH
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 p-6">
              <Disc className="w-12 h-12 mb-2 text-neutral-700 animate-pulse" />
              <p className="text-xs">SELECT A CARTRIDGE ON THE LEFT</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
