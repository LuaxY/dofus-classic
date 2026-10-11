//! The whole server state as one synchronous event handler: frames in, frames out (through each session's channel),
//! timers as events. Runs on a single task (net.rs), so no locks.
// ponytail: one task owns everything; shard per game if a single core ever becomes the limit.
use crate::codec::{cell_code, compress_path, extract_path};
use crate::crypt;
use crate::data::GameData;
use crate::fight::{color, Fighter, Game, Phase, Rng};
use crate::pathfinding::{distance, path_find};
use crate::store::{Account, Character, KnownSpell, Store};
use std::collections::{BTreeMap, HashMap, HashSet};
use tokio::sync::mpsc::UnboundedSender;

pub type Sid = u64;

pub enum Event {
    Open(Sid, UnboundedSender<String>),
    Frame(Sid, String),
    Close(Sid),
    Timer { game: u32, serial: u64 },
}

#[derive(PartialEq)]
enum Stage {
    Version,
    Login,
    Authed,
    Rejected,
}

#[derive(Clone, PartialEq)]
enum Place {
    None,
    Village,
    Channel(String),
    Game(u32),
}

struct Session {
    tx: UnboundedSender<String>,
    key: String,
    stage: Stage,
    account: Option<String>,
    character: Option<u32>,
    place: Place,
    last_channel: Option<String>,
    /// Authored `GW` after `PS` ("Rejoindre la carte"): this session stays on the village map instead of `GAx;3`.
    social: bool,
    /// On a village (world) map: (map, cell, dir), and the cells of its last walk (a `GKE` must stop on one of them).
    spot: Option<(u32, i64, i32)>,
    walk: Vec<i64>,
}

pub struct World {
    data: GameData,
    store: Store,
    sessions: BTreeMap<Sid, Session>,
    games: BTreeMap<u32, Game>,
    next_game: u32,
    rng: Rng,
    timers: Option<UnboundedSender<Event>>,
    turn_ms: u64,
    placement_ms: u64,
    /// Action ids of village moves (`GA<n>;1;…`), like a game's `next_action`.
    village_action: u32,
}

/// Names (characters, games, channels): no protocol separators, no markup, no control chars.
fn valid_name(s: &str, min: usize) -> bool {
    let n = s.chars().count();
    (min..=20).contains(&n) && s.chars().all(|c| !c.is_control() && !"|;,~*#<>&%\"'\\/".contains(c))
}

/// `PA` colour: decimal `0xRRGGBB` or `-1`; `""`/`undefined` (SWF6 coercions) mean unset.
fn parse_color(s: &str) -> Option<i64> {
    match s {
        "" | "undefined" | "-1" => Some(-1),
        _ => s.parse().ok().filter(|v| (0..=0xFF_FFFF).contains(v)),
    }
}

impl World {
    pub fn new(data: GameData, store: Store, seed: u64) -> World {
        let (turn_ms, placement_ms) = (data.rules.turn_ms, data.rules.placement_ms);
        World {
            data,
            store,
            sessions: BTreeMap::new(),
            games: BTreeMap::new(),
            next_game: 1,
            rng: Rng(seed | 1),
            timers: None,
            turn_ms,
            placement_ms,
            village_action: 0,
        }
    }

    /// Where timer events are posted (the world's own event queue). Without it timers never fire (unit tests).
    pub fn set_timers(&mut self, tx: UnboundedSender<Event>, turn_ms: Option<u64>, placement_ms: Option<u64>) {
        self.timers = Some(tx);
        self.turn_ms = turn_ms.unwrap_or(self.turn_ms);
        self.placement_ms = placement_ms.unwrap_or(self.placement_ms);
    }

    pub fn handle(&mut self, ev: Event) {
        match ev {
            Event::Open(sid, tx) => {
                let key: String = (0..32).map(|_| crypt::HASH[(self.rng.next_u64() % 64) as usize] as char).collect();
                let _ = tx.send(format!("H{key}"));
                self.sessions.insert(
                    sid,
                    Session {
                        tx,
                        key,
                        stage: Stage::Version,
                        account: None,
                        character: None,
                        place: Place::None,
                        last_channel: None,
                        social: false,
                        spot: None,
                        walk: Vec::new(),
                    },
                );
            }
            // One WebSocket text frame = one message; split on `\0` anyway (XMLSocket framing), strip one `\n`.
            Event::Frame(sid, raw) => {
                for piece in raw.split('\0').filter(|p| !p.is_empty()) {
                    let msg = piece.strip_suffix('\n').unwrap_or(piece).to_string();
                    if !msg.is_empty() && self.sessions.contains_key(&sid) {
                        self.dispatch(sid, &msg);
                    }
                }
            }
            Event::Close(sid) => self.close(sid),
            Event::Timer { game, serial } => self.timer(game, serial),
        }
    }

    // ───────────── plumbing ─────────────

    fn send(&self, sid: Sid, msg: impl Into<String>) {
        if let Some(s) = self.sessions.get(&sid) {
            let _ = s.tx.send(msg.into());
        }
    }

    fn sid_of(&self, char_id: u32) -> Option<Sid> {
        self.sessions.iter().find(|(_, s)| s.character == Some(char_id)).map(|(&k, _)| k)
    }

    fn character(&self, sid: Sid) -> Option<&Character> {
        self.sessions.get(&sid)?.character.and_then(|c| self.store.characters.get(&c))
    }

    fn place(&self, sid: Sid) -> Place {
        self.sessions.get(&sid).map_or(Place::None, |s| s.place.clone())
    }

    fn set_place(&mut self, sid: Sid, place: Place) {
        if let Some(s) = self.sessions.get_mut(&sid) {
            s.place = place;
        }
    }

