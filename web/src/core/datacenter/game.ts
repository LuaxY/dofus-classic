// Ports of Dofus.DataCenter.Game.as (Class_DataCenter_Game) and Dofus.DataCenter.Channel.as.
// (`new Class_Datacenter_Game()` in Client.Game.as / Events.AKS.Channel.as is the same class: SWF 6 is case-insensitive.)
import { DofusDataProvider } from "./dataProvider.ts";

export class Game {
  m_bRunning = false;
  m_name: string | null = null;
  m_playerCount: number | null = null;
  m_maxPlayerCount: number | null = null;
  currentPlayerID: string | number | null = null;
  lastPlayerID: string | number | null = null;
  /** 1 solo, 2 free, 3 random team (Client.Game.as:6-9); set from Number(...) of the GC/GJ reply. */
  state: number | null = null;
  turnSequence: string[] = [];
  Results: { winners?: unknown[]; losers?: unknown[] } = {};
  bYouAreCreator = false;
  bInSearch = false;
  players = new DofusDataProvider<object>();

  get isPlayerIn(): boolean { return this.state != null; }
  get isRunning(): boolean { return this.m_bRunning; }
  get name(): string | null { return this.m_name; }
  /** null counts as 0 (both null → true). */
  get isFull(): boolean { return Number(this.m_playerCount) >= Number(this.m_maxPlayerCount); }
  get isMultiplayer(): boolean { return Number(this.state) > 1 && this.state != null; }
  get isFree(): boolean { return this.state == 2; }
  get isRandom(): boolean { return this.state == 3; }
  /** Same test as isMultiplayer (Game.as:53-57). */
  get isFight(): boolean { return Number(this.state) > 1 && this.state != null; }
}

/**
 * Dofus.DataCenter.Channel.as. AS quirk kept: the `name` setter does not store the name, it only copies the
 * previous m_name into m_lastChannel; nothing in AKSClient assigns `name` (DataProcessor writes m_name directly),
 * so lastChannel stays null.
 */
export class Channel {
  m_name: string | null = null;
  m_lastChannel: string | null = null;
  get name(): string | null { return this.m_name; }
  set name(_v: string | null) { this.m_lastChannel = this.m_name; }
  get lastChannel(): string | null { return this.m_lastChannel; }
}
