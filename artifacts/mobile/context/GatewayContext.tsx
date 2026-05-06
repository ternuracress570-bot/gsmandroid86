import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface GatewayConfig {
  host: string;
  ariPort: string;
  ariUser: string;
  ariPassword: string;
  sipExtension: string;
  sipPassword: string;
  appName: string;
  useWss: boolean;
}

export interface ActiveCall {
  id: string;
  state: string;
  caller: string;
  callee: string;
  direction: "inbound" | "outbound";
  startTime: Date;
  duration: number;
}

export interface LogEntry {
  id: string;
  time: Date;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface GatewayContextType {
  config: GatewayConfig;
  updateConfig: (cfg: Partial<GatewayConfig>) => Promise<void>;
  status: ConnectionStatus;
  activeCalls: ActiveCall[];
  logs: LogEntry[];
  connect: () => void;
  disconnect: () => void;
  makeCall: (destination: string) => Promise<void>;
  hangupCall: (channelId: string) => Promise<void>;
  totalCalls: number;
  successCalls: number;
}

const DEFAULT_CONFIG: GatewayConfig = {
  host: "103.82.193.58",
  ariPort: "8088",
  ariUser: "asterisk",
  ariPassword: "asterisk",
  sipExtension: "100",
  sipPassword: "",
  appName: "gsm-gateway",
  useWss: false,
};

const STORAGE_KEY = "@gsm_gateway_config";
const MAX_LOGS = 200;

const GatewayContext = createContext<GatewayContextType | null>(null);

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GatewayConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [successCalls, setSuccessCalls] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const addLog = useCallback(
    (level: LogEntry["level"], message: string) => {
      const entry: LogEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        time: new Date(),
        level,
        message,
      };
      setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
    },
    []
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<GatewayConfig>;
          setConfig((prev) => ({ ...prev, ...saved }));
        } catch (_) {}
      }
    });
  }, []);

  useEffect(() => {
    durationTimer.current = setInterval(() => {
      setActiveCalls((prev) =>
        prev.map((c) => ({
          ...c,
          duration: Math.floor((Date.now() - c.startTime.getTime()) / 1000),
        }))
      );
    }, 1000);
    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current);
    };
  }, []);

  const updateConfig = useCallback(async (cfg: Partial<GatewayConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...cfg };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
    addLog("info", "Disconnected from Asterisk ARI");
  }, [addLog]);

  const connect = useCallback(() => {
    const cfg = configRef.current;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("connecting");
    addLog("info", `Connecting to ${cfg.host}:${cfg.ariPort}...`);

    const proto = cfg.useWss ? "wss" : "ws";
    const creds = btoa(`${cfg.ariUser}:${cfg.ariPassword}`);
    const url = `${proto}://${cfg.host}:${cfg.ariPort}/ari/events?api_key=${cfg.ariUser}:${cfg.ariPassword}&app=${cfg.appName}&subscribeAll=true`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      setStatus("error");
      addLog("error", `Failed to create WebSocket: ${String(e)}`);
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      addLog("success", "Connected to Asterisk ARI");
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string);
        handleAriEvent(data);
      } catch (_) {}
    };

    ws.onerror = () => {
      setStatus("error");
      addLog("error", "WebSocket error — check host/port/credentials");
    };

    ws.onclose = (evt) => {
      setStatus("error");
      addLog("warn", `Connection closed (${evt.code}). Retrying in 10s...`);
      reconnectTimer.current = setTimeout(() => {
        if (wsRef.current === ws) connect();
      }, 10000);
    };
  }, [addLog]);

  const handleAriEvent = useCallback(
    (data: Record<string, unknown>) => {
      const type = data.type as string;

      if (type === "ChannelCreated") {
        const ch = data.channel as Record<string, unknown>;
        const caller = (ch?.caller as Record<string, unknown>)?.number as string ?? "Unknown";
        const dialplan = (ch?.dialplan as Record<string, unknown>);
        const callee = (dialplan?.exten as string) ?? "";
        const dir: ActiveCall["direction"] =
          caller === configRef.current.sipExtension ? "outbound" : "inbound";
        const newCall: ActiveCall = {
          id: ch?.id as string,
          state: (ch?.state as string) ?? "Ring",
          caller,
          callee,
          direction: dir,
          startTime: new Date(),
          duration: 0,
        };
        setActiveCalls((prev) => {
          if (prev.find((c) => c.id === newCall.id)) return prev;
          return [...prev, newCall];
        });
        setTotalCalls((n) => n + 1);
        addLog(
          "info",
          `📞 New ${dir} call: ${caller} → ${callee || "?"}`
        );
      } else if (type === "ChannelStateChange") {
        const ch = data.channel as Record<string, unknown>;
        const id = ch?.id as string;
        const state = (ch?.state as string) ?? "";
        setActiveCalls((prev) =>
          prev.map((c) => (c.id === id ? { ...c, state } : c))
        );
        if (state === "Up") {
          setSuccessCalls((n) => n + 1);
          addLog("success", `Call ${id.slice(0, 8)} answered`);
        }
      } else if (type === "ChannelDestroyed") {
        const ch = data.channel as Record<string, unknown>;
        const id = ch?.id as string;
        setActiveCalls((prev) => prev.filter((c) => c.id !== id));
        addLog("info", `Call ended: ${id.slice(0, 8)}`);
      } else if (type === "ChannelHangupRequest") {
        addLog("info", `Hangup requested on channel`);
      }
    },
    [addLog]
  );

  const ariRequest = useCallback(
    async (method: string, path: string, body?: Record<string, unknown>) => {
      const cfg = configRef.current;
      const proto = cfg.useWss ? "https" : "http";
      const url = `${proto}://${cfg.host}:${cfg.ariPort}/ari${path}`;
      const creds = btoa(`${cfg.ariUser}:${cfg.ariPassword}`);
      const resp = await fetch(url, {
        method,
        headers: {
          Authorization: `Basic ${creds}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`ARI ${method} ${path} failed: ${resp.status} ${text}`);
      }
      return resp.json().catch(() => null);
    },
    []
  );

  const makeCall = useCallback(
    async (destination: string) => {
      const cfg = configRef.current;
      try {
        addLog("info", `Dialing ${destination}...`);
        await ariRequest("POST", "/channels", {
          endpoint: `PJSIP/${destination}`,
          app: cfg.appName,
          callerId: cfg.sipExtension,
        });
        addLog("success", `Call to ${destination} initiated`);
      } catch (e) {
        addLog("error", `Dial failed: ${String(e)}`);
        throw e;
      }
    },
    [ariRequest, addLog]
  );

  const hangupCall = useCallback(
    async (channelId: string) => {
      try {
        await ariRequest("DELETE", `/channels/${channelId}`);
        addLog("info", `Hung up channel ${channelId.slice(0, 8)}`);
      } catch (e) {
        addLog("error", `Hangup failed: ${String(e)}`);
      }
    },
    [ariRequest, addLog]
  );

  return (
    <GatewayContext.Provider
      value={{
        config,
        updateConfig,
        status,
        activeCalls,
        logs,
        connect,
        disconnect,
        makeCall,
        hangupCall,
        totalCalls,
        successCalls,
      }}
    >
      {children}
    </GatewayContext.Provider>
  );
}

export function useGateway() {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error("useGateway must be used inside GatewayProvider");
  return ctx;
}
