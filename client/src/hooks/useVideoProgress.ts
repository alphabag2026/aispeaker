import { useEffect, useRef, useState, useCallback } from "react";

interface VideoProgressData {
  phase: string;
  progress: number;
  step: string;
  status?: string;
  videoUrl?: string;
  errorMessage?: string;
}

/**
 * WebSocket hook for real-time video generation progress.
 * Falls back to polling if WebSocket is unavailable.
 */
export function useVideoProgress(projectId: number | null, enabled: boolean) {
  const [data, setData] = useState<VideoProgressData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!projectId || !enabled) return;

    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/video-progress`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "subscribe", projectId }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "progress" && msg.projectId === projectId) {
            setData({
              phase: msg.phase,
              progress: msg.progress,
              step: msg.step,
              status: msg.status,
              videoUrl: msg.videoUrl,
              errorMessage: msg.errorMessage,
            });
          }
        } catch (err) {
          console.error("[useVideoProgress] Parse error:", err);
        }
      };

      ws.onclose = () => {
        // Attempt reconnect after 3 seconds if still enabled
        if (enabled) {
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error("[useVideoProgress] WebSocket error:", err);
        ws.close();
      };
    } catch (err) {
      console.error("[useVideoProgress] Failed to create WebSocket:", err);
    }
  }, [projectId, enabled]);

  useEffect(() => {
    if (enabled && projectId) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect, enabled, projectId]);

  // Reset data when disabled
  useEffect(() => {
    if (!enabled) {
      setData(null);
    }
  }, [enabled]);

  return data;
}
