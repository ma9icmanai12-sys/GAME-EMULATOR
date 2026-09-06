import React from "react";
import { CrtShaderConfig } from "../../types";
import { X, Sliders, Tv, Sparkles, Eye, Check } from "lucide-react";

interface CrtSettingsModalProps {
  config: CrtShaderConfig;
  onUpdate: (cfg: Partial<CrtShaderConfig>) => void;
  onClose: () => void;
}

export const CrtSettingsModal: React.FC<CrtSettingsModalProps> = ({
  config,
  onUpdate,
  onClose,
}) => {
  const bezels: Array<{ id: CrtShaderConfig["bezelStyle"]; label: string; desc: string }> = [
    { id: "dark-monitor", label: "Dark Monitor", desc: "Sleek matte arcade TV monitor" },
    { id: "silver-trinitron", label: "Sony Trinitron", desc: "Iconic 90s silver aperture grille TV" },
    { id: "arcade-cab", label: "Arcade Cabinet", desc: "Authentic wooden coin-op bezel" },
    { id: "frameless", label: "Frameless Clean", desc: "Zero bezel edge-to-edge screen" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono">
                CRT DISPLAY & SHADER SETTINGS
              </h2>
              <p className="text-xs text-zinc-400">Adjust vintage phosphor, scanlines, and TV bezels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Bezel Style */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2 font-mono">
              TELEVISION BEZEL CASING
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {bezels.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onUpdate({ bezelStyle: b.id })}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    config.bezelStyle === b.id
                      ? "bg-purple-950/40 border-purple-500 text-white shadow-md"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>{b.label}</span>
                    {config.bezelStyle === b.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Shaders Toggles */}
          <div className="space-y-4 pt-2 border-t border-zinc-800/80">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block font-mono">
              RETRO CRT VISUAL FILTERS
            </label>

            {/* Scanlines */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
              <div>
                <div className="text-xs font-semibold text-zinc-200">Scanlines</div>
                <div className="text-[11px] text-zinc-500">Horizontal cathode ray beam lines</div>
              </div>
              <input
                type="checkbox"
                checked={config.scanlines}
                onChange={(e) => onUpdate({ scanlines: e.target.checked })}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {config.scanlines && (
              <div className="px-3">
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Scanline Intensity</span>
                  <span className="font-mono">{Math.round(config.scanlineIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={config.scanlineIntensity}
                  onChange={(e) => onUpdate({ scanlineIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            )}

            {/* Curvature */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
              <div>
                <div className="text-xs font-semibold text-zinc-200">CRT Screen Curvature</div>
                <div className="text-[11px] text-zinc-500">Curved bubble tube glass distortion</div>
              </div>
              <input
                type="checkbox"
                checked={config.curvature}
                onChange={(e) => onUpdate({ curvature: e.target.checked })}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {/* Bloom Glow */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
              <div>
                <div className="text-xs font-semibold text-zinc-200">Phosphor Bloom & Glow</div>
                <div className="text-[11px] text-zinc-500">Soft warm glow around bright retro pixels</div>
              </div>
              <input
                type="checkbox"
                checked={config.bloom}
                onChange={(e) => onUpdate({ bloom: e.target.checked })}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {/* Vignette */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
              <div>
                <div className="text-xs font-semibold text-zinc-200">Vignette Shading</div>
                <div className="text-[11px] text-zinc-500">Darkened corners matching authentic CRT tubes</div>
              </div>
              <input
                type="checkbox"
                checked={config.vignette}
                onChange={(e) => onUpdate({ vignette: e.target.checked })}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-between items-center">
          <button
            onClick={() =>
              onUpdate({
                scanlines: false,
                curvature: false,
                bloom: false,
                vignette: false,
                staticNoise: false,
                bezelStyle: "dark-monitor",
              })
            }
            className="text-xs text-zinc-400 hover:text-white transition cursor-pointer"
          >
            Reset to Clean Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition cursor-pointer"
          >
            APPLY & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
