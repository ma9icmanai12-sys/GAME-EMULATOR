import React, { useState, useEffect, useRef, useCallback } from "react";
import { PartySocket, ConnectionStatus } from "../../services/socket";
import { NesButton } from "../../types";
import {
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Smartphone,
  ChevronLeft,
  RotateCcw,
  Zap,
} from "lucide-react";

interface PhoneControllerProps {
  socket?: PartySocket;
  roomId: string;
  initialSlot?: 1 | 2;
  onExit?: () => void;
  onDirectInput?: (slot: 1 | 2, button: NesButton, state: boolean) => void;
}

export const PhoneController: React.FC<PhoneControllerProps> = ({
  socket,
  roomId,
  initialSlot,
  onExit,
  onDirectInput,
}) => {
  const [slot, setSlot] = useState<1 | 2 | "spectator">(initialSlot || socket?.getSlot() || 1);
  const [status, setStatus] = useState<ConnectionStatus>(socket ? socket.getStatus() : "connecting");
  const [hostConnected, setHostConnected] = useState<boolean>(socket ? socket.isHostConnected() : true);
  const [ping, setPing] = useState<number>(socket ? socket.getPing() || 0 : 0);
  const [activeButtons, setActiveButtons] = useState<Set<NesButton>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTurboAHeld, setIsTurboAHeld] = useState(false);
  const [isTurboBHeld, setIsTurboBHeld] = useState(false);

  // Responsive orientation detection
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerHeight > window.innerWidth;
  });
  const [forceLandscape, setForceLandscape] = useState(false);

  useEffect(() => {
    const handleOrientationChange = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener("resize", handleOrientationChange);
    window.addEventListener("orientationchange", handleOrientationChange);
    return () => {
      window.removeEventListener("resize", handleOrientationChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  // Send button event both to WebSocket (for remote phones) and directly (for local testing)
  const sendButtonEvent = useCallback((btn: NesButton, state: boolean) => {
    if (socket) {
      socket.sendInput(btn, state);
    }
    if (onDirectInput) {
      const activeSlot = (slot === "spectator" ? 1 : slot) as 1 | 2;
      onDirectInput(activeSlot, btn, state);
    }
  }, [socket, onDirectInput, slot]);

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
        if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
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
    if (!socket) return;
    setStatus(socket.getStatus());
    setPing(socket.getPing());
    setHostConnected(socket.isHostConnected());
    const currentSlot = socket.getSlot();
    if (currentSlot) setSlot(currentSlot);

    const unsubStatus = socket.onStatusChange((s) => setStatus(s));
    const unsubPing = socket.onPing((p) => setPing(p));
    const unsubAssigned = socket.onAssigned((newSlot) => setSlot(newSlot));
    const unsubHost = socket.onHostStatus((data) => setHostConnected(data.hostConnected));

    return () => {
      unsubStatus();
      unsubPing();
      unsubAssigned();
      unsubHost();
    };
  }, [socket]);

  // Turbo Rapid-Fire Engine (30Hz alternation when Turbo A or Turbo B is held)
  useEffect(() => {
    if (isTurboAHeld || isTurboBHeld) {
      turboIntervalRef.current = setInterval(() => {
        turboPulseRef.current = !turboPulseRef.current;
        const pulse = turboPulseRef.current;

        if (isTurboAHeld) {
          sendButtonEvent("A", pulse);
        }
        if (isTurboBHeld) {
          sendButtonEvent("B", pulse);
        }
      }, 50); // 20 times a second turbo
    } else {
      if (turboIntervalRef.current) {
        clearInterval(turboIntervalRef.current);
        turboIntervalRef.current = null;
      }
      if (!activeButtons.has("A")) sendButtonEvent("A", false);
      if (!activeButtons.has("B")) sendButtonEvent("B", false);
    }

    return () => {
      if (turboIntervalRef.current) {
        clearInterval(turboIntervalRef.current);
      }
    };
  }, [isTurboAHeld, isTurboBHeld, sendButtonEvent, activeButtons]);

  // Audio click feedback generator
  const playClickFeedback = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      if (audioCtxRef.current) {
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
      }
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
    sendButtonEvent(btn, true);
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
    sendButtonEvent(btn, false);
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
      const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180

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
        sendButtonEvent(btn, true);
        triggerHaptic();
        playClickFeedback();
      } else if (wasActive && !isNowActive) {
        sendButtonEvent(btn, false);
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
        sendButtonEvent(btn, false);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const isConnected = status === "connected";
  const isP1 = slot === 1;

  // Reusable Cross D-Pad Component
  const renderDpad = (sizeClass: string) => (
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
      onMouseDown={(e) => handleDpadTouch(e.clientX, e.clientY)}
      onMouseMove={(e) => {
        if (e.buttons === 1) handleDpadTouch(e.clientX, e.clientY);
      }}
      onMouseUp={() => clearDpad()}
      onMouseLeave={() => clearDpad()}
      className={`relative ${sizeClass} touch-none cursor-pointer select-none filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]`}
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

      {/* Center Pivot Thumb Circle */}
      <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 flex items-center justify-center pointer-events-none">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#111215] shadow-[inset_0_3px_6px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.1)] border border-zinc-800 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1f2025] shadow-inner" />
        </div>
      </div>

      {/* Visual Glow on Pressed Arms */}
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
  );

  // Reusable SELECT & START Buttons
  const renderSelectStart = () => (
    <div className="flex flex-row gap-4 sm:gap-6 items-center select-none">
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
        <span className="font-display font-black text-[9px] sm:text-[10px] text-[#e52521] mt-1.5 tracking-widest uppercase">
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
        <span className="font-display font-black text-[9px] sm:text-[10px] text-[#e52521] mt-1.5 tracking-widest uppercase">
          START
        </span>
      </div>
    </div>
  );

  // Reusable Turbo Buttons
  const renderTurboButtons = () => (
    <div className="flex gap-3 sm:gap-6 items-center">
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
          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#991b1b] border-2 border-[#ef4444] text-white flex items-center justify-center shadow-lg transition-all cursor-pointer ${
            isTurboBHeld ? "scale-90 bg-[#ef4444] shadow-[0_0_15px_#ef4444]" : "active:scale-95"
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-white" />
        </button>
        <span className="text-[8px] sm:text-[9px] font-mono font-black text-zinc-400 mt-1 uppercase">
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
          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#991b1b] border-2 border-[#ef4444] text-white flex items-center justify-center shadow-lg transition-all cursor-pointer ${
            isTurboAHeld ? "scale-90 bg-[#ef4444] shadow-[0_0_15px_#ef4444]" : "active:scale-95"
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-white" />
        </button>
        <span className="text-[8px] sm:text-[9px] font-mono font-black text-zinc-400 mt-1 uppercase">
          TURBO A
        </span>
      </div>
    </div>
  );

  // Reusable Primary Action Buttons (B & A)
  const renderActionButtons = (sizeClass: string, fontClass: string = "text-xl sm:text-2xl") => (
    <div className="flex gap-3 sm:gap-6 items-center">
      {/* Button B */}
      <div className="flex flex-col items-center transform translate-y-2 sm:translate-y-4">
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
          className={`${sizeClass} rounded-full bg-gradient-to-br from-[#e52521] via-[#c81e1a] to-[#991512] border-4 border-[#7f1d1d] flex items-center justify-center shadow-[0_8px_20px_rgba(229,37,33,0.45),inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all cursor-pointer ${
            activeButtons.has("B")
              ? "scale-90 bg-[#ef4444] shadow-[0_0_25px_#ef4444]"
              : "active:scale-95"
          }`}
        >
          <span className={`font-display font-black ${fontClass} text-white drop-shadow-md`}>
            B
          </span>
        </button>
        <div className="mt-1.5 px-2 py-0.5 rounded bg-[#111215] border border-[#e52521]/60">
          <span className="font-display font-black text-[9px] sm:text-[10px] text-[#e52521] uppercase tracking-wider">
            BUTTON B
          </span>
        </div>
      </div>

      {/* Button A */}
      <div className="flex flex-col items-center transform -translate-y-2 sm:-translate-y-4">
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
          className={`${sizeClass} rounded-full bg-gradient-to-br from-[#e52521] via-[#c81e1a] to-[#991512] border-4 border-[#7f1d1d] flex items-center justify-center shadow-[0_8px_20px_rgba(229,37,33,0.45),inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all cursor-pointer ${
            activeButtons.has("A")
              ? "scale-90 bg-[#ef4444] shadow-[0_0_25px_#ef4444]"
              : "active:scale-95"
          }`}
        >
          <span className={`font-display font-black ${fontClass} text-white drop-shadow-md`}>
            A
          </span>
        </button>
        <div className="mt-1.5 px-2 py-0.5 rounded bg-[#111215] border border-[#e52521]/60">
          <span className="font-display font-black text-[9px] sm:text-[10px] text-[#e52521] uppercase tracking-wider">
            BUTTON A
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#0a0a0c] text-white flex flex-col justify-between select-none touch-none overflow-hidden font-sans">
      {/* Top Controller Status Bar */}
      <header className="h-12 sm:h-14 bg-zinc-950 border-b border-zinc-800 px-3 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {onExit && (
            <button
              onClick={onExit}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700 transition-colors cursor-pointer mr-1"
              title="Exit Controller to TV View"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Player Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-display font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md border ${
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

          {/* TV Link Status Badge */}
          {!hostConnected ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold tracking-wider bg-amber-500/20 border border-amber-500/60 text-amber-300 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>WAITING FOR TV</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold tracking-wider bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>TV LINKED</span>
            </div>
          )}

          {/* Room info */}
          <div className="hidden md:flex items-center gap-1 text-xs font-mono text-zinc-400">
            <span>ROOM:</span>
            <span className="text-amber-400 font-bold tracking-wider">{roomId}</span>
          </div>
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Menu Button (Select + Start) */}
          <button
            onClick={() => {
              sendButtonEvent("SELECT", true);
              sendButtonEvent("START", true);
              triggerHaptic();
              playClickFeedback();
              setTimeout(() => {
                sendButtonEvent("SELECT", false);
                sendButtonEvent("START", false);
              }, 200);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-xs font-mono font-bold tracking-wider transition-colors cursor-pointer"
            title="Menu (Select + Start)"
          >
            <span>MENU</span>
          </button>

          {/* Latency badge */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
            {isConnected ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500 animate-pulse" />
            )}
            <span>{isConnected ? `${ping}ms` : "CONNECTING"}</span>
          </div>

          {/* Orientation switch */}
          <button
            onClick={() => setForceLandscape(!forceLandscape)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              forceLandscape
                ? "bg-red-950/80 border-red-500 text-red-300"
                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300"
            }`}
            title="Rotate Controller Layout"
          >
            <Smartphone className={`w-3.5 h-3.5 ${forceLandscape ? "rotate-90 text-red-400" : ""}`} />
          </button>

          {/* Switch Player Slot */}
          <button
            onClick={() => {
              const nextSlot = slot === 1 ? 2 : 1;
              socket?.send({
                type: "join-controller",
                roomId,
                requestedSlot: nextSlot,
              });
            }}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-xs font-grotesk font-bold uppercase tracking-wider transition-colors cursor-pointer"
            title="Switch Player Slot (P1 / P2)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>P{slot === 1 ? 2 : 1}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 transition-colors cursor-pointer"
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
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 transition-colors cursor-pointer"
            title="Fullscreen Edge-to-Edge"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Controller Area: Adaptive Layout */}
      {isPortrait && !forceLandscape ? (
        /* PORTRAIT HANDHELD VIEW FOR SMARTPHONES */
        <main className="flex-1 flex flex-col justify-end p-3 max-w-md mx-auto w-full h-full overflow-hidden select-none">
          {/* Upper Controller Section */}
          <div className="flex-1 flex flex-col justify-start min-h-0">
            <div className="bg-[#caccd1] rounded-2xl p-3 border-4 border-[#9a9ea7] shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute inset-x-2 top-2 bottom-2 bg-[#1b1c20] rounded-xl border-2 border-[#121316] pointer-events-none" />

              <div className="relative z-10 flex justify-between items-center px-2">
                <div className="font-display font-black text-lg text-[#e52521] uppercase italic tracking-tight">
                  Nintendo
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-black text-[10px]">
                  {isP1 ? "CONTROLLER I" : "CONTROLLER II"}
                </span>
              </div>

              <div className="relative z-20 flex items-center justify-around mt-3 pt-2">
                {renderSelectStart()}
                {renderTurboButtons()}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-between gap-3 px-1 py-2 min-h-0">
              <div className="flex items-center justify-center flex-1">
                {renderDpad("w-36 h-36 sm:w-40 sm:h-40")}
              </div>

              <div className="flex items-center justify-center flex-1">
                {renderActionButtons("w-15 h-15 sm:w-16 sm:h-16", "text-xl sm:text-2xl")}
              </div>
            </div>
          </div>

          {/* Bottom Status / Info Panel */}
          <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-2.5 text-[10px] text-zinc-300">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 font-mono font-bold uppercase text-zinc-400">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>{isConnected ? `${ping}ms` : "CONNECTING"}</span>
              </div>
              <div className="font-mono font-bold text-red-400">
                {activeButtons.size > 0 ? `KEYS: ${Array.from(activeButtons).join(" ")}` : "READY"}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
              <span className="font-mono font-bold uppercase">ROOM {roomId}</span>
              <span className="font-mono font-bold uppercase text-emerald-400">
                {hostConnected ? "TV LINKED" : "WAITING"}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 px-2 py-1 bg-zinc-900/80 rounded-lg border border-zinc-800">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-red-500 rotate-90" />
                <span>Rotate for widescreen</span>
              </span>
              <button
                onClick={() => setForceLandscape(true)}
                className="text-red-400 font-bold hover:underline cursor-pointer"
              >
                Widescreen
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* WIDESCREEN / LANDSCAPE CLASSIC NES CONTROLLER BODY */
        <main className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 relative overflow-hidden">
          <div className="w-full max-w-4xl h-full max-h-[520px] bg-[#caccd1] rounded-3xl p-3 sm:p-5 md:p-6 border-4 sm:border-8 border-[#9a9ea7] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)] flex flex-col justify-between relative overflow-hidden">
            {/* Corner Hardware Screw Details */}
            <div className="absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-[#838791] shadow-inner border border-zinc-500/40" />
            <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#838791] shadow-inner border border-zinc-500/40" />
            <div className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-[#838791] shadow-inner border border-zinc-500/40" />
            <div className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#838791] shadow-inner border border-zinc-500/40" />

            {/* Dark Horizontal Inset Band with NES pinstripes */}
            <div className="absolute inset-x-2 sm:inset-x-4 top-10 sm:top-12 bottom-10 sm:bottom-12 bg-[#1b1c20] rounded-2xl border-2 sm:border-4 border-[#121316] shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)] pointer-events-none overflow-hidden">
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
              <div className="flex items-center gap-2">
                <div className="font-display font-black text-base sm:text-xl md:text-2xl text-[#e52521] tracking-tight uppercase italic drop-shadow-sm">
                  Nintendo
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono font-black text-zinc-600 uppercase tracking-widest hidden sm:inline">
                  ENTERTAINMENT SYSTEM
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[10px] sm:text-xs text-zinc-600 uppercase tracking-widest">
                  WIRELESS CONTROLLER
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-black text-[10px]">
                  {isP1 ? "CONTROLLER I" : "CONTROLLER II"}
                </span>
              </div>
            </div>

            {/* Controller Interactive Surface: Left (D-PAD) | Center (SELECT/START) | Right (B / A) */}
            <div className="relative z-20 flex-1 grid grid-cols-12 items-center gap-2 sm:gap-4 my-auto">
              {/* LEFT: D-Pad */}
              <div className="col-span-5 flex items-center justify-center">
                {renderDpad("w-40 h-40 sm:w-52 sm:h-52 md:w-60 md:h-60")}
              </div>

              {/* CENTER: SELECT and START */}
              <div className="col-span-2 flex flex-col items-center justify-center gap-6 sm:gap-8">
                <div className="transform -rotate-12">
                  {renderSelectStart()}
                </div>
              </div>

              {/* RIGHT: Turbo and Action Buttons */}
              <div className="col-span-5 flex flex-col items-center justify-center gap-3 sm:gap-4">
                {renderTurboButtons()}
                {renderActionButtons("w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22", "text-xl sm:text-2xl md:text-3xl")}
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
      )}
    </div>
  );
};

export default PhoneController;
