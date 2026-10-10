// Replay harness: a scripted server behind a WebSocket stand-in. `installReplay()` swaps it in as
// `globalThis.WebSocket`, so frames reach the client through exactly the WebSocket path (core/connection.ts →
// parseServerMessage → AKS.dispatch). A stage's server frames are sent once the client has sent every frame the
// stage expects, in any order. A frame matches byte-exact, or loosely by its code (first 2 chars; the credentials
// frame by its inner "\n") so a browser session with other inputs still advances — recorded in `mismatches`.
// Frames with no counterpart in the stage are recorded in `extra` and ignored.
// Delays run on the runtime clock (player.advance in tests, rAF in the browser).
import { clearInterval, setInterval } from "../runtime/player.ts";
import { type Fixture, fixtures } from "./fixtures.ts";

export class ReplaySocket {
  static last: ReplaySocket | undefined;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  readonly fixture: Fixture;
  /** Every frame the client sent, in order. */
  readonly sent: string[] = [];
  /** Frames matched only by their code: [stage, expected, sent]. */
  readonly mismatches: [string, string, string][] = [];
  /** Frames the current stage did not expect: [stage, frame]. */
  readonly extra: [string, string][] = [];
  stage = 0;
  /** Client frames the current stage still waits for. */
  pending: string[] = [];
  closed = false;

  constructor(readonly url: string) {
    const name = url.replace(/^replay:/, "");
    const fx = fixtures[name];
    if (!fx) throw new Error(`unknown replay fixture "${name}" (have: ${Object.keys(fixtures).join(", ")})`);
    this.fixture = fx;
    this.pending = [...(fx[0]?.client ?? [])];
    ReplaySocket.last = this;
    this.advance();
  }

  send(data: string): void {
    if (this.closed) return;
    this.sent.push(data);
    const name = this.fixture[this.stage]?.name ?? "(after the end)";
    let i = this.pending.indexOf(data);
    if (i < 0) {
      i = this.pending.findIndex((f) => code(f) == code(data));
      if (i < 0) {
        this.extra.push([name, data]);
        console.warn(`replay: stage "${name}" waits for ${JSON.stringify(this.pending)}, ignoring ${JSON.stringify(data)}`);
        return;
      }
      this.mismatches.push([name, this.pending[i]!, data]);
      console.warn(`replay: stage "${name}" expected ${JSON.stringify(this.pending[i])}, client sent ${JSON.stringify(data)}`);
    }
    this.pending.splice(i, 1);
    this.advance();
  }

  close(): void {
    this.closed = true;
  }

  /** Send the server frames of every stage whose client frames are complete. */
  private advance(): void {
    let due = 0; // offset of the last frame scheduled by this call: frames keep their order across stages
    for (let st = this.fixture[this.stage]; st && this.pending.length == 0; st = this.fixture[this.stage]) {
      for (const { delayMs, frame } of st.server) {
        due += Math.max(10, delayMs);
        const id = setInterval(() => {
          clearInterval(id);
          if (!this.closed) this.onmessage?.({ data: frame });
        }, due);
      }
      this.stage++;
      this.pending = [...(this.fixture[this.stage]?.client ?? [])];
    }
  }

  /** Name of the stage the replay is waiting on (or "done"). */
  get waitingFor(): string {
    return this.fixture[this.stage]?.name ?? "done";
  }
}

/** Message code of a client frame: the credentials frame is "<login>\n<crypt>\n", every other one starts with its code. */
const code = (f: string) => {
  const n = f.indexOf("\n");
  return n >= 0 && n < f.length - 1 ? "login" : f.slice(0, 2);
};

/** Use the replay server for `new WebSocket("replay:<fixture>")`; any other URL (e.g. Vite's HMR socket) keeps the real one. */
export function installReplay(): void {
  const Real = globalThis.WebSocket;
  const ws = function (url: string | URL, protocols?: string | string[]) {
    return String(url).startsWith("replay:") ? new ReplaySocket(String(url)) : new Real(url, protocols);
  };
  Object.setPrototypeOf(ws, Real ?? Function.prototype); // keeps WebSocket.OPEN & co
  (globalThis as { WebSocket: unknown }).WebSocket = ws;
}
