import React, { useState } from "react";
import { RomItem } from "../../types";
import { Gamepad2, Tv } from "lucide-react";

interface BoxArtImageProps {
  rom: RomItem;
  className?: string;
  imgClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const BoxArtImage: React.FC<BoxArtImageProps> = ({
  rom,
  className = "",
  imgClassName = "",
  size = "md",
}) => {
  const [hasError, setHasError] = useState(false);
  const [proxyTried, setProxyTried] = useState(false);

  // Determine URL to try
  const directUrl = rom.boxArtThumbnail || rom.boxArtUrl || rom.posterUrl;
  const boxArtId = rom.boxArtUrl?.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  const proxyUrl = boxArtId ? `/api/proxy-art?id=${boxArtId}` : undefined;

  const currentSrc = !proxyTried ? directUrl : proxyUrl;

  const handleImageError = () => {
    if (!proxyTried && proxyUrl) {
      setProxyTried(true);
    } else {
      setHasError(true);
    }
  };

  if (currentSrc && !hasError) {
    return (
      <div className={`relative overflow-hidden bg-zinc-950 shrink-0 ${className}`}>
        <img
          src={currentSrc}
          alt={`${rom.title} Box Art`}
          onError={handleImageError}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={`w-full h-full object-cover object-top transition-transform duration-300 ${imgClassName}`}
        />
      </div>
    );
  }

  // Authentic stylized NES Box Art Card Fallback
  return (
    <div
      className={`relative overflow-hidden shrink-0 flex flex-col justify-between p-1.5 sm:p-2 border border-zinc-700/80 shadow-md ${className}`}
      style={{
        background: `linear-gradient(145deg, ${rom.secondaryColor || "#1e1b4b"}, #0a0a0f)`,
      }}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <span className="text-[8px] sm:text-[9px] font-mono font-black text-amber-400 bg-black/70 px-1 py-0.5 rounded">
          {rom.system?.toUpperCase() || "NES"}
        </span>
        <Tv className="w-2.5 h-2.5 text-zinc-400" />
      </div>

      {/* Center Icon & Title */}
      <div className="my-auto text-center py-1">
        <Gamepad2
          className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-white opacity-80"
          style={{ color: rom.primaryColor || "#ef4444" }}
        />
        <span className="font-display font-black text-[9px] sm:text-[10px] text-white uppercase tracking-tight line-clamp-2 leading-tight drop-shadow">
          {rom.title}
        </span>
      </div>

      {/* Bottom Year / Players */}
      <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-mono text-zinc-400 border-t border-zinc-800 pt-0.5">
        <span>{rom.year || "1988"}</span>
        <span className="text-emerald-400">{rom.players === 2 ? "2P" : "1P"}</span>
      </div>
    </div>
  );
};
