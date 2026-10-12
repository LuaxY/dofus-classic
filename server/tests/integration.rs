//! End to end: the real server on a random port, two scripted WebSocket clients sending the exact frames the client
//! builds (web/src/core/protocol.ts), through login → character → channel → chat → free game → placement → fight
//! (moves computed with the client's pathfinding, spells, close combat) → death → results → back to the channel.
//! Every server frame is checked against the documented format (`check_frame`).
use dofus_server::codec::{cell_code, compress_path, decode64};
use dofus_server::crypt::crypt_password;
use dofus_server::data::GameData;
use dofus_server::map::{tacle_zones, Map};
use dofus_server::pathfinding::{check_range, check_view, distance, path_find};
use dofus_server::world::{Event, World};
use dofus_server::{net, store::Store};
use futures_util::{SinkExt, StreamExt};
use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::sync::mpsc::{error::TryRecvError, unbounded_channel};
use tokio_tungstenite::{tungstenite::Message, MaybeTlsStream, WebSocketStream};

// ───────────── documented formats ─────────────

fn is_num(s: &str) -> bool {
    !s.is_empty() && s.strip_prefix('-').unwrap_or(s).bytes().all(|b| b.is_ascii_digit())
}
fn is_b64(s: &str) -> bool {
    s.chars().all(|c| decode64(c).is_some())
}
fn is_color(s: &str) -> bool {
    s == "-1" || (s.len() == 6 && s.bytes().all(|b| b.is_ascii_hexdigit()))
}
fn nums(fields: &[&str]) -> bool {
    fields.iter().all(|f| is_num(f))
}
/// `<id>~<level>~<shape><size>~<15 flags>` (docs/protocol/spells.md).
fn spell_entry(s: &str) -> bool {
    let p: Vec<&str> = s.split('~').collect();
    p.len() == 4 && is_num(p[0]) && is_num(p[1]) && p[2].len() == 2 && "PCLX".contains(&p[2][..1]) && is_b64(&p[2][1..]) && {
        let f: Vec<char> = p[3].chars().collect();
        f.len() == 15
            && "01".contains(f[0])
            && "AWEF".contains(f[1])
            && [3, 4, 7, 8].iter().all(|&i| "01".contains(f[i]))
            && is_b64(&p[3][5..7])
            && is_b64(&p[3][9..])
    }
}
/// `<idHex>~<typeHex>~<gfxHex>~<RRGGBB>~<positionHex or empty>~<effect>,…`, effect `<id>#<p1>#<p2>#<p3>` in hex
/// (docs/protocol/items.md).
fn item_entry(e: &str) -> bool {
    let hex = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_hexdigit());
    let f: Vec<&str> = e.split('~').collect();
    f.len() == 6
        && [f[0], f[1], f[2], f[3]].iter().all(|x| hex(x))
        && f[3].len() == 6
        && (f[4].is_empty() || hex(f[4]))
        && f[5].split(',').all(|x| x.split('#').count() == 4 && x.split('#').all(hex))
}
/// Multiplayer `GM` add entry (13 fields) or solo (12 fields).
fn gm_entry(e: &str) -> bool {
    let f: Vec<&str> = e.split(';').collect();
    (f.len() == 12 || f.len() == 13)
        && nums(&[f[0], f[2], f[3], f[4], f[5]])
        && f[6..9].iter().all(|c| is_color(c))
        && f[9].is_empty()
        && nums(&f[10..])
}

fn check_frame(m: &str) {
    let p: Vec<&str> = m.split('|').collect();
    let ok = match () {
        _ if m.starts_with('H') => m.len() == 33 && is_b64(&m[1..]),
        _ if m.starts_with("AlK") => true,
        _ if m.starts_with("AlE") => m.len() == 4,
        _ if m.starts_with("ALK") => {
            p[0] == "ALK"
                && p[1..].iter().all(|e| {
                    let f: Vec<&str> = e.split(';').collect();
                    f.len() == 9 && nums(&[f[0], f[2], f[3], f[4], f[5]]) && f[6..].iter().all(|c| is_color(c))
                })
        }
        _ if m.starts_with("ASK") => {
            p.len() == 31
                && nums(&[p[1], p[3], p[4], p[5], p[6]])
                && p[7..10].iter().all(|c| is_color(c))
                && p[10].is_empty()
                && nums(&p[11..29])
                && p[29].split(';').all(spell_entry)
                && (p[30].is_empty() || p[30].split(';').all(item_entry))
        }
        _ if m == "AAK" || m == "AAE" || m == "ASE" || m == "GtE" || m == "GR" || m == "GS" || m == "GV" || m == "FDK" || m == "SUE" => {
            true
        }
        _ if m == "GCK|3" || m == "GJK|3" || m == "Gs" || m == "Gy" => true,
        _ if m.starts_with("GY") => p.len() == 2 && is_num(&p[0][2..]) && !p[1].is_empty(),
        _ if m.starts_with("Gi") => p.len() == 2 && "EC".contains(&m[2..3]) && is_num(&p[0][3..]),
        _ if m.starts_with("ABK") => {
            nums(&[&p[0][3..]]) && p[1..].iter().all(|s| s.split(';').count() == 2 && nums(&s.split(';').collect::<Vec<_>>()))
        }
        _ if m.starts_with("OAKO") => item_entry(&m[4..]), // one item per frame (docs/protocol/items.md)
        _ if m == "OAEF" => true,
        _ if m.starts_with("ODK") => is_num(&m[3..]),
        _ if m.starts_with("AN") => p.len() == 5 && nums(&[&p[0][2..]]) && nums(&p[1..]),
        _ if m.starts_with("AW|") => p.len() == 2 || (p.len() == 6 && p[5].is_empty()),
        _ if m.starts_with("CJK") => m.len() > 3,
        _ if m.starts_with("CLK") => p[0] == "CLK" && p[1..].iter().all(|u| u.split(';').count() == 3),
        _ if m.starts_with("CM|") => p.len() == 2 && (p[1].starts_with('+') && p[1].split(';').count() == 3 || p[1].starts_with('-')),
        _ if m.starts_with("cMK") => p.len() == 4 && ["", "#", "F", "T"].contains(&&p[0][3..]) && is_num(p[1]) && !p[3].contains("/##"),
        _ if m.starts_with("cME") => m.len() >= 4,
        _ if m.starts_with("cS") => p.len() == 2 && nums(&[&p[0][2..], p[1]]),
        _ if m.starts_with("IC") => is_num(&m[2..]),
        _ if m.starts_with("IG") => p.len() == 5 && nums(&[&p[0][2..]]) && nums(&p[1..]),
        _ if m.starts_with("IP") => m[2..].split('|').all(|e| {
            let f: Vec<&str> = e.split(';').collect();
            f.len() == 10 && nums(&f[2..])
        }),
        _ if m.starts_with("FLK") || m.starts_with("FlK") => true,
        _ if m.starts_with("FAK") => m[3..].split(';').count() == 7 || !m[3..].contains(';'),
        _ if m.starts_with("FAE") || m.starts_with("FDE") => m.len() == 4,
        _ if m.starts_with("FI") || m.starts_with("FO") => m[2..].split(';').count() == 2,
        _ if m.starts_with("mL") => m[2..].split('|').all(is_num),
        _ if m.starts_with('M') => m.len() >= 3 && "01".contains(&m[1..2]) && is_num(&m[2..]), // notice: display, SRV_MSG id
        _ if m.starts_with("GLK") => p[0] == "GLK" && p[1..].iter().all(|g| g.split(';').nth(1).is_some_and(|o| o.len() == 3)),
        _ if m.starts_with("GCK|1") => m == "GCK|1",
        _ if m.starts_with("GCK|2|") || m.starts_with("GJK|2|") => p.len() == 5 && is_num(p[3]) && p[4].len() == 2,
        _ if m.starts_with("GCE") || m.starts_with("GJE") => m.len() == 4,
        _ if m.starts_with("GDM|") => {
            p.len() == 7 && nums(&p[1..6]) && (p[4] == "0" || p[4] == "1") && p[6].len().is_multiple_of(10) && is_b64(p[6])
        }
        _ if m.starts_with("GM|") => {
            p[1..].iter().all(|e| e == &"+0" || e.strip_prefix('+').is_some_and(gm_entry) || e.strip_prefix('-').is_some_and(is_num))
                && (p.len() == 2 || p[1].starts_with('+'))
        }
        _ if m.starts_with("GtK") => p.len() == 2 && is_num(&p[0][3..]) && (p[1] == "0" || p[1] == "1"),
        _ if m.starts_with("GPS") => {
            p.len() == 2 && is_b64(&p[0][3..]) && !p[0].len().is_multiple_of(2) && p[1].len().is_multiple_of(2) && is_b64(p[1])
        }
        _ if m.starts_with("GIC|") => p[1..].iter().all(|e| e.split(';').count() == 3 && nums(&e.split(';').collect::<Vec<_>>())),
        _ if m.starts_with("GTL|") => nums(&p[1..]),
        _ if m.starts_with("GTS") => p.len() == 2 && nums(&[&p[0][3..], p[1]]),
        _ if m.starts_with("GTF") || m.starts_with("GAS") || m.starts_with("GAF") => is_num(&m[3..]),
        _ if m.starts_with("GE") => {
            is_num(p[0].get(2..).unwrap_or(""))
                && p.len() >= 2
                && p[1..].iter().all(|r| {
                    let f: Vec<&str> = r.split(';').collect();
                    f.len() == 9 && nums(&f) && (f[0] == "2" || f[0] == "0") && (f[3] == "0" || f[3] == "1")
                })
        }
        _ if m.starts_with("GA") => {
            // GA<id>;<type>;<actor>;<params> — exactly 4 ';'-fields, id numeric or x, params by type.
            let f: Vec<&str> = m[2..].split(';').collect();
            let args: Vec<&str> = f.get(3).map_or(vec![], |a| a.split(',').collect());
            f.len() == 3 && f[1] == "3" && is_num(f[2]) // `GAx;3;<id>`: to the multiplayer screen, no params
                || f.len() == 4 && (f[0] == "x" || is_num(f[0])) && nums(&[f[1], f[2]]) && match f[1] {
                "1" => f[3].len() >= 4 && f[3].len().is_multiple_of(2) && is_b64(f[3]),
                "4" | "5" | "100" | "101" | "102" | "107" | "121" => args.len() == 2 && nums(&args),
                "103" | "130" | "303" | "301" | "302" => is_num(f[3]),
                "304" | "305" => f[3].is_empty(),
                "111" | "112" | "117" => args.len() == 3 && nums(&args),
                "300" => args.len() == 6 && nums(&args),
                _ => false,
            }
        }
        _ => false,
    };
    assert!(ok, "frame does not match its documented format: {m:?}");
}

// ───────────── scripted client ─────────────

struct Client {
    ws: WebSocketStream<MaybeTlsStream<TcpStream>>,
    key: String,
    id: u32,
    log: Vec<String>,
}

