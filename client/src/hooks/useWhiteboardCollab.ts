import { useState, useEffect, useRef, useCallback } from "react";

interface Participant {
  id: number;
  userId: number;
  name: string;
  color: string;
}

interface CursorPosition {
  userId: number;
  userName: string;
  color: string;
  x: number;
  y: number;
}

interface CollabStroke {
  id: string;
  tool: "pen" | "eraser";
  points: { x: number; y: number; t: number }[];
  color: string;
  width: number;
}

interface CollabTextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  width?: number;
}

interface CollabShapeElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  fill: boolean;
}

export interface CollabCallbacks {
  onRemoteDraw?: (stroke: CollabStroke) => void;
  onRemoteAddText?: (textElement: CollabTextElement) => void;
  onRemoteAddShape?: (shapeElement: CollabShapeElement) => void;
  onRemoteErase?: (elementId: string) => void;
  onRemoteUndo?: (userId: number) => void;
  onRemoteClearAll?: () => void;
  onSyncState?: (whiteboardData: any) => void;
}

export function useWhiteboardCollab(callbacks: CollabCallbacks) {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cursors, setCursors] = useState<Map<number, CursorPosition>>(new Map());
  const [myColor, setMyColor] = useState("#FF4444");
  const [myParticipantId, setMyParticipantId] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const connect = useCallback((sessionCode: string, userId: number, userName: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/whiteboard`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", sessionCode, userId, userName }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "joined":
            setIsConnected(true);
            setMyColor(msg.cursorColor);
            setMyParticipantId(msg.participantId);
            setParticipants(msg.participants || []);
            break;

          case "participant_joined":
            setParticipants(prev => [...prev, msg.participant]);
            break;

          case "participant_left":
            setParticipants(prev => prev.filter(p => p.id !== msg.participantId));
            setCursors(prev => {
              const next = new Map(prev);
              next.delete(msg.userId);
              return next;
            });
            break;

          case "draw":
            callbacksRef.current.onRemoteDraw?.(msg.stroke);
            break;

          case "add_text":
            callbacksRef.current.onRemoteAddText?.(msg.textElement);
            break;

          case "add_shape":
            callbacksRef.current.onRemoteAddShape?.(msg.shapeElement);
            break;

          case "cursor":
            setCursors(prev => {
              const next = new Map(prev);
              next.set(msg.userId, {
                userId: msg.userId,
                userName: msg.userName,
                color: msg.color,
                x: msg.x,
                y: msg.y,
              });
              return next;
            });
            break;

          case "erase":
            callbacksRef.current.onRemoteErase?.(msg.elementId);
            break;

          case "undo":
            callbacksRef.current.onRemoteUndo?.(msg.userId);
            break;

          case "clear_all":
            callbacksRef.current.onRemoteClearAll?.();
            break;

          case "sync_state":
            callbacksRef.current.onSyncState?.(msg.whiteboardData);
            break;

          case "error":
            console.error("[WS Collab] Error:", msg.message);
            break;
        }
      } catch (err) {
        console.error("[WS Collab] Parse error:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setParticipants([]);
      setCursors(new Map());
    };

    ws.onerror = (err) => {
      console.error("[WS Collab] Connection error:", err);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setParticipants([]);
    setCursors(new Map());
  }, []);

  const sendDraw = useCallback((stroke: CollabStroke) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "draw", stroke }));
    }
  }, []);

  const sendAddText = useCallback((textElement: CollabTextElement) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "add_text", textElement }));
    }
  }, []);

  const sendAddShape = useCallback((shapeElement: CollabShapeElement) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "add_shape", shapeElement }));
    }
  }, []);

  const sendCursor = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cursor", x, y }));
    }
  }, []);

  const sendErase = useCallback((elementId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "erase", elementId }));
    }
  }, []);

  const sendUndo = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "undo" }));
    }
  }, []);

  const sendClearAll = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "clear_all" }));
    }
  }, []);

  const sendSyncState = useCallback((whiteboardData: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "sync_state", whiteboardData }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    participants,
    cursors,
    myColor,
    myParticipantId,
    connect,
    disconnect,
    sendDraw,
    sendAddText,
    sendAddShape,
    sendCursor,
    sendErase,
    sendUndo,
    sendClearAll,
    sendSyncState,
  };
}
