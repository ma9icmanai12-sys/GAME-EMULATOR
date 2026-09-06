/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NesEngine } from "./services/emulator";
import { PartySocket } from "./services/socket";
import {
  RomItem,
  MenuLayoutOption,
  CrtShaderConfig,
  PlayerStatus,
  NesButton,
  AppMode,
} from "./types";
import { CURATED_DRIVE_ROMS, ALL_DRIVE_ROMS, createHomebrewTestRom } from "./data/defaultRoms";
import { CrtScreen } from "./components/crt/CrtScreen";
import { CartridgeShelfMenu } from "./components/menus/CartridgeShelfMenu";
import { ChannelSurferMenu } from "./components/menus/ChannelSurferMenu";
import { PowerGridMenu } from "./components/menus/PowerGridMenu";
import { LivingRoomMenu } from "./components/menus/LivingRoomMenu";
import { ArcadeFrontendMenu } from "./components/menus/ArcadeFrontendMenu";
import { LayoutSelectorModal } from "./components/menus/LayoutSelectorModal";
import { EmulatorView } from "./components/emulator/EmulatorView";
import { PhoneController } from "./components/controller/PhoneController";
import { QrCodeModal } from "./components/modals/QrCodeModal";
import { CrtSettingsModal } from "./components/modals/CrtSettingsModal";
import { RomUploadModal } from "./components/modals/RomUploadModal";
import { DocsModal } from "./components/modals/DocsModal";
import {
  Tv,
  Smartphone,
  QrCode,
  Sliders,
  Upload,
  BookOpen,
  LayoutGrid,
  Users,
  Gamepad2,
  Columns,
  RefreshCw,
} from "lucide-react";

// Generate clean random 4-letter alphanumeric room code
function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "NES-";
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getPersistentRoomId(initialParam?: string): string {
  if (initialParam) return initialParam.toUpperCase();
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("nes_party_tv_room");
      if (saved && saved.startsWith("NES-") && saved.length >= 7) {
        return saved;
      }
      const fresh = generateRoomId();
      localStorage.setItem("nes_party_tv_room", fresh);
      return fresh;
    } catch (e) {}
  }
  return generateRoomId();
}

