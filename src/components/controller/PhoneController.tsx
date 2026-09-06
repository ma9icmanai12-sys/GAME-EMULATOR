import React, { useState, useEffect, useRef, useCallback } from "react";
import { PartySocket } from "../../services/socket";
import { NesButton } from "../../types";
import {
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Volume2,
  VolumeX,
  Smartphone,
  ChevronLeft,
  RotateCcw,
  Zap,
} from "lucide-react";

interface PhoneControllerProps {
  socket: PartySocket;
  roomId: string;
  initialSlot?: 1 | 2;
  onExit?: () => void;
}

export const PhoneController: React.FC<PhoneControllerProps> = ({
  socket,
  roomId,
  initialSlot,
  onExit,
}) => {
  const [slot, setSlot] = useState<1 | 2 | "spectator">(initialSlot || socket.getSlot() || 1);
  const [status, setStatus] = useState(socket.getStatus());
  const [ping, setPing] = useState(socket.getPing() || 0);
  const [activeButtons, setActiveButtons] = useState<Set<NesButton>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTurboAHeld, setIsTurboAHeld] = useState(false);
  const [isTurboBHeld, setIsTurboBHeld] = useState(false);

  // Audio click context
  const audioCtxRef = useRef<AudioContext | null>(null);

  // D-Pad Touch Coordinates Ref
  const dpadRef = useRef<HTMLDivElement | null>(null);
  const activeDpadDirRef = useRef<Set<NesButton>>(new Set());

  // Turbo interval timer
  const turboIntervalRef = useRef<any>(null);
  const turboPulseRef = useRef<boolean>(false);

  // WakeLock to keep phone screen awake during gameplay
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (err) {
        // Ignore wakeLock errors
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  // Socket listener bindings
  useEffect(() => {
    const unsubStatus = socket.onStatusChange((s) => setStatus(s));
    const unsubPing = socket.onPing((p) => setPing(p));
    const unsubAssigned = socket.onAssigned((newSlot) => setSlot(newSlot));

    return () => {
      unsubStatus();
      unsubPing();
      unsubAssigned();
    };
  }, [socket]);

  // Turbo Rapid-Fire Engine (30Hz alternation when Turbo A or Turbo B is held)
  useEffect(() => {
    if (isTurboAHeld || isTurboBHeld) {
      turboIntervalRef.current = setInterval(() => {
        turboPulseRef.current = !turboPulseRef.current;
        const pulse = turboPulseRef.current;

        if (isTurboAHeld) {
          socket.sendInput("A", pulse);
        }
        if (isTurboBHeld) {
          socket.sendInput("B", pulse);
        }
      }, 50); // 20 times a second turbo
    } else {
      if (turboIntervalRef.current) {
        clearInterval(turboIntervalRef.current);
        turboIntervalRef.current = null;
      }
      if (!activeButtons.has("A")) socket.sendInput("A", false);
      if (!activeButtons.has("B")) socket.sendInput("B", false);
    }

    return () => {
      if (turboIntervalRef.current) {
        clearInterval(turboIntervalRef.current);
      }
    };
  }, [isTurboAHeld, isTurboBHeld, socket, activeButtons]);

  // Audio click feedback generator
  const playClickFeedback = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, audioCtxRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, audioCtxRef.current.currentTime + 0.025);
      gain.gain.setValueAtTime(0.15, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.025);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.025);
    } catch (e) {}
  }, [soundEnabled]);

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if (!hapticsEnabled) return;
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    } catch (e) {}
  }, [hapticsEnabled]);

  // Send single button down
  const pressButton = (btn: NesButton) => {
    setActiveButtons((prev) => new Set(prev).add(btn));
    socket.sendInput(btn, true);
    triggerHaptic();
    playClickFeedback();
  };

  // Send single button up
  const releaseButton = (btn: NesButton) => {
    setActiveButtons((prev) => {
      const next = new Set(prev);
      next.delete(btn);
      return next;
    });
    socket.sendInput(btn, false);
  };

  // Continuous D-Pad Touch/Drag Handling
  const handleDpadTouch = (clientX: number, clientY: number) => {
    if (!dpadRef.current) return;
    const rect = dpadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Dead zone in center
    const deadZone = rect.width * 0.14;
    const newDirs = new Set<NesButton>();

    if (dist > deadZone) {
      // Calculate angle
      const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180

      // Support 8-way directional rolling
      if (angle >= -157.5 && angle < -112.5) {
        newDirs.add("UP");
        newDirs.add("LEFT");
      } else if (angle >= -112.5 && angle < -67.5) {
        newDirs.add("UP");
      } else if (angle >= -67.5 && angle < -22.5) {
        newDirs.add("UP");
        newDirs.add("RIGHT");
      } else if (angle >= -22.5 && angle < 22.5) {
        newDirs.add("RIGHT");
      } else if (angle >= 22.5 && angle < 67.5) {
        newDirs.add("DOWN");
        newDirs.add("RIGHT");
      } else if (angle >= 67.5 && angle < 112.5) {
        newDirs.add("DOWN");
      } else if (angle >= 112.5 && angle < 157.5) {
        newDirs.add("DOWN");
        newDirs.add("LEFT");
      } else {
        newDirs.add("LEFT");
      }
    }

    // Compare with current active D-pad directions
    const current = activeDpadDirRef.current;
    const allDpadBtns: NesButton[] = ["UP", "DOWN", "LEFT", "RIGHT"];

    for (const btn of allDpadBtns) {
      const wasActive = current.has(btn);
      const isNowActive = newDirs.has(btn);

      if (!wasActive && isNowActive) {
        socket.sendInput(btn, true);
        triggerHaptic();
        playClickFeedback();
      } else if (wasActive && !isNowActive) {
        socket.sendInput(btn, false);
      }
    }

    activeDpadDirRef.current = newDirs;
    setActiveButtons((prev) => {
      const next = new Set(prev);
      for (const btn of allDpadBtns) {
        if (newDirs.has(btn)) {
          next.add(btn);
        } else {
          next.delete(btn);
        }
      }
      return next;
    });
  };

  const clearDpad = () => {
    const allDpadBtns: NesButton[] = ["UP", "DOWN", "LEFT", "RIGHT"];
    for (const btn of allDpadBtns) {
      if (activeDpadDirRef.current.has(btn)) {
        socket.sendInput(btn, false);
      }
    }
    activeDpadDirRef.current.clear();
    setActiveButtons((prev) => {
      const next = new Set(prev);
      for (const btn of allDpadBtns) {
        next.delete(btn);
      }
      return next;
    });
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const isConnected = status === "connected";
  const isP1 = slot === 1;

  return (
    <div className="fixed inset-0 bg-[#0f0e13] text-white flex flex-col justify-between select-none touch-none overflow-hidden font-sans">
      
      {/* Top Controller Status Bar */}
      <header className="h-12 sm:h-14 bg-zinc-950 border-b border-zinc-850 px-3 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {onExit && (
            <button
              onClick={onExit}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-750 transition-colors cursor-pointer mr-1"
              title="Exit Controller"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Player Badge */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-md border ${
              isP1
                ? "bg-red-600 border-red-400 text-white shadow-red-950/60"
                : slot === 2
                ? "bg-blue-600 border-blue-400 text-white shadow-blue-950/60"
                : "bg-zinc-800 border-zinc-700 text-zinc-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>{isP1 ? "PLAYER 1" : slot === 2 ? "PLAYER 2" : "SPECTATOR"}</span>
          </div>

          {/* Room info */}
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-400">
            <span className="hidden sm:inline">ROOM:</span>
            <span className="text-amber-400 font-bold tracking-wider">{roomId}</span>
          </div>
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Latency badge */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
            {isConnected ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500 animate-pulse" />
            )}
            <span>{isConnected ? `${ping}ms` : "RECONNECTING"}</span>
          </div>

          {/* Switch Player Slot */}
          <button
            onClick={() => {
              const nextSlot = slot === 1 ? 2 : 1;
              socket.send({
                type: "join-controller",
                roomId,
                requestedSlot: nextSlot,
              });
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 rounded-lg text-zinc-300 hover:text-white text-xs font-grotesk font-bold uppercase tracking-wider transition-colors cursor-pointer"
            title="Switch Player Slot (P1 / P2)"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">P{slot === 1 ? 2 : 1}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 rounded-lg text-zinc-300 transition-colors cursor-pointer"
            title="Toggle Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 rounded-lg text-zinc-300 transition-colors cursor-pointer"
            title="Fullscreen Edge-to-Edge"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Nintendo Controller Chassis Area */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 relative overflow-hidden">
        
        {/* Authentic Two-Tone NES Controller Body */}
        <div className="w-full max-w-4xl h-full max-h-[520px] bg-[#caccd1] rounded-3xl p-3 sm:p-5 md:p-6 border-4 sm:border-8 border-[#9a9ea7] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)] flex flex-col justify-between relative overflow-hidden">
          
          {/* Corner Hardware Screw Details */}
          <div className="absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-[#838791] shadow-inner border border-zinc-500/40" />
          <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#838791] shadow-inner border border-zinc-500/40" />
          <div className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-[#838791] shadow-inner border border-zinc-500/40" />
          <div className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#838791] shadow-inner border border-zinc-500/40" />

          {/* The Iconic Dark Horizontal Inset Band */}
          <div className="absolute inset-x-2 sm:inset-x-4 top-10 sm:top-12 bottom-10 sm:bottom-12 bg-[#1b1c20] rounded-2xl border-2 sm:border-4 border-[#121316] shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)] pointer-events-none overflow-hidden">
            {/* Subtle NES horizontal pinstripes */}
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, #374151 0px, #374151 2px, transparent 2px, transparent 6px)",
              }}
            />
          </div>

          {/* Controller Top Branding Band */}
          <div className="relative z-10 flex justify-between items-center px-3 sm:px-6">
            {/* Authentic Red Nintendo Logo */}
            <div className="flex items-center gap-2">
              <div className="font-display font-black text-base sm:text-xl md:text-2xl text-[#e52521] tracking-tight uppercase italic drop-shadow-sm">
                Nintendo
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono font-black text-zinc-600 uppercase tracking-widest hidden sm:inline">
                ENTERTAINMENT SYSTEM
              </span>
            </div>

            {/* Controller Model / Slot Badge */}
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[10px] sm:text-xs text-zinc-600 uppercase tracking-widest">
                WIRELESS CONTROLLER
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-black text-[10px]">
                {isP1 ? "CONTROLLER I" : "CONTROLLER II"}
              </span>
            </div>
          </div>

          {/* Controller Interactive Play Surface: Left (D-PAD) | Center (SELECT/START) | Right (B / A) */}
          <div className="relative z-20 flex-1 grid grid-cols-12 items-center gap-2 sm:gap-4 my-auto">
            
            {/* LEFT: Authentic NES Cross D-Pad */}
            <div className="col-span-5 flex items-center justify-center">
              <div
                ref={dpadRef}
                onTouchStart={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  handleDpadTouch(touch.clientX, touch.clientY);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  handleDpadTouch(touch.clientX, touch.clientY);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  clearDpad();
                }}
                onTouchCancel={(e) => {
                  e.preventDefault();
                  clearDpad();
                }}
                onMouseDown={(e) => {
                  handleDpadTouch(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => {
                  if (e.buttons === 1) {
                    handleDpadTouch(e.clientX, e.clientY);
                  }
                }}
                onMouseUp={() => clearDpad()}
                onMouseLeave={() => clearDpad()}
                className="relative w-40 h-40 sm:w-52 sm:h-52 md:w-60 md:h-60 touch-none cursor-pointer select-none filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]"
              >
                {/* Horizontal Cross Arm */}
                <div className="absolute top-1/3 left-0 right-0 h-1/3 bg-[#18191d] rounded-xl border border-zinc-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.15)] flex items-center justify-between px-2">
                  <span
                    className={`text-zinc-500 font-bold text-lg select-none transition-transform ${
                      activeButtons.has("LEFT") ? "text-[#e52521] scale-125" : ""
                    }`}
                  >
                    ◀
                  </span>
                  <span
                    className={`text-zinc-500 font-bold text-lg select-none transition-transform ${
                      activeButtons.has("RIGHT") ? "text-[#e52521] scale-125" : ""
                    }`}
                  >
                    ▶
                  </span>
                </div>

                {/* Vertical Cross Arm */}
                <div className="absolute top-0 bottom-0 left-1/3 right-1/3 bg-[#18191d] rounded-xl border border-zinc-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.15)] flex flex-col items-center justify-between py-2">
                  <span
                    className={`text-zinc-500 font-bold text-lg select-none transition-transform ${
                      activeButtons.has("UP") ? "text-[#e52521] scale-125" : ""
                    }`}
                  >
                    ▲
                  </span>
                  <span
                    className={`text-zinc-500 font-bold text-lg select-none transition-transform ${
                      activeButtons.has("DOWN") ? "text-[#e52521] scale-125" : ""
                    }`}
                  >
                    ▼
                  </span>
                </div>

                {/* Center Pivot Thumb Depression (The iconic tactile circle) */}
                <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#111215] shadow-[inset_0_3px_6px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.1)] border border-zinc-800 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#1f2025] shadow-inner" />
                  </div>
                </div>

                {/* Visual Active Glow Rings on Pressed Arms */}
                {activeButtons.has("UP") && (
                  <div className="absolute top-0 left-1/3 w-1/3 h-1/3 bg-[#e52521]/25 rounded-t-xl pointer-events-none shadow-[0_0_12px_#e52521]" />
                )}
                {activeButtons.has("DOWN") && (
                  <div className="absolute bottom-0 left-1/3 w-1/3 h-1/3 bg-[#e52521]/25 rounded-b-xl pointer-events-none shadow-[0_0_12px_#e52521]" />
                )}
                {activeButtons.has("LEFT") && (
                  <div className="absolute top-1/3 left-0 w-1/3 h-1/3 bg-[#e52521]/25 rounded-l-xl pointer-events-none shadow-[0_0_12px_#e52521]" />
                )}
                {activeButtons.has("RIGHT") && (
                  <div className="absolute top-1/3 right-0 w-1/3 h-1/3 bg-[#e52521]/25 rounded-r-xl pointer-events-none shadow-[0_0_12px_#e52521]" />
                )}
              </div>
            </div>

            {/* CENTER: SELECT and START Pill Buttons */}
            <div className="col-span-2 flex flex-col items-center justify-center gap-6 sm:gap-8">
              <div className="flex flex-row gap-4 sm:gap-6 items-center transform -rotate-12 select-none">
                
                {/* SELECT */}
                <div className="flex flex-col items-center">
                  <button
                    id="btn-select"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      pressButton("SELECT");
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      releaseButton("SELECT");
                    }}
                    onMouseDown={() => pressButton("SELECT")}
                    onMouseUp={() => releaseButton("SELECT")}
                    className={`w-11 sm:w-14 md:w-16 h-4 sm:h-5 md:h-6 rounded-full bg-[#16171b] border border-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_2px_4px_rgba(0,0,0,0.5)] transition-all cursor-pointer ${
                      activeButtons.has("SELECT") ? "scale-95 bg-[#e52521] shadow-[0_0_10px_#e52521]" : "active:scale-95"
                    }`}
                  />
                  <span className="font-display font-black text-[9px] sm:text-[10px] text-[#e52521] mt-2 tracking-widest uppercase">
                    SELECT
                  </span>
                </div>

                {/* START */}
                <div className="flex flex-col items-center">
                  <button
                    id="btn-start"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      pressButton("START");
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      releaseButton("START");
                    }}
                    onMouseDown={() => pressButton("START")}
                    onMouseUp={() => releaseButton("START")}
                    className={`w-11 sm:w-14 md:w-16 h-4 sm:h-5 md:h-6 rounded-full bg-[#16171b] border border-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_2px_4px_rgba(0,0,0,0.5)] transition-all cursor-pointer ${
                      activeButtons.has("START") ? "scale-95 bg-[#e52521] shadow-[0_0_10px_#e52521]" : "active:scale-95"
                    }`}
                  />
                  <span className="font-display font-black text-[9px] sm:text-[10px] text-[#e52521] mt-2 tracking-widest uppercase">
                    START
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: Iconic Round Red Action Buttons B & A (Plus Turbo B & A) */}
            <div className="col-span-5 flex flex-col items-center justify-center gap-3 sm:gap-4">
              
              {/* Optional Turbo Row (Autofire) */}
              <div className="flex gap-4 sm:gap-7 items-center mb-1">
                {/* Turbo B */}
                <div className="flex flex-col items-center">
                  <button
                    id="btn-turbo-b"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setIsTurboBHeld(true);
                      triggerHaptic();
                      playClickFeedback();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setIsTurboBHeld(false);
                    }}
                    onMouseDown={() => setIsTurboBHeld(true)}
                    onMouseUp={() => setIsTurboBHeld(false)}
                    onMouseLeave={() => setIsTurboBHeld(false)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-full bg-[#991b1b] border-2 border-[#ef4444] text-white flex items-center justify-center shadow-lg font-display font-black text-xs transition-all cursor-pointer ${
                      isTurboBHeld ? "scale-90 bg-[#ef4444] shadow-[0_0_15px_#ef4444]" : "active:scale-95"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                  </button>
                  <span className="text-[9px] sm:text-[10px] font-mono font-black text-zinc-400 mt-1 uppercase tracking-wider">
                    TURBO B
                  </span>
                </div>

                {/* Turbo A */}
                <div className="flex flex-col items-center">
                  <button
                    id="btn-turbo-a"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setIsTurboAHeld(true);
                      triggerHaptic();
                      playClickFeedback();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setIsTurboAHeld(false);
                    }}
                    onMouseDown={() => setIsTurboAHeld(true)}
                    onMouseUp={() => setIsTurboAHeld(false)}
                    onMouseLeave={() => setIsTurboAHeld(false)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-full bg-[#991b1b] border-2 border-[#ef4444] text-white flex items-center justify-center shadow-lg font-display font-black text-xs transition-all cursor-pointer ${
                      isTurboAHeld ? "scale-90 bg-[#ef4444] shadow-[0_0_15px_#ef4444]" : "active:scale-95"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                  </button>
                  <span className="text-[9px] sm:text-[10px] font-mono font-black text-zinc-400 mt-1 uppercase tracking-wider">
                    TURBO A
                  </span>
                </div>
              </div>

              {/* Primary Classic Diagonal Buttons: B (lower) & A (higher) */}
              <div className="flex gap-4 sm:gap-7 items-center">
                
                {/* Button B */}
                <div className="flex flex-col items-center transform translate-y-3 sm:translate-y-4">
                  <button
                    id="btn-b"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      pressButton("B");
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      releaseButton("B");
                    }}
                    onMouseDown={() => pressButton("B")}
                    onMouseUp={() => releaseButton("B")}
                    className={`w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full bg-gradient-to-br from-[#e52521] via-[#c81e1a] to-[#991512] border-4 border-[#7f1d1d] flex items-center justify-center shadow-[0_8px_20px_rgba(229,37,33,0.45),inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all cursor-pointer ${
                      activeButtons.has("B")
                        ? "scale-90 bg-[#ef4444] shadow-[0_0_25px_#ef4444]"
                        : "active:scale-95"
                    }`}
                  >
                    <span className="font-display font-black text-xl sm:text-2xl md:text-3xl text-white drop-shadow-md">
                      B
                    </span>
                  </button>
                  <div className="mt-2 px-2.5 py-0.5 rounded bg-[#111215] border border-[#e52521]/60">
                    <span className="font-display font-black text-[10px] sm:text-xs text-[#e52521] uppercase tracking-wider">
                      BUTTON B
                    </span>
                  </div>
                </div>

                {/* Button A */}
                <div className="flex flex-col items-center transform -translate-y-3 sm:-translate-y-4">
                  <button
                    id="btn-a"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      pressButton("A");
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      releaseButton("A");
                    }}
                    onMouseDown={() => pressButton("A")}
                    onMouseUp={() => releaseButton("A")}
                    className={`w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full bg-gradient-to-br from-[#e52521] via-[#c81e1a] to-[#991512] border-4 border-[#7f1d1d] flex items-center justify-center shadow-[0_8px_20px_rgba(229,37,33,0.45),inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all cursor-pointer ${
                      activeButtons.has("A")
                        ? "scale-90 bg-[#ef4444] shadow-[0_0_25px_#ef4444]"
                        : "active:scale-95"
                    }`}
                  >
                    <span className="font-display font-black text-xl sm:text-2xl md:text-3xl text-white drop-shadow-md">
                      A
                    </span>
                  </button>
                  <div className="mt-2 px-2.5 py-0.5 rounded bg-[#111215] border border-[#e52521]/60">
                    <span className="font-display font-black text-[10px] sm:text-xs text-[#e52521] uppercase tracking-wider">
                      BUTTON A
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Bottom Footnote Bar */}
          <div className="relative z-10 flex justify-between items-center text-[10px] sm:text-[11px] text-zinc-600 px-3 sm:px-6">
            <span className="font-mono font-bold uppercase tracking-wider text-zinc-500">
              LOW-LATENCY WEBSOCKET MULTIPLAYER
            </span>
            <span className="font-mono font-bold text-zinc-500">
              {activeButtons.size > 0 ? `KEYS: ${Array.from(activeButtons).join(" ")}` : "READY"}
            </span>
          </div>

        </div>

      </main>
    </div>
  );
};

export default PhoneController;
