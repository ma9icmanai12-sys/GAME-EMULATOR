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
  const isCompactPhone = isPortrait && typeof window !== "undefined" && window.innerWidth < 420;

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
      className={`relative ${sizeClass} touch-none cursor-pointer select-none rounded-[30%] border-[5px] border-[#24282d] bg-[#0d1012] shadow-[inset_0_10px_16px_rgba(0,0,0,0.87),0_8px_18px_rgba(0,0,0,0.5)] filter`}
    >
      <div className="absolute inset-1.5 rounded-[26%] border border-zinc-700/80 bg-[#171b1d] shadow-[inset_0_6px_12px_rgba(0,0,0,0.9)]" />

      <div className="absolute top-1/3 left-0 right-0 h-1/3 bg-[#1b1d20] border-y border-zinc-700/80 shadow-[inset_0_2px_5px_rgba(255,255,255,0.08)] flex items-center justify-between px-2.5">
        <span
          className={`text-zinc-500 font-black text-[11px] select-none transition-all ${
            activeButtons.has("LEFT") ? "text-[#d84d4d] scale-125" : ""
          }`}
        >
          ◀
        </span>
        <span
          className={`text-zinc-500 font-black text-[11px] select-none transition-all ${
            activeButtons.has("RIGHT") ? "text-[#d84d4d] scale-125" : ""
          }`}
        >
          ▶
        </span>
      </div>

      <div className="absolute top-0 bottom-0 left-1/3 right-1/3 bg-[#1b1d20] border-x border-zinc-700/80 shadow-[inset_0_2px_5px_rgba(255,255,255,0.08)] flex flex-col items-center justify-between py-2.5">
        <span
          className={`text-zinc-500 font-black text-[11px] select-none transition-all ${
            activeButtons.has("UP") ? "text-[#d84d4d] scale-125" : ""
          }`}
        >
          ▲
        </span>
        <span
          className={`text-zinc-500 font-black text-[11px] select-none transition-all ${
            activeButtons.has("DOWN") ? "text-[#d84d4d] scale-125" : ""
          }`}
        >
          ▼
        </span>
      </div>

      <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 flex items-center justify-center pointer-events-none">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#111215] shadow-[inset_0_5px_10px_rgba(0,0,0,0.95)] border border-zinc-800 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#1f2025] shadow-inner" />
        </div>
      </div>

      {activeButtons.has("UP") && (
        <div className="absolute top-1 left-1/3 w-1/3 h-[calc(33%-0.5rem)] bg-[#d84d4d]/20 rounded-t-xl pointer-events-none" />
      )}
      {activeButtons.has("DOWN") && (
        <div className="absolute bottom-1 left-1/3 w-1/3 h-[calc(33%-0.5rem)] bg-[#d84d4d]/20 rounded-b-xl pointer-events-none" />
      )}
      {activeButtons.has("LEFT") && (
        <div className="absolute top-1/3 left-1 w-[calc(33%-0.5rem)] h-1/3 bg-[#d84d4d]/20 rounded-l-xl pointer-events-none" />
      )}
      {activeButtons.has("RIGHT") && (
        <div className="absolute top-1/3 right-1 w-[calc(33%-0.5rem)] h-1/3 bg-[#d84d4d]/20 rounded-r-xl pointer-events-none" />
      )}
    </div>
  );

  // Reusable SELECT & START Buttons
  const renderSelectStart = () => (
    <div className="flex flex-row gap-3 sm:gap-4 items-center select-none">
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
          className={`w-9 sm:w-11 md:w-12 h-4 sm:h-5 md:h-5 rounded-full bg-[#171a1d] border border-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_2px_4px_rgba(0,0,0,0.45)] transition-all cursor-pointer ${
            activeButtons.has("SELECT") ? "scale-95 bg-[#d12b2d]" : "active:scale-95"
          }`}
        />
        <span className="font-display font-black text-[8px] sm:text-[9px] text-[#d12b2d] mt-1.5 tracking-widest uppercase">
          SELECT
        </span>
      </div>

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
          className={`w-9 sm:w-11 md:w-12 h-4 sm:h-5 md:h-5 rounded-full bg-[#171a1d] border border-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_2px_4px_rgba(0,0,0,0.45)] transition-all cursor-pointer ${
            activeButtons.has("START") ? "scale-95 bg-[#d12b2d]" : "active:scale-95"
          }`}
        />
        <span className="font-display font-black text-[8px] sm:text-[9px] text-[#d12b2d] mt-1.5 tracking-widest uppercase">
          START
        </span>
      </div>
    </div>
  );

  // Reusable Turbo Buttons
  const renderTurboButtons = () => (
    <div className="flex gap-2 sm:gap-4 items-center">
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
          className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-[#991b1b] border-2 border-[#ef4444] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(239,68,68,0.35)] transition-all cursor-pointer ${
            isTurboBHeld ? "scale-90 bg-[#ef4444] shadow-[0_0_15px_#ef4444]" : "active:scale-95"
          }`}
        >
          <Zap className="w-3 h-3 fill-white" />
        </button>
        <span className="text-[7px] sm:text-[8px] font-mono font-black text-zinc-400 mt-1 uppercase">
          TURBO B
        </span>
      </div>

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
          className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-[#991b1b] border-2 border-[#ef4444] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(239,68,68,0.35)] transition-all cursor-pointer ${
            isTurboAHeld ? "scale-90 bg-[#ef4444] shadow-[0_0_15px_#ef4444]" : "active:scale-95"
          }`}
        >
          <Zap className="w-3 h-3 fill-white" />
        </button>
        <span className="text-[7px] sm:text-[8px] font-mono font-black text-zinc-400 mt-1 uppercase">
          TURBO A
        </span>
      </div>
    </div>
  );

  // Reusable Primary Action Buttons (B & A)
  const renderActionButtons = (sizeClass: string, fontClass: string = "text-xl sm:text-2xl") => (
    <div className="flex gap-2 sm:gap-4 items-center">
      <div className="flex flex-col items-center transform translate-y-2 sm:translate-y-3">
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
          className={`${sizeClass} rounded-full bg-gradient-to-br from-[#d94949] via-[#b51d20] to-[#721014] border-[5px] border-[#4b080d] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.35),inset_0_2px_5px_rgba(255,255,255,0.18)] transition-all cursor-pointer ${
            activeButtons.has("B")
              ? "scale-95 bg-[#d94949]"
              : "active:scale-95"
          }`}
        >
          <span className={`font-display font-black ${fontClass} text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.7)]`}>
            B
          </span>
        </button>
        {!isCompactPhone && (
          <div className="mt-1.5 px-2 py-0.5 rounded bg-[#111215] border border-[#d63a3a]/60">
            <span className="font-display font-black text-[8px] sm:text-[9px] text-[#d63a3a] uppercase tracking-wider">
              BUTTON B
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center transform -translate-y-2 sm:-translate-y-3">
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
          className={`${sizeClass} rounded-full bg-gradient-to-br from-[#d94949] via-[#b51d20] to-[#721014] border-[5px] border-[#4b080d] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.35),inset_0_2px_5px_rgba(255,255,255,0.18)] transition-all cursor-pointer ${
            activeButtons.has("A")
              ? "scale-95 bg-[#d94949]"
              : "active:scale-95"
          }`}
        >
          <span className={`font-display font-black ${fontClass} text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.7)]`}>
            A
          </span>
        </button>
        {!isCompactPhone && (
          <div className="mt-1.5 px-2 py-0.5 rounded bg-[#111215] border border-[#d63a3a]/60">
            <span className="font-display font-black text-[8px] sm:text-[9px] text-[#d63a3a] uppercase tracking-wider">
              BUTTON A
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#0a0a0c] text-white flex flex-col justify-between select-none touch-none overflow-hidden font-sans">
      {/* Bottom Controller Utility Bar */}
      <div className="w-full bg-zinc-950 border-t border-zinc-800 px-3 sm:px-6 py-2 z-30 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onExit && (
              <button
                onClick={onExit}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                title="Exit Controller to TV View"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

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

            <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-zinc-400">
              <span>ROOM:</span>
              <span className="text-amber-400 font-bold tracking-wider">{roomId}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
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
              className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-[10px] sm:text-xs font-mono font-bold tracking-wider transition-colors cursor-pointer"
              title="Menu (Select + Start)"
            >
              <span>MENU</span>
            </button>

            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
              {isConnected ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500 animate-pulse" />
              )}
              <span>{isConnected ? `${ping}ms` : "CONNECTING"}</span>
            </div>

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

            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 transition-colors cursor-pointer"
              title="Fullscreen Edge-to-Edge"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Controller Area: Adaptive Layout */}
      {isPortrait && !forceLandscape ? (
        /* PORTRAIT HANDHELD VIEW FOR SMARTPHONES */
        <main className="flex-1 flex flex-col justify-end p-3 max-w-md mx-auto w-full h-full overflow-hidden select-none">
          {/* Upper Controller Section */}
          <div className="flex-1 flex flex-col justify-start min-h-0">
            <div className="bg-gradient-to-b from-[#dde1e5] to-[#c2c6cb] rounded-[1.75rem] p-3 border-[5px] border-[#7e8792] shadow-[0_12px_20px_rgba(0,0,0,0.38)] relative overflow-hidden flex flex-col justify-between">
              <div className="absolute inset-x-2.5 top-2.5 bottom-2.5 bg-[#1b1c20] rounded-[1rem] border-2 border-[#121316] pointer-events-none" />

              <div className="relative z-10 flex justify-between items-center px-2">
                <div className="font-display font-black text-lg text-[#d84d4d] uppercase italic tracking-tight drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]">
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
        <main className="flex-1 flex items-center justify-center p-0 sm:p-1 md:p-2 relative overflow-hidden">
          <div className="w-full h-[calc(100vh-4.5rem)] max-w-[calc(100vw-0.5rem)] max-h-[calc(100vh-4.5rem)] bg-gradient-to-b from-[#dfe3e7] to-[#c8ccd0] rounded-xl sm:rounded-[1.75rem] p-2 sm:p-3 md:p-4 border-[5px] sm:border-[6px] border-[#7b838d] shadow-[0_20px_46px_rgba(0,0,0,0.72),inset_0_2px_4px_rgba(255,255,255,0.32)] flex flex-col justify-between relative overflow-hidden">
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
            <div className="relative z-10 flex justify-between items-center px-2 sm:px-3">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
                <div className="font-display font-black text-lg sm:text-xl md:text-2xl text-[#d84d4d] tracking-tight uppercase italic drop-shadow-[0_1px_0_rgba(0,0,0,0.35)] leading-none">
                  Nintendo
                </div>
                <span className="text-[8px] sm:text-[9px] font-mono font-black text-zinc-600 uppercase tracking-widest hidden sm:inline">
                  ENTERTAINMENT SYSTEM
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-mono font-bold text-[8px] sm:text-[9px] text-zinc-600 uppercase tracking-widest hidden md:inline">
                  WIRELESS CONTROLLER
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-black text-[8px] sm:text-[10px]">
                  {isP1 ? "CONTROLLER I" : "CONTROLLER II"}
                </span>
              </div>
            </div>

            {/* Controller Interactive Surface: Left (D-PAD) | Center (SELECT/START) | Right (B / A) */}
            <div className="relative z-20 flex-1 grid grid-cols-12 items-center gap-1.5 sm:gap-2 my-1 sm:my-1.5">
              {/* LEFT: D-Pad */}
              <div className="col-span-5 flex items-center justify-center">
                {renderDpad("w-30 h-30 sm:w-36 sm:h-36 md:w-40 md:h-40")}
              </div>

              {/* CENTER: SELECT and START */}
              <div className="col-span-2 flex flex-col items-center justify-center gap-4 sm:gap-5">
                <div className="transform -rotate-12">
                  {renderSelectStart()}
                </div>
              </div>

              {/* RIGHT: Turbo and Action Buttons */}
              <div className="col-span-5 flex flex-col items-center justify-center gap-2 sm:gap-3">
                {renderTurboButtons()}
                {renderActionButtons("w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18", "text-lg sm:text-xl md:text-2xl")}
              </div>
            </div>

            {/* Bottom Footnote Bar */}
            <div className="relative z-10 flex justify-between items-center text-[7px] sm:text-[8px] text-zinc-600 px-2 sm:px-3">
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
