import React, { useEffect, useRef, useState } from "react";
import { NesEngine, NES_WIDTH, NES_HEIGHT } from "../../services/emulator";
import { RomItem, PlayerStatus, NesButton } from "../../types";
import { Play, Pause, RotateCcw, ArrowLeft, Volume2, VolumeX, Sparkles, Gamepad2, Smartphone } from "lucide-react";

interface EmulatorViewProps {
  engine: NesEngine;
  activeRom: RomItem;
  p1Status: PlayerStatus;
  p2Status: PlayerStatus;
  onExitToMenu: () => void;
  fps: number;
  onOpenQrModal?: () => void;
}

export const EmulatorView: React.FC<EmulatorViewProps> = ({
  engine,
  activeRom,
  p1Status,
  p2Status,
  onExitToMenu,
  fps,
  onOpenQrModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      engine.attachCanvas(canvasRef.current);
    }
  }, [engine]);

  const togglePause = () => {
    const paused = engine.togglePause();
    setIsPaused(paused);
  };

  const handleReset = () => {
    engine.reset();
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      {/* 256x240 Native NES Canvas scaled with crisp nearest-neighbor */}
      <canvas
        ref={canvasRef}
        width={NES_WIDTH}
        height={NES_HEIGHT}
        className="pixelated-canvas w-full h-full max-w-[95%] max-h-[95%] object-contain"
      />

      {/* Top Floating Mini HUD - stays visible enough to show the active game and controller state */}
      <div className="absolute top-2 inset-x-4 flex items-center justify-between pointer-events-none z-20 text-xs opacity-100 transition-opacity duration-300">
        {/* Game Title & FPS */}
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full border border-neutral-700 pointer-events-auto shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-press-start text-[9px] text-white truncate max-w-[180px] sm:max-w-xs">
            {activeRom.title}
          </span>
          <span className="text-neutral-500 font-mono text-[10px]">|</span>
          <span className="font-mono text-[10px] text-emerald-400">{fps} FPS</span>
        </div>

        {/* Player Connected Indicators */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Player 1 Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-press-start text-[8px] border transition-all ${
              p1Status.connected
                ? "bg-red-950/80 border-red-500 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                : "bg-neutral-900/80 border-neutral-700 text-neutral-500"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                p1Status.connected ? "bg-red-500 animate-pulse" : "bg-neutral-600"
              }`}
            />
            <span>P1 {p1Status.connected ? "CONNECTED" : "WAITING"}</span>
            {/* Show active buttons pressed in real-time */}
            {p1Status.activeButtons.size > 0 && (
              <span className="ml-1 text-white font-mono font-bold">
                [{Array.from(p1Status.activeButtons).join(",")}]
              </span>
            )}
          </div>

          {/* Player 2 Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-press-start text-[8px] border transition-all ${
              p2Status.connected
                ? "bg-blue-950/80 border-blue-500 text-blue-200 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                : "bg-neutral-900/80 border-neutral-700 text-neutral-500"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                p2Status.connected ? "bg-blue-500 animate-pulse" : "bg-neutral-600"
              }`}
            />
            <span>P2 {p2Status.connected ? "CONNECTED" : "WAITING"}</span>
            {p2Status.activeButtons.size > 0 && (
              <span className="ml-1 text-white font-mono font-bold">
                [{Array.from(p2Status.activeButtons).join(",")}]
              </span>
            )}
          </div>

          {/* Quick Connect Phone Button */}
          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-full font-press-start text-[8px] border border-red-400 shadow-md cursor-pointer transition-all active:scale-95"
              title="Connect Phone Controller"
            >
              <Smartphone className="w-3 h-3" />
              <span>CONNECT PHONE</span>
            </button>
          )}
        </div>
      </div>

      {/* Pause Screen Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-30">
          <div className="bg-neutral-900 border-2 border-red-500 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-press-start text-base text-red-500 tracking-wider">
              GAME PAUSED
            </h3>
            <p className="text-xs text-neutral-400 font-mono">
              Press RESUME or use phone controller START button
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={togglePause}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-press-start text-xs rounded-lg flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>RESUME GAME</span>
              </button>

              {onOpenQrModal && (
                <button
                  onClick={onOpenQrModal}
                  className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-press-start text-[10px] rounded-lg flex items-center justify-center gap-2 border border-red-400/50"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>CONNECT PHONE CONTROLLER</span>
                </button>
              )}

              <button
                onClick={handleReset}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs rounded-lg flex items-center justify-center gap-2 border border-neutral-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET NES CONSOLE</span>
              </button>

              <button
                onClick={onExitToMenu}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs rounded-lg flex items-center justify-center gap-2 border border-neutral-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>RETURN TO ROM BROWSER</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom In-Game Controls Bar - always visible so players can immediately exit back to the menu */}
      <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-none z-20 opacity-100 transition-opacity duration-300">
        <button
          onClick={onExitToMenu}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-700 font-mono text-xs shadow-md transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>EJECT / MENU</span>
        </button>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={togglePause}
            className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-700 font-press-start text-[9px] shadow-md transition-colors"
          >
            {isPaused ? <Play className="w-3 h-3 fill-white" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? "RESUME" : "PAUSE"}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-700 shadow-md transition-colors"
            title="Reset Game"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
