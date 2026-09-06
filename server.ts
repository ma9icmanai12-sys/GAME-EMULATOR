import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const server = http.createServer(app);

app.use(express.json());

// In-memory room manager for multiplayer
interface RoomState {
  hostWs: WebSocket | null;
  p1Ws: WebSocket | null;
  p2Ws: WebSocket | null;
  p1Name?: string;
  p2Name?: string;
  createdAt: number;
}

const rooms = new Map<string, RoomState>();

// Helper to decode HTML entities in scraped Google Drive names
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Helper to clean and format game title from ROM filename
function cleanRomTitle(rawName: string): { title: string; tags: string[] } {
  const decodedName = decodeHtmlEntities(rawName);
  const tags: string[] = [];
  let title = decodedName.replace(/\.nes$/i, "");

  // Extract bracketed/parenthesized tags like (U), [!], (E), etc.
  const tagMatches = title.match(/(\([^\)]+\)|\[[^\]]+\])/g);
  if (tagMatches) {
    tags.push(...tagMatches.map((t) => t.replace(/[\(\)\[\]]/g, "").trim()));
    title = title.replace(/(\([^\)]+\)|\[[^\]]+\])/g, "").trim();
  }

  // Handle ", The" at end
  if (title.endsWith(", The")) {
    title = "The " + title.slice(0, -5);
  }

  return { title: title.trim(), tags };
}

// In-memory cache for drive ROM lists to avoid hitting rate limits
let cachedDriveRoms: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours (keep all games cached)

// Try to pre-seed default catalog from masterGameLibrary.json or driveCatalog.json if available
try {
  const masterPath = path.join(process.cwd(), "src", "data", "masterGameLibrary.json");
  const catalogPath = path.join(process.cwd(), "src", "data", "driveCatalog.json");
  if (fs.existsSync(masterPath)) {
    const rawMaster = JSON.parse(fs.readFileSync(masterPath, "utf-8"));
    if (Array.isArray(rawMaster) && rawMaster.length > 0) {
      cachedDriveRoms = rawMaster;
      lastCacheTime = Date.now();
      console.log(`[Drive Cache] Pre-seeded ${cachedDriveRoms?.length} games with box art from masterGameLibrary.json`);
    }
  } else if (fs.existsSync(catalogPath)) {
    const rawCatalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
    if (Array.isArray(rawCatalog) && rawCatalog.length > 0) {
      cachedDriveRoms = rawCatalog.map((item: any) => {
        const { title, tags } = cleanRomTitle(item.rawName);
        return {
          id: item.id,
          rawName: item.rawName,
          title: item.title || title,
          tags,
          source: "google-drive",
          downloadUrl: `/api/proxy-rom?id=${encodeURIComponent(item.id)}`,
        };
      });
      lastCacheTime = Date.now();
      console.log(`[Drive Cache] Pre-seeded ${cachedDriveRoms?.length} ROMs from driveCatalog.json`);
    }
  }
} catch (err) {
  console.warn("[Drive Cache] Could not pre-seed catalog:", err);
}