    fn schedule(&self, ms: u64, game: u32, serial: u64) {
        if let Some(tx) = self.timers.clone() {
            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(ms)).await;
                let _ = tx.send(Event::Timer { game, serial });
            });
        }
    }

    fn game_sids(&self, gid: u32) -> Vec<Sid> {
        self.games.get(&gid).map_or(Vec::new(), |g| g.members.iter().filter_map(|f| self.sid_of(f.id)).collect())
    }

    fn broadcast(&self, gid: u32, frames: &[String]) {
        for sid in self.game_sids(gid) {
            frames.iter().for_each(|f| self.send(sid, f.clone()));
        }
    }

    fn channel_sids(&self, name: &str) -> Vec<Sid> {
        self.sessions.iter().filter(|(_, s)| s.place == Place::Channel(name.into())).map(|(&k, _)| k).collect()
    }

    /// Sessions standing on village map `map` (social sessions after their `GD`).
    fn village_sids(&self, map: u32) -> Vec<Sid> {
        self.sessions.iter().filter(|(_, s)| s.place == Place::Village && s.spot.is_some_and(|(m, ..)| m == map)).map(|(&k, _)| k).collect()
    }

    /// The cells they stand on.
    fn village_cells(&self, map: u32) -> HashSet<i64> {
        self.village_sids(map).iter().filter_map(|o| self.sessions[o].spot).map(|(_, c, _)| c).collect()
    }

    // ───────────── dispatch ─────────────

    fn dispatch(&mut self, sid: Sid, msg: &str) {
        let stage = &self.sessions[&sid].stage;
        match stage {
            Stage::Version if msg == "5" => self.sessions.get_mut(&sid).unwrap().stage = Stage::Login,
            Stage::Version => {
                self.send(sid, "AlEv");
                self.sessions.get_mut(&sid).unwrap().stage = Stage::Rejected;
            }
            Stage::Login => self.login(sid, msg),
            Stage::Authed => self.command(sid, msg),
            Stage::Rejected => {}
        }
    }

    /// `<login>\n<crypt>` logs in. The authored register frame `<login>\n+<crypt>` (docs/protocol/account.md) creates the
    /// account first (`AlEe` if it exists): `+` is outside the crypt alphabet (crypt::HASH), no login frame carries it.
    fn login(&mut self, sid: Sid, msg: &str) {
        let (login, pass) = msg.split_once('\n').unwrap_or((msg, ""));
        let (register, pass) = pass.strip_prefix('+').map_or((false, pass), |p| (true, p));
        let key = self.sessions[&sid].key.clone();
        // A register frame cut at 200 chars (Client.as:78-81) would store a crypt no later, 1-char-shorter login matches.
        let valid = (1..=32).contains(&login.len())
            && login.chars().all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
            && !pass.is_empty()
            && !(register && msg.len() >= 200);
        if !valid {
            return self.send(sid, "AlEx");
        }
        let ok = match self.store.accounts.get_mut(login) {
            Some(_) if register => return self.send(sid, "AlEe"),
            Some(acc) => crypt::verify(&mut acc.password, pass, &key),
            None if !register => false, // unknown account: ACCESS_DENIED, like a wrong password
            None => match crypt::candidates(pass, &key) {
                Some(password) => {
                    self.store.accounts.insert(login.to_string(), Account { password, friends: Vec::new() });
                    true
                }
                None => false,
            },
        };
        if !ok {
            return self.send(sid, "AlEx");
        }
        if self.sessions.values().any(|s| s.stage == Stage::Authed && s.account.as_deref() == Some(login)) {
            return self.send(sid, "AlEa");
        }
        self.store.save();
        let s = self.sessions.get_mut(&sid).unwrap();
        (s.stage, s.account) = (Stage::Authed, Some(login.to_string()));
        self.send(sid, "AlKfr");
    }

    fn command(&mut self, sid: Sid, msg: &str) {
        let code = msg.get(..2).unwrap_or(msg);
        let rest = msg.get(2..).unwrap_or("");
        match code {
            "PL" => self.char_list(sid),
            "PA" => self.create_character(sid, rest),
            "PD" => self.delete_character(sid, rest),
            "PS" => self.select_character(sid, rest),
            "FL" | "Fl" | "FA" | "FD" => self.friends(sid, code, rest),
            _ if self.character(sid).is_none() => {}
            "PB" => self.boost_stat(sid, rest),
            "BW" => self.whois(sid, rest),
            "CJ" => self.join_channel(sid, rest),
            "CL" => self.channel_list(sid),
            "BM" => self.chat(sid, rest),
            "BS" => self.smiley(sid, rest),
            "IC" => self.send(sid, format!("IC{}", self.sessions.values().filter(|s| s.character.is_some()).count())),
            "IP" => self.podium(sid),
            "IG" => self.general_stats(sid),
            "SM" => self.spell_position(sid, rest),
            "SB" => self.spell_boost(sid, rest),
            "SI" => self.spell_infos(sid, rest),
            "BL" => self.send(sid, format!("mL{}", self.data.maps.iter().map(|m| m.id.to_string()).collect::<Vec<_>>().join("|"))),
            _ if code.starts_with('G') => self.game_command(sid, msg),
            _ => {} // OM/OD (no items on this server), unknown codes
        }
    }

    // ───────────── characters ─────────────

    fn account(&self, sid: Sid) -> String {
        self.sessions[&sid].account.clone().unwrap_or_default()
    }

    fn char_list(&self, sid: Sid) {
        let acc = self.account(sid);
        let list: String = self
            .store
            .characters
            .values()
            .filter(|c| c.account == acc)
            .map(|c| {
                format!(
                    "|{};{};{};{};{};{};{};{};{}",
                    c.id,
                    c.name,
                    c.level,
                    c.class,
                    c.sex,
                    c.gfx(),
                    color(c.colors[0]),
                    color(c.colors[1]),
                    color(c.colors[2])
                )
            })
            .collect();
        self.send(sid, format!("ALK{list}"));
    }

    /// `PA<name>|<guild>|<sex>|<c1>|<c2>|<c3>` → `AAK` + a fresh `AL` (the client does nothing on `AAK`), or `AAE`.
    fn create_character(&mut self, sid: Sid, rest: &str) {
        let acc = self.account(sid);
        let p: Vec<&str> = rest.split('|').collect();
        let parsed = (p.len() == 6).then(|| {
            let class: u8 = p[1].parse().ok().filter(|c| self.data.classes.contains_key(c))?;
            let sex = match p[2] {
                "" | "undefined" | "0" => 0,
                "1" => 1,
                _ => return None,
            };
            Some((class, sex, [parse_color(p[3])?, parse_color(p[4])?, parse_color(p[5])?]))
        });
        let count = self.store.characters.values().filter(|c| c.account == acc).count();
        let Some(Some((class, sex, colors))) = parsed else { return self.send(sid, "AAE") };
        if !valid_name(p[0], 2)
            || !p[0].chars().next().is_some_and(char::is_alphabetic)
            || self.store.by_name(p[0]).is_some()
            || count >= self.data.rules.max_characters
        {
            return self.send(sid, "AAE");
        }
        let id = self.store.next_id;
        self.store.next_id += 1;
        let spells = self.data.classes[&class]
            .spells
            .iter()
            .enumerate()
            .map(|(i, &id)| KnownSpell { id, level: 1, position: (i < 8).then_some(i as u8 + 1) })
            .collect();
        let c = Character {
            id,
            account: acc,
            name: p[0].to_string(),
            class,
            sex,
            colors,
            level: 1,
            xp: 0,
            gold: 0,
            bonus: 0,
            stats: BTreeMap::new(),
            spells,
        };
        self.store.characters.insert(id, c);
        self.store.save();
        self.send(sid, "AAK");
        self.char_list(sid);
    }

    fn delete_character(&mut self, sid: Sid, rest: &str) {
        let acc = self.account(sid);
        if let Ok(id) = rest.parse::<u32>() {
            if self.store.characters.get(&id).is_some_and(|c| c.account == acc) && self.sid_of(id).is_none() {
                self.store.characters.remove(&id);
                self.store.save();
            }
        }
        self.char_list(sid);
    }

    fn lp_max(&self, c: &Character) -> i32 {
        self.data.classes[&c.class].lp + (c.level as i32 - 1) * self.data.rules.lp_per_level + c.stat(11)
    }

    fn xp_bounds(&self, level: u32) -> (u64, u64) {
        let xp = &self.data.rules.xp;
        (xp[level as usize - 1], *xp.get(level as usize).unwrap_or(&xp[level as usize - 1]))
    }

    /// `PS<id>` → `ASK|…` with exactly 31 `|`-parts; the client then sends `GC1` by itself.
    fn select_character(&mut self, sid: Sid, rest: &str) {
        let acc = self.account(sid);
        let Some(c) = rest.parse::<u32>().ok().and_then(|id| self.store.characters.get(&id)).filter(|c| c.account == acc).cloned() else {
            return self.send(sid, "ASE");
        };
        if self.sid_of(c.id).is_some_and(|other| other != sid) {
            return self.send(sid, "ASE");
        }
        self.leave_place(sid, true);
        let s = self.sessions.get_mut(&sid).unwrap();
        (s.character, s.social) = (Some(c.id), false);
        let class = &self.data.classes[&c.class];
        let (low, high) = self.xp_bounds(c.level);
        let spells: Vec<String> = c.spells.iter().map(|s| self.data.spell_entry(s.id, s.level, s.position)).collect();
        let stats: Vec<String> = [10, 11, 6, 7, 8, 9, 12, 13, 14, 15].iter().map(|&i| c.stat(i).to_string()).collect();
        let col = c.colors.map(color);
        let ask = format!(
            "ASK|{}|{}|{}|{}|{}|{}|{}|{}|{}||{low}|{}|{high}|{}|{}|{}|{}|{}|{}|{}|",
            c.id,
            c.name,
            c.level,
            c.class,
            c.sex,
            c.gfx(),
            col[0],
            col[1],
            col[2],
            c.xp,
            self.lp_max(&c),
            class.ap,
            c.gold,
            stats.join("|"),
            c.bonus,
            class.cc.ap,
            spells.join(";")
        );
        debug_assert_eq!(ask.split('|').count(), 31);
        self.send(sid, ask);
        self.notify_friends(sid, 'I');
    }

    /// `PB<stat>`: one bonus point → +1 (ids 6-15) → `ABK<id>|<stat>;<value>|3;<bonus>` (+ `0;<LPmax>` for vitality).
    fn boost_stat(&mut self, sid: Sid, rest: &str) {
        let in_game = matches!(self.place(sid), Place::Game(_));
        let id = self.sessions[&sid].character.unwrap();
        let stat = rest.parse::<u8>().ok().filter(|s| (6..=15).contains(s));
        let c = self.store.characters.get_mut(&id).unwrap();
        let mut ab = format!("ABK{id}");
        if let (Some(stat), false, true) = (stat, in_game, c.bonus >= 1) {
            c.bonus -= 1;
            *c.stats.entry(stat).or_default() += 1;
            ab += &format!("|{stat};{}", c.stat(stat));
            if stat == 11 {
                let c = c.clone();
                ab += &format!("|0;{}", self.lp_max(&c));
            }
            self.store.save();
        }
        ab += &format!("|3;{}", self.store.characters[&id].bonus);
        self.send(sid, ab);
    }

    // ───────────── spells ─────────────

    fn spell_position(&mut self, sid: Sid, rest: &str) {
        let id = self.sessions[&sid].character.unwrap();
        let Some((spell, pos)) =
            rest.split_once('|').and_then(|(s, p)| Some((s.parse::<u32>().ok()?, p.parse::<u8>().ok().filter(|p| (1..=8).contains(p))?)))
        else {
            return;
        };
        let c = self.store.characters.get_mut(&id).unwrap();
        if c.spells.iter().any(|s| s.id == spell) {
            for s in &mut c.spells {
                if s.id == spell {
                    s.position = Some(pos);
                } else if s.position == Some(pos) {
                    s.position = None;
                }
            }
            self.store.save();
        }
    }

    /// `SB<id>`: costs `SPELL_BOOST_BONUS[level]` bonus points, out of game → `SUK<entry>` + `ABK…|3;<bonus>`.
    fn spell_boost(&mut self, sid: Sid, rest: &str) {
        let id = self.sessions[&sid].character.unwrap();
        let in_game = matches!(self.place(sid), Place::Game(_));
        let spell = rest.parse::<u32>().unwrap_or(0);
        let max = self.data.spells.get(&spell).map_or(0, |s| s.levels.len());
        let costs = &self.data.rules.spell_boost_bonus;
        let c = self.store.characters.get_mut(&id).unwrap();
        let Some(k) = c.spells.iter_mut().find(|s| s.id == spell).filter(|k| !in_game && k.level < max && k.level < costs.len()) else {
            return self.send(sid, "SUE");
        };
        let cost = costs[k.level];
        if c.bonus < cost {
            return self.send(sid, "SUE");
        }
        k.level += 1;
        let (level, position) = (k.level, k.position);
        c.bonus -= cost;
        let bonus = c.bonus;
        self.store.save();
        self.send(sid, format!("SUK{}", self.data.spell_entry(spell, level, position)));
        self.send(sid, format!("ABK{id}|3;{bonus}"));
    }

    /// `SI<id>` → `SI<id>|<next level>|<AP>|<range>` (plain decimal).
    fn spell_infos(&self, sid: Sid, rest: &str) {
        let c = self.character(sid).unwrap();
        let Some((k, s)) =
            rest.parse::<u32>().ok().and_then(|id| Some((c.spells.iter().find(|k| k.id == id)?, self.data.spells.get(&id)?)))
        else {
            return;
        };
        let next = (k.level + 1).min(s.levels.len());
        let l = &s.levels[next - 1];
        self.send(sid, format!("SI{}|{next}|{}|{}", k.id, l.ap, l.range));
    }

    // ───────────── channels, chat, infos ─────────────

    fn leave_place(&mut self, sid: Sid, silent: bool) {
        match self.place(sid) {
            Place::Channel(name) => {
                self.set_place(sid, Place::None);
                let me = self.character(sid).map(|c| c.name.clone()).unwrap_or_default();
                for other in self.channel_sids(&name) {
                    self.send(other, format!("CM|-{me}"));
                }
            }
            Place::Game(_) => self.leave_game(sid, silent),
            Place::Village if self.sessions[&sid].spot.is_some() => {
                let s = self.sessions.get_mut(&sid).unwrap();
                let (map, ..) = s.spot.take().unwrap();
                let me = s.character.unwrap();
                for other in self.village_sids(map) {
                    self.send(other, format!("GM|-{me}"));
                }
            }
            _ => {}
        }
        self.set_place(sid, Place::None);
    }

    /// `CJ<name>`; `CJ` / `CJundefined` (SWF6 coercion after leaving a lobby) rejoin the previous channel.
    fn join_channel(&mut self, sid: Sid, rest: &str) {
        let name = match rest {
            "" | "undefined" => self.sessions[&sid].last_channel.clone().unwrap_or(self.data.rules.default_channel.clone()),
            n => n.to_string(),
        };
        if !valid_name(&name, 1) || matches!(self.place(sid), Place::Game(_)) {
            return self.send(sid, format!("CJE{name}"));
        }
        self.leave_place(sid, true);
        let s = self.sessions.get_mut(&sid).unwrap();
        (s.place, s.last_channel) = (Place::Channel(name.clone()), Some(name.clone()));
        self.send(sid, format!("CJK{name}"));
        let c = self.character(sid).unwrap();
        let entry = format!("CM|+{};{};{}", c.name, c.level, c.gfx());
        for other in self.channel_sids(&name).into_iter().filter(|&o| o != sid) {
            self.send(other, entry.clone());
        }
    }

    fn channel_list(&self, sid: Sid) {
        let Place::Channel(name) = self.place(sid) else { return self.send(sid, "CLK") };
        let users: String = self
            .channel_sids(&name)
            .iter()
            .filter_map(|&s| self.character(s))
            .map(|c| format!("|{};{};{}", c.name, c.level, c.gfx()))
            .collect();
        self.send(sid, format!("CLK{users}"));
    }

    /// Who hears `*` (or `#` = own team) from this session: its channel, its game, or only itself.
    fn audience(&self, sid: Sid, team_only: bool) -> Vec<Sid> {
        match self.place(sid) {
            Place::Channel(n) if !team_only => self.channel_sids(&n),
            Place::Village if !team_only && self.sessions[&sid].spot.is_some() => self.village_sids(self.sessions[&sid].spot.unwrap().0),
            Place::Game(g) => {
                let me = self.sessions[&sid].character;
                let game = &self.games[&g];
                let team = me.and_then(|m| game.member(m)).map(|f| f.team);
                game.members.iter().filter(|f| !team_only || Some(f.team) == team).filter_map(|f| self.sid_of(f.id)).collect()
            }
            _ => vec![sid],
        }
    }

    /// `BM<dest>|<text>`: `*` public, `#` team, else a whisper (`cMKF` to the target, `cMKT` echo, `cMEn` offline).
    /// Relayed text never contains `|` or the `/##` remote-console trigger.
    fn chat(&self, sid: Sid, rest: &str) {
        let Some((dest, text)) = rest.split_once('|') else { return self.send(sid, "cMES") };
        let mut text = text.replace('|', " ");
        while text.contains("/##") {
            text = text.replace("/##", "");
        }
        let me = self.character(sid).unwrap();
        match dest {
            "*" | "#" => {
                for to in self.audience(sid, dest == "#") {
                    self.send(to, format!("cMK{dest}|{}|{}|{text}", me.id, me.name));
                }
            }
            name => {
                match self.sessions.iter().find(|(_, s)| {
                    s.character.and_then(|c| self.store.characters.get(&c)).is_some_and(|c| c.name.eq_ignore_ascii_case(name))
                }) {
                    Some((&to, s)) => {
                        let target = &self.store.characters[&s.character.unwrap()];
                        self.send(to, format!("cMKF|{}|{}|{text}", me.id, me.name));
                        self.send(sid, format!("cMKT|{}|{}|{text}", target.id, target.name));
                    }
                    None => self.send(sid, format!("cMEn{name}")),
                }
            }
        }
    }

    /// `BS<n>` → `cS<id>|<n>` to the game (the smiley is drawn over the sprite); elsewhere only back to the sender,
    /// whose spinner needs an answer (other channel members have no sprite for it).
    fn smiley(&self, sid: Sid, rest: &str) {
        let Ok(n) = rest.parse::<u32>() else { return };
        let id = self.sessions[&sid].character.unwrap();
        let to = if matches!(self.place(sid), Place::Game(_)) { self.audience(sid, false) } else { vec![sid] };
        to.into_iter().for_each(|to| self.send(to, format!("cS{id}|{n}")));
    }

    /// `IP`: best 3 characters by level then XP; colours in decimal (they are used raw in `&` operations).
    fn podium(&self, sid: Sid) {
        let mut best: Vec<&Character> = self.store.characters.values().collect();
        best.sort_by(|a, b| (b.level, b.xp).cmp(&(a.level, a.xp)).then(a.id.cmp(&b.id)));
        let e: Vec<String> = best
            .iter()
            .take(3)
            .map(|c| {
                format!(
                    "{};{};{};{};{};{};{};{};{};{}",
                    c.account,
                    c.name,
                    c.class,
                    c.sex,
                    c.gfx(),
                    c.colors[0],
                    c.colors[1],
                    c.colors[2],
                    c.xp,
                    c.level
                )
            })
            .collect();
        self.send(sid, format!("IP{}", e.join("|")));
    }

    fn general_stats(&self, sid: Sid) {
        let count = |p: fn(&Place) -> bool| self.sessions.values().filter(|s| s.character.is_some() && p(&s.place)).count();
        let players = count(|_| true);
        let solo = count(|p| *p == Place::Village);
        let waiting = count(|p| matches!(p, Place::Channel(_)));
        let random = self.games.values().filter(|g| g.random).count();
        self.send(sid, format!("IG{players}|{solo}|{}|{random}|{waiting}", self.games.len() - random));
    }

    /// `BW` / `BW<name>` → `AW|account|character|state|param|` (6 parts) or `AW|<name>` (not found).
    fn whois(&self, sid: Sid, rest: &str) {
        let target = if rest.is_empty() {
            Some(sid)
        } else {
            self.sessions
                .iter()
                .find(|(&k, s)| s.account.as_deref() == Some(rest) || self.character(k).is_some_and(|c| c.name.eq_ignore_ascii_case(rest)))
                .map(|(&k, _)| k)
        };
        let Some((t, c)) = target.and_then(|t| Some((t, self.character(t)?))) else { return self.send(sid, format!("AW|{rest}")) };
        let (state, param) = match self.place(t) {
            Place::Channel(n) => ("C", n),
            Place::Game(g) => (if self.games[&g].random { "3" } else { "2" }, self.games[&g].name.clone()),
            Place::Village => ("4", String::new()),
            Place::None => ("?", String::new()),
        };
        self.send(sid, format!("AW|{}|{}|{state}|{param}|", self.account(t), c.name));
    }

    // ───────────── friends ─────────────

    /// Friend entry: `account` offline, `account;state;name;level;guild;sex;gfx` online (state C/1/2/?).
    fn friend_entry(&self, account: &str) -> String {
        let online = self.sessions.iter().find(|(_, s)| s.account.as_deref() == Some(account) && s.character.is_some());
        match online.and_then(|(&k, s)| Some((s, self.character(k)?))) {
            Some((s, c)) => {
                let state = match s.place {
                    Place::Channel(_) => "C",
                    Place::Village => "1",
                    Place::Game(g) if self.games[&g].random => "3",
                    Place::Game(_) => "2",
                    Place::None => "?",
                };
                format!("{account};{state};{};{};{};{};{}", c.name, c.level, c.class, c.sex, c.gfx())
            }
            None => account.to_string(),
        }
    }

    fn friends(&mut self, sid: Sid, code: &str, rest: &str) {
        let me = self.account(sid);
        let list = self.store.accounts[&me].friends.clone();
        // `*account` or a character name → account
        let resolve = |w: &World| match rest.strip_prefix('*') {
            Some(a) => w.store.accounts.contains_key(a).then(|| a.to_string()),
            None => w.store.by_name(rest).map(|c| c.account.clone()),
        };
        match code {
            "FL" => self.send(sid, format!("FLK{}", list.iter().map(|a| self.friend_entry(a)).collect::<Vec<_>>().join("|"))),
            "Fl" => {
                let e: Vec<String> = list
                    .iter()
                    .filter_map(|a| self.sessions.iter().find(|(_, s)| s.account.as_deref() == Some(a.as_str())))
                    .filter_map(|(&k, _)| self.character(k))
                    .map(|c| format!("{};{};{}", c.name, c.id, c.level))
                    .collect();
                self.send(sid, format!("FlK{}", e.join("|")));
            }
            "FA" => match resolve(self) {
                None => self.send(sid, "FAEf"),
                Some(a) if a == me => self.send(sid, "FAEy"),
                Some(a) if list.contains(&a) => self.send(sid, "FAEa"),
                Some(a) => {
                    self.store.accounts.get_mut(&me).unwrap().friends.push(a.clone());
                    self.store.save();
                    self.send(sid, format!("FAK{}", self.friend_entry(&a)));
                }
            },
            _ => match resolve(self).filter(|a| list.contains(a)) {
                Some(a) => {
                    self.store.accounts.get_mut(&me).unwrap().friends.retain(|f| *f != a);
                    self.store.save();
                    self.send(sid, "FDK");
                }
                None => self.send(sid, "FDEf"),
            },
        }
    }

    /// `FI`/`FO<account>;<character>` to everyone who has this account as a friend.
    fn notify_friends(&self, sid: Sid, kind: char) {
        let (me, Some(c)) = (self.account(sid), self.character(sid)) else { return };
        for (&k, s) in &self.sessions {
            if k != sid && s.account.as_ref().is_some_and(|a| self.store.accounts.get(a).is_some_and(|acc| acc.friends.contains(&me))) {
                self.send(k, format!("F{kind}{me};{}", c.name));
            }
        }
    }

    fn close(&mut self, sid: Sid) {
        if let Some(me) = self.sessions.get(&sid).and_then(|s| s.character) {
            self.leave_place(sid, true);
            self.notify_friends(sid, 'O');
            // pending random-team invitations of this character: the inviter's waiting card goes (IMPOSSIBLE_INVITATION)
            let name = self.store.characters.get(&me).map_or(String::new(), |c| c.name.clone());
            for g in self.games.values_mut().filter(|g| g.invited.contains(&me)) {
                g.invited.retain(|&i| i != me);
                let creator = g.creator;
                if let Some(k) = self.sessions.iter().find(|(_, s)| s.character == Some(creator)).map(|(&k, _)| k) {
                    let _ = self.sessions[&k].tx.send(format!("GiE{me}|{name}"));
                }
            }
        }
        self.sessions.remove(&sid);
    }

    // ───────────── games ─────────────

    fn fighter(&self, c: &Character) -> Fighter {
        let class = &self.data.classes[&c.class];
        let spells: HashMap<u32, usize> = c.spells.iter().map(|s| (s.id, s.level)).collect();
        Fighter::new(c.id, c.name.clone(), c.level, c.class, c.sex, c.colors, self.lp_max(c), class.ap, class.cc.clone(), spells, c.gold)
    }

    fn game_command(&mut self, sid: Sid, msg: &str) {
        let me = self.sessions[&sid].character.unwrap();
        let gid = match self.place(sid) {
            Place::Game(g) => Some(g),
            _ => None,
        };
        let code = if msg.starts_with("GK") { msg.get(..3).unwrap_or(msg) } else { msg.get(..2).unwrap_or(msg) };
        let rest = msg.get(code.len()..).unwrap_or("");
        match (code, gid) {
            ("GC", _) => match rest.get(..1) {
                Some("1") => {
                    self.leave_place(sid, true);
                    self.set_place(sid, Place::Village);
                    self.send(sid, "GCK|1");
                }
                Some("2") => self.create_game(sid, me, &rest[1..]), // safe: byte 0 is the ASCII "2"
                Some("3") => self.create_random(sid, me),
                _ => self.send(sid, "GCEr"),
            },
            // Outside a game `GD` only follows `GCK|1`. Not tied to Place::Village: leaving a lobby with `GQ` + `GC1`
            // ("Retour au village", the random result's gift button) makes `GV` → `onLeave` send a `CJ` that the
            // server reads between `GC1` and `GD`.
            ("GD", None) => self.village_map(sid, me),
            ("GW", None) => self.sessions.get_mut(&sid).unwrap().social = true, // authored, sent without a spinner
            ("GA", None) if self.sessions[&sid].spot.is_some() => self.village_move(sid, me, rest),
            ("GKE", None) if self.sessions[&sid].spot.is_some() => self.village_stop(sid, rest),
            ("GKK", None) if self.sessions[&sid].spot.is_some() => self.village_walked(sid, me),
            ("GL", _) => {
                let open: String = self
                    .games
                    .values()
                    .filter(|g| !g.random && g.phase == Phase::Lobby && !g.is_full())
                    .map(|g| format!("|{};{}{}", g.name, g.options(), (64 + g.members.len() as u8) as char))
                    .collect();
                self.send(sid, format!("GLK{open}"));
            }
            ("GJ", None) => self.join_game(sid, me, rest),
            ("GJ", Some(_)) => self.send(sid, "GJEa"),
            ("GQ", None) => self.send(sid, "GV"),
            ("GQ", Some(g)) => match rest.parse::<u32>() {
                Ok(kicked) if kicked != me && self.games[&g].creator == me && self.games[&g].phase == Phase::Lobby => {
                    if let Some(k) = self.sid_of(kicked).filter(|&k| self.place(k) == Place::Game(g)) {
                        self.leave_game(k, false);
                    }
                }
                Ok(_) => {}
                Err(_) => self.leave_game(sid, false),
            },
            ("Gi", Some(g)) => self.invite(sid, me, g, rest),
            ("GY", _) => self.refuse_invitation(me, rest),
            ("GU", Some(g)) => self.undo_invitation(sid, me, g, rest),
            ("Gs", Some(g)) if self.games[&g].random && self.games[&g].creator == me && self.games[&g].phase == Phase::Lobby => {
                let g = self.games.get_mut(&g).unwrap();
                g.searching = true;
                let (gid, invited) = (g.id, std::mem::take(&mut g.invited));
                for i in invited {
                    self.sid_of(i).into_iter().for_each(|k| self.send(k, "Gy"));
                }
                self.broadcast(gid, &["Gs".into()]);
                self.match_random();
            }
            (_, Some(g)) => self.in_game(sid, me, g, code, rest),
            _ => {}
        }
    }

    /// Solo `GM` add entry: `+id;name;level;guild;sex;gfx;c1;c2;c3;weapon;cell;dir`.
    fn solo_entry(c: &Character, (cell, dir): (i64, i32)) -> String {
        let col = c.colors.map(color);
        format!("+{};{};{};{};{};{};{};{};{};;{cell};{dir}", c.id, c.name, c.level, c.class, c.sex, c.gfx(), col[0], col[1], col[2])
    }

    /// `GDM` of world map `map`, role-play.
    fn map_frame(&self, map: u32) -> String {
        let m = &self.data.world[&map].map;
        format!("GDM|{}|{}|{}|1|{}|{}", m.id, m.width, m.height, m.background, m.data)
    }

    /// The free walkable cell of world map `map` nearest `target` (the middle of the map is in view, unlike the fight
    /// placement cells at its edges); never an occupied one: both path-finders treat occupied cells as blocked.
    fn free_cell_near(&self, map: u32, target: i64) -> i64 {
        let (taken, m) = (self.village_cells(map), &self.data.world[&map].map);
        (0..m.cells.len() as i64)
            .filter(|c| m.walkable(*c) && !taken.contains(c))
            .min_by_key(|&c| distance(c, target, m.width as i64))
            .unwrap_or(target)
    }

    /// Village (state 1): `GDM` role-play, the player on its cell, then `GA x;3` straight to the multiplayer
    /// screen — beta 5 "ne contient que les combats". A social session (`GW`) stays, on the village map (or the world
    /// map it already stands on): `show_map`.
    fn village_map(&mut self, sid: Sid, me: u32) {
        let (social, spot, village) = (self.sessions[&sid].social, self.sessions[&sid].spot, self.data.rules.village_map);
        if spot.is_none() {
            self.leave_place(sid, true);
        }
        let middle = self.data.world[&village].map.cells.len() as i64 / 2;
        if !social {
            self.send(sid, self.map_frame(village));
            self.send(sid, format!("GM|{}", Self::solo_entry(&self.store.characters[&me], (self.free_cell_near(village, middle), 1))));
            return self.send(sid, format!("GAx;3;{me}"));
        }
        if spot.is_none() {
            let cell = self.free_cell_near(village, middle);
            let s = self.sessions.get_mut(&sid).unwrap();
            (s.place, s.spot, s.walk) = (Place::Village, Some((village, cell, 1)), Vec::new());
        }
        self.show_map(sid, spot.is_none());
    }

    /// The session's world map, then one `GM` with every occupant of it (itself last) to it; `arrived`: its own `GM|+`
    /// to the others.
    fn show_map(&self, sid: Sid, arrived: bool) {
        let (map, ..) = self.sessions[&sid].spot.unwrap();
        self.send(sid, self.map_frame(map));
        let others: Vec<Sid> = self.village_sids(map).into_iter().filter(|&o| o != sid).collect();
        let entry = |o: Sid| {
            let (_, cell, dir) = self.sessions[&o].spot.unwrap();
            Self::solo_entry(self.character(o).unwrap(), (cell, dir))
        };
        let entries: Vec<String> = others.iter().chain([&sid]).map(|&o| entry(o)).collect();
        self.send(sid, format!("GM|{}", entries.join("|")));
        if arrived {
            others.iter().for_each(|&o| self.send(o, format!("GM|{}", entries.last().unwrap())));
        }
    }

    /// `GKK<n>`: its walk is over. Standing on a plate of its world map (`links`, maps.json `world`) → the linked map,
    /// arriving on the plate there that leads back, or on the free walkable cell nearest it. The walker gets, while the
    /// old map is still drawn, one `GM|-<id>` per old occupant (one removal per `GM`, Dofus.Client.Game.as:249) and its
    /// own `GM|+` on the arrival cell (the new map's `onMapLoad` rebuilds its sprite from that cell,
    /// Events.Battlefield.Map.as:57-61), then the new map as after `GD`. Old occupants get `GM|-<id>`.
    fn village_walked(&mut self, sid: Sid, me: u32) {
        let (map, cell, dir) = self.sessions[&sid].spot.unwrap();
        let Some(&(to, plate)) = self.data.world[&map].links.get(&cell) else { return };
        for o in self.village_sids(map).into_iter().filter(|&o| o != sid) {
            self.send(o, format!("GM|-{me}"));
            self.send(sid, format!("GM|-{}", self.sessions[&o].character.unwrap()));
        }
        let arrival = self.free_cell_near(to, plate);
        let s = self.sessions.get_mut(&sid).unwrap();
        (s.spot, s.walk) = (Some((to, arrival, dir)), Vec::new());
        self.send(sid, format!("GM|{}", Self::solo_entry(self.character(sid).unwrap(), (arrival, dir))));
        self.show_map(sid, true);
    }

    /// Village `GA001<path>`: the server's own path (pathfinding.rs, out-of-fight rules: length 500, every occupant
    /// blocks, like the client's `pathFind`, whose role-play exemption reads the never-set `BATTLEFIELD.Map.bRolePlay`)
    /// to the requested end cell, broadcast as `GA<n>;1;<id>;<startCode><path>` to every occupant, the mover included
    /// (it answers `GKK<n>`). No `GAS`/`GAF` around it: `GAS` sets `m_bNextAction` and the ack would then leave the
    /// action manager transmitting. A refused move gets `GAF<id>` alone (closes the spinner, resets the manager).
    fn village_move(&mut self, sid: Sid, me: u32, rest: &str) {
        let (map_id, start, _) = self.sessions[&sid].spot.unwrap();
        let map = &self.data.world[&map_id].map;
        let occupied = self.village_cells(map_id);
        let dest = rest.strip_prefix("001").and_then(extract_path).and_then(|p| p.last().copied());
        let found = dest.and_then(|d| path_find(map, &occupied, &HashSet::new(), false, 500, start, d as i64));
        let Some((path, full)) = found.filter(|(_, full)| !full.is_empty()) else {
            return self.send(sid, format!("GAF{me}"));
        };
        let (end, dir) = *full.last().unwrap();
        let s = self.sessions.get_mut(&sid).unwrap();
        (s.spot, s.walk) = (Some((map_id, end, dir)), [start].into_iter().chain(full.iter().map(|&(c, _)| c)).collect());
        self.village_action += 1;
        let path: Vec<(i32, i32)> = path.iter().map(|&(c, d)| (c as i32, d)).collect();
        let ga = format!("GA{};1;{me};{}{}", self.village_action, cell_code(start as i32), compress_path(&path));
        self.village_sids(map_id).into_iter().for_each(|o| self.send(o, ga.clone()));
    }

    /// `GKE<n>|<cell>`: a click during its own walk stopped the sprite on `cell` (GameActionsManager.as:29-33,59-69);
    /// the new `GA001` that follows starts there. Only a free cell of its last walk (start included) is taken.
    fn village_stop(&mut self, sid: Sid, rest: &str) {
        let (map, ..) = self.sessions[&sid].spot.unwrap();
        let taken = self.village_cells(map);
        let s = self.sessions.get_mut(&sid).unwrap();
        let cell = rest.split_once('|').and_then(|(_, c)| c.parse::<i64>().ok());
        if let (Some(cell), Some((_, _, dir))) = (cell.filter(|c| s.walk.contains(c) && !taken.contains(c)), s.spot) {
            s.spot = Some((map, cell, dir));
        }
    }

    /// `GC2<name>|<map>|<options>|<password>` → `GCK|2|name|map|options` then the creator's `GM`.
    fn create_game(&mut self, sid: Sid, me: u32, rest: &str) {
        let p: Vec<&str> = rest.split('|').collect();
        if p.len() != 4 || !valid_name(p[0], 1) || self.games.values().any(|g| g.name == p[0]) {
            return self.send(sid, "GCEn");
        }
        let Some(map) = p[1].parse::<u32>().ok().filter(|m| self.data.map_index.contains_key(m)) else { return self.send(sid, "GCEm") };
        let opts: Vec<u8> = p[2].bytes().collect();
        if opts.len() != 2 || opts.iter().any(|o| !(b'A'..=b'D').contains(o)) {
            return self.send(sid, "GCEo");
        }
        self.leave_place(sid, true);
        let gid = self.next_game;
        self.next_game += 1;
        let creator = self.fighter(&self.store.characters[&me]);
        let game = Game::new(gid, p[0].to_string(), map, [opts[0] - 64, opts[1] - 64], p[3].to_string(), creator);
        let gm = format!("GM|{}", Game::gm_entry(&game.members[0]));
        self.send(sid, format!("GCK|2|{}|{map}|{}", game.name, game.options()));
        self.send(sid, gm);
        self.games.insert(gid, game);
        self.set_place(sid, Place::Game(gid));
    }

    /// `GJ2<name>|<password>` → `GJK|2|…`, the full `GM` to the joiner, its `GM +` to the others. `GJ3<inviter>|…`
    /// (accepting a random-team invitation, `|` or `|undefined` password) → `join_random`.
    fn join_game(&mut self, sid: Sid, me: u32, rest: &str) {
        let (kind, rest) = rest.split_at_checked(1).unwrap_or(("", rest)); // any text can arrive through the `/c` console
        let (name, pass) = rest.split_once('|').unwrap_or((rest, ""));
        if kind == "3" {
            return self.join_random(sid, me, name);
        }
        let Some(g) = self.games.values().find(|g| g.name == name && kind == "2" && !g.random) else { return self.send(sid, "GJEn") };
        let err = if g.phase != Phase::Lobby {
            "GJEs"
        } else if g.is_full() {
            "GJEf"
        } else if !g.password.is_empty() && g.password != pass {
            "GJEp"
        } else {
            ""
        };
        if !err.is_empty() {
            return self.send(sid, err);
        }
        let gid = g.id;
        self.leave_place(sid, true);
        let f = self.fighter(&self.store.characters[&me]);
        let others = self.game_sids(gid);
        let g = self.games.get_mut(&gid).unwrap();
        g.add(f);
        let entries: Vec<String> = g.members.iter().map(Game::gm_entry).collect();
        let mine = Game::gm_entry(g.members.last().unwrap());
        let jk = format!("GJK|2|{}|{}|{}", g.name, g.map, g.options());
        self.send(sid, jk);
        self.send(sid, format!("GM|{}", entries.join("|")));
        for o in others {
            self.send(o, format!("GM|{mine}"));
        }
        self.set_place(sid, Place::Game(gid));
    }

    // ───────────── random games (state 3) ─────────────
    // The `R` handlers are dead (no `AKS.RandomGame`, docs/protocol/misc.md): the client plays random games through
    // `GC3`, `Gi`/`GY`/`GU`, `Gs` and the usual game frames. A random game starts as a party (a lobby whose members
    // see team-mate cards, AKSClient/Events.AKS.Game.as:103-112,153-158), searches, and is matched into a fight.

    /// "Jouer" tabs (`GC3`) → `GCK|3` (the client names the game `getText("RANDOM")` itself), then the creator's `GM`
    /// (its own card, `onValidateInvitation`).
    fn create_random(&mut self, sid: Sid, me: u32) {
        self.leave_place(sid, true);
        let gid = self.next_game;
        self.next_game += 1;
        let mut g = Game::new(gid, format!("#{gid}"), 0, [4, 0], String::new(), self.fighter(&self.store.characters[&me]));
        g.random = true;
        let gm = format!("GM|{}", Game::gm_entry(&g.members[0]));
        self.games.insert(gid, g);
        self.set_place(sid, Place::Game(gid));
        self.send(sid, "GCK|3");
        self.send(sid, gm);
    }

    /// Room left in a random party: 4 team-mates at most (the invite button stops at `m_playerCount == 4`,
    /// modules_Interfaces/DefineSprite_273_TabPlayDofus_TeamMateChoose/…PushButton_5/CLIPACTIONRECORD on(release).as:2).
    fn party_room(g: &Game) -> bool {
        g.members.len() + g.placeholders as usize + g.invited.len() < 4
    }

    /// `Gi<id>` from the party creator. `Gi0` (the list's "Aléatoire" entry) adds a random team-mate slot: `GM|+0`.
    /// Otherwise the character must be online outside any game: `GY<me>|<my name>` to it, else `GiE<id>|<name>`.
    fn invite(&mut self, sid: Sid, me: u32, gid: u32, rest: &str) {
        let g = &self.games[&gid];
        if !g.random || g.creator != me || g.phase != Phase::Lobby || g.searching {
            return;
        }
        let Ok(id) = rest.parse::<u32>() else { return };
        let target = self.sid_of(id).filter(|&t| !matches!(self.place(t), Place::Game(_)));
        let name = self.store.characters.get(&id).map_or(String::new(), |c| c.name.clone());
        match (id, target) {
            _ if !Self::party_room(g) || g.invited.contains(&id) => self.send(sid, format!("GiE{id}|{name}")),
            (0, _) => {
                self.games.get_mut(&gid).unwrap().placeholders += 1;
                self.broadcast(gid, &["GM|+0".into()]);
            }
            (_, Some(t)) if id != me => {
                self.games.get_mut(&gid).unwrap().invited.push(id);
                let my_name = self.store.characters[&me].name.clone();
                self.send(t, format!("GY{me}|{my_name}"));
            }
            _ => self.send(sid, format!("GiE{id}|{name}")),
        }
    }

    /// The pending invitation of `me` into the party created by `inviter`.
    fn invited_party(&self, me: u32, inviter: &str) -> Option<u32> {
        let inviter = inviter.parse::<u32>().ok()?;
        self.games.values().find(|g| g.random && g.creator == inviter && g.invited.contains(&me)).map(|g| g.id)
    }

    /// `GY<inviter>` (No in the invitation box) → `GiC<me>|<my name>` to the inviter (`REFUSE_INVITATION`, its waiting
    /// card removed).
    fn refuse_invitation(&mut self, me: u32, rest: &str) {
        let Some(gid) = self.invited_party(me, rest) else { return };
        let g = self.games.get_mut(&gid).unwrap();
        g.invited.retain(|&i| i != me);
        let creator = g.creator;
        let my_name = self.store.characters[&me].name.clone();
        self.sid_of(creator).into_iter().for_each(|k| self.send(k, format!("GiC{me}|{my_name}")));
    }

    /// `GJ3<inviter>|…` (Yes in the invitation box) → `GJK|3`, the party's `GM` (members and random slots) to the
    /// joiner, its `GM +` to the others (their waiting card becomes a team-mate card). `GJEn` once the invitation is
    /// gone (cancelled, or the party searches).
    fn join_random(&mut self, sid: Sid, me: u32, inviter: &str) {
        let Some(gid) = self.invited_party(me, inviter).filter(|g| self.games[g].phase == Phase::Lobby && !self.games[g].searching)
        else {
            return self.send(sid, "GJEn");
        };
        self.leave_place(sid, true);
        let f = self.fighter(&self.store.characters[&me]);
        let others = self.game_sids(gid);
        let g = self.games.get_mut(&gid).unwrap();
        g.invited.retain(|&i| i != me);
        g.add(f);
        let mut entries: Vec<String> = g.members.iter().map(Game::gm_entry).collect();
        entries.extend((0..g.placeholders).map(|_| "+0".to_string()));
        let mine = Game::gm_entry(g.members.last().unwrap());
        self.set_place(sid, Place::Game(gid));
        self.send(sid, "GJK|3");
        self.send(sid, format!("GM|{}", entries.join("|")));
        for o in others {
            self.send(o, format!("GM|{mine}"));
        }
    }

    /// `GU<id>` (a card's "Annuler"). Own card: leave, like `GQ`. Creator: a pending invitation is withdrawn (`Gy`
    /// closes the invitee's box; the inviter removed the card itself and its `Fl` answer ends its spinner), a random
    /// slot is removed (`GM|-0`), a team-mate is sent away (`GV` to it, `GM|-id` to the others).
    fn undo_invitation(&mut self, sid: Sid, me: u32, gid: u32, rest: &str) {
        let g = &self.games[&gid];
        let Ok(id) = rest.parse::<u32>() else { return };
        if !g.random || g.phase != Phase::Lobby {
            return;
        }
        if id == me {
            return self.leave_game(sid, false);
        }
        if g.creator != me {
            return;
        }
        if g.invited.contains(&id) {
            self.games.get_mut(&gid).unwrap().invited.retain(|&i| i != id);
            self.sid_of(id).into_iter().for_each(|k| self.send(k, "Gy"));
        } else if id == 0 && g.placeholders > 0 {
            self.games.get_mut(&gid).unwrap().placeholders -= 1;
            self.broadcast(gid, &["GM|-0".into()]);
        } else if let Some(k) = self.sid_of(id).filter(|&k| self.place(k) == Place::Game(gid)) {
            self.leave_game(k, false);
        }
    }

    /// Match-making over the searching parties, oldest first: two teams of the same size `n` (members + random slots);
    /// the first party's random slots, the other's, or a whole missing opposing team are filled with players searching
    /// alone (parties of one without random slots).
    // ponytail: greedy first fit on every search start / departure; a skill or level criterion would go here.
    fn match_random(&mut self) {
        loop {
            let queue: Vec<&Game> = self.games.values().filter(|g| g.random && g.searching && g.phase == Phase::Lobby).collect();
            let size = |g: &Game| g.members.len() + g.placeholders as usize;
            let solo = |g: &Game| g.members.len() == 1 && g.placeholders == 0;
            let found = queue.iter().find_map(|a| {
                let n = size(a);
                let b = queue.iter().find(|b| b.id != a.id && size(b) == n);
                let need = a.placeholders as usize + b.map_or(n, |b| b.placeholders as usize);
                let fill: Vec<&Game> = queue.iter().filter(|f| f.id != a.id && Some(f.id) != b.map(|b| b.id) && solo(f)).take(need).copied().collect();
                (fill.len() == need).then(|| {
                    let ids = |gs: &[&Game]| gs.iter().flat_map(|g| g.members.iter().map(|f| f.id)).collect::<Vec<_>>();
                    let (fa, fb) = fill.split_at(a.placeholders as usize);
                    let team0 = [ids(&[a]), ids(fa)].concat();
                    let team1 = [b.map_or(vec![], |b| ids(&[b])), ids(fb)].concat();
                    let parties: Vec<u32> = [a.id].into_iter().chain(b.map(|b| b.id)).chain(fill.iter().map(|f| f.id)).collect();
                    (team0, team1, parties)
                })
            });
            let Some((team0, team1, parties)) = found else { return };
            self.start_random(team0, team1, parties);
        }
    }

    /// A match: the parties' random slots go (`GM|-0`, one per frame), every client gets every fighter with its final
    /// team and slot (silent while `bInSearch`, but `team` decides which `GPS` cells are its own), then `GPS`.
    fn start_random(&mut self, team0: Vec<u32>, team1: Vec<u32>, parties: Vec<u32>) {
        for p in parties {
            let g = self.games.remove(&p).unwrap();
            for sid in g.members.iter().filter_map(|f| self.sid_of(f.id)) {
                (0..g.placeholders).for_each(|_| self.send(sid, "GM|-0"));
            }
        }
        let gid = self.next_game;
        self.next_game += 1;
        let map = self.data.maps[(self.rng.next_u64() % self.data.maps.len() as u64) as usize].id;
        let fighters: Vec<Fighter> = team0.iter().chain(&team1).map(|id| self.fighter(&self.store.characters[id])).collect();
        let mut fighters = fighters.into_iter();
        let mut g = Game::new(gid, format!("#{gid}"), map, [team0.len() as u8; 2], String::new(), fighters.next().unwrap());
        g.random = true;
        fighters.for_each(|f| g.add(f)); // team 0 fills first, in order
        let gm = format!("GM|{}", g.members.iter().map(Game::gm_entry).collect::<Vec<_>>().join("|"));
        let gps = g.start_placement(&self.data);
        let ids: Vec<u32> = g.members.iter().map(|f| f.id).collect();
        self.games.insert(gid, g);
        for id in ids {
            if let Some(sid) = self.sid_of(id) {
                self.set_place(sid, Place::Game(gid));
            }
        }
        self.broadcast(gid, &[gm, gps]);
    }

    fn in_game(&mut self, sid: Sid, me: u32, gid: u32, code: &str, rest: &str) {
        let phase = self.games[&gid].phase;
        match (code, phase) {
            ("Gt", Phase::Lobby) if !self.games[&gid].random => {
                let team = rest.parse::<u8>().unwrap_or(9);
                if self.games.get_mut(&gid).unwrap().change_team(me, team) {
                    self.broadcast(gid, &[format!("GtK{me}|{team}")]);
                } else {
                    self.send(sid, "GtE");
                }
            }
            ("GS", Phase::Lobby) if !self.games[&gid].random => {
                let g = self.games.get_mut(&gid).unwrap();
                if g.creator == me && g.is_full() {
                    let gps = g.start_placement(&self.data);
                    self.broadcast(gid, &[gps]);
                }
            }
            ("GD", Phase::Placement | Phase::Fight) => {
                let m = &self.data.map_index[&self.games[&gid].map];
                self.send(sid, format!("GDM|{}|{}|{}|0|{}|{}", m.id, m.width, m.height, m.background, m.data));
            }
            ("GR", Phase::Placement) => {
                let g = self.games.get_mut(&gid).unwrap();
                g.members.iter_mut().filter(|f| f.id == me).for_each(|f| f.ready = true);
                if !g.ready_sent && g.members.iter().all(|f| f.ready) {
                    self.everybody_ready(gid);
                }
            }
            ("Gp", Phase::Placement) => {
                let g = self.games.get_mut(&gid).unwrap();
                let ok = rest.parse::<i64>().is_ok_and(|cell| g.place(&self.data, me, cell));
                let gic = g.gic();
                if !ok {
                    if gic.len() > 4 {
                        self.send(sid, gic);
                    }
                    return;
                }
                self.broadcast(gid, &[gic]);
                if self.games[&gid].members.iter().all(|f| f.placed) {
                    self.start_fight(gid);
                }
            }
            ("GT", Phase::Fight) if self.games[&gid].current() == Some(me) => self.next_turn(gid),
            ("GA", Phase::Fight) => {
                let (kind, params) = rest.split_at_checked(3).unwrap_or(("", ""));
                let g = self.games.get_mut(&gid).unwrap();
                match g.act(&self.data, &mut self.rng, me, kind, params) {
                    Some(mut frames) => {
                        frames.insert(0, format!("GAS{me}"));
                        frames.push(format!("GAF{me}"));
                        self.broadcast(gid, &frames);
                        if let Some(winner) = self.games[&gid].outcome() {
                            self.end_game(gid, winner);
                        }
                    }
                    // A rejected request still needs an answer: `GAF` resets the client's action manager. Only for
                    // the current fighter — for anyone else it would run KERNEL.cleanPlayer and reset its AP.
                    None if g.current() == Some(me) => self.send(sid, format!("GAF{me}")),
                    None => {}
                }
            }
            _ => {} // GKK acks (nothing waits on them), GKE (moves are applied at once), GP/Gc/GI (no caller)
        }
    }

    /// Every fighter has built the map: `GR` (placement mode on every client), then the placement timer starts.
    fn everybody_ready(&mut self, gid: u32) {
        let g = self.games.get_mut(&gid).unwrap();
        g.ready_sent = true;
        let serial = g.serial;
        self.broadcast(gid, &["GR".into()]);
        self.schedule(self.placement_ms, gid, serial);
    }

    fn start_fight(&mut self, gid: u32) {
        let g = self.games.get_mut(&gid).unwrap();
        let mut frames = g.start_fight();
        frames.extend(g.begin_turn(self.turn_ms));
        let serial = g.serial;
        self.broadcast(gid, &frames);
        self.schedule(self.turn_ms, gid, serial);
    }

    fn next_turn(&mut self, gid: u32) {
        let g = self.games.get_mut(&gid).unwrap();
        let mut frames: Vec<String> = g.end_turn().into_iter().collect();
        frames.extend(g.begin_turn(self.turn_ms));
        let serial = g.serial;
        self.broadcast(gid, &frames);
        self.schedule(self.turn_ms, gid, serial);
    }

    fn timer(&mut self, gid: u32, serial: u64) {
        let Some(g) = self.games.get_mut(&gid).filter(|g| g.serial == serial) else { return };
        match g.phase {
            Phase::Placement => {
                g.place_everyone(&self.data);
                let gic = g.gic();
                self.broadcast(gid, &[gic]);
                self.start_fight(gid);
            }
            Phase::Fight => self.next_turn(gid),
            _ => {}
        }
    }

    /// `GE<sender>|<winner>;<id>;<level>;<dead>;<lowXp>;<xp>;<highXp>;<winXp>;<gold>|…` to everyone still in the game,
    /// XP/gold persisted, then `AN` for level-ups and `AB` stat 2 for gold.
    fn end_game(&mut self, gid: u32, winner: Option<u8>) {
        let g = self.games.get_mut(&gid).unwrap();
        g.phase = Phase::Ended;
        g.serial += 1;
        let g = &self.games[&gid];
        let r = &self.data.rules;
        let sender = g.last_actor.filter(|a| g.member(*a).is_some()).unwrap_or(g.members[0].id);
        let mut results = Vec::new();
        let mut after = Vec::new();
        for f in &g.members {
            let opponents: u64 = g
                .members
                .iter()
                .map(|o| (o.team, o.level))
                .chain(g.departed.iter().map(|&(_, t, l)| (t, l)))
                .filter(|o| o.0 != f.team)
                .map(|o| o.1 as u64)
                .sum();
            let won = winner == Some(f.team);
            let xp = opponents * if won { r.xp_win_per_opponent_level } else { r.xp_loss_per_opponent_level };
            let gold = if won { opponents as i64 * r.gold_win_per_opponent_level } else { 0 };
            let Some(c) = self.store.characters.get_mut(&f.id) else { continue };
            let level_before = c.level;
            c.xp += xp;
            c.gold = (c.gold + gold + f.gold_change).max(0);
            while c.level < r.max_level && c.xp >= r.xp[c.level as usize] {
                c.level += 1;
                c.bonus += r.bonus_per_level;
            }
            let (low, high) = (r.xp[c.level as usize - 1], *r.xp.get(c.level as usize).unwrap_or(&r.xp[c.level as usize - 1]));
            results.push(format!(
                "{};{};{};{};{low};{};{high};{xp};{gold}",
                if won { 2 } else { 1 },
                f.id,
                c.level,
                !f.alive as u8,
                c.xp - low,
            ));
            let sid = self.sessions.iter().find(|(_, s)| s.character == Some(f.id)).map(|(&k, _)| k);
            if let Some(sid) = sid {
                if c.level > level_before {
                    after.push((sid, format!("AN{}|{low}|{}|{high}|{}", c.level, c.xp, c.bonus)));
                }
                if gold + f.gold_change != 0 {
                    after.push((sid, format!("ABK{}|2;{}", f.id, c.gold)));
                }
            }
        }
        // Leavers are losers, dead (receivers played their `die` on `GM|-id`), no XP or gold. Their records still exist
        // on every receiver: `GM|-id` "deletes" with `setItemAt(id, undefined)`, which keeps the object
        // (DofusDataProviderSymbol.as:65-98), so the result panel finds their name.
        for &(id, _, level) in &g.departed {
            results.push(match self.store.characters.get(&id) {
                Some(c) => {
                    let (low, high) = self.xp_bounds(c.level);
                    format!("1;{id};{};1;{low};{};{high};0;0", c.level, c.xp - low)
                }
                None => format!("1;{id};{level};1;0;0;0;0;0"),
            });
        }
        self.store.save();
        self.games.get_mut(&gid).unwrap().members.iter_mut().for_each(|f| f.gold_change = 0); // applied above
        self.broadcast(gid, &[format!("GE{sender}|{}", results.join("|"))]);
        for (sid, m) in after {
            self.send(sid, m);
        }
    }

    /// Leaving (`GQ`, kick, disconnect, joining elsewhere). Lobby: `GM|-id` to the others (the creator leaving closes
    /// the game: `GV` to all). Running: `GTF` if it was its turn, `GM|-id`, then the fight goes on or ends.
    /// The leaver gets `GV` unless `silent` (disconnected or already moving elsewhere).
    fn leave_game(&mut self, sid: Sid, silent: bool) {
        let Place::Game(gid) = self.place(sid) else { return };
        let me = self.sessions[&sid].character.unwrap();
        self.set_place(sid, Place::None);
        if !silent {
            self.send(sid, "GV");
        }
        let g = self.games.get_mut(&gid).unwrap();
        let was_current = g.current() == Some(me);
        let phase = g.phase;
        let left = g.remove(me);
        if let Some(f) = &left {
            if let Some(c) = self.store.characters.get_mut(&me) {
                c.gold = (c.gold + f.gold_change).max(0);
            }
        }
        match phase {
            Phase::Lobby if g.creator == me => {
                for i in std::mem::take(&mut g.invited) {
                    self.sid_of(i).into_iter().for_each(|k| self.send(k, "Gy")); // the invitation box closes
                }
                for k in self.game_sids(gid) {
                    self.set_place(k, Place::None);
                    self.send(k, "GV");
                }
                self.games.remove(&gid);
            }
            Phase::Lobby => self.broadcast(gid, &[format!("GM|-{me}")]),
            Phase::Ended => {}
            Phase::Placement | Phase::Fight => {
                let mut frames = Vec::new();
                if was_current {
                    frames.push(format!("GTF{me}"));
                }
                frames.push(format!("GM|-{me}"));
                self.broadcast(gid, &frames);
                let g = &self.games[&gid];
                if let Some(winner) = g.outcome() {
                    self.end_game(gid, winner);
                } else if phase == Phase::Fight && was_current {
                    // begin_turn moves on from the leaver's slot and skips ids no longer in the game.
                    let g = self.games.get_mut(&gid).unwrap();
                    let frames: Vec<String> = g.begin_turn(self.turn_ms).into_iter().collect();
                    let serial = g.serial;
                    self.broadcast(gid, &frames);
                    self.schedule(self.turn_ms, gid, serial);
                } else if phase == Phase::Placement {
                    let g = self.games.get_mut(&gid).unwrap();
                    if !g.ready_sent && !g.members.is_empty() && g.members.iter().all(|f| f.ready) {
                        self.everybody_ready(gid);
                    }
                    if !self.games[&gid].members.is_empty() && self.games[&gid].members.iter().all(|f| f.placed) {
                        self.start_fight(gid);
                    }
                }
            }
        }
        if self.games.get(&gid).is_some_and(|g| g.members.is_empty()) {
            self.games.remove(&gid);
        }
        self.store.save();
        self.match_random(); // a searching party got smaller
    }
}
