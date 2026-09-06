import React, { useState } from "react";
import { RomItem } from "../../types";
import { BoxArtImage } from "../common/BoxArtImage";
import {
  Play,
  Heart,
  Calendar,
  Users,
  Gamepad2,
  Building2,
  Tag,
  ArrowLeft,
  Tv,
  Check,
  Globe,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface ArcadeDetailsOverlayProps {
  game: RomItem;
  allGames: RomItem[];
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onLaunchGame: (game: RomItem) => void;
  onSelectRelatedGame: (game: RomItem) => void;
  onClose: () => void;
}

export const ArcadeDetailsOverlay: React.FC<ArcadeDetailsOverlayProps> = ({
  game,
  allGames,
  isFavorite,
  onToggleFavorite,
  onLaunchGame,
  onSelectRelatedGame,
  onClose,
}) => {
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"overview" | "versions" | "screenshots">("overview");

  // Related games by genre or developer
  const relatedGames = allGames.filter(
    (g) =>
      g.id !== game.id &&
      (g.genre === game.genre ||
        (game.developer && g.developer === game.developer) ||
        (game.tags && g.tags.some((t) => game.tags?.includes(t))))
  ).slice(0, 6);

  const versions = game.versions && game.versions.length > 0 ? game.versions : [
    { name: "Original Release", region: "USA", revision: "1.0", isDefault: true },
    { name: "European Edition", region: "EUR", revision: "PAL" },
    { name: "Japanese Version", region: "JPN", revision: "Famicom" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-zinc-100"
        style={{
          boxShadow: `0 0 50px -10px ${game.accentColor || "#ef4444"}40`,
        }}
      >
        {/* Top Header & Close Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-grotesk font-black uppercase tracking-wider text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ESC / BACK TO WHEEL</span>
            </button>
            <div className="h-4 w-px bg-zinc-700" />
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
              CANONICAL GAME DETAILS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-red-950/60 border border-red-500/40 text-red-400 text-xs font-display font-black tracking-wider uppercase">
              {game.platform || "NINTENDO ENTERTAINMENT SYSTEM"}
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hero Showcase Section */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
            {/* Ambient Backlight Glow */}
            <div
              className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: game.primaryColor || "#ef4444" }}
            />

            {/* Poster / Cartridge Frame */}
            <div className="w-full md:w-56 shrink-0 flex flex-col items-center">
              <div className="w-full aspect-[3/4] rounded-2xl border-2 border-zinc-750 shadow-2xl overflow-hidden relative group">
                <BoxArtImage
                  rom={game}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Version Selector Pill under Poster */}
              <div className="w-full mt-3 flex items-center justify-between px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono">
                <span className="text-zinc-400">REGION:</span>
                <span className="font-bold text-amber-400">
                  {versions[selectedVersionIdx]?.region || "USA"} [{versions[selectedVersionIdx]?.revision || "1.0"}]
                </span>
              </div>
            </div>

            {/* Title, Badges, Actions & Summary */}
            <div className="flex-1 flex flex-col justify-between min-h-full space-y-4">
              <div>
                <h1 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight uppercase drop-shadow-md">
                  {game.title}
                </h1>
                <p className="text-xs sm:text-sm font-mono text-zinc-400 mt-1 flex items-center gap-2">
                  <span>{game.rawName}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  id="overlay-play-game-btn"
                  onClick={() => onLaunchGame(game)}
                  className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-display font-black text-sm sm:text-base tracking-wider uppercase rounded-2xl shadow-xl shadow-emerald-950/60 border border-emerald-400/40 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>PLAY GAME NOW</span>
                </button>

                <button
                  onClick={() => onToggleFavorite(game.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl border text-xs font-grotesk font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                    isFavorite
                      ? "bg-rose-950/80 border-rose-500 text-rose-300 shadow-lg shadow-rose-950/50"
                      : "bg-zinc-850 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white"
                  }`}
                  title="Toggle Favorite"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-400 text-rose-400" : ""}`} />
                  <span>{isFavorite ? "FAVORITED" : "FAVORITE"}</span>
                </button>
              </div>

              {/* Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>RELEASE</span>
                  </div>
                  <div className="font-mono font-bold text-xs text-zinc-100 mt-1">
                    {game.releaseDate || game.year || "1988"}
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>PLAYERS</span>
                  </div>
                  <div className="font-mono font-bold text-xs text-zinc-100 mt-1">
                    {game.players === 2 ? "2 PLAYERS" : "1 PLAYER"}
                    {game.coop && <span className="text-[10px] text-emerald-400 ml-1">(CO-OP)</span>}
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>DEVELOPER</span>
                  </div>
                  <div className="font-mono font-bold text-xs text-zinc-100 mt-1 truncate">
                    {game.developer || "Nintendo / Arcade"}
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5 text-rose-400" />
                    <span>GENRE</span>
                  </div>
                  <div className="font-mono font-bold text-xs text-zinc-100 mt-1 truncate">
                    {game.genre || "Action Arcade"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Narrative */}
          <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
            <h3 className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MASTER DATABASE DESCRIPTION</span>
            </h3>
            <p className="text-sm leading-relaxed text-zinc-300 font-sans">
              {game.description ||
                "Authentic retro title curated for the ArcadeFrontend living room party emulator. Features authentic sound, high-speed controller dispatch, and 60 FPS scanline output."}
            </p>
          </div>

          {/* Owned Versions & Revisions Section */}
          <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
            <h3 className="text-xs font-mono font-black text-sky-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              <span>AVAILABLE RELEASES & REGIONS</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {versions.map((ver, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedVersionIdx(idx)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedVersionIdx === idx
                      ? "bg-zinc-800/90 border-amber-400 text-white shadow-md"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  }`}
                >
                  <div>
                    <div className="font-mono font-bold text-xs">{ver.name}</div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                      Region: {ver.region} • Rev: {ver.revision || "Original"}
                    </div>
                  </div>
                  {selectedVersionIdx === idx && (
                    <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Related Games Strip */}
          {relatedGames.length > 0 && (
            <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
              <h3 className="text-xs font-mono font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>MORE LIKE THIS / SAME SERIES</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {relatedGames.map((rel) => (
                  <button
                    key={rel.id}
                    onClick={() => onSelectRelatedGame(rel)}
                    className="p-3 bg-zinc-950/80 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-zinc-600 text-left transition-all group cursor-pointer active:scale-95"
                  >
                    <div
                      className="w-full aspect-[4/3] rounded-lg mb-2 flex items-center justify-center text-xs font-mono font-black uppercase text-zinc-300 border border-zinc-700/60"
                      style={{
                        background: `linear-gradient(135deg, ${rel.secondaryColor || "#18181b"}, #09090b)`,
                      }}
                    >
                      <Gamepad2 className="w-6 h-6 text-zinc-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="font-display font-black text-xs text-white truncate">
                      {rel.title}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                      {rel.genre || "Retro"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
