import React from "react";
import { MenuLayoutOption } from "../../types";
import { X, Tv, Layers, LayoutGrid, Columns, Monitor } from "lucide-react";

interface LayoutSelectorModalProps {
  currentLayout: MenuLayoutOption;
  onSelectLayout: (layout: MenuLayoutOption) => void;
  onClose: () => void;
}

interface LayoutItem {
  id: MenuLayoutOption;
  title: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  previewColor: string;
}

const LAYOUTS: LayoutItem[] = [
  {
    id: "arcade-frontend",
    title: "ARCADE FRONTEND (HYPERSPIN)",
    badge: "FLAGSHIP",
    description: "Authentic arcade cabinet wheel selector with dynamic video snaps, rich metadata, and box art banners.",
    icon: Columns,
    previewColor: "from-red-600 to-amber-600",
  },
  {
    id: "power-grid",
    title: "NINTENDO POWER GRID",
    badge: "POPULAR",
    description: "High-density retro catalog view with multi-category filters, box covers, and quick search.",
    icon: LayoutGrid,
    previewColor: "from-blue-600 to-indigo-600",
  },
  {
    id: "cartridge-shelf",
    title: "CARTRIDGE SHELF",
    badge: "3D VINTAGE",
    description: "Physical grey NES cartridge rack with authentic end-labels and detailed specs panel.",
    icon: Layers,
    previewColor: "from-purple-600 to-pink-600",
  },
  {
    id: "channel-surfer",
    title: "CHANNEL SURFER",
    badge: "90s TV",
    description: "Retro CRT television tuner with channel dial, static sweep sound effects, and fast flipping.",
    icon: Tv,
    previewColor: "from-emerald-600 to-teal-600",
  },
  {
    id: "living-room",
    title: "RETRO LIVING ROOM",
    badge: "NOSTALGIC",
    description: "Warm 1980s woodgrain television lounge console with tabletop cartridge stack.",
    icon: Monitor,
    previewColor: "from-amber-600 to-yellow-600",
  },
];

export const LayoutSelectorModal: React.FC<LayoutSelectorModalProps> = ({
  currentLayout,
  onSelectLayout,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono">
              SWITCH TV MENU LAYOUT
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Choose your preferred retro navigation and game browsing interface
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Layout list */}
        <div className="p-6 grid grid-cols-1 gap-3 max-h-[70vh] overflow-y-auto">
          {LAYOUTS.map((layout) => {
            const isSelected = currentLayout === layout.id;
            const Icon = layout.icon;
            return (
              <button
                key={layout.id}
                onClick={() => onSelectLayout(layout.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition cursor-pointer group ${
                  isSelected
                    ? "bg-red-950/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    : "bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${layout.previewColor} text-white shadow-md`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{layout.title}</span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                        isSelected
                          ? "bg-red-500 text-white"
                          : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-200"
                      }`}
                    >
                      {layout.badge}
                    </span>
                    {isSelected && (
                      <span className="ml-auto text-xs text-red-400 font-bold uppercase font-mono">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {layout.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