impl Client {
    async fn connect(addr: &str) -> Client {
        let (ws, _) = tokio_tungstenite::connect_async(format!("ws://{addr}")).await.unwrap();
        let mut c = Client { ws, key: String::new(), id: 0, log: Vec::new() };
        let h = c.recv().await;
        c.key = h[1..].to_string();
        c
    }
    async fn send(&mut self, s: &str) {
        assert!(s.encode_utf16().count() <= 200, "client frames are cut at 200 UTF-16 units");
        self.ws.send(Message::Text(s.into())).await.unwrap();
    }
    async fn recv(&mut self) -> String {
        loop {
            let msg = tokio::time::timeout(Duration::from_secs(5), self.ws.next()).await.expect("no frame within 5 s").unwrap().unwrap();
            if let Message::Text(t) = msg {
                let t = t.to_string();
                assert!(!t.contains('\0') && !t.ends_with('\n'), "{t:?}");
                check_frame(&t);
                self.log.push(t.clone());
                return t;
            }
        }
    }
    async fn expect(&mut self, want: &str) -> String {
        let got = self.recv().await;
        assert!(got.starts_with(want), "expected {want:?}, got {got:?}");
        got
    }
    /// Frames until (and including) the first one starting with `prefix`.
    async fn until(&mut self, prefix: &str) -> Vec<String> {
        let mut out = Vec::new();
        loop {
            let f = self.recv().await;
            let done = f.starts_with(prefix);
            out.push(f);
            if done {
                return out;
            }
        }
    }
    async fn login(&mut self, account: &str, password: &str) -> String {
        self.credentials(account, "", password).await
    }
    /// The authored register frame: `+` before the crypt (docs/protocol/account.md).
    async fn register(&mut self, account: &str, password: &str) -> String {
        self.credentials(account, "+", password).await
    }
    async fn credentials(&mut self, account: &str, marker: &str, password: &str) -> String {
        self.send("5\n").await;
        let crypt = crypt_password(password, &self.key);
        self.send(&format!("{account}\n{marker}{crypt}\n")).await;
        self.recv().await
    }
}

async fn start_server(store: &Path, timers: net::Overrides) -> String {
    let _ = std::fs::remove_file(store);
    let data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
    let world = World::new(data, Store::open(Some(store.to_path_buf())), 42);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap().to_string();
    tokio::spawn(net::serve(listener, world, timers));
    addr
}

/// Character creation + selection + village → multiplayer screen + channel. Returns (id, ASK parts).
async fn enter(c: &mut Client, pa: &str, name: &str) -> Vec<String> {
    c.send("PL\n").await;
    c.expect("ALK").await;
    c.send(pa).await;
    c.expect("AAK").await;
    let al = c.expect("ALK|").await;
    let entry = al.split('|').find(|e| e.split(';').nth(1) == Some(name)).unwrap().to_string();
    c.id = entry.split(';').next().unwrap().parse().unwrap();
    c.send(&format!("PS{}\n", c.id)).await;
    let ask: Vec<String> = c.expect("ASK|").await.split('|').map(String::from).collect();
    c.send("GC1\n").await;
    c.expect("GCK|1").await;
    c.send("GD\n").await;
    let gdm = c.expect("GDM|").await;
    assert_eq!(gdm.split('|').nth(4), Some("1"), "village map is role-play");
    let gm = c.expect("GM|+").await;
    assert_eq!(gm.split(';').count(), 12, "solo GM layout: …;cell;dir");
    c.expect(&format!("GAx;3;{}", c.id)).await;
    ask
}

/// What a client knows during the fight (from GIC and GA frames).
#[derive(Default)]
struct Board {
    cells: HashMap<u32, i64>,
    alive: HashSet<u32>,
    ap: HashMap<u32, i32>,
    team: HashMap<u32, u8>,
}

impl Board {
    fn apply(&mut self, f: &str, w: i64) {
        if let Some(rest) = f.strip_prefix("GIC|") {
            for e in rest.split('|') {
                let v: Vec<i64> = e.split(';').map(|x| x.parse().unwrap()).collect();
                self.cells.insert(v[0] as u32, v[1]);
                self.alive.insert(v[0] as u32);
            }
        } else if let Some(id) = f.strip_prefix("GTF") {
            self.ap.insert(id.parse().unwrap(), 6); // reset at the end of the fighter's own turn
        } else if let Some(rest) = f.strip_prefix("GA").filter(|r| !r.starts_with('S') && !r.starts_with('F')) {
            let p: Vec<&str> = rest.split(';').collect();
            let args: Vec<i64> = p[3].split(',').filter_map(|a| a.parse().ok()).collect();
            match p[1] {
                "1" => {
                    let cells: Vec<i64> = p[3]
                        .as_bytes()
                        .chunks(2)
                        .map(|c| ((decode64(c[0] as char).unwrap() as i64 & 15) << 6) | decode64(c[1] as char).unwrap() as i64)
                        .collect();
                    assert_eq!(
                        Some(&cells[0]),
                        self.cells.get(&p[2].parse().unwrap()),
                        "a broadcast path starts on the mover's current cell"
                    );
                    let _ = w;
                    self.cells.insert(p[2].parse().unwrap(), *cells.last().unwrap());
                }
                "101" | "102" => *self.ap.entry(args[0] as u32).or_insert(6) += args[1] as i32,
                "121" => *self.ap.entry(args[0] as u32).or_insert(6) += args[1] as i32,
                "4" | "5" => {
                    self.cells.insert(args[0] as u32, args[1]);
                }
                "103" => {
                    self.alive.remove(&(p[3].parse::<u32>().unwrap()));
                }
                _ => {}
            }
        }
    }
    fn occupied(&self) -> HashSet<i64> {
        self.alive.iter().map(|i| self.cells[i]).collect()
    }
}

/// The acting client's choice for one step of its turn, like a player clicking: a damaging spell or close combat on
/// the enemy if the client-side checks pass, else one move toward it. None = end the turn.
#[allow(clippy::too_many_arguments)]
fn choose(
    data: &GameData,
    map: &Map,
    board: &Board,
    me: u32,
    foe: u32,
    spells: &[u32],
    cc_ap: i32,
    moved: bool,
    used: &HashSet<u32>,
) -> Option<String> {
    let (from, target) = (board.cells[&me], board.cells[&foe]);
    let ap = board.ap.get(&me).copied().unwrap_or(6);
    let occ = board.occupied();
    let w = map.width as i64;
    for &id in spells.iter().filter(|s| !used.contains(s)) {
        let l = &data.spells[&id].levels[0];
        let damages = l.effects.iter().any(|e| matches!(e, dofus_server::data::Effect::Damage { .. }));
        if damages
            && ap >= l.ap
            && check_range(w, from, target, l.line, l.range as i64, 0, l.on_itself)
            && (!l.los || check_view(map, &occ, from, target))
        {
            return Some(format!("GA300{id};{target}\n"));
        }
    }
    if ap >= cc_ap && distance(from, target, w) == 1 && check_view(map, &occ, from, target) {
        return Some(format!("GA303{target}\n"));
    }
    if moved || ap <= 0 {
        return None;
    }
    // Walk the shortest route to a cell next to the foe, as far as the AP allow (a player clicking on the way).
    let zones = tacle_zones(map, board.cells.iter().map(|(i, &c)| (c, board.team[i])));
    let adverse = if board.team[&me] != 0 { 0 } else { 1 };
    let none = HashSet::new();
    let route = map
        .around()
        .iter()
        .map(|o| target + o)
        .filter(|&c| map.walkable(c) && !occ.contains(&c) && distance(c, target, w) == 1)
        .filter_map(|c| path_find(map, &occ, &none, false, 500, from, c))
        .min_by_key(|p| p.1.len())?;
    let stop = route.1.get((ap as usize).min(route.1.len()) - 1)?.0;
    let (path, _) = path_find(map, &occ, &zones[adverse], true, ap as i64, from, stop)?;
    Some(format!("GA001{}\n", compress_path(&path.iter().map(|&(c, d)| (c as i32, d)).collect::<Vec<_>>())))
}

/// `GA<id>;<type>;…` → type.
fn ga_type(f: &str) -> Option<&str> {
    f.strip_prefix("GA").and_then(|r| r.split(';').nth(1))
}

/// Plays from `current`'s turn like two players clicking (`choose`) until a death within 80 turns: every action block
/// reaches both clients identically, the actor acknowledges numeric ids, and a critical miss (`302`/`305`) ends the turn
/// server-side (`GTF`, `GTS` right after its `GAF`). `fighters`: id → (spells it uses, close-combat AP of `ASK` part 28).
/// Returns the `GE` and every action block.
#[allow(clippy::too_many_arguments)]
async fn play(
    a: &mut Client,
    b: &mut Client,
    data: &GameData,
    map: &Map,
    board: &mut Board,
    mut current: u32,
    fighters: &HashMap<u32, (Vec<u32>, i32)>,
    turn_ms: u64,
) -> (String, Vec<Vec<String>>) {
    let (ida, idb, w) = (a.id, b.id, map.width as i64);
    let mut blocks = Vec::new();
    let mut used = HashSet::new(); // once-per-fight spells (delay 63) already cast
    for _turn in 0..80 {
        let foe = if current == ida { idb } else { ida };
        let (spells, cc_ap) = &fighters[&current];
        let (mut moved, mut missed) = (false, false);
        while let Some(req) = choose(data, map, board, current, foe, spells, *cc_ap, moved, &used) {
            let (actor, other) = if current == ida { (&mut *a, &mut *b) } else { (&mut *b, &mut *a) };
            actor.send(&req).await;
            let frames = actor.until(&format!("GAF{current}")).await;
            assert_eq!(frames[0], format!("GAS{current}"), "request accepted: {req:?} → {frames:?}");
            assert_eq!(other.until(&format!("GAF{current}")).await, frames, "everybody gets the same action block");
            for f in &frames {
                board.apply(f, w);
                if f[2..].split(';').next().is_some_and(|id| id.parse::<u32>().is_ok()) {
                    actor.send(&format!("GKK{}\n", f[2..].split(';').next().unwrap())).await;
                }
            }
            moved |= req.starts_with("GA001");
            let cast = frames.iter().any(|f| ga_type(f) == Some("300")); // a missed spell is not recorded
            if let Some(id) = req.strip_prefix("GA300").and_then(|r| r.split(';').next()).and_then(|s| s.parse::<u32>().ok()) {
                if cast && data.spells[&id].levels[0].delay >= 63 {
                    used.insert(id);
                }
            }
            missed = frames.iter().any(|f| matches!(ga_type(f), Some("302" | "305")));
            let died = frames.iter().any(|f| f.starts_with("GAx;103;"));
            blocks.push(frames);
            if died {
                let ge = actor.expect("GE").await;
                assert_eq!(other.expect("GE").await, ge);
                return (ge, blocks);
            }
            if missed {
                break;
            }
        }
        if !missed {
            if current == ida { &mut *a } else { &mut *b }.send("GT\n").await;
        }
        for cl in [&mut *a, &mut *b] {
            let f = cl.until("GTS").await;
            assert_eq!(f[0], format!("GTF{current}"));
            assert_eq!(f[1], format!("GTS{foe}|{turn_ms}"));
            board.apply(&f[0], w);
        }
        current = foe;
    }
    panic!("nobody died within 80 turns");
}

