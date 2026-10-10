// Transport for protocol.ts (replaces the XMLSocket of Dofus.Client.as:21-56).
// ASSUMPTION: the original is a TCP XMLSocket to SERVER_NAME:5555 whose frames are "\0"-terminated strings.
// In the browser this becomes a WebSocket carrying exactly ONE protocol message per WebSocket text frame, with
// no "\0" terminator; outgoing payloads are sent exactly as built (they keep their own trailing "\n").
import { parseServerMessage, type ParseContext, type ServerEvent } from "./protocol.ts";

export interface ConnectionHandlers {
  /** Every parsed server message (ignored codes are skipped, as in DataProcessor). */
  onEvent(event: ServerEvent, raw: string): void;
  /** XMLonConnect(false) / innerOnDisconnect: the AS reports a failed connect and a close the same way. */
  onClose?(): void;
  /** Client state consulted by the parser (login for AW, isMultiplayer for GM). */
  context?(): ParseContext;
}

export function connect(url: string, handlers: ConnectionHandlers) {
  const ws = new WebSocket(url);
  ws.onmessage = (e: MessageEvent) => {
    const raw = String(e.data);
    const event = parseServerMessage(raw, handlers.context?.());
    if (event) handlers.onEvent(event, raw);
  };
  ws.onclose = () => handlers.onClose?.();
  return {
    /** Send a string built by protocol.ts (already truncated to MAX_DATA_LENGTH). */
    send: (data: string) => ws.send(data),
    close: () => ws.close(),
  };
}