export default function App() {
  // Detect URL mode and room params (supports both query search and hash parameters)
  const urlParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    const search = window.location.search;
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const combined = search ? `${search}&${hash}` : `?${hash}`;
    return new URLSearchParams(combined);
  }, []);

  const isMobileScreen = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }, []);

  const initialRoomParam = urlParams.get("room") || "";
  const isControllerParam =
    urlParams.get("mode") === "controller" ||
    urlParams.get("controller") === "1" ||
    urlParams.get("role") === "controller" ||
    (isMobileScreen && Boolean(initialRoomParam));

  const [roomId, setRoomId] = useState<string>(() => {
    return getPersistentRoomId(initialRoomParam);
  });

  const [appMode, setAppMode] = useState<AppMode>(
    isControllerParam ? "controller" : "tv"
  );

  const [liveSocket, setLiveSocket] = useState<PartySocket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentOrigin = window.location.origin;
    const currentWsUrl = currentOrigin.replace(/^http/i, "ws");
    try {
      localStorage.setItem("nes_party_ws_url", currentWsUrl);
    } catch (e) {}
  }, []);

  // Selected layout option (Flagship: ArcadeFrontend HyperSpin wheel)
  const [currentLayout, setCurrentLayout] = useState<MenuLayoutOption>("arcade-frontend");

  // CRT TV Casing settings (Clean screen display with authentic TV casing, zero screen GUI overlay)
  const [shaderConfig, setShaderConfig] = useState<CrtShaderConfig>({
    scanlines: false,
    scanlineIntensity: 0.2,
    curvature: false,
    bloom: false,
    staticNoise: false,
    noiseIntensity: 0.02,
    vignette: false,
    colorBleed: false,
    bezelStyle: "dark-monitor",
  });

  const [isPoweredOn, setIsPoweredOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentChannel, setCurrentChannel] = useState("CH 03");
  const [fps, setFps] = useState(60);

  // ROMs state - preloaded with all 366 games from Google Drive
  const [roms, setRoms] = useState<RomItem[]>(ALL_DRIVE_ROMS);
  const [selectedRom, setSelectedRom] = useState<RomItem | null>(ALL_DRIVE_ROMS[0] || null);
  const [activeRom, setActiveRom] = useState<RomItem | null>(null);
  const [isLoadingRom, setIsLoadingRom] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState("1nXMaslAUGucUn8VMp89w-osvlDTt877-");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Players status
  const [p1Status, setP1Status] = useState<PlayerStatus>({
    connected: false,
    lastActive: Date.now(),
    activeButtons: new Set(),
  });

  const [p2Status, setP2Status] = useState<PlayerStatus>({
    connected: false,
    lastActive: Date.now(),
    activeButtons: new Set(),
  });

  // Modals
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  // Single engine and socket instances
  const engineRef = useRef<NesEngine | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  // Keep activeRom, selectedRom, roms in stable refs so direct input handlers always have the freshest data
  const activeRomRef = useRef<RomItem | null>(null);
  activeRomRef.current = activeRom;

  const romsRef = useRef<RomItem[]>(roms);
  romsRef.current = roms;

  const selectedRomRef = useRef<RomItem | null>(selectedRom);
  selectedRomRef.current = selectedRom;

  const p1StatusRef = useRef<PlayerStatus>(p1Status);
  p1StatusRef.current = p1Status;

  const p2StatusRef = useRef<PlayerStatus>(p2Status);
  p2StatusRef.current = p2Status;

  const launchRomRef = useRef<(rom: RomItem) => Promise<void>>(() => Promise.resolve());
  const exitToMenuRef = useRef<() => void>(() => {});

  const exitToMenu = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setIsPaused(false);
    setActiveRom(null);
    setP1Status((prev) => ({ ...prev, activeButtons: new Set() }));
    setP2Status((prev) => ({ ...prev, activeButtons: new Set() }));
  }, []);
  exitToMenuRef.current = exitToMenu;

  // Unified controller input handler for both real phone WebSockets and PC on-screen test controller
  const handleDirectInput = useCallback((slot: 1 | 2 | any, button: NesButton, state: boolean) => {
    const targetSlot = (slot === 2 || slot === "2") ? 2 : 1;
    const normBtn = (button ? String(button).toUpperCase() : "") as NesButton;

    if (activeRomRef.current && state) {
      const activeButtons = targetSlot === 1 ? p1StatusRef.current.activeButtons : p2StatusRef.current.activeButtons;
      const isMenuCombo =
        (normBtn === "SELECT" && activeButtons.has("START")) ||
        (normBtn === "START" && activeButtons.has("SELECT"));

      if (isMenuCombo) {
        exitToMenuRef.current();
        return;
      }
    }

    // 1. Update UI active buttons indicator
    if (targetSlot === 1) {
      setP1Status((prev) => {
        const btns = new Set(prev.activeButtons);
        if (state) btns.add(normBtn);
        else btns.delete(normBtn);
        return { ...prev, connected: true, activeButtons: btns, lastActive: Date.now() };
      });
    } else {
      setP2Status((prev) => {
        const btns = new Set(prev.activeButtons);
        if (state) btns.add(normBtn);
        else btns.delete(normBtn);
        return { ...prev, connected: true, activeButtons: btns, lastActive: Date.now() };
      });
    }

    // 2. Unmute & resume Web Audio on player interaction
    if (engineRef.current) {
      engineRef.current.getAudio()?.resume();
    }

    // 3. Forward to active NES Engine if a game is loaded
    if (activeRomRef.current && engineRef.current) {
      if (state) {
        engineRef.current.buttonDown(targetSlot, normBtn);
        // If player 2 controller is used in single player games, also mirror to player 1
        if (targetSlot === 2 && !p1Status.connected) {
          engineRef.current.buttonDown(1, normBtn);
        }
      } else {
        engineRef.current.buttonUp(targetSlot, normBtn);
        if (targetSlot === 2 && !p1Status.connected) {
          engineRef.current.buttonUp(1, normBtn);
        }
      }
    }

    // 4. If in menu (no active game), directly navigate and launch games
    if (!activeRomRef.current) {
      if (state) {
        const list = romsRef.current;
        const currentSel = selectedRomRef.current || list[0];
        const curIdx = list.findIndex((r) => r.id === currentSel?.id);

        if (normBtn === "DOWN" || normBtn === "RIGHT") {
          if (list.length > 0) {
            const nextIdx = (curIdx + 1 + list.length) % list.length;
            setSelectedRom(list[nextIdx]);
          }
        } else if (normBtn === "UP" || normBtn === "LEFT") {
          if (list.length > 0) {
            const prevIdx = (curIdx - 1 + list.length) % list.length;
            setSelectedRom(list[prevIdx]);
          }
        } else if (normBtn === "A" || normBtn === "START") {
          if (currentSel) {
            launchRomRef.current(currentSel);
          }
        } else if (normBtn === "B") {
          setShowLayoutModal(false);
          setShowQrModal(false);
          setShowSettingsModal(false);
          setShowUploadModal(false);
          setShowDocsModal(false);
        }
      }

      // Also dispatch standard KeyboardEvents for custom frontend wheels/overlays
      const keyMap: Record<string, { key: string; code: string; keyCode: number }> = {
        UP: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
        DOWN: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
        LEFT: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
        RIGHT: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
        A: { key: "Enter", code: "Enter", keyCode: 13 },
        START: { key: "Enter", code: "Enter", keyCode: 13 },
        B: { key: "Escape", code: "Escape", keyCode: 27 },
        SELECT: { key: "i", code: "KeyI", keyCode: 73 },
        TURBO_A: { key: "Enter", code: "Enter", keyCode: 13 },
        TURBO_B: { key: "Escape", code: "Escape", keyCode: 27 },
      };

      const mapped = keyMap[normBtn];
      if (mapped) {
        const eventType = state ? "keydown" : "keyup";
        const evt = new KeyboardEvent(eventType, {
          key: mapped.key,
          code: mapped.code,
          keyCode: mapped.keyCode,
          which: mapped.keyCode,
          bubbles: true,
          cancelable: true,
        });
        window.dispatchEvent(evt);
      }
    }
  }, [p1Status.connected]);

  const handleDirectInputRef = useRef(handleDirectInput);
  handleDirectInputRef.current = handleDirectInput;

  // Initialize Engine & Socket
  useEffect(() => {
    let engine: NesEngine | null = null;
    if (appMode !== "controller") {
      engine = new NesEngine({
        onFpsChange: (val) => setFps(val),
        onError: (err) => console.error("NES Engine error:", err),
      });
      engineRef.current = engine;
    }

    const socket = new PartySocket();
    socketRef.current = socket;
    setLiveSocket(socket);

    if (appMode !== "controller") {
      // Host Registration
      socket.connectAsHost(roomId);
    } else {
      // Controller Registration
      socket.connectAsController(roomId);
    }

    // Socket listeners for Host
    socket.onPlayerJoined((data) => {
      if (data.slot === 1) {
        setP1Status((prev) => ({ ...prev, connected: true, name: data.deviceName }));
      } else if (data.slot === 2) {
        setP2Status((prev) => ({ ...prev, connected: true, name: data.deviceName }));
      }
    });

    socket.onPlayerLeft((data) => {
      if (data.slot === 1) {
        setP1Status((prev) => ({ ...prev, connected: false }));
      } else if (data.slot === 2) {
        setP2Status((prev) => ({ ...prev, connected: false }));
      }
    });

    socket.onInput((msg) => {
      const slot = (msg.slot === 2 || (msg as any).slot === "2") ? 2 : 1;
      const btn = (msg.button || "").toUpperCase() as NesButton;
      handleDirectInputRef.current(slot, btn, !!msg.state);
    });

    return () => {
      if (engine) engine.destroy();
      socket.disconnect();
    };
  }, [roomId, appMode]);

  // Fetch Google Drive folder ROMs dynamically on mount
  useEffect(() => {
    async function loadDriveRoms(folderId: string) {
      try {
        setFetchError(null);
        const res = await fetch(`/api/drive-roms?folderId=${encodeURIComponent(folderId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.roms && data.roms.length > 0) {
          // Merge with master catalog to preserve rich box art, video snaps, and metadata
          const merged: RomItem[] = data.roms.map((d: any) => {
            const curated = ALL_DRIVE_ROMS.find(
              (c) => c.id === d.id || c.title.toLowerCase() === d.title.toLowerCase()
            );
            return {
              ...curated,
              ...d,
              boxArtUrl: d.boxArtUrl || curated?.boxArtUrl,
              boxArtThumbnail: d.boxArtThumbnail || curated?.boxArtThumbnail,
              boxArtFileName: d.boxArtFileName || curated?.boxArtFileName,
              videoId: d.videoId || curated?.videoId,
              videoUrl: d.videoUrl || curated?.videoUrl,
              videoDirectUrl: d.videoDirectUrl || curated?.videoDirectUrl,
              videoThumbnail: d.videoThumbnail || curated?.videoThumbnail,
              videoFileName: d.videoFileName || curated?.videoFileName,
              genre: d.genre || curated?.genre || "NES Classic",
              year: d.year || curated?.year || "1988",
              players: d.players || curated?.players || 2,
              description: d.description || curated?.description || `Authentic ROM from Google Drive: ${d.rawName}`,
              primaryColor: d.primaryColor || curated?.primaryColor || "#dc2626",
              secondaryColor: d.secondaryColor || curated?.secondaryColor || "#1e1b4b",
              accentColor: d.accentColor || curated?.accentColor || "#f59e0b",
            };
          });

          // Ensure ALL games from ALL_DRIVE_ROMS are present so no game is missed
          const existingIds = new Set(merged.map((m) => m.id));
          for (const c of ALL_DRIVE_ROMS) {
            if (!existingIds.has(c.id)) {
              merged.push(c);
            }
          }

          setRoms(merged);
          if (merged.length > 0 && !selectedRom) {
            setSelectedRom(merged[0]);
          }
        }
      } catch (e: any) {
        console.warn("Drive fetch notice:", e);
        setFetchError("Google Drive dynamic fetch notice: using built-in catalog.");
      }
    }

    loadDriveRoms(driveFolderId);
  }, [driveFolderId]);

  // Keyboard controls for PC testing (Player 1)
  useEffect(() => {
    if (appMode === "controller") return;

    const keyMap: Record<string, NesButton> = {
      ArrowUp: "UP",
      ArrowDown: "DOWN",
      ArrowLeft: "LEFT",
      ArrowRight: "RIGHT",
      KeyW: "UP",
      KeyS: "DOWN",
      KeyA: "LEFT",
      KeyD: "RIGHT",
      KeyZ: "B",
      KeyX: "A",
      KeyJ: "B",
      KeyK: "A",
      Enter: "START",
      ShiftRight: "SELECT",
      ShiftLeft: "SELECT",
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const btn = keyMap[e.code];
      if (btn && engineRef.current) {
        engineRef.current.buttonDown(1, btn);
        setP1Status((prev) => {
          const next = new Set(prev.activeButtons);
          next.add(btn);
          return { ...prev, activeButtons: next, lastActive: Date.now() };
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const btn = keyMap[e.code];
      if (btn && engineRef.current) {
        engineRef.current.buttonUp(1, btn);
        setP1Status((prev) => {
          const next = new Set(prev.activeButtons);
          next.delete(btn);
          return { ...prev, activeButtons: next };
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [appMode]);

  // Launch a selected ROM
  const launchRom = async (rom: RomItem) => {
    if (!engineRef.current) return;
    setIsLoadingRom(true);

    try {
      if (rom.source === "builtin") {
        const demoData = createHomebrewTestRom(rom.title);
        await engineRef.current.loadRom(demoData);
      } else if (rom.downloadUrl) {
        const res = await fetch(rom.downloadUrl);
        if (!res.ok) throw new Error(`Download failed with status ${res.status}`);
        const buffer = await res.arrayBuffer();
        await engineRef.current.loadRom(buffer);
      } else if (rom.id) {
        const proxyUrl = `/api/proxy-rom?id=${encodeURIComponent(rom.id)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Download failed with status ${res.status}`);
        const buffer = await res.arrayBuffer();
        await engineRef.current.loadRom(buffer);
      }

      setActiveRom(rom);
      setCurrentChannel(`CH ${String((roms.findIndex((r) => r.id === rom.id) % 99) + 3).padStart(2, "0")}`);
    } catch (err: any) {
      console.error("Failed to load ROM:", err);
      // If download fails, load interactive party test ROM
      const demoData = createHomebrewTestRom(rom.title);
      await engineRef.current.loadRom(demoData);
      setActiveRom(rom);
    } finally {
      setIsLoadingRom(false);
    }
  };
  launchRomRef.current = launchRom;

  useEffect(() => {
    if (!activeRom) return;

    const handleKeyboardExit = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Backspace") {
        event.preventDefault();
        exitToMenuRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyboardExit);
    return () => window.removeEventListener("keydown", handleKeyboardExit);
  }, [activeRom]);

  const handleCustomRomLoad = async (rom: RomItem, data: Uint8Array) => {
    if (!engineRef.current) return;
    setIsLoadingRom(true);
    try {
      await engineRef.current.loadRom(data);
      setRoms((prev) => [rom, ...prev]);
      setSelectedRom(rom);
      setActiveRom(rom);
    } finally {
      setIsLoadingRom(false);
    }
  };

  // If in pure Phone Controller Mode, render full-screen controller immediately
  if (appMode === "controller") {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-[#0a0a0c] text-white overflow-hidden select-none">
        <PhoneController
          socket={liveSocket || socketRef.current || undefined}
          roomId={roomId}
          onExit={() => setAppMode("tv")}
        />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#050408] text-zinc-100 flex flex-col p-0 m-0 overflow-hidden select-none font-sans">
      {appMode === "split-test" ? (
        /* Dual Split View: TV on Left, Phone Controller Simulator on Right */
        <div className="w-full h-full p-2 sm:p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-[#0d0714] shadow-2xl flex flex-col overflow-hidden relative">
            {activeRom && engineRef.current ? (
              <EmulatorView
                engine={engineRef.current}
                activeRom={activeRom}
                p1Status={p1Status}
                p2Status={p2Status}
                onExitToMenu={exitToMenu}
                fps={fps}
                onOpenQrModal={() => setShowQrModal(true)}
              />
            ) : (
              renderCurrentMenuLayout()
            )}
          </div>

          <div className="lg:col-span-4 bg-zinc-950 rounded-2xl border border-zinc-800 p-4 flex flex-col shadow-2xl justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-red-500" />
                <span className="font-grotesk font-black text-xs text-white uppercase tracking-wider">PHONE TEST DECK</span>
              </div>
              <button
                onClick={() => setAppMode("tv")}
                className="text-xs text-zinc-400 hover:text-white font-grotesk font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                EXIT SPLIT
              </button>
            </div>

            <div className="flex-1 mt-2 rounded-xl overflow-hidden border border-zinc-800 bg-black">
              {socketRef.current && (
                <PhoneController
                  socket={socketRef.current}
                  roomId={roomId}
                  initialSlot={1}
                  onDirectInput={handleDirectInput}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Full-Screen Edge-to-Edge Display Filling 100% of Screen Space */
        <div className="w-full h-full bg-[#0d0714] flex flex-col overflow-hidden relative">
          {activeRom && engineRef.current ? (
            <EmulatorView
              engine={engineRef.current}
              activeRom={activeRom}
              p1Status={p1Status}
              p2Status={p2Status}
              onExitToMenu={exitToMenu}
              fps={fps}
              onOpenQrModal={() => setShowQrModal(true)}
            />
          ) : (
            renderCurrentMenuLayout()
          )}
        </div>
      )}


      {/* Layout Selection Modal */}
      {showLayoutModal && (
        <LayoutSelectorModal
          currentLayout={currentLayout}
          onSelectLayout={(layout) => {
            setCurrentLayout(layout);
            setShowLayoutModal(false);
          }}
          onClose={() => setShowLayoutModal(false)}
        />
      )}

      {/* QR Code & Text Code Connect Phone Modal */}
      {showQrModal && (
        <QrCodeModal
          roomId={roomId}
          p1Status={p1Status}
          p2Status={p2Status}
          onClose={() => setShowQrModal(false)}
          onOpenSplitTest={() => {
            setAppMode("split-test");
            setShowQrModal(false);
          }}
          onJoinCustomRoom={(targetCode) => {
            setRoomId(targetCode);
            setAppMode("split-test");
            setShowQrModal(false);
          }}
        />
      )}

      {/* CRT Display & Shader Settings Modal */}
      {showSettingsModal && (
        <CrtSettingsModal
          config={shaderConfig}
          onUpdate={(cfg) => setShaderConfig((prev) => ({ ...prev, ...cfg }))}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Custom ROM Upload & Drive Sync Modal */}
      {showUploadModal && (
        <RomUploadModal
          currentFolderId={driveFolderId}
          onRefreshDriveFolder={(folderId) => setDriveFolderId(folderId)}
          onLoadCustomRom={handleCustomRomLoad}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* System Docs & Architecture Modal */}
      {showDocsModal && (
        <DocsModal onClose={() => setShowDocsModal(false)} />
      )}
    </div>
  );

  // Helper to render the active menu layout option inside CRT
  function renderCurrentMenuLayout() {
    switch (currentLayout) {
      case "arcade-frontend":
        return (
          <ArcadeFrontendMenu
            roms={roms}
            selectedRom={selectedRom}
            onSelectRom={setSelectedRom}
            onLaunchRom={launchRom}
            isLoading={isLoadingRom}
            roomId={roomId}
            onOpenQrModal={() => setShowQrModal(true)}
            onOpenUploadModal={() => setShowUploadModal(true)}
            onOpenDocsModal={() => setShowDocsModal(true)}
            onOpenLayoutModal={() => setShowLayoutModal(true)}
            onToggleSplitTest={() => setAppMode(appMode === "split-test" ? "tv" : "split-test")}
            audioEngine={engineRef.current?.getAudio()}
          />
        );
      case "cartridge-shelf":
        return (
          <CartridgeShelfMenu
            roms={roms}
            selectedRom={selectedRom}
            onSelectRom={setSelectedRom}
            onLaunchRom={launchRom}
            isLoading={isLoadingRom}
          />
        );
      case "channel-surfer":
        return (
          <ChannelSurferMenu
            roms={roms}
            selectedRom={selectedRom}
            onSelectRom={setSelectedRom}
            onLaunchRom={launchRom}
            isLoading={isLoadingRom}
          />
        );
      case "power-grid":
        return (
          <PowerGridMenu
            roms={roms}
            selectedRom={selectedRom}
            onSelectRom={setSelectedRom}
            onLaunchRom={launchRom}
            isLoading={isLoadingRom}
            roomId={roomId}
            onOpenQrModal={() => setShowQrModal(true)}
            onOpenUploadModal={() => setShowUploadModal(true)}
            onOpenDocsModal={() => setShowDocsModal(true)}
            onOpenLayoutModal={() => setShowLayoutModal(true)}
            onToggleSplitTest={() => setAppMode(appMode === "split-test" ? "tv" : "split-test")}
          />
        );
      case "living-room":
        return (
          <LivingRoomMenu
            roms={roms}
            selectedRom={selectedRom}
            onSelectRom={setSelectedRom}
            onLaunchRom={launchRom}
            isLoading={isLoadingRom}
          />
        );
      default:
        return (
          <ArcadeFrontendMenu
            roms={roms}
            selectedRom={selectedRom}
            onSelectRom={setSelectedRom}
            onLaunchRom={launchRom}
            isLoading={isLoadingRom}
            roomId={roomId}
            onOpenQrModal={() => setShowQrModal(true)}
            onOpenUploadModal={() => setShowUploadModal(true)}
            onOpenDocsModal={() => setShowDocsModal(true)}
            onOpenLayoutModal={() => setShowLayoutModal(true)}
            onToggleSplitTest={() => setAppMode(appMode === "split-test" ? "tv" : "split-test")}
            audioEngine={engineRef.current?.getAudio()}
          />
        );
    }
  }
}