#[tokio::test]
async fn two_clients_play_a_full_duel() {
    let store = std::env::temp_dir().join(format!("dofus-it-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: Some(60_000), placement_ms: Some(60_000) }).await;
    let data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();

    // ── register, version check, double login, wrong password ──
    let mut a = Client::connect(&addr).await;
    assert_eq!(a.register("bo", "pass").await, "AlKfr");
    let mut b = Client::connect(&addr).await;
    assert_eq!(b.register("ali", "dofus2004").await, "AlKfr");
    let mut c = Client::connect(&addr).await;
    assert_eq!(c.login("bo", "pass").await, "AlEa");
    let mut v = Client::connect(&addr).await;
    v.send("4\n").await;
    v.expect("AlEv").await;

    // ── characters, village, multiplayer screen ──
    a.send("PABad|name|8|0|-1|-1|-1\n").await; // `|` in a name: refused
    a.expect("AAE").await;
    let ask = enter(&mut a, "PABobby|8|0|16711680|-1|65280\n", "Bobby").await;
    assert_eq!(
        (ask[2].as_str(), ask[4].as_str(), ask[6].as_str(), ask[7].as_str(), ask[9].as_str()),
        ("Bobby", "8", "80", "FF0000", "00FF00")
    );
    assert_eq!((ask[14].as_str(), ask[15].as_str(), ask[28].as_str()), ("55", "6", "3"), "LP, AP, close-combat AP of an Iop");
    assert_eq!(
        ask[29].split(';').next(),
        Some("141~1~Pb~1E000cd10EYaaab"),
        "Pression: range 2, 3 AP, line of sight, crit 1/30, miss 1/50, bar slot 1"
    );
    assert_eq!(ask[29].split(';').count(), 3);
    enter(&mut b, "PAAli|9|1|-1|-1|undefined\n", "Ali").await;
    let (ida, idb) = (a.id, b.id);

    // ── channels, infos, chat, whisper, friends ──
    a.send("CJFrance\n").await;
    a.expect("CJKFrance").await;
    a.send("CL\n").await;
    assert_eq!(a.expect("CLK").await, "CLK|Bobby;1;80");
    a.send("IP\n").await;
    a.expect("IP").await;
    a.send("IG\n").await;
    a.expect("IG").await;
    b.send("CJ\n").await; // SWF6 `"CJ" + undefined`: rejoin previous / default channel
    b.expect("CJKFrance").await;
    assert_eq!(a.expect("CM|+").await, "CM|+Ali;1;91");
    b.send("CL\n").await;
    assert_eq!(b.expect("CLK").await, "CLK|Bobby;1;80|Ali;1;91");
    a.send("BM*|Salut &lt;3 /##/c GQ\n").await;
    for cl in [&mut a, &mut b] {
        assert_eq!(cl.expect("cMK|").await, format!("cMK|{ida}|Bobby|Salut &lt;3 /c GQ"));
    }
    b.send("BMbobby|coucou\n").await;
    assert_eq!(a.expect("cMKF").await, format!("cMKF|{idb}|Ali|coucou"));
    assert_eq!(b.expect("cMKT").await, format!("cMKT|{ida}|Bobby|coucou"));
    b.send("BMZed|hello\n").await;
    assert_eq!(b.expect("cME").await, "cMEfZed");
    a.send("FAAli\n").await;
    assert_eq!(a.expect("FAK").await, "FAKali;C;Ali;1;9;1;91");
    a.send("FA*bo\n").await;
    a.expect("FAEy").await;
    a.send("FL\n").await;
    a.expect("FLKali;C;Ali").await;
    b.send("BW\n").await;
    assert_eq!(b.expect("AW|").await, "AW|ali|Ali|C|France|");

    // ── free game: create, list, join, teams ──
    let map_id = data.maps[0].id;
    a.send("BL\n").await;
    a.expect("mL").await;
    a.send(&format!("GC2Duel|{map_id}|AA|\n")).await;
    assert_eq!(a.expect("GCK|2|").await, format!("GCK|2|Duel|{map_id}|AA"));
    let gm = a.expect("GM|+").await;
    assert!(gm.ends_with(";;55;0;0"), "{gm}");
    assert_eq!(b.expect("CM|-").await, "CM|-Bobby");
    b.send("GL2\n").await;
    assert_eq!(b.expect("GLK").await, "GLK|Duel;AAA");
    b.send("GJ2Duel|\n").await;
    assert_eq!(b.expect("GJK|2|").await, format!("GJK|2|Duel|{map_id}|AA"));
    let gm = b.expect("GM|").await;
    assert_eq!(gm.matches("|+").count(), 2, "the joiner gets every member, itself included");
    assert!(a.expect("GM|+").await.ends_with(";;45;1;1"));
    b.send("Gt0\n").await;
    b.expect("GtE").await; // team 0 is full
    a.send("BM*|go\n").await;
    for cl in [&mut a, &mut b] {
        cl.expect("cMK|").await;
    }

    // ── placement ──
    a.send("GS\n").await;
    let gps = a.expect("GPS").await;
    assert_eq!(b.expect("GPS").await, gps);
    let lists: Vec<Vec<i64>> = gps[3..]
        .split('|')
        .map(|l| {
            l.as_bytes().chunks(2).map(|c| ((decode64(c[0] as char).unwrap() << 6) + decode64(c[1] as char).unwrap()) as i64).collect()
        })
        .collect();
    assert_eq!(lists, data.maps[0].places.to_vec());
    for cl in [&mut a, &mut b] {
        cl.send("GD\n").await;
        assert!(cl.expect("GDM|").await.starts_with(&format!("GDM|{map_id}|")));
    }
    a.send("GR\n").await;
    b.send("GR\n").await;
    a.expect("GR").await;
    b.expect("GR").await;
    a.send(&format!("Gp{}\n", lists[0][1])).await;
    for cl in [&mut a, &mut b] {
        assert_eq!(cl.expect("GIC").await, format!("GIC|{ida};{};1", lists[0][1]));
    }
    a.send(&format!("Gp{}\n", lists[1][0])).await; // not a team-0 cell: refused, answered to the requester only
    assert_eq!(a.expect("GIC").await, format!("GIC|{ida};{};1", lists[0][1]));
    b.send(&format!("Gp{}\n", lists[1][2])).await;
    let mut board = Board { team: HashMap::from([(ida, 0), (idb, 1)]), ..Default::default() };
    for cl in [&mut a, &mut b] {
        let gic = cl.expect("GIC").await;
        board.apply(&gic, 0);
        cl.expect("GS").await;
        assert_eq!(cl.expect("GTL").await, format!("GTL|{ida}|{idb}"));
        cl.expect(&format!("GTS{ida}|60000")).await;
    }

    // ── fight ──
    let map = &data.map_index[&map_id];
    let fighters = HashMap::from([(ida, (data.classes[&8].spells.clone(), 3)), (idb, (data.classes[&9].spells.clone(), 4))]);
    let (ge, blocks) = play(&mut a, &mut b, &data, map, &mut board, ida, &fighters, 60000).await;
    let count = |t: &str| blocks.iter().filter(|b| b.iter().any(|f| ga_type(f) == Some(t))).count();
    let (moves, casts, ccs) = (count("1"), count("300"), count("303"));
    assert!(moves > 0 && casts > 0, "moves {moves}, casts {casts}, close combats {ccs}");

    // ── results, back to the lobby ──
    let results: Vec<Vec<&str>> = ge.split('|').skip(1).map(|r| r.split(';').collect()).collect();
    assert_eq!(results.len(), 2);
    let winner: u32 = results.iter().find(|r| r[0] == "2").unwrap()[1].parse().unwrap();
    let loser = results.iter().find(|r| r[0] == "0").unwrap();
    assert_eq!(loser[3], "1", "the loser is dead");
    // Level 1 against level 1: a win is round(110 × 0.4) of the 110 XP to level 2, a loss round(110 × 0.1).
    assert_eq!(results.iter().find(|r| r[0] == "2").unwrap()[4..], ["0", "44", "110", "44", "10"]);
    assert_eq!(loser[4..], ["0", "11", "110", "11", "0"]);
    let (win, lose) = if winner == ida { (&mut a, &mut b) } else { (&mut b, &mut a) };
    assert_eq!(win.expect("ABK").await, format!("ABK{winner}|2;10"), "gold won");
    win.expect("OAKO").await; // the winner's item
    win.send("GQ\n").await;
    win.expect("GV").await;
    win.send("CJ\n").await; // `AKS.Channels.join()` after GV sends "CJ" (SWF6) …
    win.expect("CJKFrance").await;
    lose.send("GQ\n").await;
    lose.expect("GV").await;
    lose.send("CJundefined\n").await; // … or "CJundefined" (SWF7+ coercion)
    lose.expect("CJKFrance").await;
    assert!(win.expect("CM|+").await.starts_with("CM|+"));
    lose.send("CL\n").await;
    assert_eq!(lose.expect("CLK").await.matches('|').count(), 2);

    // ── persistence + second login under a new key ──
    drop(c);
    drop(v);
    a.ws.close(None).await.unwrap();
    b.ws.close(None).await.unwrap();
    let saved: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&store).unwrap()).unwrap();
    assert_eq!(saved["characters"].as_object().unwrap().len(), 2);
    assert_eq!(saved["accounts"]["bo"]["friends"][0], "ali");
    tokio::time::sleep(Duration::from_millis(100)).await;
    let mut again = Client::connect(&addr).await;
    assert_ne!(again.key, a.key);
    assert_eq!(again.login("bo", "pass").await, "AlKfr");
    let mut wrong = Client::connect(&addr).await;
    assert_eq!(wrong.login("ali", "dofus2005").await, "AlEf");
    again.send("PL\n").await;
    assert!(again.expect("ALK|").await.contains(";Bobby;"));
    let _ = std::fs::remove_file(&store);
}