// API: Fetch ALL ROMs from Google Drive folder
app.get("/api/drive-roms", async (req, res) => {
  const folderId =
    (req.query.folderId as string) || "1nXMaslAUGucUn8VMp89w-osvlDTt877-";

  // Check cache if default folder and already populated with all games
  if (
    folderId === "1nXMaslAUGucUn8VMp89w-osvlDTt877-" &&
    cachedDriveRoms &&
    cachedDriveRoms.length > 0 &&
    req.query.forceFresh !== "true"
  ) {
    return res.json({
      folderId,
      cached: true,
      count: cachedDriveRoms.length,
      roms: cachedDriveRoms,
    });
  }

  try {
    // Google Drive paginates at 50/100 items per view. Querying different sort orders
    // in parallel retrieves ALL files stored within the folder.
    const sortParams = [
      "",
      "?sort=13&direction=a",
      "?sort=14&direction=a",
      "?sort=11&direction=a",
      "?sort=19&direction=a",
      "?sort=1&direction=a",
      "?sort=3&direction=a",
    ];

    const romMap = new Map<string, { id: string; rawName: string }>();

    const parseDriveHtml = (html: string) => {
      // Pattern 1: Embedded ds:4 data items [[null, "FILE_ID"], ... [[["FILENAME.nes", ...
      const r1 = /\[\[null,"([a-zA-Z0-9_-]{25,40})"\][\s\S]*?\[\[\["([^"]+\.nes)"/g;
      let m;
      while ((m = r1.exec(html)) !== null) {
        if (!romMap.has(m[1])) {
          romMap.set(m[1], { id: m[1], rawName: decodeHtmlEntities(m[2]) });
        }
      }
      // Pattern 2: ssk data attributes in DOM aria-label="FILENAME.nes" ... ssk='...:FILE_ID-
      const r2 = /aria-label="([^"]+\.nes)[^"]*"[\s\S]*?ssk=[\x27"][^:]+:[^:]+:([a-zA-Z0-9_-]{25,40})/g;
      while ((m = r2.exec(html)) !== null) {
        if (!romMap.has(m[2])) {
          romMap.set(m[2], { id: m[2], rawName: decodeHtmlEntities(m[1]) });
        }
      }
      // Pattern 3: data-id in DOM
      const r3 = /aria-label="([^"]+\.nes)[^"]*"[\s\S]*?data-id="([a-zA-Z0-9_-]{25,40})"/g;
      while ((m = r3.exec(html)) !== null) {
        if (!romMap.has(m[2])) {
          romMap.set(m[2], { id: m[2], rawName: decodeHtmlEntities(m[1]) });
        }
      }
      // Pattern 4: direct JSON pair in script chunks
      const r4 = /\["([^"]+\.nes)"[^\]]*?"([a-zA-Z0-9_-]{25,40})"/g;
      while ((m = r4.exec(html)) !== null) {
        if (!romMap.has(m[2])) {
          romMap.set(m[2], { id: m[2], rawName: decodeHtmlEntities(m[1]) });
        }
      }
    };

    await Promise.all(
      sortParams.map(async (sortParam) => {
        try {
          const driveUrl = `https://drive.google.com/drive/folders/${folderId}${sortParam}`;
          const response = await fetch(driveUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });
          if (response.ok) {
            const html = await response.text();
            parseDriveHtml(html);
          }
        } catch (e) {
          console.warn(`[Drive Scraper] Failed to fetch sort param ${sortParam}:`, e);
        }
      })
    );

    let romList = Array.from(romMap.values()).map((item) => {
      const { title, tags } = cleanRomTitle(item.rawName);
      return {
        id: item.id,
        rawName: item.rawName,
        title,
        tags,
        source: "google-drive",
        downloadUrl: `/api/proxy-rom?id=${encodeURIComponent(item.id)}`,
      };
    });

    // If live scraping yielded fewer than our preloaded catalog, merge them so no game is missed
    if (folderId === "1nXMaslAUGucUn8VMp89w-osvlDTt877-" && cachedDriveRoms) {
      const existingIds = new Set(romList.map((r) => r.id));
      for (const pre of cachedDriveRoms) {
        if (!existingIds.has(pre.id)) {
          romList.push(pre);
          existingIds.add(pre.id);
        }
      }
    }

    // Sort alphabetically by title
    romList.sort((a, b) => a.title.localeCompare(b.title));

    if (romList.length > 0) {
      if (folderId === "1nXMaslAUGucUn8VMp89w-osvlDTt877-") {
        cachedDriveRoms = romList;
        lastCacheTime = Date.now();
      }

      return res.json({
        folderId,
        cached: false,
        count: romList.length,
        roms: romList,
      });
    }

    // If nothing found and we have cached, return cached
    if (cachedDriveRoms && cachedDriveRoms.length > 0) {
      return res.json({
        folderId,
        cached: true,
        stale: true,
        count: cachedDriveRoms.length,
        roms: cachedDriveRoms,
      });
    }

    res.status(404).json({
      error: "No .nes ROM files found in the specified Google Drive folder",
      count: 0,
      roms: [],
    });
  } catch (err: any) {
    console.error("Error scraping Google Drive folder:", err);
    // Return cached if available
    if (cachedDriveRoms && cachedDriveRoms.length > 0) {
      return res.json({
        folderId,
        cached: true,
        stale: true,
        count: cachedDriveRoms.length,
        roms: cachedDriveRoms,
        warning: "Served from cache due to fetch error",
      });
    }

    res.status(500).json({
      error: "Failed to load ROMs from Google Drive",
      details: err.message,
      roms: [],
    });
  }
});

