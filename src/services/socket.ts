import { ControllerInputMessage, NesButton } from "../types";

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export class PartySocket {
  private ws: WebSocket | null = null;
  private roomId: string = "";
  private role: "host" | "controller" = "host";
  private slot: 1 | 2 | "spectator" = 1;
  private status: ConnectionStatus = "disconnected";
  private ping: number = 0;
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private shouldReconnect: boolean = false;
  private customWsUrl?: string;

  // Listeners
  private playerJoinedCbs: Set<(data: { slot: number; deviceName?: string }) => void> = new Set();
  private playerLeftCbs: Set<(data: { slot: number }) => void> = new Set();
  private inputCbs: Set<(msg: ControllerInputMessage) => void> = new Set();
  private statusCbs: Set<(status: ConnectionStatus) => void> = new Set();
  private pingCbs: Set<(ping: number) => void> = new Set();
  private assignedCbs: Set<(slot: 1 | 2 | "spectator") => void> = new Set();
  private hostStatusCbs: Set<(data: { hostConnected: boolean; roomId?: string }) => void> = new Set();
  private hostConnected: boolean = false;

  constructor(customWsUrl?: string) {
    this.customWsUrl = customWsUrl;
  }

  public getSlot(): 1 | 2 | "spectator" {
    return this.slot;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getPing(): number {
    return this.ping;
  }

  public isHostConnected(): boolean {
    return this.hostConnected;
  }

  public connectAsHost(roomId: string) {
    this.roomId = roomId.toUpperCase();
    this.role = "host";
    this.shouldReconnect = true;
    this.connect();
  }

  public connectAsController(roomId: string, requestedSlot?: 1 | 2) {
    this.roomId = roomId.toUpperCase();
    this.role = "controller";
    if (requestedSlot) this.slot = requestedSlot;
    this.shouldReconnect = true;
    this.connect();
  }

  private getSocketUrl(): string {
    if (this.customWsUrl) return this.customWsUrl;
    if (typeof window !== "undefined") {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.host}`;
    }
    return "ws://localhost:3000";
  }

  private connect() {
    if (typeof window === "undefined") return;
    this.cleanupSocket();

    this.setStatus("connecting");
    try {
      const url = this.getSocketUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus("connected");
        this.startPingLoop();

        if (this.role === "host") {
          this.send({
            type: "register-host",
            roomId: this.roomId,
          });
        } else {
          this.send({
            type: "join-controller",
            roomId: this.roomId,
            requestedSlot: this.slot,
            deviceName: navigator.userAgent.includes("iPhone")
              ? "iPhone"
              : navigator.userAgent.includes("Android")
              ? "Android"
              : "Mobile Controller",
          });
        }
      };

      this.ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error("[PartySocket] Parse error:", e);
        }
      };

      this.ws.onclose = () => {
        this.setStatus("disconnected");
        this.stopPingLoop();
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[PartySocket] Socket error:", err);
      };
    } catch (err) {
      console.error("[PartySocket] Connection error:", err);
      this.setStatus("disconnected");
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case "player-joined":
        this.playerJoinedCbs.forEach((cb) => cb(msg));
        break;

      case "player-left":
        this.playerLeftCbs.forEach((cb) => cb(msg));
        break;

      case "controller-input":
        this.inputCbs.forEach((cb) => cb(msg));
        break;

      case "assigned":
        if (msg.slot) {
          this.slot = msg.slot;
          this.assignedCbs.forEach((cb) => cb(msg.slot));
        }
        if (typeof msg.hostConnected === "boolean") {
          this.hostConnected = msg.hostConnected;
          this.hostStatusCbs.forEach((cb) => cb({ hostConnected: msg.hostConnected, roomId: msg.roomId }));
        }
        break;

      case "host-status":
        this.hostConnected = !!msg.hostConnected;
        if (msg.roomId) this.roomId = msg.roomId;
        this.hostStatusCbs.forEach((cb) => cb({ hostConnected: !!msg.hostConnected, roomId: msg.roomId }));
        break;

      case "pong":
        if (msg.clientTimestamp) {
          this.ping = Math.max(1, Date.now() - msg.clientTimestamp);
          this.pingCbs.forEach((cb) => cb(this.ping));
        }
        break;

      case "host-registered":
        if (msg.p1Connected) {
          this.playerJoinedCbs.forEach((cb) => cb({ slot: 1, deviceName: msg.p1Name }));
        }
        if (msg.p2Connected) {
          this.playerJoinedCbs.forEach((cb) => cb({ slot: 2, deviceName: msg.p2Name }));
        }
        break;
    }
  }

  public requestSlot(newSlot: 1 | 2) {
    this.slot = newSlot;
    this.send({
      type: "join-controller",
      roomId: this.roomId,
      requestedSlot: newSlot,
    });
  }

  public sendInput(button: NesButton, state: boolean) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.send({
      type: "input",
      roomId: this.roomId,
      button,
      state,
      slot: this.slot === "spectator" ? 1 : this.slot,
      timestamp: Date.now(),
    });
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusCbs.forEach((cb) => cb(status));
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: "ping",
          timestamp: Date.now(),
        });
      }
    }, 2000);
  }

  private stopPingLoop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, 2000);
  }

  public reconnect() {
    this.shouldReconnect = true;
    this.connect();
  }

  public disconnect() {
    this.shouldReconnect = false;
    this.stopPingLoop();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.cleanupSocket();
    this.setStatus("disconnected");
  }

  private cleanupSocket() {
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }

  // Listener subscriptions
  public onPlayerJoined(cb: (data: { slot: number; deviceName?: string }) => void) {
    this.playerJoinedCbs.add(cb);
    return () => this.playerJoinedCbs.delete(cb);
  }

  public onPlayerLeft(cb: (data: { slot: number }) => void) {
    this.playerLeftCbs.add(cb);
    return () => this.playerLeftCbs.delete(cb);
  }

  public onInput(cb: (msg: ControllerInputMessage) => void) {
    this.inputCbs.add(cb);
    return () => this.inputCbs.delete(cb);
  }

  public onStatusChange(cb: (status: ConnectionStatus) => void) {
    this.statusCbs.add(cb);
    return () => this.statusCbs.delete(cb);
  }

  public onPing(cb: (ping: number) => void) {
    this.pingCbs.add(cb);
    return () => this.pingCbs.delete(cb);
  }

  public onAssigned(cb: (slot: 1 | 2 | "spectator") => void) {
    this.assignedCbs.add(cb);
    return () => this.assignedCbs.delete(cb);
  }

  public onHostStatus(cb: (data: { hostConnected: boolean; roomId?: string }) => void) {
    this.hostStatusCbs.add(cb);
    return () => this.hostStatusCbs.delete(cb);
  }
}
