import { RomItem } from "../types";
import masterGames from "./masterGameLibrary.json";

// Raw JSON games typed as RomItem
export const ALL_DRIVE_ROMS: RomItem[] = (masterGames as any[]).map((g) => ({
  id: g.id || `rom-${Math.random().toString(36).slice(2, 9)}`,
  title: g.title || "Unknown Game",
  rawName: g.rawName || `${g.title || "Game"}.nes`,
  source: "google-drive" as const,
  downloadUrl: g.downloadUrl || `/api/proxy-rom?id=${encodeURIComponent(g.id)}`,
  tags: g.tags || [],
  genre: g.genre || "NES Classic",
  year: g.year || "1988",
  players: (g.players === 1 ? 1 : 2) as 1 | 2,
  description: g.description || `Authentic NES Classic from library: ${g.title}`,
  primaryColor: g.primaryColor || "#dc2626",
  secondaryColor: g.secondaryColor || "#1e1b4b",
  accentColor: g.accentColor || "#f59e0b",
  iconName: g.iconName,
  system: g.system || "nes",
  platform: g.platform || "Nintendo Entertainment System",
  developer: g.developer || "Nintendo",
  publisher: g.publisher || "Nintendo",
  releaseDate: g.releaseDate || g.year || "1988",
  coop: g.coop ?? (g.players === 2),
  posterUrl: g.posterUrl,
  boxArtUrl: g.boxArtUrl,
  boxArtThumbnail: g.boxArtThumbnail,
  boxArtFileName: g.boxArtFileName,
  videoId: g.videoId,
  videoUrl: g.videoUrl,
  videoDirectUrl: g.videoDirectUrl,
  videoThumbnail: g.videoThumbnail,
  videoFileName: g.videoFileName,
  logoUrl: g.logoUrl,
  screenshots: g.screenshots,
  versions: g.versions,
  isFavorite: g.isFavorite,
}));

// Curated top party and classic games for initial highlights
export const CURATED_DRIVE_ROMS: RomItem[] = ALL_DRIVE_ROMS.slice(0, 30);

/**
 * Creates a minimal valid iNES test ROM with a working 6502 test loop
 * Header:
 * 0-3: "NES\x1a"
 * 4: 1 (16KB PRG ROM)
 * 5: 1 (8KB CHR ROM)
 * 6: 0 (Mapper 0)
 * 7: 0
 * 8-15: 0
 */
export function createHomebrewTestRom(title: string): Uint8Array {
  const prgSize = 16 * 1024; // 16KB
  const chrSize = 8 * 1024;  // 8KB
  const totalSize = 16 + prgSize + chrSize;
  const rom = new Uint8Array(totalSize);

  // iNES Header (16 bytes)
  rom[0] = 0x4e; // 'N'
  rom[1] = 0x45; // 'E'
  rom[2] = 0x53; // 'S'
  rom[3] = 0x1a; // EOF
  rom[4] = 1;    // 1 x 16KB PRG ROM
  rom[5] = 1;    // 1 x 8KB CHR ROM
  rom[6] = 0x00; // Mapper 0, horizontal mirroring
  rom[7] = 0x00; // Mapper 0

  // Write simple 6502 code into PRG ROM
  // PRG starts at offset 16 in file, loaded at $C000 in NES CPU memory
  // Reset vector at $FFFC-$FFFD (offset 16 + 16384 - 4 = 16396)
  const prgOffset = 16;
  let codePtr = prgOffset;

  // SEI ($78) - Disable interrupts
  rom[codePtr++] = 0x78;
  // CLD ($D8) - Clear decimal mode
  rom[codePtr++] = 0xd8;
  // LDX #$FF ($A2 $FF)
  rom[codePtr++] = 0xa2;
  rom[codePtr++] = 0xff;
  // TXS ($9A) - Initialize stack pointer
  rom[codePtr++] = 0x9a;

  // Infinite loop: JMP $C005 (4C 05 C0)
  rom[codePtr++] = 0x4c;
  rom[codePtr++] = 0x05;
  rom[codePtr++] = 0xc0;

  // Fill in NMI vector ($FFFA-$FFFB -> $C000)
  const nmiVectorOffset = prgOffset + prgSize - 6;
  rom[nmiVectorOffset] = 0x00;
  rom[nmiVectorOffset + 1] = 0xc0;

  // Fill in Reset vector ($FFFC-$FFFD -> $C000)
  const resetVectorOffset = prgOffset + prgSize - 4;
  rom[resetVectorOffset] = 0x00;
  rom[resetVectorOffset + 1] = 0xc0;

  // Fill in IRQ/BRK vector ($FFFE-$FFFF -> $C000)
  const irqVectorOffset = prgOffset + prgSize - 2;
  rom[irqVectorOffset] = 0x00;
  rom[irqVectorOffset + 1] = 0xc0;

  // Fill some simple pattern data in CHR ROM so PPU has valid tiles
  const chrOffset = 16 + prgSize;
  for (let i = 0; i < chrSize; i++) {
    rom[chrOffset + i] = (i % 8 === 0 || i % 8 === 7) ? 0xff : 0x81;
  }

  return rom;
}