// API: Proxy Google Drive ROM download to prevent CORS issues
app.get("/api/proxy-rom", async (req, res) => {
  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: "Missing 'id' parameter" });
  }

  try {
    const directUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
      id
    )}&export=download&authuser=0`;

    const driveRes = await fetch(directUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!driveRes.ok) {
      // Try fallback URL
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
        id
      )}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) {
        throw new Error(`Drive proxy failed with status ${driveRes.status}`);
      }

      const buffer = await fallbackRes.arrayBuffer();
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="game-${id}.nes"`
      );
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(Buffer.from(buffer));
    }

    const buffer = await driveRes.arrayBuffer();
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="game-${id}.nes"`
    );
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error(`Error downloading ROM ${id}:`, err);
    res.status(500).json({ error: "Failed to download ROM", details: err.message });
  }
});

// API: Proxy Google Drive Box Art image to prevent CORS or rate limit blocks
app.get("/api/proxy-art", async (req, res) => {
  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: "Missing 'id' parameter" });
  }

  try {
    const urls = [
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w600`,
      `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}`,
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
    ];

    for (const url of urls) {
      try {
        const artRes = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        if (artRes.ok) {
          const buf = await artRes.arrayBuffer();
          res.setHeader("Content-Type", artRes.headers.get("Content-Type") || "image/png");
          res.setHeader("Cache-Control", "public, max-age=604800"); // cache 7 days
          return res.send(Buffer.from(buf));
        }
      } catch (e) {}
    }

    res.status(404).json({ error: "Box art not found" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to proxy box art", details: err.message });
  }
});

