import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import * as db from "./db";

// --- Types ---
interface WsClient {
  ws: WebSocket;
  userId: number;
  userName: string;
  sessionCode: string;
  participantId: number;
  cursorColor: string;
}

interface WsMessage {
  type: string;
  [key: string]: any;
}

// Participant colors palette
const CURSOR_COLORS = [
  "#FF4444", "#44AA44", "#4488FF", "#FF8800", "#AA44CC",
  "#00BBBB", "#FF44AA", "#88AA00", "#6644FF", "#FF6644",
];

// Active sessions: sessionCode -> Set<WsClient>
const sessions = new Map<string, Set<WsClient>>();

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws/whiteboard" });

  wss.on("connection", (ws, req) => {
    let client: WsClient | null = null;

    ws.on("message", async (raw) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());

        // --- JOIN session ---
        if (msg.type === "join") {
          const { sessionCode, userId, userName } = msg;
          if (!sessionCode || !userId) {
            ws.send(JSON.stringify({ type: "error", message: "Missing sessionCode or userId" }));
            return;
          }

          // Verify session exists
          const session = await db.getWhiteboardSessionByCode(sessionCode);
          if (!session || session.status === "ended") {
            ws.send(JSON.stringify({ type: "error", message: "Session not found or ended" }));
            ws.close();
            return;
          }

          // Get or create session room
          if (!sessions.has(sessionCode)) {
            sessions.set(sessionCode, new Set());
          }
          const room = sessions.get(sessionCode)!;

          // Check max participants
          if (room.size >= session.maxParticipants) {
            ws.send(JSON.stringify({ type: "error", message: "Session is full" }));
            ws.close();
            return;
          }

          // Assign color
          const colorIndex = room.size % CURSOR_COLORS.length;
          const cursorColor = CURSOR_COLORS[colorIndex];

          // Add participant to DB
          const participant = await db.addWhiteboardParticipant({
            sessionId: session.id,
            userId,
            displayName: userName || `User ${userId}`,
            cursorColor,
          });

          // Update session status
          if (session.status === "waiting") {
            await db.updateWhiteboardSession(session.id, { status: "active" });
          }
          await db.updateWhiteboardSession(session.id, {
            currentParticipants: room.size + 1,
          });

          client = {
            ws,
            userId,
            userName: userName || `User ${userId}`,
            sessionCode,
            participantId: participant.id,
            cursorColor,
          };
          room.add(client);

          // Send join confirmation
          ws.send(JSON.stringify({
            type: "joined",
            participantId: participant.id,
            cursorColor,
            participants: Array.from(room).map(c => ({
              id: c.participantId,
              userId: c.userId,
              name: c.userName,
              color: c.cursorColor,
            })),
          }));

          // Broadcast new participant to others
          broadcastToRoom(sessionCode, {
            type: "participant_joined",
            participant: {
              id: participant.id,
              userId,
              name: userName || `User ${userId}`,
              color: cursorColor,
            },
          }, ws);

          return;
        }

        // All other messages require a joined client
        if (!client) {
          ws.send(JSON.stringify({ type: "error", message: "Not joined to a session" }));
          return;
        }

        // --- DRAW stroke ---
        if (msg.type === "draw") {
          broadcastToRoom(client.sessionCode, {
            type: "draw",
            userId: client.userId,
            userName: client.userName,
            color: client.cursorColor,
            stroke: msg.stroke,
          }, ws);
          return;
        }

        // --- ADD text ---
        if (msg.type === "add_text") {
          broadcastToRoom(client.sessionCode, {
            type: "add_text",
            userId: client.userId,
            textElement: msg.textElement,
          }, ws);
          return;
        }

        // --- ADD shape ---
        if (msg.type === "add_shape") {
          broadcastToRoom(client.sessionCode, {
            type: "add_shape",
            userId: client.userId,
            shapeElement: msg.shapeElement,
          }, ws);
          return;
        }

        // --- CURSOR move ---
        if (msg.type === "cursor") {
          broadcastToRoom(client.sessionCode, {
            type: "cursor",
            userId: client.userId,
            userName: client.userName,
            color: client.cursorColor,
            x: msg.x,
            y: msg.y,
          }, ws);
          return;
        }

        // --- ERASE ---
        if (msg.type === "erase") {
          broadcastToRoom(client.sessionCode, {
            type: "erase",
            userId: client.userId,
            elementId: msg.elementId,
          }, ws);
          return;
        }

        // --- UNDO ---
        if (msg.type === "undo") {
          broadcastToRoom(client.sessionCode, {
            type: "undo",
            userId: client.userId,
          }, ws);
          return;
        }

        // --- CLEAR ALL (host only) ---
        if (msg.type === "clear_all") {
          broadcastToRoom(client.sessionCode, {
            type: "clear_all",
            userId: client.userId,
          }, ws);
          return;
        }

        // --- SYNC request (full state) ---
        if (msg.type === "sync_state") {
          broadcastToRoom(client.sessionCode, {
            type: "sync_state",
            userId: client.userId,
            whiteboardData: msg.whiteboardData,
          }, ws);
          return;
        }

      } catch (err) {
        console.error("[WS] Message parse error:", err);
      }
    });

    ws.on("close", async () => {
      if (client) {
        const room = sessions.get(client.sessionCode);
        if (room) {
          room.delete(client);

          // Update participant status
          await db.updateParticipantStatus(client.participantId, false);

          // Broadcast leave
          broadcastToRoom(client.sessionCode, {
            type: "participant_left",
            participantId: client.participantId,
            userId: client.userId,
          });

          // Update session participant count
          const session = await db.getWhiteboardSessionByCode(client.sessionCode);
          if (session) {
            await db.updateWhiteboardSession(session.id, {
              currentParticipants: Math.max(0, room.size),
            });

            // If room is empty, end session
            if (room.size === 0) {
              sessions.delete(client.sessionCode);
              await db.updateWhiteboardSession(session.id, {
                status: "ended",
                endedAt: new Date(),
                currentParticipants: 0,
              });
            }
          }
        }
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] Error:", err.message);
    });
  });

  console.log("[WS] WebSocket server initialized at /ws/whiteboard");
}

function broadcastToRoom(sessionCode: string, message: WsMessage, exclude?: WebSocket) {
  const room = sessions.get(sessionCode);
  if (!room) return;
  const data = JSON.stringify(message);
  Array.from(room).forEach(client => {
    if (client.ws !== exclude && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

export function getActiveSessionCount(): number {
  return sessions.size;
}

export function getSessionParticipantCount(sessionCode: string): number {
  return sessions.get(sessionCode)?.size || 0;
}
