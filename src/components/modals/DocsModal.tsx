import React from "react";
import { X, BookOpen, Smartphone, Tv, Gamepad2, Layers, Zap, Wifi } from "lucide-react";

interface DocsModalProps {
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono">
                SYSTEM DOCUMENTATION & MANUAL
              </h2>
              <p className="text-xs text-zinc-400">NES TV Party Architecture, Controls, and Setup Guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Dual-Screen System Architecture */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Tv className="w-4 h-4" />
              <span>DUAL-SCREEN TV + SMARTPHONE ARCHITECTURE</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              NES TV Party is built from the ground up for big-screen party play. The main browser window
              acts as the TV console host running the 60 FPS NES emulation core. Anyone with a smartphone
              can scan the QR code to instantly turn their phone into a low-latency virtual NES gamepad
              over WebSockets—no app install or Bluetooth pairing needed.
            </p>
          </div>

          {/* Controls Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              <span>CONTROLS & INPUT MAPPING</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-red-400" />
                  <span>Phone Virtual Controller</span>
                </div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• <strong className="text-zinc-200">D-Pad:</strong> 8-way directional thumb pad</li>
                  <li>• <strong className="text-zinc-200">A & B:</strong> Primary NES action buttons</li>
                  <li>• <strong className="text-zinc-200">TURBO A & B:</strong> 20Hz rapid fire buttons</li>
                  <li>• <strong className="text-zinc-200">SELECT / START:</strong> Game controls & pause</li>
                  <li>• <strong className="text-zinc-200">Haptics:</strong> Vibration feedback on touch</li>
                </ul>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>PC Keyboard Fallback (Player 1)</span>
                </div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• <strong className="text-zinc-200">D-Pad:</strong> Arrow Keys or W / A / S / D</li>
                  <li>• <strong className="text-zinc-200">B Button:</strong> Z or J key</li>
                  <li>• <strong className="text-zinc-200">A Button:</strong> X or K key</li>
                  <li>• <strong className="text-zinc-200">START:</strong> Enter key</li>
                  <li>• <strong className="text-zinc-200">SELECT:</strong> Shift key</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Menu Layouts */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>5 AUTHENTIC TV MENU LAYOUTS</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Switch anytime between 5 distinct visual frontend themes:
            </p>
            <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1 pl-1">
              <li><strong className="text-zinc-200">Arcade Frontend:</strong> HyperSpin vertical curved wheel with video snaps and rich lore.</li>
              <li><strong className="text-zinc-200">Nintendo Power Grid:</strong> High-density vintage magazine layout with instant genre filtering.</li>
              <li><strong className="text-zinc-200">Cartridge Shelf:</strong> 3D perspective physical cartridge stack with authentic end labels.</li>
              <li><strong className="text-zinc-200">Channel Surfer:</strong> Vintage 90s TV channel changer with broadcast scanlines.</li>
              <li><strong className="text-zinc-200">Retro Living Room:</strong> Nostalgic CRT lounge setup with wood-grain TV console.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition cursor-pointer"
          >
            CLOSE MANUAL
          </button>
        </div>
      </div>
    </div>
  );
};
