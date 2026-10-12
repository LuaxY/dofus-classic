// Promo video, step 1: the real server and five headless clients play the scenes while the camera client (C) records
// them: frames, sound log and the tick range of each of its steps (steps.jsonl) in OUT. scripts/promo/edit.ts cuts them
// into the MP4. Everything said and named in the game is French.
//
//   bun scripts/promo/record.ts
import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Step } from "../../web/src/dev/bot.ts";
import { Bot, enter, startServer, stopServer, store, type Who } from "../playtest.ts";

const OUT = join(import.meta.dir, "../../web/public/assets/port-preview/promo/take");

if (import.meta.main) {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  await startServer({ DOFUS_TURN_MS: "600000" }); // the camera may run slower than the wall clock (recorder.ts)
  const bot = (name: string, env?: Record<string, string>) => new Bot(name, join(OUT, "bots", name), env);
  const [C, D, E, F, G] = [bot("C", { DOFUS_RECORD: OUT }), bot("D"), bot("E"), bot("F"), bot("G")] as const;
  try {
    await Promise.all([C, D, E, F, G].map((b) => b.ready()));
    const cam = async (scene: string, s: Step) => {
      const r = await C.do(s);
      appendFileSync(join(OUT, "steps.jsonl"), JSON.stringify({ scene, do: s.do, t0: r.t0, t1: r.t1 }) + "\n");
      return r;
    };
    const wait = (scene: string, ms: number) => cam(scene, { do: "wait", ms });
    const who = (bot: Bot, character: string, guild: number, sex: 0 | 1): Who => ({ bot, account: character.toLowerCase(), password: "nostalgie", character, guild, sex });
    const d = who(D, "Flechette", 9, 1), e = who(E, "Sadidou", 10, 0), f = who(F, "Pepite", 3, 1), g = who(G, "Felinou", 6, 0);

    // 1. Account and character creation, while the others reach the multiplayer screen
    const others = Promise.all([d, e, f, g].map((w) => enter(w, true)));
    await C.do({ do: "rec", on: true });
    await wait("creation", 800);
    await cam("creation", { do: "register", account: "ioptimiste", password: "nostalgie" });
    await cam("creation", { do: "characters" });
    await cam("creation", { do: "createCharacter", name: "Ioptimiste", guild: 8, sex: 1, colors: [[0.05, 0.3], [0.55, 0.45], [0.75, 0.2]], browse: [2, 9, 6] });
    await wait("creation", 1200);
    await others;

    // 2. Multiplayer screen: chat
    await cam("lobby", { do: "selectCharacter", name: "Ioptimiste" });
    await wait("lobby", 1000);
    await E.do({ do: "chat", text: "Salut Ioptimiste ! Bienvenue en 2004 !", via: "enter" });
    await cam("lobby", { do: "waitChat", text: "Salut Ioptimiste ! Bienvenue en 2004 !" });
    await wait("lobby", 800);
    await cam("lobby", { do: "chat", text: "Merci ! Qui est partant pour un duel ?", via: "enter" });
    await D.do({ do: "waitChat", text: "Merci ! Qui est partant pour un duel ?" });
    await D.do({ do: "chat", text: "Moi ! Mes flèches sont prêtes.", via: "enter" });
    await cam("lobby", { do: "waitChat", text: "Moi ! Mes flèches sont prêtes." });
    await wait("lobby", 1200);

    // 3. A free game on the bridge map, fought to the end; meanwhile the others go to the village map
    const village = Promise.all([E, F, G].map((b) => b.do({ do: "village" })));
    await Promise.all([cam("duel", { do: "freeGames" }), D.do({ do: "freeGames" })]);
    await cam("duel", { do: "createGame", name: "Duel au pont", map: 53 });
    await D.do({ do: "joinGame", name: "Duel au pont" });
    await cam("duel", { do: "waitPlayers", count: 2 });
    await wait("duel", 800);
    await Promise.all([cam("duel", { do: "start", creator: true }), D.do({ do: "start", creator: false })]);
    await Promise.all([cam("duel", { do: "place", index: 1 }), D.do({ do: "place", index: 2 })]);
    const [fc] = await Promise.all([
      cam("fight", { do: "fight", policy: { want: [141, 142, 143], cc: true, say: "Pour la gloire d'Iop !", maxMs: 3600000 } }),
      D.do({ do: "fight", policy: { want: [161, 162, 163, 166], passive: true, say: "Attention à mes flèches !" } }),
    ]);
    console.log(`fight: ${String(fc.result)}`);
    await wait("result", 2500);
    await village;
    await Promise.all([cam("result", { do: "leaveResult" }), D.do({ do: "leaveResult" })]);

    // 4. The village map: everybody there, walking, chatting, a smiley
    await D.do({ do: "village" });
    await wait("lobby2", 800);
    await cam("village", { do: "village" });
    await wait("village", 1500);
    await Promise.all([E.do({ do: "walk" }), F.do({ do: "walk" }), wait("village", 2500)]);
    await F.do({ do: "chat", text: "Quelle nostalgie, cette bêta !", via: "enter" });
    await cam("village", { do: "waitChat", text: "Quelle nostalgie, cette bêta !", bubble: true });
    await wait("village", 1000);
    await Promise.all([G.do({ do: "smiley", index: 3 }), cam("village", { do: "smiley", from: "Felinou" })]);
    await Promise.all([cam("village", { do: "walk" }), D.do({ do: "walk" })]);
    await cam("village", { do: "chat", text: "Qui vient explorer Amakna avec moi ?", via: "enter" });
    await E.do({ do: "waitChat", text: "Qui vient explorer Amakna avec moi ?" });
    await E.do({ do: "chat", text: "Je te suis !", via: "enter" });
    await cam("village", { do: "waitChat", text: "Je te suis !", bubble: true });
    await wait("village", 1000);

    // 5. Through the map-change plates: 567 → 555 → 554 → 591 (playtest "social" route)
    await cam("travel", { do: "travel", cell: 24, map: 555 });
    const te = await E.do({ do: "travel", cell: 24, map: 555 });
    await cam("travel", { do: "sprite", name: "Sadidou", cell: te.cell as number });
    await wait("travel", 1200);
    await cam("travel", { do: "travel", cell: 276, map: 554 });
    await wait("travel", 1000);
    await cam("travel", { do: "travel", cell: 334, map: 591 });
    await wait("travel", 2000);
    await C.do({ do: "rec", on: false });
  } finally {
    await Promise.all([C, D, E, F, G].map((b) => b.quit()));
    stopServer();
    rmSync(store, { recursive: true, force: true });
  }
}
