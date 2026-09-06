import React, { useState, useEffect, useRef, useMemo } from "react";
import { RomItem } from "../../types";
import {
  Gamepad2,
  Play,
  Info,
  Heart,
  Search,
  X,
  QrCode,
  Upload,
  BookOpen,
  LayoutGrid,
  Columns,
  Shuffle,
  Sparkles,
  Users,
  Calendar,
  Layers,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Smartphone,
  Film,
} from "lucide-react";
import { ArcadeDetailsOverlay } from "./ArcadeDetailsOverlay";
import { NesAudioContext } from "../../services/audio";
import { BoxArtImage } from "../common/BoxArtImage";

interface ArcadeFrontendMenuProps {
  roms: RomItem[];
  selectedRom: RomItem | null;
  onSelectRom: (rom: RomItem) => void;
  onLaunchRom: (rom: RomItem) => void;
  isLoading?: boolean;
  roomId?: string;
  onOpenQrModal?: () => void;
  onOpenUploadModal?: () => void;
  onOpenDocsModal?: () => void;
  onOpenLayoutModal?: () => void;
  onToggleSplitTest?: () => void;
  audioEngine?: NesAudioContext;
}

export const ArcadeFrontendMenu: React.FC<ArcadeFrontendMenuProps> = ({
  roms,
  selectedRom,
  onSelectRom,
  onLaunchRom,
  isLoading = false,
  roomId = "NES88",
  onOpenQrModal,
  onOpenUploadModal,
  onOpenDocsModal,
  onOpenLayoutModal,
  onToggleSplitTest,
  audioEngine,
}) => {
  const [selectedSystem, setSelectedSystem] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDetailsOverlay, setShowDetailsOverlay] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["16TWwozu3F4uobWhFoLk0NQad2PR7nNkt"]));
  const [wheelPulse, setWheelPulse] = useState<boolean>(true);

  // Video snap playback state (Google Drive authentic video snaps)
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartYRef = useRef<number>(0);

  // Audio helper
  const playTick = () => {
    audioEngine?.playWheelTick();
  };
  const playSelect = () => {
    audioEngine?.playSelectSound();
  };

  // Filtered games list
  const filteredRoms = useMemo(() => {
    return roms.filter((rom) => {
      // System filter
      if (selectedSystem === "favorites") {
        if (!favorites.has(rom.id)) return false;
      } else if (selectedSystem !== "all") {
        const romSys = rom.system || "nes";
        if (romSys !== selectedSystem) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = rom.title.toLowerCase().includes(q);
        const matchGenre = rom.genre?.toLowerCase().includes(q);
        const matchDev = rom.developer?.toLowerCase().includes(q);
        const matchTags = rom.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchGenre && !matchDev && !matchTags) return false;
      }

      return true;
    });
  }, [roms, selectedSystem, searchQuery, favorites]);

  // Ensure an active selected game
  const activeGame = selectedRom || filteredRoms[0] || roms[0];

  // Reset video player state when selected game changes
  useEffect(() => {
    setVideoError(false);
    setVideoLoaded(false);
  }, [activeGame?.id]);

  const activeIndex = useMemo(() => {
    const idx = filteredRoms.findIndex((r) => r.id === activeGame?.id);
    return idx >= 0 ? idx : 0;
  }, [filteredRoms, activeGame]);

  // Jump to games beginning with specific letter
  const jumpToLetter = (char: string) => {
    const target = char.toUpperCase();
    const idx = filteredRoms.findIndex((r) => {
      const first = (r.title || "").trim()[0]?.toUpperCase() || "";
      if (target === "#") {
        return !/[A-Z]/.test(first);
      }
      return first === target;
    });
    if (idx >= 0) {
      onSelectRom(filteredRoms[idx]);
      playTick();
    }
  };

  const currentLetter = useMemo(() => {
    const first = (activeGame?.title || "").trim()[0]?.toUpperCase() || "";
    return /[A-Z]/.test(first) ? first : "#";
  }, [activeGame?.title]);

  // Navigate wheel up/down
  const moveWheel = (step: number) => {
    if (filteredRoms.length === 0) return;
    const nextIdx = (activeIndex + step + filteredRoms.length) % filteredRoms.length;
    onSelectRom(filteredRoms[nextIdx]);
    playTick();
  };

  // Random game select
  const pickRandom = () => {
    if (filteredRoms.length <= 1) return;
    const randomIdx = Math.floor(Math.random() * filteredRoms.length);
    onSelectRom(filteredRoms[randomIdx]);
    playSelect();
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    playSelect();
  };

  // Keyboard navigation on wheel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        moveWheel(-1);
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        moveWheel(1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (showDetailsOverlay) {
          if (activeGame) onLaunchRom(activeGame);
        } else {
          if (activeGame) onLaunchRom(activeGame);
        }
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        setShowDetailsOverlay((prev) => !prev);
        playSelect();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (activeGame) toggleFavorite(activeGame.id);
      } else if (e.key === " " && !e.repeat) {
        e.preventDefault();
        pickRandom();
      } else if (e.key === "Escape") {
        if (showDetailsOverlay) {
          setShowDetailsOverlay(false);
          audioEngine?.playBackSound();
        }
      } else if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1 && !["w", "s", "i", "f", " "].includes(e.key.toLowerCase())) {
        if (/^[a-zA-Z]$/.test(e.key)) {
          jumpToLetter(e.key.toUpperCase());
        } else if (/^[0-9]$/.test(e.key)) {
          jumpToLetter("#");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filteredRoms, activeGame, showDetailsOverlay]);

  // Mouse wheel scroll support
  const handleWheelScroll = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > 20) {
      moveWheel(e.deltaY > 0 ? 1 : -1);
    }
  };

  // Wheel Items Generation (Display 9 items visible on the curved arc: -4 to +4)
  const visibleWheelItems = useMemo(() => {
    if (filteredRoms.length === 0) return [];
    const span = 4; // 4 above, center, 4 below = 9 items
    const items = [];

    for (let offset = -span; offset <= span; offset++) {
      const idx = (activeIndex + offset + filteredRoms.length) % filteredRoms.length;
      const rom = filteredRoms[idx];

      // Exact mathematical arc parameters inspired by ArcadeFrontend's Wheel.cs:
      // Y offset follows vertical spread
      const normOffset = offset;
      const isSelected = offset === 0;

      // Arc curvature: center item (selected) protrudes furthest toward left (toward GUI)
      // Top and bottom items curve back to the right
      const angleRad = (normOffset / span) * 0.42; // arc spread
      const archProtrusion = (Math.cos(angleRad) - Math.cos(0.42)) * 78;
      const rotation = normOffset * 2.2; // subtle elegant degrees tilt
      const scale = isSelected ? 1.09 : Math.max(0.81, 1.03 - Math.abs(normOffset) * 0.05);
      const opacity = isSelected ? 1.0 : Math.max(0.42, 1.0 - Math.abs(normOffset) * 0.14);

      items.push({
        rom,
        offset,
        isSelected,
        xOffset: archProtrusion,
        rotation,
        scale,
        opacity,
      });
    }

    return items;
  }, [filteredRoms, activeIndex]);

  return (
    <div
      className="w-full h-full bg-[#07060a] text-zinc-100 flex flex-col justify-between overflow-hidden relative select-none font-sans"
      onWheel={handleWheelScroll}
    >
      {/* Background Ambience / Game Theme Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-25 blur-3xl"
        style={{
          background: `radial-gradient(circle at 30% 40%, ${
            activeGame?.primaryColor || "#ef4444"
          } 0%, transparent 60%), radial-gradient(circle at 75% 65%, ${
            activeGame?.accentColor || "#38bdf8"
          } 0%, transparent 60%)`,
        }}
      />

      {/* Subtle Scanline Texture Layer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay z-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 1px, transparent 1px, transparent 2px)",
          backgroundSize: "100% 2px",
        }}
      />

      {/* Top ArcadeFrontend Header Bar */}
      <header className="relative z-20 bg-zinc-950/90 border-b border-zinc-800/80 px-3 py-2 backdrop-blur-md flex items-center justify-between gap-2">
        {/* Logo & System Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl shadow-md border border-amber-400/40">
            <Gamepad2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-sm tracking-tight text-white uppercase flex items-center gap-1.5">
              <span>ARCADE FRONTEND</span>
              <span className="text-zinc-600">/</span>
              <span className="text-amber-400 font-mono text-xs">HYPERSPIN WHEEL</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-500/40 text-red-400 font-mono text-[10px] font-black tracking-wider uppercase hidden sm:inline-block">
              {filteredRoms.length} GAMES
            </span>
          </div>
        </div>

        {/* Center: System Selector Tabs */}
        <div className="hidden md:flex items-center gap-1 p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl">
          {[
            { id: "all", label: "ALL SYSTEMS" },
            { id: "nes", label: "NES (8-BIT)" },
            { id: "snes", label: "SNES" },
            { id: "arcade", label: "ARCADE" },
            { id: "favorites", label: "FAVORITES" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedSystem(tab.id);
                playSelect();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                selectedSystem === tab.id
                  ? "bg-amber-500 text-black shadow-sm font-black"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Action Icons: Search, Room Code, Split Test, Layouts */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-28 sm:w-36 md:w-44 px-2.5 py-1 text-xs bg-zinc-900 border border-zinc-750 focus:border-amber-400 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none font-mono"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <Search className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          {/* Prominent Connect Phone Controller Button */}
          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-grotesk font-black uppercase tracking-wider shadow-lg shadow-red-950/60 border border-red-400/60 active:scale-95 transition-all cursor-pointer ring-2 ring-red-500/20"
              title="Connect Phone as Wireless NES Controller"
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse" />
              <span className="font-extrabold tracking-wide">CONNECT PHONE</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-mono text-amber-300 border border-amber-400/40 font-black">
                {roomId}
              </span>
            </button>
          )}

          {/* Dual Split Screen Test */}
          {onToggleSplitTest && (
            <button
              onClick={onToggleSplitTest}
              className="hidden lg:flex p-1.5 bg-zinc-900 hover:bg-zinc-800 text-purple-400 rounded-lg border border-zinc-750 transition-all cursor-pointer"
              title="Dual Screen Controller Test on PC"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Layout Selector Modal */}
          {onOpenLayoutModal && (
            <button
              onClick={onOpenLayoutModal}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-400 rounded-lg border border-zinc-750 transition-all cursor-pointer"
              title="Switch Menu Layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          )}

          {/* System Specs / Docs */}
          {onOpenDocsModal && (
            <button
              onClick={onOpenDocsModal}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-sky-400 rounded-lg border border-zinc-750 transition-all cursor-pointer"
              title="Documentation & Specs"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Arcade Stage: Left Side Stage & Right Side Curved Wheel */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3 xl:gap-4 p-2 sm:p-3 md:p-4 overflow-hidden items-stretch">
        {/* Left Side: Game Theme Stage / CRT Preview Showcase - Enlarged to the right filling empty space */}
        <section className="lg:col-span-7 xl:col-span-7 2xl:col-span-7 flex flex-col justify-between h-full p-3 sm:p-4 md:p-5 rounded-3xl bg-zinc-950/75 border border-zinc-800/80 backdrop-blur-md shadow-2xl relative overflow-hidden">
          {/* Top Stage Badges & Arcade System Specs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeGame?.system?.toUpperCase() || "NES"}</span>
              </span>
              <span className="px-3 py-1 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                {activeGame?.genre || "Action Arcade"}
              </span>
              <span className="hidden sm:inline-flex px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
                60 FPS CYCLE-ACCURATE
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>{activeGame?.year || "1988"}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeGame?.players === 2 ? "2 PLAYERS" : "1 PLAYER"}</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-amber-400/90">
                <span>•</span>
                <span>NTSC 2A03 STEREO</span>
              </span>
            </div>
          </div>

          {/* Central Showcase: Duo Presentation (Authentic Box Art + Expanded Animated CRT Preview Screen) */}
          <div className="my-auto py-1 flex flex-col items-center w-full">
            <div className="w-full flex items-center justify-center gap-3 sm:gap-4 lg:gap-6">
              {/* Authentic Google Drive Box Cover */}
              <div className="shrink-0 relative group/cover">
                <BoxArtImage
                  rom={activeGame}
                  className="w-28 sm:w-36 md:w-44 lg:w-48 aspect-[3/4] rounded-2xl border-2 border-zinc-750 shadow-2xl overflow-hidden hover:scale-105 transition-transform"
                />
                <div className="absolute -bottom-2.5 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full bg-black/95 border border-amber-500/50 text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest text-center shadow-xl">
                  BOX ART
                </div>
              </div>

              {/* Animated CRT Preview Screen with Arcade Bezel - Plays Authentic Google Drive Video Snaps */}
              <div
                className="relative flex-1 w-full max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden border-4 border-zinc-800 shadow-2xl flex items-center justify-center group bg-black"
                style={{
                  boxShadow: `0 0 45px -10px ${activeGame?.primaryColor || "#ef4444"}50`,
                }}
              >
                {/* Authentic Video Snap from Google Drive */}
                {(activeGame?.videoUrl || activeGame?.videoDirectUrl) && !videoError ? (
                  <video
                    ref={videoRef}
                    key={activeGame.videoId || activeGame.id}
                    src={activeGame.videoUrl || activeGame.videoDirectUrl}
                    autoPlay
                    loop
                    muted={isVideoMuted}
                    playsInline
                    onLoadedData={() => setVideoLoaded(true)}
                    onError={() => setVideoError(true)}
                    className={`absolute inset-0 w-full h-full object-contain bg-black z-0 transition-opacity duration-500 ${
                      videoLoaded ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ) : null}

                {/* Video Snap Overlay Indicators: Live Snap badge & Mute/Unmute toggle */}
                {(activeGame?.videoUrl || activeGame?.videoDirectUrl) && !videoError && (
                  <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm border border-red-500/50 text-[10px] font-mono font-black text-red-400 tracking-wider shadow-md">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                      <span>LIVE VIDEO SNAP</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVideoMuted((prev) => !prev);
                      }}
                      className="p-1.5 rounded-lg bg-black/80 hover:bg-black/95 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:text-white transition-all shadow-md cursor-pointer"
                      title={isVideoMuted ? "Unmute Video Clip" : "Mute Video Clip"}
                    >
                      {isVideoMuted ? (
                        <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                  </div>
                )}

                {/* Authentic Action Snap Screenshot (Displays for all games when video is not playing) */}
                {activeGame?.snapUrl && (
                  <img
                    src={activeGame.snapUrl}
                    alt={`${activeGame.title} Snap Screenshot`}
                    referrerPolicy="no-referrer"
                    className={`absolute inset-0 w-full h-full object-contain bg-black z-0 transition-opacity duration-500 ${
                      videoLoaded && !videoError ? "opacity-0 pointer-events-none" : "opacity-100"
                    }`}
                  />
                )}

                {/* Badge when displaying In-Game Action Snap */}
                {activeGame?.snapUrl && (!activeGame?.videoUrl && !activeGame?.videoDirectUrl) && (
                  <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm border border-emerald-500/50 text-[10px] font-mono font-black text-emerald-400 tracking-wider shadow-md">
                    <Film className="w-3 h-3 text-emerald-400" />
                    <span>ARCADE SNAP</span>
                  </div>
                )}

                {/* Retro scanlines overlay on preview screen */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-35 z-10"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(0,0,0,0.6), rgba(0,0,0,0.6) 2px, transparent 2px, transparent 4px)",
                  }}
                />

                {/* Animated Arcade Backdrop Elements (Active when neither video nor snap exists) */}
                {!activeGame?.snapUrl && (
                  <div
                    className={`relative z-0 text-center p-4 sm:p-6 flex flex-col items-center max-w-md transition-opacity duration-300 ${
                      (activeGame?.videoUrl || activeGame?.videoDirectUrl) && videoLoaded && !videoError
                        ? "opacity-0 pointer-events-none"
                        : "opacity-100"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${activeGame?.secondaryColor || "#1e1b4b"}, #09090b)`,
                    }}
                  >
                    <div
                      className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg border border-white/20"
                      style={{ backgroundColor: activeGame?.primaryColor || "#ef4444" }}
                    >
                      <Gamepad2 className="w-7 sm:w-8 h-7 sm:h-8 text-white animate-pulse" />
                    </div>
                    <h3 className="font-display font-black text-lg sm:text-xl md:text-2xl text-white uppercase tracking-tight drop-shadow-md line-clamp-1">
                      {activeGame?.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-mono text-zinc-300/90 mt-1.5 line-clamp-2 leading-relaxed">
                      {activeGame?.description || "Authentic 60 FPS NES reproduction running on ArcadeFrontend engine."}
                    </p>
                  </div>
                )}

                {/* Hover Launch Trigger Overlay */}
                <button
                  onClick={() => onLaunchRom(activeGame)}
                  className="absolute inset-0 z-30 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-[2px]"
                >
                  <div className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-2xl border border-emerald-400/50 scale-95 group-hover:scale-100 transition-transform">
                    <Play className="w-4 h-4 fill-white" />
                    <span>START EMULATOR [ENTER]</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Stage Controls & Details */}
          <div className="space-y-2 pt-1">
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white uppercase tracking-tight drop-shadow-md truncate">
                  {activeGame?.title}
                </h2>
                {activeGame?.publisher && (
                  <span className="hidden sm:inline-block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    {activeGame.publisher}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 font-sans line-clamp-2 mt-1 leading-relaxed max-w-3xl">
                {activeGame?.description || "Authentic 60 FPS NES reproduction running on cycle-accurate engine with stereo 2A03 sound."}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {activeGame?.tags?.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-300"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                id="arcade-play-btn"
                onClick={() => onLaunchRom(activeGame)}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-display font-black text-xs sm:text-sm tracking-wider uppercase rounded-2xl shadow-xl shadow-emerald-950/60 border border-emerald-400/40 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isLoading ? "LOADING..." : "PLAY NOW [ENTER]"}</span>
              </button>

              <button
                id="arcade-details-btn"
                onClick={() => {
                  setShowDetailsOverlay(true);
                  playSelect();
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white rounded-2xl text-xs font-grotesk font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>DETAILS [I]</span>
              </button>

              <button
                onClick={() => toggleFavorite(activeGame.id)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
                  favorites.has(activeGame.id)
                    ? "bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-950/40"
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                }`}
                title="Toggle Favorite [F]"
              >
                <Heart
                  className={`w-4 h-4 ${
                    favorites.has(activeGame.id) ? "fill-rose-400 text-rose-400" : ""
                  }`}
                />
              </button>

              <button
                onClick={pickRandom}
                className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 hover:text-amber-300 rounded-2xl transition-all cursor-pointer active:scale-95"
                title="Random Game [SPACE]"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Right Side: The HyperSpin Curved Radial Wheel (Shifted Left & Enlarged to Fill Empty Space) */}
        <section
          ref={wheelContainerRef}
          className="lg:col-span-5 xl:col-span-5 2xl:col-span-5 h-full flex flex-col justify-center relative overflow-visible select-none lg:-ml-6 xl:-ml-10 2xl:-ml-12"
        >
          {/* Wheel Control Arrows (Top / Bottom) */}
          <div className="absolute top-2 right-2 sm:right-4 md:right-6 z-30 flex gap-1.5">
            <button
              onClick={() => moveWheel(-1)}
              className="p-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer shadow-lg active:scale-90"
              title="Spin Up [▲]"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => moveWheel(1)}
              className="p-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer shadow-lg active:scale-90"
              title="Spin Down [▼]"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Vertical Alphabet Quick-Jump Index Strip for all 948 titles */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-40 hidden 2xl:flex flex-col items-center py-1.5 px-0.5 bg-zinc-950/90 backdrop-blur-md rounded-full border border-zinc-800 shadow-2xl">
            {["#", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].map((letter) => {
              const isCurrent = currentLetter === letter;
              return (
                <button
                  key={letter}
                  onClick={() => jumpToLetter(letter)}
                  className={`w-4 h-4 rounded-full text-[8.5px] font-mono font-black flex items-center justify-center transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-amber-400 text-black shadow-md scale-110 font-black"
                      : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                  }`}
                  title={`Jump to '${letter}' titles`}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Curved Wheel Items Container - Shifted leftward and enlarged to meet the Main GUI */}
          <div className="relative w-full h-full min-h-[580px] flex flex-col justify-center items-end pr-1.5 sm:pr-2 md:pr-3 lg:pr-4">
            {visibleWheelItems.map((item) => {
              const { rom, offset, isSelected, xOffset, rotation, scale, opacity } = item;

              return (
                <div
                  key={`${rom.id}-${offset}`}
                  onClick={() => {
                    if (isSelected) {
                      onLaunchRom(rom);
                    } else {
                      onSelectRom(rom);
                      playTick();
                    }
                  }}
                  className={`absolute right-0 cursor-pointer transition-all duration-300 flex items-center justify-end w-full ${
                    isSelected ? "z-30" : "z-10"
                  }`}
                  style={{
                    transform: `translateY(${offset * 90}px) translateX(${-(xOffset + 55)}px) rotate(${rotation}deg) scale(${scale})`,
                    opacity: opacity,
                  }}
                >
                  {/* Wheel Item Card: Enlarged to fill space and reach left towards Main GUI */}
                  <div
                    className={`relative w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] lg:max-w-[530px] xl:max-w-[590px] 2xl:max-w-[650px] h-22 sm:h-24 md:h-26 px-3.5 sm:px-4.5 py-2 rounded-2xl flex items-center justify-between border-2 transition-all shadow-2xl backdrop-blur-md ${
                      isSelected
                        ? "bg-gradient-to-r from-zinc-900 via-zinc-900/98 to-zinc-950 border-amber-400 text-white shadow-amber-500/40"
                        : "bg-zinc-950/85 hover:bg-zinc-900/90 border-zinc-800/90 hover:border-zinc-600 text-zinc-300"
                    }`}
                    style={{
                      borderColor: isSelected ? "#f59e0b" : undefined,
                      boxShadow: isSelected
                        ? `0 0 32px -4px ${rom.primaryColor || "#f59e0b"}95`
                        : undefined,
                    }}
                  >
                    {/* Left: Authentic Box Cover Thumbnail */}
                    <BoxArtImage
                      rom={rom}
                      className="w-14 sm:w-16 md:w-17 h-16 sm:h-18 md:h-20 rounded-xl shadow-lg border border-zinc-700/80 shrink-0"
                    />

                    {/* Middle: Prominent, High-Contrast Readable Game Title & Metadata */}
                    <div className="min-w-0 flex-1 px-3 sm:px-4">
                      <div className="font-display font-black text-sm sm:text-base md:text-lg uppercase tracking-tight truncate text-white leading-tight">
                        {rom.title}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-[10px] sm:text-xs font-mono text-zinc-400">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 font-bold text-amber-400">
                          {rom.year || "1988"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 font-semibold text-zinc-300 truncate max-w-[140px] sm:max-w-[180px]">
                          {rom.genre || "Action Arcade"}
                        </span>
                        {(rom.videoId || rom.videoUrl) && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/70 border border-red-500/40 text-[9px] font-mono font-black text-red-300">
                            <Film className="w-2.5 h-2.5 text-red-400" />
                            SNAP
                          </span>
                        )}
                        <span className="hidden md:inline-block px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-400 font-bold">
                          {rom.players === 2 ? "2 PLAYERS" : "1 PLAYER"}
                        </span>
                      </div>
                    </div>

                    {/* Right: Launch Badge or System Pill */}
                    <div className="shrink-0 pl-1 sm:pl-2">
                      {isSelected ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-display font-black text-xs uppercase tracking-wider shadow-lg animate-pulse border border-emerald-300/40">
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span className="hidden sm:inline">LAUNCH</span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-500 uppercase">
                          {rom.system?.toUpperCase() || "NES"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Bottom Arcade HUD Prompt Bar */}
      <footer className="relative z-20 bg-zinc-950/90 border-t border-zinc-850 px-3 py-1.5 text-xs font-mono font-semibold text-zinc-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-zinc-200 font-bold">CONTROLS:</span>
          <span>
            <strong className="text-amber-400">[▲ / ▼]</strong> SPIN WHEEL
          </span>
          <span>•</span>
          <span>
            <strong className="text-emerald-400">[ENTER]</strong> PLAY
          </span>
          <span>•</span>
          <span>
            <strong className="text-sky-400">[I]</strong> DETAILS
          </span>
          <span>•</span>
          <span>
            <strong className="text-rose-400">[F]</strong> FAVORITE
          </span>
          <span>•</span>
          <span>
            <strong className="text-purple-400">[SPACE]</strong> RANDOM
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>SOCKET 3000 • 60 FPS CANVAS NES ENGINE</span>
        </div>
      </footer>

      {/* Canonical Game Details Overlay Modal */}
      {showDetailsOverlay && activeGame && (
        <ArcadeDetailsOverlay
          game={activeGame}
          allGames={roms}
          isFavorite={favorites.has(activeGame.id)}
          onToggleFavorite={toggleFavorite}
          onLaunchGame={(g) => {
            setShowDetailsOverlay(false);
            onLaunchRom(g);
          }}
          onSelectRelatedGame={(g) => {
            onSelectRom(g);
            playTick();
          }}
          onClose={() => {
            setShowDetailsOverlay(false);
            audioEngine?.playBackSound();
          }}
        />
      )}
    </div>
  );
};
