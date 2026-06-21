'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

// ============================================================
// usePlvtvsLogs — WebSocket hook for live activity logs
// Connects to the plvtvs-logs mini-service via the gateway.
// ============================================================

export interface PlvtvsLogEvent {
  id: string;
  sector: 'SOCIAL' | 'ECOM' | 'CRYPTO' | 'SYSTEM';
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  timestamp: string;
  source?: string;
}

interface PlvtvsStats {
  totalLogs: number;
  activeClients: number;
  sectors: Record<string, number>;
}

// Gateway routing: connect to '/' with XTransformPort=3030
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';
const WS_PORT = '3030';

export function usePlvtvsLogs(maxLogs = 50) {
  const [logs, setLogs] = useState<PlvtvsLogEvent[]>([]);
  const [stats, setStats] = useState<PlvtvsStats | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let socket: Socket;

    if (WS_URL) {
      // Production / external WS service
      socket = io(WS_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });
    } else {
      // Local dev via gateway with XTransformPort
      socket = io('/', {
        path: '/',
        query: { XTransformPort: WS_PORT },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });
    }
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[PLVTVS-LOGS] WebSocket connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.warn('[PLVTVS-LOGS] WebSocket disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[PLVTVS-LOGS] WS connect error (will retry):', err.message);
      setConnected(false);
    });

    socket.on('plvtvs:history', (data: { logs: PlvtvsLogEvent[] }) => {
      setLogs(data.logs.slice(-maxLogs));
    });

    socket.on('plvtvs:log', (log: PlvtvsLogEvent) => {
      setLogs((prev) => [...prev, log].slice(-maxLogs));
    });

    socket.on('plvtvs:stats', (s: PlvtvsStats) => {
      setStats(s);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [maxLogs]);

  const requestStats = useCallback(() => {
    socketRef.current?.emit('plvtvs:get-stats');
  }, []);

  return { logs, stats, connected, requestStats };
}