// API: Proxy and Stream Google Drive Video Snaps with Range Request support
app.get("/api/proxy-video", async (req, res) => {
  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: "Missing 'id' parameter" });
  }

  try {
    const directUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&authuser=0`;
    const range = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    if (range) {
      fetchHeaders["Range"] = range;
    }

    let videoRes = await fetch(directUrl, { headers: fetchHeaders });
    if (!videoRes.ok) {
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
      videoRes = await fetch(fallbackUrl, { headers: fetchHeaders });
    }

    if (!videoRes.ok) {
      // If direct fetch fails, redirect directly to Google Drive content delivery URL
      return res.redirect(directUrl);
    }

    res.status(videoRes.status);
    const contentType = videoRes.headers.get("content-type") || "video/mp4";
    const contentLength = videoRes.headers.get("content-length");
    const contentRange = videoRes.headers.get("content-range");
    const acceptRanges = videoRes.headers.get("accept-ranges") || "bytes";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", acceptRanges);
    res.setHeader("Cache-Control", "public, max-age=604800");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    const buf = await videoRes.arrayBuffer();
    return res.send(Buffer.from(buf));
  } catch (err: any) {
    console.error(`Error streaming video snap ${id}:`, err);
    res.status(500).json({ error: "Failed to stream video clip", details: err.message });
  }
});

// API: Fetch video snaps catalog from Google Drive
app.get("/api/drive-videos", (req, res) => {
  try {
    const vPath = path.join(process.cwd(), "src", "data", "rawVideos.json");
    if (fs.existsSync(vPath)) {
      const vList = JSON.parse(fs.readFileSync(vPath, "utf-8"));
      return res.json({ count: vList.length, videos: vList });
    }
    return res.json({ count: 0, videos: [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Health and Room status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    activeRooms: rooms.size,
    timestamp: Date.now(),
  });
});

// WebSocket Server for Ultra Low-Latency Controller Sync
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket, req) => {
  let boundRoomId: string | null = null;
  let boundRole: "host" | "p1" | "p2" | "spectator" | null = null;

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      switch (data.type) {
        case "host-register": {
          const roomId = (data.roomId || "NES").toUpperCase();
          boundRoomId = roomId;
          boundRole = "host";

          let room = rooms.get(roomId);
          if (!room) {
            room = {
              hostWs: ws,
              p1Ws: null,
              p2Ws: null,
              createdAt: Date.now(),
            };
            rooms.set(roomId, room);
          } else {
            room.hostWs = ws;
          }

          ws.send(
            JSON.stringify({
              type: "host-registered",
              roomId,
              p1Connected: !!room.p1Ws,
              p2Connected: !!room.p2Ws,
              p1Name: room.p1Name,
              p2Name: room.p2Name,
            })
          );
          break;
        }

        case "join-controller": {
          const roomId = (data.roomId || "").toUpperCase();
          const deviceName = data.deviceName || "Player";
          boundRoomId = roomId;

          const room = rooms.get(roomId);
          if (!room) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: `Room "${roomId}" not found. Ensure the TV host is active!`,
              })
            );
            return;
          }

          let assignedSlot: 1 | 2 | "spectator" = "spectator";

          if (data.requestedSlot === 1 && !room.p1Ws) {
            room.p1Ws = ws;
            room.p1Name = deviceName;
            assignedSlot = 1;
            boundRole = "p1";
          } else if (data.requestedSlot === 2 && !room.p2Ws) {
            room.p2Ws = ws;
            room.p2Name = deviceName;
            assignedSlot = 2;
            boundRole = "p2";
          } else if (!room.p1Ws) {
            room.p1Ws = ws;
            room.p1Name = deviceName;
            assignedSlot = 1;
            boundRole = "p1";
          } else if (!room.p2Ws) {
            room.p2Ws = ws;
            room.p2Name = deviceName;
            assignedSlot = 2;
            boundRole = "p2";
          } else {
            boundRole = "spectator";
            assignedSlot = "spectator";
          }

          // Acknowledge controller
          ws.send(
            JSON.stringify({
              type: "assigned",
              roomId,
              slot: assignedSlot,
              deviceName,
            })
          );

          // Inform TV Host
          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(
              JSON.stringify({
                type: "player-joined",
                slot: assignedSlot,
                deviceName,
                p1Connected: !!room.p1Ws,
                p2Connected: !!room.p2Ws,
                p1Name: room.p1Name,
                p2Name: room.p2Name,
              })
            );
          }
          break;
        }

        case "input": {
          // Fast-path controller input dispatch to Host
          if (!boundRoomId) return;
          const room = rooms.get(boundRoomId);
          if (room && room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            // Forward input payload with origin verification
            const slot = boundRole === "p1" ? 1 : boundRole === "p2" ? 2 : data.slot;
            if (slot === 1 || slot === 2) {
              room.hostWs.send(
                JSON.stringify({
                  type: "controller-input",
                  slot,
                  button: data.button, // "A", "B", "UP", "DOWN", "LEFT", "RIGHT", "START", "SELECT", "TURBO_A", "TURBO_B"
                  state: !!data.state, // true = pressed, false = released
                  timestamp: data.timestamp || Date.now(),
                })
              );
            }
          }
          break;
        }

        case "host-command": {
          // Host commands (e.g. notify controllers of current game title or reset)
          if (boundRole === "host" && boundRoomId) {
            const room = rooms.get(boundRoomId);
            if (room) {
              const broadcastPayload = JSON.stringify(data);
              if (room.p1Ws && room.p1Ws.readyState === WebSocket.OPEN) {
                room.p1Ws.send(broadcastPayload);
              }
              if (room.p2Ws && room.p2Ws.readyState === WebSocket.OPEN) {
                room.p2Ws.send(broadcastPayload);
              }
            }
          }
          break;
        }

        case "ping": {
          // Latency measurement
          ws.send(
            JSON.stringify({
              type: "pong",
              clientTimestamp: data.timestamp,
              serverTimestamp: Date.now(),
            })
          );
          break;
        }
      }
    } catch (e) {
      console.error("WebSocket message parsing error:", e);
    }
  });

  ws.on("close", () => {
    if (boundRoomId) {
      const room = rooms.get(boundRoomId);
      if (room) {
        if (boundRole === "host") {
          room.hostWs = null;
          // Notify controllers host left
          const msg = JSON.stringify({ type: "host-disconnected" });
          if (room.p1Ws?.readyState === WebSocket.OPEN) room.p1Ws.send(msg);
          if (room.p2Ws?.readyState === WebSocket.OPEN) room.p2Ws.send(msg);
        } else if (boundRole === "p1") {
          room.p1Ws = null;
          room.p1Name = undefined;
          if (room.hostWs?.readyState === WebSocket.OPEN) {
            room.hostWs.send(
              JSON.stringify({
                type: "player-left",
                slot: 1,
                p1Connected: false,
                p2Connected: !!room.p2Ws,
              })
            );
          }
        } else if (boundRole === "p2") {
          room.p2Ws = null;
          room.p2Name = undefined;
          if (room.hostWs?.readyState === WebSocket.OPEN) {
            room.hostWs.send(
              JSON.stringify({
                type: "player-left",
                slot: 2,
                p1Connected: !!room.p1Ws,
                p2Connected: false,
              })
            );
          }
        }
      }
    }
  });
});

// Vite middleware or static serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[NES TV Party] Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
