import React, { useState, useRef } from "react";
import { RomItem } from "../../types";
import { X, Upload, FolderSync, FileCheck, AlertCircle, HardDrive } from "lucide-react";

interface RomUploadModalProps {
  currentFolderId: string;
  onRefreshDriveFolder: (folderId: string) => void;
  onLoadCustomRom: (rom: RomItem, data: Uint8Array) => void;
  onClose: () => void;
}

export const RomUploadModal: React.FC<RomUploadModalProps> = ({
  currentFolderId,
  onRefreshDriveFolder,
  onLoadCustomRom,
  onClose,
}) => {
  const [folderIdInput, setFolderIdInput] = useState(currentFolderId);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderIdInput.trim()) {
      onRefreshDriveFolder(folderIdInput.trim());
      onClose();
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".nes")) {
      setUploadError("Please upload a valid .nes ROM file.");
      return;
    }
    setUploadError(null);
    setSelectedFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Verify iNES header
      if (
        uint8.length < 16 ||
        uint8[0] !== 0x4e ||
        uint8[1] !== 0x45 ||
        uint8[2] !== 0x53 ||
        uint8[3] !== 0x1a
      ) {
        setUploadError("The selected file is not a valid iNES format ROM.");
        return;
      }

      const cleanTitle = file.name
        .replace(/\.nes$/i, "")
        .replace(/\([^\)]+\)|\[[^\]]+\]/g, "")
        .trim();

      const customRom: RomItem = {
        id: `custom-${Date.now()}`,
        title: cleanTitle || file.name,
        rawName: file.name,
        source: "upload",
        genre: "Custom ROM",
        year: new Date().getFullYear().toString(),
        players: 2,
        description: `Custom user-uploaded ROM: ${file.name}`,
        primaryColor: "#059669",
        secondaryColor: "#064e3b",
        accentColor: "#34d399",
      };

      onLoadCustomRom(customRom, uint8);
      onClose();
    } catch (err: any) {
      setUploadError(`Failed to read ROM: ${err.message || err}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono">
                ROM MANAGER & DRIVE SYNC
              </h2>
              <p className="text-xs text-zinc-400">Load local .nes files or sync custom Google Drive folders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* File Upload Drop Zone */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2 font-mono">
              LOAD LOCAL .NES ROM
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                dragOver
                  ? "border-emerald-500 bg-emerald-950/20"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".nes"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-200">
                  {selectedFileName ? selectedFileName : "Click or drag & drop .nes ROM here"}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Supports standard iNES headered ROMs (up to 4MB)
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-800/60 p-2.5 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Google Drive Sync */}
          <div className="pt-4 border-t border-zinc-800/80">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2 font-mono">
              SYNC CUSTOM GOOGLE DRIVE FOLDER
            </label>
            <form onSubmit={handleFolderSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderIdInput}
                  onChange={(e) => setFolderIdInput(e.target.value)}
                  placeholder="e.g. 1nXMaslAUGucUn8VMp89w-osvlDTt877-"
                  className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <FolderSync className="w-4 h-4" />
                  <span>SYNC</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Paste any publicly shared Google Drive folder containing .nes files to scrape and play
                directly on your TV screen.
              </p>
            </form>
          </div>
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
