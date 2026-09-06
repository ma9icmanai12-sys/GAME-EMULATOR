import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  X,
  Copy,
  Check,
  Smartphone,
  QrCode as QrIcon,
  Wifi,
  ExternalLink,
  Keyboard,
  ArrowRight,
  ShieldCheck,
  Gamepad2,
  Share2,
  AlertTriangle,
  Globe,
  ShieldAlert,
  Info,
} from "lucide-react";
import { PlayerStatus } from "../../types";

interface ConnectPhoneModalProps {
  roomId: string;
  p1Status: PlayerStatus;
  p2Status: PlayerStatus;
  onClose: () => void;
  onOpenSplitTest: () => void;
  onJoinCustomRoom?: (targetRoomId: string) => void;
}

export const ConnectPhoneModal: React.FC<ConnectPhoneModalProps> = ({
  roomId,
  p1Status,
  p2Status,
  onClose,
  onOpenSplitTest,
  onJoinCustomRoom,
}) => {
  const [activeTab, setActiveTab] = useState<"qr" | "text">("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [inputRoomCode, setInputRoomCode] = useState("");

  // Determine current origin and whether we are on Google AI Studio's private dev sandbox
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const isAisDev = currentOrigin.includes("ais-dev-");
  const suggestedSharedOrigin = currentOrigin.replace("ais-dev-", "ais-pre-");

  // By default use current origin (or allow toggling to public shared ais-pre domain)
  const [useSharedDomain, setUseSharedDomain] = useState<boolean>(false);
  const [customOrigin, setCustomOrigin] = useState<string>("");

  const activeOrigin = customOrigin.trim()
    ? customOrigin.trim().replace(/\/$/, "")
    : useSharedDomain && isAisDev
    ? suggestedSharedOrigin
    : currentOrigin;

  // Full controller URL for this room
  const controllerUrl = activeOrigin
    ? `${activeOrigin}/?room=${encodeURIComponent(roomId)}&mode=controller`
    : `/?room=${encodeURIComponent(roomId)}&mode=controller`;

  // Base website URL for typing manually
  const baseSiteUrl = activeOrigin;

  useEffect(() => {
    QRCode.toDataURL(controllerUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#0a0a0c",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR generation error:", err));
  }, [controllerUrl]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(controllerUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2200);
    }
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomId);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2200);
    }
  };

  const handleManualJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputRoomCode.trim().toUpperCase();
    if (!cleanCode) return;
    if (onJoinCustomRoom) {
      onJoinCustomRoom(cleanCode);
    } else {
      window.location.href = `/?room=${encodeURIComponent(cleanCode)}&mode=controller`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto">
      <div className="relative w-full max-w-xl bg-zinc-950 border-2 border-red-600/90 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(220,38,38,0.25)] flex flex-col my-auto max-h-[95vh] overflow-y-auto font-sans">
        
        {/* Modal Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl shadow-lg border border-red-400/40">
              <Smartphone className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-base sm:text-lg text-white uppercase tracking-tight">
                  CONNECT PHONE CONTROLLER
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/60 text-red-400 font-mono text-[10px] font-black uppercase">
                  WIRELESS
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-grotesk font-medium mt-0.5">
                Scan QR or enter text code to play using your smartphone
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Domain / Connection Mode Selector (Solves Google 403 / "You don't have access" error) */}
        {isAisDev && (
          <div className="mt-3.5 p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                PHONE CONNECTION TARGET:
              </span>
              <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full uppercase ${
                useSharedDomain && !customOrigin
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                  : "bg-amber-950 text-amber-400 border border-amber-500/40"
              }`}>
                {useSharedDomain && !customOrigin ? "PUBLIC (RECOMMENDED FOR PHONES)" : "DEV SANDBOX"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseSharedDomain(true);
                  setCustomOrigin("");
                }}
                className={`py-2 px-3 rounded-xl text-[11px] font-grotesk font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center text-center cursor-pointer border ${
                  useSharedDomain && !customOrigin
                    ? "bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500/40"
                    : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Public Shared App</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-400 mt-0.5 lowercase">ais-pre-*.run.app</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUseSharedDomain(false);
                  setCustomOrigin("");
                }}
                className={`py-2 px-3 rounded-xl text-[11px] font-grotesk font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center text-center cursor-pointer border ${
                  !useSharedDomain && !customOrigin
                    ? "bg-amber-950/70 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/40"
                    : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dev Sandbox</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-400 mt-0.5 lowercase">ais-dev-*.run.app</span>
              </button>
            </div>
          </div>
        )}

        {/* Dedicated Guide: Why Google Throws "You don't have access" & How to Fix */}
        <div className="mt-3 bg-gradient-to-r from-red-950/40 via-zinc-900/90 to-amber-950/30 border border-amber-500/40 rounded-2xl p-3.5 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Why does Google show "You don't have access" on your phone?</span>
          </div>
          <p className="text-zinc-300 text-[11px] leading-relaxed">
            Google AI Studio development containers (<code className="bg-black/60 px-1 py-0.5 rounded text-[10px] text-amber-300 font-mono">ais-dev-...</code>) are private and require your developer Google login. When an unauthenticated phone browser scans the link, Google Cloud blocks it.
          </p>
          <div className="space-y-1.5 text-[11px] text-zinc-200 pt-1.5 border-t border-zinc-800/80">
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-black">1.</span>
              <span><strong>Make Public:</strong> In the AI Studio top bar, click <strong>Share</strong> to publish your app. Once shared, anyone scanning the <strong>Public Shared App</strong> QR above can play without logging in!</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-amber-400 font-black">2.</span>
              <span><strong>Or Sign in on Phone:</strong> In Safari or Chrome on your phone, sign in to your developer Google account.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-sky-400 font-black">3.</span>
              <span><strong>Play on this PC Right Now:</strong> Click <strong>"Test Controller on PC"</strong> or <strong>"Open Controller in New Window"</strong> below — works immediately without needing a phone!</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-rose-400 font-black">4.</span>
              <span><strong>White Screen on Phone?</strong> If your phone displays a blank white screen with "Cookie check", mobile Safari/Chrome is blocking Google's third-party cookies. Switch to <strong>Dev Sandbox</strong> QR while signed in, or open the link directly in your browser.</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher: QR Code vs Text Code */}
        <div className="grid grid-cols-2 gap-2 mt-3.5 p-1.5 bg-zinc-900/90 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "qr"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md border border-red-400/40"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <QrIcon className="w-4 h-4" />
            <span>SCAN QR CODE</span>
          </button>

          <button
            onClick={() => setActiveTab("text")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "text"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md border border-red-400/40"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>ENTER TEXT CODE</span>
          </button>
        </div>

        {/* Tab 1: QR Code Scanner View */}
        {activeTab === "qr" && (
          <div className="py-4 flex flex-col items-center space-y-4">
            {/* QR Code Container with NES Bezel */}
            <div className="relative group p-3.5 bg-white rounded-2xl shadow-2xl border-4 border-zinc-300">
              {/* Corner accent marks */}
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-red-600" />
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-red-600" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-red-600" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-red-600" />

              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Scan QR Code to join room ${roomId}`}
                  className="w-52 h-52 sm:w-60 sm:h-60 block rounded-lg"
                />
              ) : (
                <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center text-zinc-600 font-mono text-xs">
                  Generating high-res QR...
                </div>
              )}
            </div>

            {/* Step-by-step guidance */}
            <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 text-xs text-zinc-300 space-y-1.5 font-grotesk">
              <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-[11px] tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>3 SIMPLE STEPS TO PLAY</span>
              </div>
              <p className="text-zinc-300">
                1. Open the <strong>Camera app</strong> on your iPhone or Android phone.
              </p>
              <p className="text-zinc-300">
                2. Point camera at the QR code and tap the yellow notification bubble.
              </p>
              <p className="text-zinc-300">
                3. Your phone instantly becomes a wireless tactile Nintendo gamepad!
              </p>
            </div>

            {/* Copy Direct Link Button */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 active:scale-[0.99] text-zinc-200 hover:text-white rounded-xl border border-zinc-750 text-xs font-grotesk font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">DIRECT CONTROLLER LINK COPIED!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-400" />
                  <span>COPY DIRECT PHONE LINK</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Text Code View */}
        {activeTab === "text" && (
          <div className="py-4 flex flex-col items-center space-y-4">
            {/* Big Room Text Code Showcase */}
            <div className="w-full bg-zinc-900/90 border-2 border-red-500/50 rounded-2xl p-4 text-center space-y-2 relative overflow-hidden shadow-inner">
              <span className="text-[11px] font-mono font-black text-zinc-400 uppercase tracking-widest block">
                GAME ROOM TEXT CODE
              </span>

              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl sm:text-4xl font-display font-black text-red-500 tracking-widest bg-black/60 px-6 py-2.5 rounded-xl border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                  {roomId}
                </div>

                <button
                  onClick={handleCopyCode}
                  className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all cursor-pointer active:scale-95 border border-red-400"
                  title="Copy Text Code"
                >
                  {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <div className="text-[11px] font-mono text-zinc-400">
                {codeCopied ? (
                  <span className="text-emerald-400 font-bold">Room Code copied to clipboard!</span>
                ) : (
                  <span>Click copy icon or type this code on your phone</span>
                )}
              </div>
            </div>

            {/* Manual Browser Instructions */}
            <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 space-y-2 text-xs font-grotesk">
              <div className="text-zinc-200 font-bold uppercase tracking-wider text-[11px]">
                HOW TO CONNECT VIA TEXT CODE:
              </div>
              <div className="space-y-1.5 text-zinc-300">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Open Safari or Chrome on your phone and go to: <strong className="text-amber-400 underline break-all">{baseSiteUrl}</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Enter Room Code <strong className="text-red-400 font-mono font-black">{roomId}</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>Connect</strong> and start playing!</span>
                </div>
              </div>
            </div>

            {/* Quick Switch / Join Specific Room Input */}
            <form onSubmit={handleManualJoin} className="w-full space-y-2">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                JOIN DIFFERENT ROOM ON THIS DEVICE:
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value)}
                  placeholder="Enter 4-6 digit room code..."
                  className="flex-1 bg-zinc-900 border border-zinc-750 focus:border-red-500 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white placeholder-zinc-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputRoomCode.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none text-white font-grotesk font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>CONNECT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Live Connected Players Status Slots */}
        <div className="mt-2 py-3 border-t border-b border-zinc-850">
          <div className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>LIVE PLAYER SLOTS</span>
            <span className="text-zinc-500">REAL-TIME WEBSOCKET</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Player 1 Slot */}
            <div
              className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                p1Status.connected
                  ? "bg-red-950/40 border-red-500 text-white shadow-lg shadow-red-950/30"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  p1Status.connected ? "bg-red-500 animate-pulse ring-2 ring-red-400/40" : "bg-zinc-700"
                }`}
              />
              <div className="min-w-0">
                <div className="font-display font-black text-xs uppercase tracking-wider">PLAYER 1</div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider truncate">
                  {p1Status.connected ? "READY (Slot 1 Assigned)" : "WAITING FOR PHONE..."}
                </div>
              </div>
            </div>

            {/* Player 2 Slot */}
            <div
              className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                p2Status.connected
                  ? "bg-blue-950/40 border-blue-500 text-white shadow-lg shadow-blue-950/30"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  p2Status.connected ? "bg-blue-500 animate-pulse ring-2 ring-blue-400/40" : "bg-zinc-700"
                }`}
              />
              <div className="min-w-0">
                <div className="font-display font-black text-xs uppercase tracking-wider">PLAYER 2</div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider truncate">
                  {p2Status.connected ? "READY (Slot 2 Assigned)" : "WAITING FOR PHONE..."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Quick Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                // Open clean smartphone-sized window
                const width = 420;
                const height = 820;
                const left = window.screen.width ? window.screen.width - width - 40 : 100;
                const top = 60;
                window.open(
                  controllerUrl,
                  `NESController_${roomId}`,
                  `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
                );
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl border border-zinc-750 text-xs font-grotesk font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
          >
            <ExternalLink className="w-4 h-4 text-sky-400" />
            <span>OPEN CONTROLLER IN PHONE WINDOW</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenSplitTest();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white rounded-xl text-xs font-display font-black uppercase tracking-wider shadow-xl transition-all cursor-pointer border border-red-400/60"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>TEST CONTROLLER ON PC (DUAL-SCREEN)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