#[tokio::test]
async fn timers_end_placement_and_turns_and_a_leaver_loses() {
    let store = std::env::temp_dir().join(format!("dofus-it-timers-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: Some(300), placement_ms: Some(300) }).await;
    let data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
    let (mut a, mut b) = (Client::connect(&addr).await, Client::connect(&addr).await);
    assert_eq!(a.register("feca", "shield").await, "AlKfr");
    assert_eq!(b.register("sram", "shadow").await, "AlKfr");
    enter(&mut a, "PAFeca|1|0|-1|-1|-1\n", "Feca").await;
    enter(&mut b, "PASram|4|1|-1|-1|-1\n", "Sram").await;
    let map = data.maps[1].id;
    a.send(&format!("GC2Arena|{map}|AA|secret\n")).await;
    a.until("GM|+").await;
    b.send("GJ2Arena|wrong\n").await;
    b.expect("GJEp").await;
    b.send("GJ2Arena|secret\n").await;
    b.until("GM|").await;
    a.expect("GM|+").await;
    a.send("GS\n").await;
    for cl in [&mut a, &mut b] {
        cl.expect("GPS").await;
        cl.send("GD\n").await;
        cl.expect("GDM|").await;
        cl.send("GR\n").await;
    }
    for cl in [&mut a, &mut b] {
        cl.expect("GR").await; // everybody built the map: placement (and its timer) starts
    }
    // Nobody picks a cell: the placement timer places everyone and starts the fight.
    let places = &data.maps[1].places;
    for cl in [&mut a, &mut b] {
        assert_eq!(cl.expect("GIC|").await, format!("GIC|{};{};1|{};{};3", a_id(&cl.log), places[0][0], b_id(&cl.log), places[1][0]));
        cl.expect("GS").await;
        cl.expect("GTL|").await;
        cl.expect(&format!("GTS{}|300", a_id(&cl.log))).await;
    }
    // Malformed actions from the current fighter (any text can come through `/c`): refused with `GAF` alone.
    let (ida, idb) = (a.id, b.id);
    for junk in ["GAé\n", "GA3é0\n", "GA300é;1\n"] {
        a.send(junk).await;
        assert_eq!(a.expect("GAF").await, format!("GAF{ida}"));
    }
    // The turn timer ends A's turn.
    for cl in [&mut a, &mut b] {
        assert_eq!(cl.expect("GTF").await, format!("GTF{ida}"));
        assert_eq!(cl.expect("GTS").await, format!("GTS{idb}|300"));
    }
    // B leaves during its own turn: GTF, GM|-id, then A wins alone; the leaver is listed as a dead loser without XP
    // (the client keeps its record after `GM|-id`, so the result panel can name it).
    b.ws.close(None).await.unwrap();
    assert_eq!(a.expect("GTF").await, format!("GTF{idb}"));
    assert_eq!(a.expect("GM|-").await, format!("GM|-{idb}"));
    let ge = a.expect("GE").await;
    assert_eq!(ge, format!("GE{ida}|2;{ida};1;0;0;44;110;44;10|0;{idb};1;1;0;0;110;0;0"));
    a.expect("ABK").await;
    let _ = std::fs::remove_file(&store);
}

/// Random games (state 3): "Jouer seul" (`GC3` + `Gs`) matches two players; a party built with invitations (refused,
/// withdrawn, accepted), a random slot added and removed, then searching, is matched against two solo players.
#[tokio::test]
async fn random_games_match_solo_players_and_parties() {
    let store = std::env::temp_dir().join(format!("dofus-it-random-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: Some(60_000), placement_ms: Some(60_000) }).await;
    let mut cl = Vec::new();
    for (i, (acc, pa, name)) in [
        ("rnda", "PARanda|1|0|-1|-1|-1\n", "Randa"),
        ("rndb", "PARandb|2|1|-1|-1|-1\n", "Randb"),
        ("rndc", "PARandc|3|0|-1|-1|-1\n", "Randc"),
        ("rndd", "PARandd|4|1|-1|-1|-1\n", "Randd"),
    ]
    .into_iter()
    .enumerate()
    {
        let mut c = Client::connect(&addr).await;
        assert_eq!(c.register(acc, &format!("pw{i}")).await, "AlKfr");
        enter(&mut c, pa, name).await;
        cl.push(c);
    }
    let [mut a, mut b, mut c, mut d] = <[Client; 4]>::try_from(cl).ok().unwrap();
    let (ida, idb, idc, idd) = (a.id, b.id, c.id, d.id);
    let team_of =
        |gm: &str, id: u32| gm.split("|+").find(|e| e.starts_with(&format!("{id};"))).map(|e| e.split(';').nth(11).unwrap().to_string());

    // ── "Jouer seul": A searches alone, B too → matched 1v1 ──
    a.send("GC3\n").await;
    a.send("Gs\n").await;
    a.expect("GCK|3").await;
    assert!(a.expect("GM|+").await.starts_with(&format!("GM|+{ida};Randa;")));
    a.expect("Gs").await;
    c.send("GL2\n").await;
    assert_eq!(c.expect("GLK").await, "GLK", "random parties are not free games");
    c.send("IG\n").await;
    assert!(c.expect("IG").await.ends_with("|0|1|0"), "one random game, no free game");
    b.send("GC3\n").await;
    b.send("Gs\n").await;
    b.expect("GCK|3").await;
    b.expect("GM|+").await;
    b.expect("Gs").await;
    for x in [&mut a, &mut b] {
        let gm = x.expect("GM|+").await;
        assert_eq!((team_of(&gm, ida), team_of(&gm, idb)), (Some("0".into()), Some("1".into())), "{gm}");
        x.expect("GPS").await;
        x.send("GD\n").await;
        x.expect("GDM|").await;
    }
    // B leaves during placement: A wins, B is listed as a dead loser
    b.send("GQ\n").await;
    b.expect("GV").await;
    assert_eq!(a.expect("GM|-").await, format!("GM|-{idb}"));
    let ge = a.expect("GE").await;
    assert!(ge.starts_with(&format!("GE{ida}|2;{ida};")) && ge.contains(&format!("|0;{idb};1;1;")), "{ge}");
    a.until("ABK").await;
    a.expect("OAKO").await; // the winner's item
    a.send("GQ\n").await;
    a.expect("GV").await;

    // ── a party: C invites D (refused, withdrawn, accepted), adds and removes a random slot, searches ──
    c.send("GC3\n").await;
    c.expect("GCK|3").await;
    c.expect("GM|+").await;
    c.send(&format!("Gi{idd}\n")).await;
    assert_eq!(d.expect("GY").await, format!("GY{idc}|Randc"));
    d.send(&format!("GY{idc}\n")).await;
    assert_eq!(c.expect("Gi").await, format!("GiC{idd}|Randd"));
    c.send(&format!("Gi{idd}\n")).await;
    d.expect("GY").await;
    c.send(&format!("GU{idd}\n")).await;
    d.expect("Gy").await;
    d.send(&format!("GJ3{idc}|undefined\n")).await; // too late: the invitation was withdrawn
    d.expect("GJEn").await;
    c.send(&format!("Gi{idc}\n")).await; // oneself (only through the console)
    assert_eq!(c.expect("Gi").await, format!("GiE{idc}|Randc"));
    // an invitee who disconnects: the inviter's waiting card goes (IMPOSSIBLE_INVITATION)
    let mut e = Client::connect(&addr).await;
    assert_eq!(e.register("rnde", "pw4").await, "AlKfr");
    enter(&mut e, "PARande|5|0|-1|-1|-1\n", "Rande").await;
    let ide = e.id;
    c.send(&format!("Gi{ide}\n")).await;
    e.expect("GY").await;
    e.ws.close(None).await.unwrap();
    assert_eq!(c.expect("Gi").await, format!("GiE{ide}|Rande"));
    c.send(&format!("Gi{idd}\n")).await;
    d.expect("GY").await;
    d.send(&format!("GJ3{idc}|undefined\n")).await;
    d.expect("GJK|3").await;
    let gm = d.expect("GM|+").await;
    assert!(gm.contains(&format!("+{idc};")) && gm.contains(&format!("+{idd};")), "{gm}");
    assert!(c.expect("GM|+").await.starts_with(&format!("GM|+{idd};Randd;")));
    c.send("Gi0\n").await;
    for x in [&mut c, &mut d] {
        x.expect("GM|+0").await;
    }
    c.send("GU0\n").await;
    for x in [&mut c, &mut d] {
        x.expect("GM|-0").await;
    }
    c.send("BW\n").await;
    assert!(c.expect("AW|").await.starts_with("AW|rndc|Randc|3|#"), "whois: in a random game");
    c.send("Gs\n").await;
    for x in [&mut c, &mut d] {
        x.expect("Gs").await;
    }
    // ── A and B search alone: they make the opposing team ──
    for x in [&mut a, &mut b] {
        x.send("GC3\n").await;
        x.send("Gs\n").await;
        x.expect("GCK|3").await;
        x.expect("GM|+").await;
        x.expect("Gs").await;
    }
    for x in [&mut a, &mut b, &mut c, &mut d] {
        let gm = x.expect("GM|+").await;
        let teams: Vec<Option<String>> = [idc, idd, ida, idb].iter().map(|&i| team_of(&gm, i)).collect();
        assert_eq!(teams, ["0", "0", "1", "1"].map(|t| Some(t.to_string())), "{gm}");
        x.expect("GPS").await;
    }
    let _ = std::fs::remove_file(&store);
}

/// Ids from the `GM` frames a client received: creator (team 0) and joiner (team 1).
fn a_id(log: &[String]) -> String {
    gm_ids(log)[0].clone()
}
fn b_id(log: &[String]) -> String {
    gm_ids(log)[1].clone()
}
fn gm_ids(log: &[String]) -> Vec<String> {
    let mut ids: Vec<(String, String)> = log
        .iter()
        .filter(|f| f.starts_with("GM|+"))
        .flat_map(|f| {
            f.split("|+")
                .skip(1)
                .map(|e| e.split(';').collect::<Vec<_>>())
                .filter(|e| e.len() == 13)
                .map(|e| (e[11].to_string(), e[0].to_string()))
                .collect::<Vec<_>>()
        })
        .collect();
    ids.sort();
    ids.dedup();
    ids.into_iter().map(|(_, id)| id).collect()
}

/// Character creation + selection with the authored `GW` ("Rejoindre la carte"): the village map, then the `GM` of
/// every occupant (no `GAx;3`). Returns that `GM`.
async fn enter_social(c: &mut Client, pa: &str, name: &str) -> String {
    c.send("PL\n").await;
    c.expect("ALK").await;
    c.send(pa).await;
    c.expect("AAK").await;
    let al = c.expect("ALK|").await;
    c.id = al.split('|').find(|e| e.split(';').nth(1) == Some(name)).unwrap().split(';').next().unwrap().parse().unwrap();
    c.send(&format!("PS{}\n", c.id)).await;
    c.send("GW\n").await;
    c.expect("ASK|").await;
    c.send("GC1\n").await;
    c.expect("GCK|1").await;
    c.send("GD\n").await;
    assert_eq!(c.expect("GDM|").await.split('|').nth(4), Some("1"));
    c.expect("GM|+").await
}

/// The village as a social map: two `GW` sessions see each other, walk (other occupants block), chat with bubbles
/// (`cM` with the sender id) and see each other leave; a normal session still bounces to the multiplayer screen.
#[tokio::test]
async fn social_village_map() {
    let store = std::env::temp_dir().join(format!("dofus-it-social-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: None, placement_ms: None }).await;
    let data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
    let village = data.maps.iter().find(|m| m.id == data.rules.village_map).unwrap();
    let map = &data.map_index[&village.id];
    let (mut a, mut b, mut c) = (Client::connect(&addr).await, Client::connect(&addr).await, Client::connect(&addr).await);
    for (cl, acc) in [(&mut a, "soca"), (&mut b, "socb"), (&mut c, "socc")] {
        assert_eq!(cl.register(acc, "pw").await, "AlKfr");
    }
    // A alone; B on another walkable cell, with A in its GM (solo layout …;cell;dir); A gets B's entry.
    let cell = |gm: &str| gm.rsplit('|').next().unwrap().split(';').nth(10).unwrap().parse::<i64>().unwrap();
    let gm = enter_social(&mut a, "PASoca|1|0|-1|-1|-1\n", "Soca").await;
    let p0 = cell(&gm);
    assert_eq!(gm, format!("GM|+{};Soca;1;1;0;10;-1;-1;-1;;{p0};1", a.id));
    let gm = enter_social(&mut b, "PASocb|2|1|-1|-1|-1\n", "Socb").await;
    let p1 = cell(&gm);
    assert!(p1 != p0 && map.walkable(p0) && map.walkable(p1), "spawn cells {p0}, {p1}");
    let entry_b = format!("+{};Socb;1;2;1;21;-1;-1;-1;;{p1};1", b.id);
    assert_eq!(gm, format!("GM|+{};Soca;1;1;0;10;-1;-1;-1;;{p0};1|{entry_b}", a.id));
    assert_eq!(a.expect("GM|").await, format!("GM|{entry_b}"));
    // A normal "Jouer" session goes through the village to the multiplayer screen; the occupants see nothing.
    enter(&mut c, "PASocc|3|0|-1|-1|-1\n", "Socc").await;
    // A walks: the server's path to the requested end cell, broadcast to both (A acknowledges with GKK).
    let none = HashSet::new();
    let walk = |from: i64, to: i64, occ: &HashSet<i64>| {
        let (path, _) = path_find(map, occ, &none, false, 500, from, to).unwrap();
        compress_path(&path.iter().map(|&(c, d)| (c as i32, d)).collect::<Vec<_>>())
    };
    let occ = HashSet::from([p0, p1]);
    let far = village.places[1][0];
    a.send(&format!("GA001{}\n", walk(p0, far, &occ))).await;
    let ga = format!("GA1;1;{};{}{}", a.id, cell_code(p0 as i32), walk(p0, far, &occ));
    assert_eq!(a.expect("GA").await, ga);
    assert_eq!(b.expect("GA").await, ga);
    a.send("GKK1\n").await;
    // The stored cell moved: the next walk starts on `far`. A move onto B's cell is refused (GAF to A only).
    let occ = HashSet::from([far, p1]);
    a.send(&format!("GA001{}\n", compress_path(&[(p1 as i32, 1)]))).await;
    assert_eq!(a.expect("GAF").await, format!("GAF{}", a.id));
    a.send(&format!("GA001{}\n", compress_path(&[(far as i32, 1)]))).await; // onto its own cell (only via `/c`)
    assert_eq!(a.expect("GAF").await, format!("GAF{}", a.id));
    a.send(&format!("GA001{}\n", walk(far, p0, &occ))).await;
    let ga = format!("GA2;1;{};{}{}", a.id, cell_code(far as i32), walk(far, p0, &occ));
    assert_eq!(a.expect("GA").await, ga);
    assert_eq!(b.expect("GA").await, ga);
    // A clicks again while walking: `GKE2|<cell reached>` (a cell of that walk only), then the new walk starts there.
    let mid = path_find(map, &occ, &none, false, 500, far, p0).unwrap().1[3].0;
    a.send(&format!("GKE2|{p1}\n")).await; // not on the walk: ignored
    a.send(&format!("GKE2|{mid}\n")).await;
    let occ = HashSet::from([mid, p1]);
    a.send(&format!("GA001{}\n", walk(mid, p0, &occ))).await;
    let ga = format!("GA3;1;{};{}{}", a.id, cell_code(mid as i32), walk(mid, p0, &occ));
    assert_eq!(a.expect("GA").await, ga);
    assert_eq!(b.expect("GA").await, ga);
    // Chat: `BM*` goes to every occupant with the sender's id (the bubble over its sprite); not to the lobby.
    b.send("BM*|Salut Soca\n").await;
    let line = format!("cMK|{}|Socb|Salut Soca", b.id);
    for cl in [&mut a, &mut b] {
        assert_eq!(cl.expect("cMK").await, line);
    }
    c.send("BM*|lobby\n").await;
    assert_eq!(c.expect("cMK").await, format!("cMK|{}|Socc|lobby", c.id));
    // "Retour au village" (`GC1` from the lobby): past its first bounce, the normal session lands on the shared map.
    c.send("GC1\n").await;
    c.expect("GCK|1").await;
    c.send("GD\n").await;
    c.expect("GDM|").await;
    let gm = c.expect("GM|+").await;
    assert!(gm.contains(&format!("+{};Soca;", a.id)) && gm.contains(&format!("+{};Socc;", c.id)), "{gm}");
    for cl in [&mut a, &mut b] {
        assert!(cl.expect("GM|").await.starts_with(&format!("GM|+{};Socc;", c.id)));
    }
    // B drops: A sees it go.
    b.ws.close(None).await.unwrap();
    assert_eq!(a.expect("GM|-").await, format!("GM|-{}", b.id));
    a.send("IC\n").await;
    assert_eq!(a.expect("IC").await, "IC2");
    let _ = std::fs::remove_file(&store);
}

/// World maps: a walk that ends on a map-change plate (on `GKK`) moves the walker to the linked map. The old map's
/// occupants see it go, the walker forgets them, gets its own entry on the arrival cell, the new map and its
/// occupants; the new map's occupants see it come. Walking back onto the plate it arrived on returns.
#[tokio::test]
async fn village_plates_change_maps() {
    let store = std::env::temp_dir().join(format!("dofus-it-travel-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: None, placement_ms: None }).await;
    let data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
    let home = data.rules.village_map;
    let (&plate, &(to, arrival)) = data.world[&home].links.iter().min().unwrap();
    let (m0, m1) = (&data.world[&home].map, &data.world[&to].map);
    let (mut a, mut b) = (Client::connect(&addr).await, Client::connect(&addr).await);
    for (cl, acc) in [(&mut a, "trava"), (&mut b, "travb")] {
        assert_eq!(cl.register(acc, "pw").await, "AlKfr");
    }
    let last_cell = |gm: &str| gm.rsplit('|').next().unwrap().split(';').nth(10).unwrap().parse::<i64>().unwrap();
    let p0 = last_cell(&enter_social(&mut a, "PATrava|1|0|-1|-1|-1\n", "Trava").await);
    let p1 = last_cell(&enter_social(&mut b, "PATravb|2|1|-1|-1|-1\n", "Travb").await);
    a.expect("GM|+").await;
    let none = HashSet::new();
    let path = |map: &Map, from: i64, to: i64, occ: &[i64]| {
        let (p, _) = path_find(map, &occ.iter().copied().collect(), &none, false, 500, from, to).unwrap();
        compress_path(&p.iter().map(|&(c, d)| (c as i32, d)).collect::<Vec<_>>())
    };
    // Walk `cl` from `from` to `to`; every listed client sees the GA; the walker acknowledges it.
    async fn walk(cl: &mut Client, others: &mut [&mut Client], p: String) {
        cl.send(&format!("GA001{p}\n")).await;
        let ga = cl.expect("GA").await;
        for o in others.iter_mut() {
            assert_eq!(o.expect("GA").await, ga);
        }
        cl.send(&format!("GKK{}\n", &ga[2..ga.find(';').unwrap()])).await;
    }
    let entry = |gm: &str, id: u32, cell: i64| {
        gm.split("|+").any(|e| e.starts_with(&format!("{id};")) && e.split(';').nth(10) == Some(&cell.to_string()))
    };
    // A onto the plate: B sees A go; A forgets B, gets its entry on the arrival plate, the new map and its occupants (A).
    walk(&mut a, &mut [&mut b], path(m0, p0, plate, &[p0, p1])).await;
    assert_eq!(b.expect("GM|-").await, format!("GM|-{}", a.id));
    assert_eq!(a.expect("GM|-").await, format!("GM|-{}", b.id));
    assert!(entry(&a.expect("GM|+").await, a.id, arrival));
    assert_eq!(a.expect("GDM|").await, format!("GDM|{to}|{}|{}|1|{}|{}", m1.width, m1.height, m1.background, m1.data));
    let gm = a.expect("GM|+").await;
    assert!(gm.matches("|+").count() == 1 && entry(&gm, a.id, arrival), "{gm}");
    // B follows onto the same plate: A stands on the arrival plate, so B lands on the free walkable cell nearest it.
    walk(&mut b, &mut [], path(m0, p1, plate, &[p1])).await;
    let b_at = last_cell(&b.expect("GM|+").await);
    assert!(b_at != arrival && m1.walkable(b_at) && distance(b_at, arrival, m1.width as i64) <= 2, "{b_at}");
    assert_eq!(b.expect("GDM|").await.split('|').nth(1), Some(to.to_string().as_str()));
    let gm = b.expect("GM|+").await;
    assert!(entry(&gm, a.id, arrival) && entry(&gm, b.id, b_at), "{gm}");
    assert!(entry(&a.expect("GM|+").await, b.id, b_at), "A sees B arrive");
    // A steps off the plate (a plain walk), then back onto it: back home, on the plate that leads here.
    let off = (0..m1.cells.len() as i64)
        .find(|&c| m1.walkable(c) && c != b_at && !data.world[&to].links.contains_key(&c) && distance(c, arrival, m1.width as i64) == 1)
        .unwrap();
    walk(&mut a, &mut [&mut b], path(m1, arrival, off, &[arrival, b_at])).await;
    walk(&mut a, &mut [&mut b], path(m1, off, arrival, &[off, b_at])).await;
    assert_eq!(b.expect("GM|-").await, format!("GM|-{}", a.id));
    assert_eq!(a.expect("GM|-").await, format!("GM|-{}", b.id));
    let (back, home_plate) = data.world[&to].links[&arrival];
    assert_eq!((back, data.world[&home].links[&home_plate].0), (home, to), "the plate it arrived on leads back");
    assert!(entry(&a.expect("GM|+").await, a.id, home_plate));
    assert_eq!(a.expect("GDM|").await.split('|').nth(1), Some(home.to_string().as_str()));
    assert!(entry(&a.expect("GM|+").await, a.id, home_plate));
    // Chat stays per map: B alone hears itself.
    b.send("BM*|seul\n").await;
    assert_eq!(b.expect("cMK").await, format!("cMK|{}|Travb|seul", b.id));
    a.send("IC\n").await;
    assert_eq!(a.expect("IC").await, "IC2", "nothing else reached A");
    let _ = std::fs::remove_file(&store);
}

/// Accounts: the authored register frame (`<login>\n+<crypt>`) creates the account and logs in; a login never creates one.
#[tokio::test]
async fn register_then_login() {
    let store = std::env::temp_dir().join(format!("dofus-it-register-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: None, placement_ms: None }).await;
    let mut first = Client::connect(&addr).await;
    assert_eq!(first.register("neo", "matrix").await, "AlKfr");
    first.ws.close(None).await.unwrap();
    tokio::time::sleep(Duration::from_millis(100)).await;
    let mut again = Client::connect(&addr).await;
    assert_eq!(again.login("neo", "matrix").await, "AlKfr");
    assert_eq!(Client::connect(&addr).await.login("neo", "matrox").await, "AlEf"); // wrong password
    assert_eq!(Client::connect(&addr).await.login("nobody", "matrix").await, "AlEf"); // unknown account
    assert_eq!(Client::connect(&addr).await.register("neo", "other").await, "AlEe"); // already registered
    assert_eq!(Client::connect(&addr).await.login("nobody", "matrix").await, "AlEf"); // the refused login created nothing
                                                                                      // a register frame cut at 200 chars (no trailing `\n`) is refused: the 1-char-shorter login frame could never match it
    let mut cut = Client::connect(&addr).await;
    cut.send("5\n").await;
    cut.send(&format!("{}\n+{}", "a".repeat(32), "a".repeat(166))).await;
    cut.expect("AlEf").await;
    let saved: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&store).unwrap()).unwrap();
    assert_eq!(saved["accounts"].as_object().unwrap().keys().collect::<Vec<_>>(), ["neo"]);
    let _ = std::fs::remove_file(&store);
}

#[tokio::test]
async fn garbage_frames_do_not_kill_the_world() {
    let store = std::env::temp_dir().join(format!("dofus-it-garbage-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: None, placement_ms: None }).await;
    let mut c = Client::connect(&addr).await;
    c.send("5\n").await;
    c.send("é\nRFdAvFlc\n").await; // non-ASCII login
    c.expect("AlEf").await;
    let crypt = crypt_password("pass", &c.key);
    c.send(&format!("garbage\n+{crypt}\n")).await; // register, retrying on the same connection (version already given)
    c.expect("AlKfr").await;
    // Anything can be sent with the `/c` console command (up to 200 chars), before and after selecting a character.
    let junk = [
        "PSé",
        "PAé|é|é|é|é|é",
        "PDé",
        "GJé",
        "GAé",
        "GA3é0",
        "GA300é;1",
        "BMé",
        "GCé",
        "GC2é|é|é|é",
        "Gté",
        "GQé",
        "SMé|é",
        "SBé",
        "SIé",
        "PBé",
        "GW",
        "GKEé|é",
    ];
    for j in junk {
        c.send(&format!("{j}\n")).await;
    }
    c.send(&"é".repeat(200)).await;
    c.send("FL\n").await;
    c.until("FLK").await; // drain the answers to the junk
    enter(&mut c, "PAGarbage|3|0|-1|-1|-1\n", "Garbage").await;
    for j in junk {
        c.send(&format!("{j}\n")).await;
    }
    c.send(&"é".repeat(200)).await;
    c.send("IC\n").await;
    c.until("IC").await; // the world task survived every frame
    let _ = std::fs::remove_file(&store);
}

/// The shared map and the lobby: smileys reach every occupant of the map (only the sender in a channel); the authored
/// `GX` (banner menu "Aller aux combats") takes a "Jouer" session and a `GW` session off the map to the multiplayer
/// screen (`GM|-` to the occupants, `GAx;3`), and "Retour au village" (`GC1` + `GD`) brings them back; a repeated `CJ`
/// for the channel one is already in gets `CJK` without a second `CM|+`.
#[tokio::test]
async fn map_to_lobby_smileys_and_repeated_cj() {
    let store = std::env::temp_dir().join(format!("dofus-it-polish-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: None, placement_ms: None }).await;
    let (mut a, mut b, mut c) = (Client::connect(&addr).await, Client::connect(&addr).await, Client::connect(&addr).await);
    for (cl, acc) in [(&mut a, "pola"), (&mut b, "polb"), (&mut c, "polc")] {
        assert_eq!(cl.register(acc, "pw").await, "AlKfr");
    }
    enter_social(&mut a, "PAPola|1|0|-1|-1|-1\n", "Pola").await;
    enter(&mut b, "PAPolb|2|1|-1|-1|-1\n", "Polb").await; // a "Jouer" session: bounced to the multiplayer screen
    enter(&mut c, "PAPolc|3|0|-1|-1|-1\n", "Polc").await;
    let (ida, idb, idc) = (a.id, b.id, c.id);
    c.send("CJ\n").await;
    c.expect("CJKFrance").await;
    b.send("CJ\n").await;
    b.expect("CJKFrance").await;
    assert_eq!(c.expect("CM|").await, "CM|+Polb;1;21");
    // "Retour au village" from the lobby: B lands on the shared map with A.
    async fn to_map(cl: &mut Client, lobby: &mut Client, others: &mut Client) {
        cl.send("GC1\n").await;
        cl.expect("GCK|1").await;
        assert!(lobby.expect("CM|-").await.starts_with("CM|-"));
        cl.send("GD\n").await;
        cl.expect("GDM|").await;
        let gm = cl.expect("GM|+").await;
        assert!(gm.contains(&format!("+{};", cl.id)) && gm.contains(&format!("+{};", others.id)), "{gm}");
        assert!(others.expect("GM|+").await.starts_with(&format!("GM|+{};", cl.id)));
    }
    to_map(&mut b, &mut c, &mut a).await;
    // Smileys: to every occupant of the map (the sprite is drawn on each client); in a channel only to the sender.
    a.send("BS3\n").await;
    for cl in [&mut a, &mut b] {
        assert_eq!(cl.expect("cS").await, format!("cS{ida}|3"));
    }
    c.send("BS5\n").await;
    assert_eq!(c.expect("cS").await, format!("cS{idc}|5"));
    // B ("Jouer" session) takes the menu's "Aller aux combats": A sees it go, B is sent to the multiplayer screen.
    b.send("GX\n").await;
    assert_eq!(a.expect("GM|-").await, format!("GM|-{idb}"));
    assert_eq!(b.expect("GA").await, format!("GAx;3;{idb}"));
    b.send("CJ\n").await; // the multiplayer screen's combo
    b.expect("CJKFrance").await;
    assert_eq!(c.expect("CM|").await, "CM|+Polb;1;21");
    b.send("CJ\n").await; // a second `CJ` for the same channel: `CJK` again, nothing to the others
    b.expect("CJKFrance").await;
    c.send("IC\n").await;
    c.expect("IC").await;
    b.send("GX\n").await; // off the map: ignored
    b.send("IC\n").await;
    b.expect("IC").await;
    to_map(&mut b, &mut c, &mut a).await;
    // A (`GW` session) too, and back.
    a.send("GX\n").await;
    assert_eq!(b.expect("GM|-").await, format!("GM|-{ida}"));
    assert_eq!(a.expect("GA").await, format!("GAx;3;{ida}"));
    a.send("CJ\n").await;
    a.expect("CJKFrance").await;
    assert_eq!(c.expect("CM|").await, "CM|+Pola;1;10");
    to_map(&mut a, &mut c, &mut b).await;
    // "Retour au village" from a game lobby: `GQ` + `GC1`, then `GV` → `onLeave` sends a `CJ` before the `GD`. That `CJ`
    // gets no `CJK` (its onJoin would reset the client's game state after `GCK|1`) and the channel sees nothing.
    b.send("GX\n").await;
    a.expect("GM|-").await;
    b.expect("GAx;3;").await;
    b.send("CJ\n").await;
    b.expect("CJKFrance").await;
    c.expect("CM|+").await;
    b.send(&format!("GC2Lobby|{}|AA|\n", GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap().maps[0].id)).await;
    b.until("GM|+").await;
    c.expect("CM|-").await;
    for f in ["GQ\n", "GC1\n", "CJ\n", "GD\n"] {
        b.send(f).await;
    }
    b.expect("GV").await;
    b.expect("GCK|1").await;
    b.expect("GDM|").await;
    assert!(b.expect("GM|+").await.contains(&format!("+{ida};")));
    assert!(a.expect("GM|+").await.starts_with(&format!("GM|+{idb};")));
    c.send("IC\n").await;
    c.expect("IC").await;
    let _ = std::fs::remove_file(&store);
}

/// A pending random-team invitation is withdrawn when the invitee enters a game: its own party ("Jouer", `GC3`) or a
/// free game (`GC2`). The inviter's waiting card goes (`GiE`), the invitee's box closes (`Gy`).
#[tokio::test]
async fn invitation_withdrawn_when_the_invitee_enters_a_game() {
    let store = std::env::temp_dir().join(format!("dofus-it-invite-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: None, placement_ms: None }).await;
    let data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
    let (mut c, mut d, mut e) = (Client::connect(&addr).await, Client::connect(&addr).await, Client::connect(&addr).await);
    for (cl, acc, pa, name) in [
        (&mut c, "invc", "PAInvc|1|0|-1|-1|-1\n", "Invc"),
        (&mut d, "invd", "PAInvd|2|1|-1|-1|-1\n", "Invd"),
        (&mut e, "inve", "PAInve|3|0|-1|-1|-1\n", "Inve"),
    ] {
        assert_eq!(cl.register(acc, "pw").await, "AlKfr");
        enter(cl, pa, name).await;
    }
    let (idd, ide) = (d.id, e.id);
    c.send("GC3\n").await;
    c.expect("GCK|3").await;
    c.expect("GM|+").await;
    c.send(&format!("Gi{idd}\n")).await;
    d.expect("GY").await;
    d.send("GC3\n").await; // D clicks "Jouer" instead of answering
    d.expect("Gy").await;
    d.expect("GCK|3").await;
    assert_eq!(c.expect("Gi").await, format!("GiE{idd}|Invd"));
    c.send(&format!("Gi{ide}\n")).await;
    e.expect("GY").await;
    e.send(&format!("GC2Solo|{}|AA|\n", data.maps[0].id)).await; // E creates a free game
    e.expect("GCK|2|").await;
    e.expect("GM|+").await;
    e.expect("Gy").await;
    assert_eq!(c.expect("Gi").await, format!("GiE{ide}|Inve"));
    e.send(&format!("GJ3{}|undefined\n", c.id)).await; // too late
    e.expect("GJEa").await;
    let _ = std::fs::remove_file(&store);
}

/// Match-making prefers the nearest level without delaying a match: three parties of one member and a random slot
/// search (the second one's member is level 5), then two players search alone. The oldest party is matched against
/// the third (same level), not the second; the second keeps waiting.
#[tokio::test]
async fn matchmaking_prefers_the_nearest_level() {
    let store = std::env::temp_dir().join(format!("dofus-it-level-{}.json", std::process::id()));
    let data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
    // A level-5 character: created on a first server, then its level (and the XP it needs) written into the store.
    let first = start_server(&store, net::Overrides { turn_ms: None, placement_ms: None }).await;
    let mut setup = Client::connect(&first).await;
    assert_eq!(setup.register("lvlb", "pw").await, "AlKfr");
    setup.send("PALvlb|2|1|-1|-1|-1\n").await;
    setup.expect("AAK").await;
    setup.expect("ALK").await;
    let mut saved: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&store).unwrap()).unwrap();
    for ch in saved["characters"].as_object_mut().unwrap().values_mut() {
        (ch["level"], ch["xp"]) = (5.into(), data.rules.xp[4].into());
    }
    std::fs::write(&store, serde_json::to_string(&saved).unwrap()).unwrap();
    let addr = reopen_server(&store).await;
    let mut cl = Vec::new();
    for (acc, pa, name) in [
        ("lvla", "PALvla|1|0|-1|-1|-1\n", "Lvla"),
        ("lvlb", "", "Lvlb"),
        ("lvlc", "PALvlc|3|0|-1|-1|-1\n", "Lvlc"),
        ("lvls", "PALvls|4|1|-1|-1|-1\n", "Lvls"),
        ("lvlt", "PALvlt|5|0|-1|-1|-1\n", "Lvlt"),
    ] {
        let mut c = Client::connect(&addr).await;
        if pa.is_empty() {
            assert_eq!(c.login(acc, "pw").await, "AlKfr");
            c.send("PL\n").await;
            let al = c.expect("ALK|").await;
            assert!(al.contains(&format!(";{name};5;")), "{al}");
            c.send(&format!("PS{}\n", al[4..].split(';').next().unwrap())).await;
            c.id = al[4..].split(';').next().unwrap().parse().unwrap();
            c.until("ASK|").await;
            c.send("GC1\n").await;
            c.send("GD\n").await;
            c.until("GAx;3;").await;
        } else {
            assert_eq!(c.register(acc, "pw").await, "AlKfr");
            enter(&mut c, pa, name).await;
        }
        cl.push(c);
    }
    let [mut a, mut b, mut c, mut s, mut t] = <[Client; 5]>::try_from(cl).ok().unwrap();
    for p in [&mut a, &mut b, &mut c] {
        p.send("GC3\n").await;
        p.expect("GCK|3").await;
        p.expect("GM|+").await;
        p.send("Gi0\n").await;
        p.expect("GM|+0").await;
        p.send("Gs\n").await;
        p.expect("Gs").await;
    }
    for x in [&mut s, &mut t] {
        x.send("GC3\n").await;
        x.send("Gs\n").await;
        x.expect("GCK|3").await;
        x.expect("GM|+").await;
        x.expect("Gs").await;
    }
    let (ida, idc, ids, idt) = (a.id, c.id, s.id, t.id);
    for p in [&mut a, &mut c] {
        p.expect("GM|-0").await;
    }
    for x in [&mut a, &mut c, &mut s, &mut t] {
        let gm = x.expect("GM|+").await;
        let mut ids_in: Vec<u32> = gm.split("|+").skip(1).map(|e| e.split(';').next().unwrap().parse().unwrap()).collect();
        ids_in.sort();
        let mut want = vec![ida, idc, ids, idt];
        want.sort();
        assert_eq!(ids_in, want, "{gm}");
        x.expect("GPS").await;
    }
    b.send("IC\n").await;
    b.expect("IC").await; // the level-5 party is still searching, nothing reached it
    drop(setup);
    let _ = std::fs::remove_file(&store);
}

/// A second server on an existing store file (start_server deletes it first).
async fn reopen_server(store: &Path) -> String {
    reopen_with(store, GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap()).await
}

async fn reopen_with(store: &Path, data: GameData) -> String {
    let world = World::new(data, Store::open(Some(store.to_path_buf())), 42);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap().to_string();
    tokio::spawn(net::serve(listener, world, net::Overrides { turn_ms: None, placement_ms: None }));
    addr
}

/// Items: the winner of a fight gets one (`OAKO<entry>` after its `ABK`), it is in `ASK` part 30 on every later
/// selection; `OM` equips it only into a slot that takes it (no answer), `OM…|-1` puts it back in the bag, `OD` drops it
/// (`ODK`); `OM`/`OD` are ignored while in a game (the client refuses them there).
#[tokio::test]
async fn items_awarded_equipped_persisted_and_dropped() {
    let store = std::env::temp_dir().join(format!("dofus-it-items-{}.json", std::process::id()));
    let addr = start_server(&store, net::Overrides { turn_ms: Some(60_000), placement_ms: Some(60_000) }).await;
    let data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
    let (mut a, mut b) = (Client::connect(&addr).await, Client::connect(&addr).await);
    assert_eq!(a.register("itema", "loot").await, "AlKfr");
    assert_eq!(b.register("itemb", "loot").await, "AlKfr");
    let ask = enter(&mut a, "PALooter|8|0|-1|-1|-1\n", "Looter").await;
    assert_eq!(ask[30], "", "no item yet");
    enter(&mut b, "PALoser|9|1|-1|-1|-1\n", "Loser").await;
    let (ida, idb) = (a.id, b.id);
    let map = data.maps[0].id;
    a.send(&format!("GC2Loot|{map}|AA|\n")).await;
    a.until("GM|+").await;
    b.send("GJ2Loot|\n").await;
    b.until("GM|").await;
    a.expect("GM|+").await;
    a.send("GS\n").await;
    for cl in [&mut a, &mut b] {
        cl.expect("GPS").await;
    }
    // B leaves: A wins and gets an item after its gold.
    b.send("GQ\n").await;
    b.expect("GV").await;
    assert_eq!(a.expect("GM|-").await, format!("GM|-{idb}"));
    assert!(a.expect("GE").await.starts_with(&format!("GE{ida}|2;{ida};")));
    a.until("ABK").await;
    let entry = a.expect("OAKO").await[4..].to_string();
    let f: Vec<&str> = entry.split('~').collect();
    let hex = |s: &str| u32::from_str_radix(s, 16).unwrap();
    let (id, kind) = (hex(f[0]), hex(f[1]));
    assert_eq!(f[4], "", "awarded into the bag");
    // Still in the (ended) game: OD is ignored.
    a.send(&format!("OD{id}\n")).await;
    a.send("IC\n").await;
    a.expect("IC").await;
    a.send("GQ\n").await;
    a.expect("GV").await;
    // The village (shared map after the first bounce): a slot of another super type is refused, the right one taken.
    a.send("GC1\n").await;
    a.expect("GCK|1").await;
    a.send("GD\n").await;
    a.expect("GDM|").await;
    a.expect("GM|+").await;
    let slot = (0..6).find(|&s| data.items.can_equip(8, kind, s)).expect("the drop is an item the winner can equip");
    let wrong = (0..6).find(|&s| !data.items.can_equip(8, kind, s)).unwrap();
    a.send(&format!("OM{id}|{wrong}\n")).await;
    a.send(&format!("OM{id}|{slot}\n")).await;
    // An equipped karma effect (123 = 0x7b) adds its p1 to karma (stat 13).
    let karma: u32 = f[5].split(',').filter_map(|e| e.strip_prefix("7b#")).map(|p| hex(p.split('#').next().unwrap())).sum();
    if karma > 0 {
        assert_eq!(a.expect("ABK").await, format!("ABK{ida}|13;{karma}"));
    }
    a.send("IC\n").await;
    a.expect("IC").await;
    // Persisted: a new connection sees it equipped in ASK part 30.
    a.ws.close(None).await.unwrap();
    tokio::time::sleep(Duration::from_millis(100)).await;
    let mut a = Client::connect(&addr).await;
    assert_eq!(a.login("itema", "loot").await, "AlKfr");
    async fn select(a: &mut Client, id: u32) -> String {
        a.send(&format!("PS{id}\n")).await;
        a.expect("ASK|").await.split('|').nth(30).unwrap().to_string()
    }
    assert_eq!(select(&mut a, ida).await, [f[0], f[1], f[2], f[3], &format!("{slot:x}"), f[5]].join("~"));
    // Back to the bag, then dropped.
    a.send(&format!("OM{id}|-1\n")).await;
    if karma > 0 {
        assert_eq!(a.expect("ABK").await, format!("ABK{ida}|13;0"));
    }
    assert_eq!(select(&mut a, ida).await, entry);
    a.send(&format!("OD{id}\n")).await;
    assert_eq!(a.expect("ODK").await, format!("ODK{id}"));
    a.send(&format!("OD{id}\n")).await; // already gone: nothing
    assert_eq!(select(&mut a, ida).await, "");
    let saved: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&store).unwrap()).unwrap();
    assert_eq!(saved["characters"][ida.to_string()]["items"], serde_json::json!([]));
    assert_eq!(saved["next_item"], 2);
    let _ = std::fs::remove_file(&store);
}

/// Rules stated by the project owner, on a stored character (level 29, a karma ring in the bag): an equipped karma
/// effect adds its `p1` to karma (`ASK` part 24, `ABK…|13;<karma>` after `OM` and `PB`); a 6th chat line within 15 s
/// gets `M10` and is dropped; reaching the max level at the end of a fight sends `M12` after `AN`.
#[tokio::test]
async fn karma_items_spam_and_max_level_notices() {
    let store = std::env::temp_dir().join(format!("dofus-it-owner-{}.json", std::process::id()));
    let data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
    let first = start_server(&store, net::Overrides { turn_ms: None, placement_ms: None }).await;
    let mut setup = Client::connect(&first).await;
    assert_eq!(setup.register("karma", "pw").await, "AlKfr");
    setup.send("PAKarma|8|0|-1|-1|-1\n").await;
    setup.expect("AAK").await;
    setup.expect("ALK").await;
    let mut saved: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&store).unwrap()).unwrap();
    for ch in saved["characters"].as_object_mut().unwrap().values_mut() {
        (ch["level"], ch["xp"], ch["bonus"]) = (29.into(), (data.rules.xp[29] - 10).into(), 1.into());
        ch["items"] = serde_json::json!([{"id": 1, "type": 9, "gfx": 3, "position": null, "effects": [[123, 3, 0, 0]]}]);
    }
    saved["next_item"] = 2.into();
    std::fs::write(&store, serde_json::to_string(&saved).unwrap()).unwrap();
    let addr = reopen_server(&store).await;
    let mut a = Client::connect(&addr).await;
    assert_eq!(a.login("karma", "pw").await, "AlKfr");
    a.send("PL\n").await;
    a.id = a.expect("ALK|").await[4..].split(';').next().unwrap().parse().unwrap();
    let ida = a.id;
    async fn karma(a: &mut Client) -> String {
        a.send(&format!("PS{}\n", a.id)).await;
        a.expect("ASK|").await.split('|').nth(24).unwrap().to_string()
    }
    assert_eq!(karma(&mut a).await, "0", "in the bag");
    a.send("OM1|2\n").await; // a ring (super type 3) into slot 2
    assert_eq!(a.expect("ABK").await, format!("ABK{ida}|13;3"));
    a.send("PB13\n").await;
    assert_eq!(a.expect("ABK").await, format!("ABK{ida}|13;4|3;0"));
    assert_eq!(karma(&mut a).await, "4");
    a.send("OM1|-1\n").await;
    assert_eq!(a.expect("ABK").await, format!("ABK{ida}|13;1"));
    a.send("OM1|-1\n").await; // karma unchanged: no ABK
    a.send("IC\n").await;
    a.expect("IC").await;
    for i in 1..=6 {
        a.send(&format!("BM*|ligne {i}\n")).await;
    }
    for i in 1..=5 {
        assert_eq!(a.expect("cMK|").await, format!("cMK|{ida}|Karma|ligne {i}"));
    }
    assert_eq!(a.expect("M").await, "M10", "the 6th line within 15 s: SRV_MSG_0, dropped");
    // A wins against a level-1 leaver: round(60600 × 0.4 × 1 / 29) = 836 XP (60600 = XP from 29 to 30) takes it to
    // level 30 (the max level) → `AN`, then `M12`.
    let mut b = Client::connect(&addr).await;
    assert_eq!(b.register("karmb", "pw").await, "AlKfr");
    enter(&mut b, "PAKarmb|9|1|-1|-1|-1\n", "Karmb").await;
    let idb = b.id;
    a.send(&format!("GC2Peak|{}|AA|\n", data.maps[0].id)).await;
    a.until("GM|+").await;
    b.send("GJ2Peak|\n").await;
    b.until("GM|").await;
    a.expect("GM|+").await;
    a.send("GS\n").await;
    for cl in [&mut a, &mut b] {
        cl.expect("GPS").await;
    }
    b.send("GQ\n").await;
    b.expect("GV").await;
    assert_eq!(a.expect("GM|-").await, format!("GM|-{idb}"));
    assert_eq!(a.expect("GE").await, format!("GE{ida}|2;{ida};30;0;621600;826;621600;836;10|0;{idb};1;1;0;0;110;0;0"));
    assert_eq!(a.expect("AN").await, "AN30|621600|622426|621600|5");
    assert_eq!(a.expect("M").await, "M12");
    assert_eq!(a.expect("ABK").await, format!("ABK{ida}|2;10"));
    a.expect("OAKO").await;
    drop(setup);
    let _ = std::fs::remove_file(&store);
}

/// Rules stated by the project owner, on stored characters, the critical odds raised to 1 in 2 (hit) and 1 in 4 (miss),
/// the world RNG seeded (42): the team whose best fighter has the higher initiative (max LP / 4) starts, here team 1;
/// a weapon's AP cost is `ASK` part 28 and is charged, its range stays the client's 1, every damage effect of it fires,
/// a critical adds the bonus to their `p3`; criticals (`301`/`304` after `300`/`303`) and critical misses (`302`/`305`
/// instead, AP spent, then the server ends the turn) happen in a fought duel.
#[tokio::test]
async fn initiative_weapon_close_combat_and_criticals() {
    let store = std::env::temp_dir().join(format!("dofus-it-crit-{}.json", std::process::id()));
    let first = start_server(&store, net::Overrides { turn_ms: None, placement_ms: None }).await;
    let mut setup = Vec::new();
    for (acc, pa) in [("wpna", "PAHammer|5|0|-1|-1|-1\n"), ("wpnb", "PABrute|8|1|-1|-1|-1\n")] {
        let mut c = Client::connect(&first).await;
        assert_eq!(c.register(acc, "pw").await, "AlKfr");
        c.send(pa).await;
        c.expect("AAK").await;
        c.expect("ALK").await;
        setup.push(c);
    }
    // The Xélor holds a hammer (type 7: 5 AP, critical bonus 5) dealing 1D1 and 1D1+1.
    let mut saved: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&store).unwrap()).unwrap();
    for ch in saved["characters"].as_object_mut().unwrap().values_mut().filter(|c| c["class"] == 5) {
        ch["items"] = serde_json::json!([{"id": 1, "type": 7, "gfx": 1, "position": 1, "effects": [[100, 1, 1, 0], [100, 1, 1, 1]]}]);
    }
    saved["next_item"] = 2.into();
    std::fs::write(&store, serde_json::to_string(&saved).unwrap()).unwrap();
    let hot = || {
        let mut d = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
        d.classes.values_mut().for_each(|c| (c.cc.crit, c.cc.miss) = (2, 4));
        d.spells.values_mut().flat_map(|s| &mut s.levels).for_each(|l| (l.crit, l.miss) = (2, 4));
        d.items.weapon_types.values_mut().for_each(|t| (t.crit, t.miss) = (2, 4));
        d
    };
    let data = hot();
    let (hammer_ap, bonus) = (data.items.weapon_types[&7].ap, data.items.weapon_types[&7].crit_bonus);
    let addr = reopen_with(&store, hot()).await;
    let mut cl = Vec::new();
    for (acc, cc_ap) in [("wpna", hammer_ap), ("wpnb", data.classes[&8].cc.ap)] {
        let mut c = Client::connect(&addr).await;
        assert_eq!(c.login(acc, "pw").await, "AlKfr");
        c.send("PL\n").await;
        c.id = c.expect("ALK|").await[4..].split(';').next().unwrap().parse().unwrap();
        c.send(&format!("PS{}\n", c.id)).await;
        assert_eq!(c.expect("ASK|").await.split('|').nth(28), Some(cc_ap.to_string().as_str()), "close-combat AP");
        c.send("GC1\n").await;
        c.send("GD\n").await;
        c.until("GAx;3;").await;
        cl.push(c);
    }
    assert_ne!(hammer_ap, data.classes[&5].cc.ap, "the hammer's AP is not the Xélor's bare-hand one");
    let [mut a, mut b] = <[Client; 2]>::try_from(cl).ok().unwrap();
    let (ida, idb) = (a.id, b.id);
    let map_id = data.maps[0].id;
    a.send(&format!("GC2Crit|{map_id}|AA|\n")).await;
    a.until("GM|+").await;
    b.send("GJ2Crit|\n").await;
    b.until("GM|").await;
    a.expect("GM|+").await;
    a.send("GS\n").await;
    for c in [&mut a, &mut b] {
        c.expect("GPS").await;
        c.send("GD\n").await;
        c.expect("GDM|").await;
        c.send("GR\n").await;
    }
    for c in [&mut a, &mut b] {
        c.expect("GR").await;
    }
    let places = &data.maps[0].places;
    let mut board = Board { team: HashMap::from([(ida, 0), (idb, 1)]), ..Default::default() };
    a.send(&format!("Gp{}\n", places[0][0])).await;
    for c in [&mut a, &mut b] {
        c.expect("GIC").await;
    }
    b.send(&format!("Gp{}\n", places[1][0])).await;
    for c in [&mut a, &mut b] {
        board.apply(&c.expect("GIC").await, 0);
        c.expect("GS").await;
        assert_eq!(c.expect("GTL").await, format!("GTL|{idb}|{ida}"), "Iop 55 LP → 13 beats Xélor 45 LP → 11");
        c.expect(&format!("GTS{idb}|")).await;
    }
    b.send("GT\n").await;
    for c in [&mut a, &mut b] {
        c.expect(&format!("GTF{idb}")).await;
        c.expect(&format!("GTS{ida}|")).await;
    }
    // A hammer does not reach farther than the client's close combat.
    a.send(&format!("GA303{}\n", places[1][0])).await;
    assert_eq!(a.expect("GA").await, format!("GAF{ida}"), "out of range: refused");
    // A only walks and hits with the hammer; B uses its spells too.
    let map = &data.map_index[&map_id];
    let fighters = HashMap::from([(ida, (vec![], hammer_ap)), (idb, (data.classes[&8].spells.clone(), data.classes[&8].cc.ap))]);
    let (_, blocks) = play(&mut a, &mut b, &data, map, &mut board, ida, &fighters, data.rules.turn_ms).await;
    let has =
        |bl: &[String], t: &str, actor: u32| bl.iter().any(|f| ga_type(f) == Some(t) && f.split(';').nth(2) == Some(&actor.to_string()));
    let (mut hits, mut crits) = (0, 0);
    for bl in blocks.iter().filter(|bl| has(bl, "303", ida)) {
        assert!(bl.contains(&format!("GAx;102;{ida};{ida},-{hammer_ap}")), "{bl:?}");
        let crit = has(bl, "304", ida);
        assert_eq!(bl[1..3].iter().any(|f| f.starts_with("GAx;304;")), crit, "304 right after the 303: {bl:?}");
        let dealt: Vec<i32> = bl.iter().filter_map(|f| f.strip_prefix(&format!("GAx;100;{ida};{idb},-"))?.parse().ok()).collect();
        if !bl.iter().any(|f| f.starts_with("GAx;103;")) {
            assert_eq!(dealt, if crit { vec![1 + bonus, 2 + bonus] } else { vec![1, 2] }, "both effects, the bonus on p3: {bl:?}");
        }
        (hits, crits) = (hits + 1, crits + crit as u32);
    }
    let misses = blocks.iter().filter(|bl| bl.iter().any(|f| matches!(ga_type(f), Some("302" | "305")))).count();
    let spell_crits = blocks.iter().filter(|bl| has(bl, "301", idb)).count();
    assert!(
        hits > crits && crits > 0 && misses > 0 && spell_crits > 0,
        "hits {hits}, critical {crits}, misses {misses}, spell criticals {spell_crits}"
    );
    for bl in blocks.iter().filter(|bl| bl.iter().any(|f| matches!(ga_type(f), Some("302" | "305")))) {
        assert!(!bl.iter().any(|f| matches!(ga_type(f), Some("300" | "303" | "100"))), "a miss replaces the action, no effect: {bl:?}");
        assert!(bl[2].starts_with("GAx;102;"), "AP spent: {bl:?}");
    }
    drop(setup);
    let _ = std::fs::remove_file(&store);
}

/// A session without any frame for `idle_ms` (rules.json) gets `M01` (stored, shown with DISCONNECT when the socket
/// closes) on the world's once-a-minute `Tick`, then is dropped (net.rs flushes its frames and closes the socket).
#[test]
fn idle_sessions_get_m01_and_are_disconnected() {
    let mut data = GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap();
    data.rules.idle_ms = 200;
    let mut world = World::new(data, Store::open(None), 1);
    let ((idle_tx, mut idle), (busy_tx, mut busy)) = (unbounded_channel(), unbounded_channel());
    world.handle(Event::Open(1, idle_tx));
    world.handle(Event::Open(2, busy_tx));
    std::thread::sleep(Duration::from_millis(250));
    world.handle(Event::Frame(2, "5\n".into()));
    world.handle(Event::Tick);
    assert!(idle.try_recv().unwrap().starts_with('H'));
    assert_eq!(idle.try_recv().unwrap(), "M01");
    assert_eq!(idle.try_recv(), Err(TryRecvError::Disconnected), "the session is gone");
    assert!(busy.try_recv().unwrap().starts_with('H'));
    assert_eq!(busy.try_recv(), Err(TryRecvError::Empty), "a frame just now: still connected");
}
