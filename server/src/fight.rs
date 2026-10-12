//! One multiplayer game: lobby members, placement, turns and game actions. Pure logic: methods return the frames
//! to broadcast; the world (world.rs) sends them, runs the timers and persists XP.
//!
//! Client mirrors (so both sides agree on what is allowed):
//! - AP: only lowered by `GA x;102`/`101`; a fighter's AP is reset to `APinit + moderator[1]` and its timed
//!   effects tick when its turn ends (the client does it in `KERNEL.cleanPlayer(lastPlayerID)` at the next `GTS`).
//! - `Launches` is `Dofus.SpellsManager.as`, `Effects` is `Dofus.EffectsManager.as`, both with their
//!   `splice(i, i + 1)` removal bug, so per-turn / per-target / delay limits and the range moderator match.
//! - Movement, range and line of sight go through pathfinding.rs (proven identical to the client port).
use crate::codec::{cell_code, compress_path, extract_path};
use crate::data::{CloseCombat, Dice, Effect, GameData, SpellLevel};
use crate::map::{tacle_zones, Map};
use crate::pathfinding::{check_range, check_view, direction, distance, path_find};
use std::collections::{HashMap, HashSet};

/// xorshift64* — enough for dice.
pub struct Rng(pub u64);

impl Rng {
    pub fn next_u64(&mut self) -> u64 {
        self.0 ^= self.0 >> 12;
        self.0 ^= self.0 << 25;
        self.0 ^= self.0 >> 27;
        self.0.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }
    pub fn roll(&mut self, [count, faces, bonus]: Dice) -> i32 {
        (0..count).map(|_| 1 + (self.next_u64() % faces.max(1) as u64) as i32).sum::<i32>() + bonus
    }
    /// True once in `n` (never for 0).
    pub fn one_in(&mut self, n: u32) -> bool {
        n > 0 && self.next_u64().is_multiple_of(n as u64)
    }
}

/// Critical-hit odds, 1 in `n` (0 = never), improved by agility: `n·e·1.1 / ln(agility + 12)` when smaller, never
/// better than 1 in 2 (rule stated by the project owner).
pub fn crit_odds(n: u32, agility: i32) -> u32 {
    match n {
        0 => 0,
        _ if agility > 0 => n.min((n as f64 * std::f64::consts::E * 1.1 / ((agility + 12) as f64).ln()) as u32).max(2),
        _ => n.max(2),
    }
}

/// Critical-miss odds: 1 in `n` (0 = never), never more than 1 in 2 (rule stated by the project owner).
pub fn miss_odds(n: u32) -> u32 {
    if n == 0 {
        0
    } else {
        n.max(2)
    }
}

/// A critical's spell effect: `bonus` added to the fixed part of damage, drain and heal dice (authored).
fn critical(e: &Effect, bonus: i32) -> Effect {
    let mut e = e.clone();
    if let Effect::Damage { dice } | Effect::Drain { dice } | Effect::Heal { dice } = &mut e {
        dice[2] += bonus;
    }
    e
}

/// `Dofus.SpellsManager.as` for one fighter.
#[derive(Default)]
pub struct Launches {
    by_turn: Vec<u32>,
    by_turn_count: HashMap<u32, i32>,
    by_player: Vec<(u32, u32)>,
    by_player_count: HashMap<u32, i32>,
    delays: Vec<(u32, f64)>,
}

impl Launches {
    /// addLaunchedSpell (:16-39); `target` = occupant of the target cell before the effects.
    fn add(&mut self, spell: u32, target: Option<u32>, l: &SpellLevel) {
        if l.per_turn != 0 {
            self.by_turn.push(spell);
            *self.by_turn_count.entry(spell).or_default() += 1;
        }
        if let (true, Some(t)) = (l.per_target != 0, target) {
            self.by_player.push((spell, t));
            *self.by_player_count.entry(spell).or_default() += 1;
        }
        if l.delay != 0 {
            self.delays.push((spell, if l.delay >= 63 { f64::MAX } else { l.delay as f64 }));
        }
    }
    /// checkCanLaunchSpell (:60-120). The per-target counter is per spell, not per target (client quirk).
    fn check(&self, spell: u32, target: Option<u32>, l: &SpellLevel) -> bool {
        let count = |m: &HashMap<u32, i32>| m.get(&spell).copied().unwrap_or(0);
        !(self.by_turn.contains(&spell) && count(&self.by_turn_count) >= l.per_turn
            || self.by_player.iter().any(|&(s, t)| s == spell && Some(t) == target) && count(&self.by_player_count) >= l.per_target
            || self.delays.iter().any(|&(s, _)| s == spell))
    }
    /// nextTurn (:40-59), at the start of the fighter's own turn.
    fn next_turn(&mut self) {
        *self = Launches { delays: std::mem::take(&mut self.delays), ..Default::default() };
        let len = self.delays.len();
        for i in 0..len {
            if let Some(d) = self.delays.get_mut(i) {
                d.1 -= 1.0;
                if d.1 <= 0.0 {
                    let end = (2 * i + 1).min(self.delays.len());
                    self.delays.drain(i..end);
                }
            }
        }
    }
}

pub struct Fighter {
    pub id: u32,
    pub name: String,
    pub level: u32,
    pub class: u8,
    pub sex: u8,
    pub colors: [i64; 3],
    pub team: u8,
    pub pos: u8,
    pub lp: i32,
    pub lp_max: i32,
    pub ap: i32,
    pub ap_init: i32,
    /// AP cost and critical numbers of the close combat: the class ones bare-handed, the weapon type's with a weapon.
    pub cc: CloseCombat,
    /// Damage effects of the equipped weapon, every one rolled by a close combat; None = bare hands (`cc.dice`).
    pub weapon: Option<Vec<Dice>>,
    /// Characteristic 14 (critical-hit odds).
    pub agility: i32,
    pub spells: HashMap<u32, usize>,
    pub gold: i64,
    pub gold_change: i64,
    pub cell: Option<i64>,
    pub ready: bool,
    pub placed: bool,
    pub alive: bool,
    /// `Dofus.EffectsManager.as`: (type, value, remainingTurn) and the 20 moderators.
    effects: Vec<(usize, i32, i32)>,
    pub moderators: [i32; 20],
    reflect: Option<(Dice, i32)>,
    launches: Launches,
}

impl Fighter {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        id: u32,
        name: String,
        level: u32,
        class: u8,
        sex: u8,
        colors: [i64; 3],
        lp: i32,
        ap: i32,
        cc: CloseCombat,
        spells: HashMap<u32, usize>,
        gold: i64,
    ) -> Fighter {
        Fighter {
            id,
            name,
            level,
            class,
            sex,
            colors,
            team: 0,
            pos: 0,
            lp,
            lp_max: lp,
            ap,
            ap_init: ap,
            cc,
            weapon: None,
            agility: 0,
            spells,
            gold,
            gold_change: 0,
            cell: None,
            ready: false,
            placed: false,
            alive: true,
            effects: Vec::new(),
            moderators: [0; 20],
            reflect: None,
            launches: Launches::default(),
        }
    }

    /// Initiative (rule stated by the project owner): a quarter of the max LP (vitality included), scaled by LP / max
    /// LP when wounded, which never applies here: everybody starts a fight with full LP. No initiative bonus in 5b.
    pub fn initiative(&self) -> i32 {
        self.lp_max / 4
    }

    fn add_effect(&mut self, kind: usize, value: i32, turns: i32, on_itself: bool) {
        self.effects.push((kind, value, if on_itself { turns } else { turns - 1 }));
        self.moderators[kind] += value;
    }

    /// End of the fighter's turn: EffectsManager.nextTurn (splice bug kept) then initAP.
    fn end_turn(&mut self) {
        let len = self.effects.len();
        for i in 0..len {
            if let Some(e) = self.effects.get_mut(i) {
                e.2 -= 1;
                if e.2 < 0 {
                    self.moderators[e.0] -= e.1;
                    let end = (2 * i + 1).min(self.effects.len());
                    self.effects.drain(i..end);
                }
            }
        }
        self.ap = self.ap_init + self.moderators[1];
        self.reflect = self.reflect.and_then(|(d, t)| (t > 0).then_some((d, t - 1)));
    }
}

pub fn color(c: i64) -> String {
    if c < 0 {
        "-1".into()
    } else {
        format!("{c:06X}")
    }
}

#[derive(PartialEq, Clone, Copy, Debug)]
pub enum Phase {
    Lobby,
    Placement,
    Fight,
    Ended,
}

pub struct Game {
    pub id: u32,
    pub name: String,
    pub map: u32,
    /// Team sizes from the options string (`chr(64 + n)`).
    pub sizes: [u8; 2],
    pub password: String,
    pub creator: u32,
    pub members: Vec<Fighter>,
    pub phase: Phase,
    pub ready_sent: bool,
    pub order: Vec<u32>,
    pub turn: usize,
    /// Bumped on every phase/turn change; a timer only fires if its serial is still current.
    pub serial: u64,
    next_action: u32,
    pub last_actor: Option<u32>,
    /// (id, team, level) of fighters who left a running game: listed as losers in `GE`, and they still count as
    /// opponents for the XP.
    pub departed: Vec<(u32, u8, u32)>,
    /// Random game (state 3): a party building its team in the lobby, then the matched fight.
    pub random: bool,
    /// Random party: match-making search started (`Gs`).
    pub searching: bool,
    /// Random party: "random team-mate" slots (`Gi0`, shown as `GM|+0`), filled by players searching alone.
    pub placeholders: u8,
    /// Random party: invited characters who have not answered yet.
    pub invited: Vec<u32>,
}

impl Game {
    pub fn new(id: u32, name: String, map: u32, sizes: [u8; 2], password: String, creator: Fighter) -> Game {
        let mut g = Game {
            id,
            name,
            map,
            sizes,
            password,
            creator: creator.id,
            members: Vec::new(),
            phase: Phase::Lobby,
            ready_sent: false,
            order: Vec::new(),
            turn: 0,
            serial: 0,
            next_action: 1,
            last_actor: None,
            departed: Vec::new(),
            random: false,
            searching: false,
            placeholders: 0,
            invited: Vec::new(),
        };
        g.add(creator);
        g
    }

    pub fn options(&self) -> String {
        self.sizes.iter().map(|&n| (64 + n) as char).collect()
    }
    pub fn is_full(&self) -> bool {
        self.members.len() >= (self.sizes[0] + self.sizes[1]) as usize
    }
    pub fn member(&self, id: u32) -> Option<&Fighter> {
        self.members.iter().find(|f| f.id == id)
    }
    fn member_mut(&mut self, id: u32) -> Option<&mut Fighter> {
        self.members.iter_mut().find(|f| f.id == id)
    }
    fn team_count(&self, team: u8, except: u32) -> usize {
        self.members.iter().filter(|f| f.team == team && f.id != except).count()
    }

    /// Joins the first team with room and the first free lobby slot.
    pub fn add(&mut self, mut f: Fighter) {
        f.team = if self.team_count(0, f.id) < self.sizes[0] as usize { 0 } else { 1 };
        f.pos = (0..).find(|p| !self.members.iter().any(|m| m.pos == *p)).unwrap();
        self.members.push(f);
    }

    /// Lobby `Gt`: true if the team has room.
    pub fn change_team(&mut self, id: u32, team: u8) -> bool {
        if self.phase != Phase::Lobby || team > 1 || self.team_count(team, id) >= self.sizes[team as usize] as usize {
            return false;
        }
        self.member_mut(id).map(|f| f.team = team).is_some()
    }

    /// Multiplayer `GM` add entry: `+id;name;level;guild;sex;gfx;c1;c2;c3;weapon;LP;team;joinPosition`.
    pub fn gm_entry(f: &Fighter) -> String {
        let c = f.colors.map(color);
        format!(
            "+{};{};{};{};{};{};{};{};{};;{};{};{}",
            f.id,
            f.name,
            f.level,
            f.class,
            f.sex,
            f.class as u32 * 10 + f.sex as u32,
            c[0],
            c[1],
            c[2],
            f.lp_max,
            f.team,
            f.pos
        )
    }

    /// `GS` from the creator: resets the fighters and returns the `GPS` frame.
    pub fn start_placement(&mut self, data: &GameData) -> String {
        self.phase = Phase::Placement;
        self.serial += 1;
        for f in &mut self.members {
            f.lp = f.lp_max;
            f.ap = f.ap_init;
            (f.cell, f.ready, f.placed, f.alive) = (None, false, false, true);
        }
        let places = &self.map_entry(data).places;
        format!(
            "GPS{}|{}",
            places[0].iter().map(|&c| cell_code(c as i32)).collect::<String>(),
            places[1].iter().map(|&c| cell_code(c as i32)).collect::<String>()
        )
    }

    fn map_entry<'a>(&self, data: &'a GameData) -> &'a crate::data::MapEntry {
        data.maps.iter().find(|m| m.id == self.map).expect("game map")
    }

    /// `Gp<cell>`: the cell must be one of the team's and free.
    pub fn place(&mut self, data: &GameData, id: u32, cell: i64) -> bool {
        let Some(team) = self.member(id).map(|f| f.team) else { return false };
        let taken = self.members.iter().any(|f| f.id != id && f.cell == Some(cell));
        if self.phase != Phase::Placement || taken || !self.map_entry(data).places[team as usize].contains(&cell) {
            return false;
        }
        let f = self.member_mut(id).unwrap();
        (f.cell, f.placed) = (Some(cell), true);
        true
    }

    /// Placement timeout: unplaced fighters get the first free cell of their team.
    pub fn place_everyone(&mut self, data: &GameData) {
        let places = self.map_entry(data).places.clone();
        for i in 0..self.members.len() {
            if self.members[i].placed {
                continue;
            }
            let team = self.members[i].team as usize;
            let free = places[team].iter().copied().find(|c| !self.members.iter().any(|f| f.cell == Some(*c)));
            let f = &mut self.members[i];
            (f.cell, f.placed) = (free, free.is_some());
        }
    }

    /// `GIC|id;cell;dir|…` for every placed fighter (listing an unplaced one would stop its drag on its client).
    pub fn gic(&self) -> String {
        let e: Vec<String> = self
            .members
            .iter()
            .filter(|f| f.placed)
            .map(|f| format!("{};{};{}", f.id, f.cell.unwrap_or(0), if f.team == 0 { 1 } else { 3 }))
            .collect();
        format!("GIC|{}", e.join("|"))
    }

    /// Ends placement: `GS`, `GTL|…`. Turn order (rule stated by the project owner): each team sorted by initiative
    /// (lobby slot among equals, authored), the team with the highest initiative starts (random on a tie), then the
    /// teams alternate; the rest of the larger team plays last. Call `begin_turn` next.
    pub fn start_fight(&mut self, rng: &mut Rng) -> Vec<String> {
        self.phase = Phase::Fight;
        let team = |t: u8| {
            let mut v: Vec<&Fighter> = self.members.iter().filter(|f| f.team == t).collect();
            v.sort_by_key(|f| (std::cmp::Reverse(f.initiative()), f.pos));
            v.into_iter().map(|f| (f.id, f.initiative())).collect::<Vec<_>>()
        };
        let (a, b) = (team(0), team(1));
        let best = |t: &[(u32, i32)]| t.first().map_or(-1, |f| f.1);
        let (a, b) = match best(&a).cmp(&best(&b)) {
            std::cmp::Ordering::Less => (b, a),
            std::cmp::Ordering::Equal if rng.one_in(2) => (b, a),
            _ => (a, b),
        };
        self.order = (0..a.len().max(b.len())).flat_map(|i| [a.get(i), b.get(i)]).flatten().map(|f| f.0).collect();
        self.turn = self.order.len() - 1; // begin_turn advances to the first alive fighter from here
        vec!["GS".into(), format!("GTL|{}", self.order.iter().map(|i| i.to_string()).collect::<Vec<_>>().join("|"))]
    }

    pub fn current(&self) -> Option<u32> {
        (self.phase == Phase::Fight).then(|| self.order.get(self.turn).copied()).flatten()
    }

    /// Advances to the next alive fighter and starts its turn: `GTS<id>|<ms>`.
    pub fn begin_turn(&mut self, turn_ms: u64) -> Option<String> {
        for _ in 0..self.order.len() {
            self.turn = (self.turn + 1) % self.order.len();
            let id = self.order[self.turn];
            if let Some(f) = self.members.iter_mut().find(|f| f.id == id && f.alive) {
                f.launches.next_turn();
                self.serial += 1;
                return Some(format!("GTS{id}|{turn_ms}"));
            }
        }
        None
    }

    /// `GT` / timeout: `GTF<id>`, then the turn-end bookkeeping of that fighter. Call `begin_turn` next.
    pub fn end_turn(&mut self) -> Option<String> {
        let id = self.current()?;
        if let Some(f) = self.member_mut(id) {
            f.end_turn();
        }
        Some(format!("GTF{id}"))
    }

    /// Winning team once a team has nobody alive (`Some(None)` = everybody died).
    pub fn outcome(&self) -> Option<Option<u8>> {
        let alive = |t: u8| self.members.iter().any(|f| f.team == t && f.alive);
        match (alive(0), alive(1)) {
            (true, true) => None,
            (true, false) => Some(Some(0)),
            (false, true) => Some(Some(1)),
            (false, false) => Some(None),
        }
    }

    pub fn remove(&mut self, id: u32) -> Option<Fighter> {
        let i = self.members.iter().position(|f| f.id == id)?;
        let f = self.members.remove(i);
        if matches!(self.phase, Phase::Placement | Phase::Fight) {
            self.departed.push((f.id, f.team, f.level));
        }
        Some(f)
    }

    fn occupant(&self, cell: i64) -> Option<u32> {
        self.members.iter().find(|f| f.alive && f.cell == Some(cell)).map(|f| f.id)
    }
    fn occupied(&self) -> HashSet<i64> {
        self.members.iter().filter(|f| f.alive).filter_map(|f| f.cell).collect()
    }

    fn action_id(&mut self) -> u32 {
        self.next_action += 1;
        self.next_action - 1
    }

    /// A `GA<type><params>` request of the current fighter. Returns the result frames (to wrap in `GAS`/`GAF`) and
    /// whether a critical miss ended the turn (the client never ends it itself: the caller sends `GTF`/`GTS`), or None
    /// when the request is invalid.
    pub fn act(&mut self, data: &GameData, rng: &mut Rng, id: u32, kind: &str, params: &str) -> Option<(Vec<String>, bool)> {
        if self.current() != Some(id) {
            return None;
        }
        let map = &data.map_index[&self.map];
        let done = match kind {
            "001" => self.act_move(map, id, params).map(|f| (f, false)),
            "300" => self.act_spell(data, map, rng, id, params),
            "303" => self.act_close_combat(map, rng, id, params),
            _ => None,
        }?;
        self.last_actor = Some(id);
        Some(done)
    }

    fn act_move(&mut self, map: &Map, id: u32, params: &str) -> Option<Vec<String>> {
        let dest = *extract_path(params)?.last()? as i64;
        let f = self.member(id)?;
        let (start, team, ap) = (f.cell?, f.team, f.ap);
        // Tackle zones of every fighter still in the game; dead ones project from cell 0 like on the client.
        let zones = tacle_zones(map, self.members.iter().map(|f| (if f.alive { f.cell.unwrap_or(0) } else { 0 }, f.team)));
        let (path, full) = path_find(map, &self.occupied(), &zones[if team != 0 { 0 } else { 1 }], true, ap as i64, start, dest)?;
        let steps = full.len() as i32;
        let f = self.member_mut(id)?;
        f.cell = Some(dest);
        f.ap -= steps;
        let n = self.action_id();
        let path: Vec<(i32, i32)> = path.iter().map(|&(c, d)| (c as i32, d)).collect();
        Some(vec![format!("GA{n};1;{id};{}{}", cell_code(start as i32), compress_path(&path)), format!("GAx;102;{id};{id},-{steps}")])
    }

    /// Close combat (rules stated by the project owner): a critical miss (`305`) spends the AP and ends the turn; a
    /// critical (`304` after the `303`) adds `crit_bonus` to the dice count bare-handed, to `p3` of every weapon damage
    /// effect with a weapon.
    fn act_close_combat(&mut self, map: &Map, rng: &mut Rng, id: u32, params: &str) -> Option<(Vec<String>, bool)> {
        let cell: i64 = params.parse().ok()?;
        let f = self.member(id)?;
        let (from, cc, weapon, range_mod, agility) = (f.cell?, f.cc.clone(), f.weapon.clone(), f.moderators[19], f.agility);
        let target = self.occupant(cell)?;
        // Interaction.as:119-145, whatever the weapon: moderated range 1, own cell excluded, walkable occupied cell,
        // line of sight.
        if f.ap < cc.ap
            || !check_range(map.width as i64, from, cell, false, 1, range_mod as i64, false)
            || !map.walkable(cell)
            || !check_view(map, &self.occupied(), from, cell)
        {
            return None;
        }
        self.member_mut(id)?.ap -= cc.ap;
        let n = self.action_id();
        let spent = format!("GAx;102;{id};{id},-{}", cc.ap);
        if rng.one_in(miss_odds(cc.miss)) {
            return Some((vec![format!("GA{n};305;{id};"), spent], true));
        }
        let crit = rng.one_in(crit_odds(cc.crit, agility));
        let mut out = vec![format!("GA{n};303;{id};{cell}")];
        if crit {
            out.push(format!("GAx;304;{id};"));
        }
        out.push(spent);
        let bonus = if crit { cc.crit_bonus } else { 0 };
        let rolls = match weapon {
            Some(dice) => dice.iter().map(|&[c, f, b]| [c, f, b + bonus]).collect(),
            None => vec![[cc.dice[0] + bonus, cc.dice[1], cc.dice[2]]],
        };
        for dice in rolls {
            let (Some(a), Some(true)) = (self.member(id).filter(|a| a.alive), self.member(target).map(|t| t.alive)) else { break };
            let dmg = (rng.roll(dice) + a.moderators[16]).max(0);
            self.damage(rng, id, target, dmg, true, &mut out);
        }
        Some((out, false))
    }

    /// Spells: a critical miss (`302` instead of the `300`) spends the AP, records no launch and ends the turn; a
    /// critical (`301` after the `300`) casts `critical` effects (mechanics stated by the project owner).
    fn act_spell(&mut self, data: &GameData, map: &Map, rng: &mut Rng, id: u32, params: &str) -> Option<(Vec<String>, bool)> {
        let (spell, cell) = params.split_once(';')?;
        let (spell, cell): (u32, i64) = (spell.parse().ok()?, cell.parse().ok()?);
        let f = self.member(id)?;
        let level = *f.spells.get(&spell)?;
        let s = data.spells.get(&spell)?;
        let l = &s.levels[level - 1];
        let from = f.cell?;
        map.cell(cell)?;
        let target = self.occupant(cell);
        // Kernel.switchToSpellLaunch (AP, launch limits) then the roll-over test of Interaction.as:80-118, verbatim:
        // a free-cell spell passes on a free cell even without line of sight.
        if f.ap < l.ap
            || !f.launches.check(spell, None, l)
            || !check_range(map.width as i64, from, cell, l.line, l.range as i64, f.moderators[19] as i64, l.on_itself)
        {
            return None;
        }
        let mut ok = false;
        if l.free_cell && map.walkable(cell) && target.is_none() {
            ok = f.launches.check(spell, target, l);
        }
        if l.los {
            if check_view(map, &self.occupied(), from, cell) {
                ok = f.launches.check(spell, target, l);
            }
        } else if !l.free_cell {
            ok = f.launches.check(spell, target, l);
        }
        if !ok {
            return None;
        }
        let agility = f.agility;
        self.member_mut(id)?.ap -= l.ap;
        let n = self.action_id();
        let spent = format!("GAx;102;{id};{id},-{}", l.ap);
        if rng.one_in(miss_odds(l.miss)) {
            // No launch recorded: the client records a cast on `300` only (Events.AKS.Game.as:775-781).
            return Some((vec![format!("GA{n};302;{id};{spell}"), spent], true));
        }
        self.member_mut(id)?.launches.add(spell, target, l);
        let crit = rng.one_in(crit_odds(l.crit, agility));
        // inFront is always 1: with 0, Spells.launch* put the spell clip at depth `cell*100+50-20+index` (index 0..20;
        // `+51` for shoots), which equals the target character's sprite depth `cell*100+50` (Character setPosition →
        // chgDepth) once every 21 launches, and createEmptyMovieClip then replaces the sprite: the character vanishes
        // and every later animation of it waits for the 10 s sequencer timeout
        // (AKSClient/Dofus.BattleField.Spells.as:54-58,71-76; AKSClient/Dofus.Sequencer.as:41).
        let mut out = vec![format!("GA{n};300;{id};{spell},{cell},{},{level},{},1", s.anim, s.launch_type)];
        if crit {
            out.push(format!("GAx;301;{id};{spell}"));
        }
        out.push(spent);
        let zone: Vec<i64> = match l.zone.split_at(1) {
            ("C", r) => {
                let r: i64 = r.parse().unwrap_or(0);
                (0..map.cells.len() as i64).filter(|&c| map.active(c) && distance(c, cell, map.width as i64) <= r).collect()
            }
            _ => vec![cell],
        };
        let targets: Vec<u32> = zone.iter().filter_map(|&c| self.occupant(c)).collect();
        for e in &l.effects {
            let e = if crit { critical(e, l.crit_bonus) } else { e.clone() };
            self.effect(map, rng, id, cell, &targets, &e, &mut out);
        }
        Some((out, false))
    }

    /// Applies one spell effect to every still-alive target (or the caster), appending its frames.
    #[allow(clippy::too_many_arguments)]
    fn effect(&mut self, map: &Map, rng: &mut Rng, caster: u32, cell: i64, targets: &[u32], e: &Effect, out: &mut Vec<String>) {
        let alive = |g: &Game, t: u32| g.member(t).is_some_and(|f| f.alive);
        let bonus = self.member(caster).map_or(0, |f| f.moderators[16]);
        for &t in targets.iter().filter(|_| !matches!(e, Effect::Jump | Effect::SelfDamage { .. })) {
            if !alive(self, t) {
                continue;
            }
            match e {
                Effect::Damage { dice } | Effect::Drain { dice } => {
                    let dmg = (rng.roll(*dice) + bonus).max(0);
                    let dealt = self.damage(rng, caster, t, dmg, true, out);
                    if matches!(e, Effect::Drain { .. }) && alive(self, caster) {
                        self.heal(caster, caster, dealt, out);
                    }
                }
                Effect::Heal { dice } => self.heal(caster, t, rng.roll(*dice), out),
                Effect::ApLoss { value } => {
                    let f = self.member_mut(t).unwrap();
                    let d = (*value).min(f.ap.max(0));
                    if d > 0 {
                        f.ap -= d;
                        out.push(format!("GAx;101;{caster};{t},-{d}"));
                    }
                }
                Effect::ApGain { value } => {
                    self.member_mut(t).unwrap().ap += value;
                    out.push(format!("GAx;121;{caster};{t},{value}"));
                }
                Effect::Push { value } => {
                    let (Some(from), Some(start)) = (self.member(caster).and_then(|f| f.cell), self.member(t).and_then(|f| f.cell)) else {
                        continue;
                    };
                    if t == caster {
                        continue;
                    }
                    let dir = direction(start, from, map.width as i64);
                    let mut cur = start;
                    for _ in 0..*value {
                        let next = cur + map.dir_offset(dir);
                        if !map.walkable(next) || (map.x2(next) - map.x2(cur)).abs() != 53 || self.occupant(next).is_some() {
                            break;
                        }
                        cur = next;
                    }
                    if cur != start {
                        self.member_mut(t).unwrap().cell = Some(cur);
                        out.push(format!("GAx;5;{caster};{t},{cur}"));
                    }
                }
                Effect::Buff { stat, value, turns } => {
                    let (kind, code) = match stat.as_str() {
                        "ap" => (1, 111),
                        "range" => (19, 117),
                        _ => (16, 112),
                    };
                    let f = self.member_mut(t).unwrap();
                    f.add_effect(kind, *value, *turns, t == caster);
                    if kind == 1 {
                        f.ap += value;
                    }
                    out.push(format!("GAx;{code};{caster};{t},{value},{turns}"));
                }
                Effect::Reflect { dice, turns } => {
                    self.member_mut(t).unwrap().reflect = Some((*dice, if t == caster { *turns } else { turns - 1 }));
                    out.push(format!("GAx;107;{caster};{t},{}", dice[0] * dice[1] + dice[2]));
                }
                Effect::StealGold { dice } => {
                    let have = self.member(t).map_or(0, |f| f.gold + f.gold_change);
                    let amount = (rng.roll(*dice) as i64).min(have).max(0);
                    self.member_mut(t).unwrap().gold_change -= amount;
                    self.member_mut(caster).unwrap().gold_change += amount;
                    out.push(format!("GAx;130;{caster};{amount}"));
                }
                Effect::Jump | Effect::SelfDamage { .. } => {}
            }
        }
        match e {
            Effect::Jump if alive(self, caster) && self.occupant(cell).is_none() => {
                self.member_mut(caster).unwrap().cell = Some(cell);
                out.push(format!("GAx;4;{caster};{caster},{cell}"));
            }
            Effect::SelfDamage { dice } if alive(self, caster) => {
                let dmg = rng.roll(*dice).max(0);
                self.damage(rng, caster, caster, dmg, false, out);
            }
            _ => {}
        }
    }

    fn heal(&mut self, actor: u32, t: u32, amount: i32, out: &mut Vec<String>) {
        let f = self.member_mut(t).unwrap();
        let amount = amount.min(f.lp_max - f.lp).max(0);
        f.lp += amount;
        out.push(format!("GAx;100;{actor};{t},{amount}"));
    }

    /// LP loss (`GA x;100`), death (`GA x;103`) and the target's damage reflection. Returns the LP actually lost.
    fn damage(&mut self, rng: &mut Rng, actor: u32, t: u32, dmg: i32, reflectable: bool, out: &mut Vec<String>) -> i32 {
        let f = self.member_mut(t).unwrap();
        let d = dmg.min(f.lp);
        f.lp -= d;
        out.push(format!("GAx;100;{actor};{t},-{d}"));
        if f.lp <= 0 {
            (f.alive, f.cell) = (false, None);
            out.push(format!("GAx;103;{actor};{t}"));
        } else if let (true, true, Some((dice, _))) = (reflectable, actor != t, f.reflect) {
            if self.member(actor).is_some_and(|a| a.alive) {
                let r = rng.roll(dice).max(0);
                // The reflected damage keeps the action's actor: the client queues each game action on its actor's
                // sequencer (AKSClient/Events.AKS.Game.as:495-500), so with the reflector as actor it plays at once,
                // the caster's `hit` interrupts its own `cast` animation, and the sequencer waits for the 10 s timeout.
                self.damage(rng, actor, actor, r, false, out);
            }
        }
        d
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    fn data() -> GameData {
        GameData::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("data")).unwrap()
    }

    fn fighter(data: &GameData, id: u32, class: u8) -> Fighter {
        let c = &data.classes[&class];
        Fighter::new(id, format!("P{id}"), 1, class, 0, [-1; 3], c.lp, c.ap, c.cc.clone(), c.spells.iter().map(|&s| (s, 1)).collect(), 0)
    }

    /// 1v1 Iop vs Crâ on the first fully covered map, both placed on their first cell, fight started.
    fn duel(data: &GameData) -> Game {
        let map = data.maps[0].id;
        let mut g = Game::new(1, "Duel".into(), map, [1, 1], String::new(), fighter(data, 10, 8));
        g.add(fighter(data, 20, 9));
        g.start_placement(data);
        let places = data.maps[0].places.clone();
        assert!(g.place(data, 10, places[0][0]) && g.place(data, 20, places[1][0]));
        assert!(!g.place(data, 20, places[0][1])); // not a team-1 cell
        g.start_fight(&mut Rng(1));
        g.begin_turn(30000).unwrap();
        g
    }

    #[test]
    fn turns_alternate_and_reset_ap_at_turn_end() {
        let data = data();
        let mut g = duel(&data);
        assert_eq!(g.order, vec![10, 20]);
        assert_eq!(g.current(), Some(10));
        g.members[0].ap = 1;
        g.members[1].ap = 2; // AP lost during the opponent's turn survives into its own turn
        assert_eq!(g.end_turn().unwrap(), "GTF10");
        assert_eq!(g.members[0].ap, 6);
        assert_eq!(g.begin_turn(30000).unwrap(), "GTS20|30000");
        assert_eq!(g.members[1].ap, 2);
        g.end_turn();
        assert_eq!(g.begin_turn(1000).unwrap(), "GTS10|1000");
    }

    #[test]
    fn move_is_ap_capped_and_broadcast_from_the_current_cell() {
        let data = data();
        let mut g = duel(&data);
        let mut rng = Rng(1);
        let start = g.members[0].cell.unwrap();
        let map = &data.map_index[&g.map];
        // Farthest walkable cell reachable within 6 steps, as the client would compute it.
        let occupied = g.occupied();
        let none = HashSet::new();
        let (dest, path) = (0..map.cells.len() as i64)
            .filter_map(|c| path_find(map, &occupied, &none, true, 6, start, c).map(|p| (c, p)))
            .max_by_key(|(_, p)| p.1.len())
            .unwrap();
        let sent = compress_path(&path.0.iter().map(|&(c, d)| (c as i32, d)).collect::<Vec<_>>());
        assert!(g.act(&data, &mut rng, 20, "001", &sent).is_none()); // not its turn
        let frames = g.act(&data, &mut rng, 10, "001", &sent).unwrap().0;
        assert_eq!(frames[0], format!("GA1;1;10;{}{sent}", cell_code(start as i32)));
        assert_eq!(frames[1], format!("GAx;102;10;10,-{}", path.1.len()));
        assert_eq!(g.members[0].cell, Some(dest));
        assert_eq!(g.members[0].ap, 6 - path.1.len() as i32);
        assert!(g.act(&data, &mut rng, 10, "001", &sent).is_none() || g.members[0].ap >= 0);
    }

    #[test]
    fn spells_check_range_ap_and_limits_and_kill() {
        let data = data();
        let mut g = duel(&data);
        let mut rng = Rng(7);
        let map = &data.map_index[&g.map];
        // Put the Crâ next to the Iop: Pression (141) has range 2, 3 AP, line of sight.
        let iop = g.members[0].cell.unwrap();
        let next = map.around().iter().map(|o| iop + o).find(|&c| map.walkable(c) && (map.x2(c) - map.x2(iop)).abs() == 53).unwrap();
        g.members[1].cell = Some(next);
        let far = g.members[1].cell.map(|_| data.maps[0].places[1][3]).unwrap();
        assert!(g.act(&data, &mut rng, 10, "300", &format!("141;{far}")).is_none()); // out of range
        assert!(g.act(&data, &mut rng, 10, "300", "999;1").is_none()); // unknown spell
        let f = g.act(&data, &mut rng, 10, "300", &format!("141;{next}")).unwrap().0;
        assert_eq!(f[0], format!("GA1;300;10;141,{next},801,1,11,1")); // inFront 1: see the comment in `act`
        assert_eq!(f[1], "GAx;102;10;10,-3");
        let dmg: i32 = f[2].rsplit(",-").next().unwrap().parse().unwrap();
        assert!((3..=8).contains(&dmg), "1d6+2 → {dmg}");
        assert_eq!(g.members[1].lp, 45 - dmg);
        g.act(&data, &mut rng, 10, "300", &format!("141;{next}")).unwrap();
        assert!(g.act(&data, &mut rng, 10, "300", &format!("141;{next}")).is_none()); // 0 AP left
                                                                                      // Kill: drop the Crâ to 1 LP, then close combat (3 AP, 1d5).
        g.end_turn();
        g.begin_turn(1).unwrap();
        g.end_turn();
        g.begin_turn(1).unwrap();
        g.members[1].lp = 1;
        let f = g.act(&data, &mut rng, 10, "303", &next.to_string()).unwrap().0;
        assert_eq!(f[0], format!("GA3;303;10;{next}"));
        assert_eq!(f.last().unwrap(), "GAx;103;10;20");
        assert_eq!(g.outcome(), Some(Some(0)));
    }

    #[test]
    fn reflected_damage_is_queued_on_the_casters_actions() {
        let data = data();
        let mut g = duel(&data);
        let mut rng = Rng(7);
        let map = &data.map_index[&g.map];
        let iop = g.members[0].cell.unwrap();
        let next = map.around().iter().map(|o| iop + o).find(|&c| map.walkable(c) && (map.x2(c) - map.x2(iop)).abs() == 53).unwrap();
        g.members[1].cell = Some(next);
        g.members[1].reflect = Some(([1, 1, 2], 2)); // reflects 3
        let f = g.act(&data, &mut rng, 10, "300", &format!("141;{next}")).unwrap().0;
        assert!(f[2].starts_with("GAx;100;10;20,-"), "{f:?}");
        assert_eq!(f[3], "GAx;100;10;10,-3"); // actor 10 (the caster), not 20: same client sequencer as the cast
    }

    #[test]
    fn launch_limits_mirror_the_spells_manager() {
        let data = data();
        let l = &data.spells[&81].levels[0]; // Ralentissement: once per target per turn
        let mut m = Launches::default();
        assert!(m.check(81, Some(2), l));
        m.add(81, Some(2), l);
        assert!(!m.check(81, Some(2), l) && m.check(81, None, l));
        m.next_turn();
        assert!(m.check(81, Some(2), l));
        let d = &data.spells[&41].levels[0]; // Armure pelleteuse: delay 5
        m.add(41, None, d);
        for _ in 0..5 {
            assert!(!m.check(41, None, d)); // usable again at the start of the 5th next turn
            m.next_turn();
        }
        assert!(m.check(41, None, d));
    }

    #[test]
    fn timed_effects_tick_at_turn_end_like_the_client() {
        let data = data();
        let mut f = fighter(&data, 1, 3);
        f.add_effect(19, 1, 3, true); // Armure pelleteuse on itself: 3 turns
        f.add_effect(1, -1, 1, false); // AP malus inflicted by someone else: remaining 0
        assert_eq!(f.moderators[19], 1);
        f.end_turn();
        assert_eq!((f.moderators[1], f.ap), (0, 6));
        for _ in 0..3 {
            assert_eq!(f.moderators[19], 1);
            f.end_turn();
        }
        assert_eq!(f.moderators[19], 0);
    }

    /// Puts the Crâ next to the Iop; returns its cell.
    fn adjacent(data: &GameData, g: &mut Game) -> i64 {
        let map = &data.map_index[&g.map];
        let iop = g.members[0].cell.unwrap();
        let next = map.around().iter().map(|o| iop + o).find(|&c| map.walkable(c) && (map.x2(c) - map.x2(iop)).abs() == 53).unwrap();
        g.members[1].cell = Some(next);
        next
    }

    /// A seed whose first draw is (or is not) a 1-in-`n` success.
    fn seed(n: u32, success: bool) -> u64 {
        (1..).find(|&s| Rng(s).one_in(n) == success).unwrap()
    }

    #[test]
    fn critical_odds_follow_agility() {
        assert_eq!([crit_odds(30, 0), crit_odds(30, 5), crit_odds(30, 50), crit_odds(30, 100)], [30, 30, 21, 19]);
        assert_eq!([crit_odds(0, 100), crit_odds(1, 0), crit_odds(3, 500)], [0, 2, 2]);
        assert_eq!([miss_odds(0), miss_odds(1), miss_odds(50)], [0, 2, 50]);
    }

    #[test]
    fn the_team_with_the_best_initiative_starts_then_teams_alternate() {
        let data = data();
        // Team 0: Crâ 45 LP → 11, Sram 50 → 12; team 1: Iop 55 → 13.
        let mut g = Game::new(1, "T".into(), data.maps[0].id, [2, 1], String::new(), fighter(&data, 1, 9));
        g.add(fighter(&data, 2, 4));
        g.add(fighter(&data, 3, 8));
        assert_eq!(g.members.iter().map(|f| (f.team, f.initiative())).collect::<Vec<_>>(), [(0, 11), (0, 12), (1, 13)]);
        assert_eq!(g.start_fight(&mut Rng(1))[1], "GTL|3|2|1");
        // Equal best initiative: a coin toss.
        let first: HashSet<u32> = (1..20)
            .map(|s| {
                let mut g = Game::new(1, "T".into(), data.maps[0].id, [1, 1], String::new(), fighter(&data, 1, 8));
                g.add(fighter(&data, 2, 8));
                g.start_fight(&mut Rng(s));
                g.order[0]
            })
            .collect();
        assert_eq!(first, HashSet::from([1, 2]));
    }

    #[test]
    fn close_combat_misses_end_the_turn_and_criticals_add_dice_or_p3() {
        let data = data();
        let mut g = duel(&data);
        let next = adjacent(&data, &mut g).to_string();
        g.members[0].cc.miss = 2;
        let (f, ended) = g.act(&data, &mut Rng(seed(2, true)), 10, "303", &next).unwrap();
        assert_eq!((f, ended), (vec!["GA1;305;10;".to_string(), "GAx;102;10;10,-3".into()], true));
        assert_eq!((g.members[0].ap, g.members[1].lp), (3, 45));
        // Bare hands: a critical adds crit_bonus (1) dice to the Iop's 1d5.
        let mut g = duel(&data);
        let next = adjacent(&data, &mut g).to_string();
        (g.members[0].cc.miss, g.members[0].cc.crit) = (0, 2);
        let (f, ended) = g.act(&data, &mut Rng(seed(2, true)), 10, "303", &next).unwrap();
        assert_eq!(f[..3], [format!("GA1;303;10;{next}"), "GAx;304;10;".into(), "GAx;102;10;10,-3".into()]);
        let dmg: i32 = f[3].rsplit(",-").next().unwrap().parse().unwrap();
        assert!(!ended && (2..=10).contains(&dmg), "2d5 → {dmg}");
        // A weapon: every damage effect fires, a critical adds crit_bonus to their p3.
        let mut g = duel(&data);
        let next = adjacent(&data, &mut g).to_string();
        (g.members[0].cc.miss, g.members[0].cc.crit, g.members[0].cc.crit_bonus) = (0, 2, 5);
        g.members[0].weapon = Some(vec![[1, 1, 0], [1, 1, 1]]);
        let f = g.act(&data, &mut Rng(seed(2, true)), 10, "303", &next).unwrap().0;
        assert_eq!(f[3..], ["GAx;100;10;20,-6", "GAx;100;10;20,-7"]);
        g.members[0].cc.crit = 0;
        let f = g.act(&data, &mut Rng(1), 10, "303", &next).unwrap().0;
        assert_eq!(f[1..], ["GAx;102;10;10,-3", "GAx;100;10;20,-1", "GAx;100;10;20,-2"]);
    }

    #[test]
    fn spell_misses_record_no_launch_and_criticals_add_their_bonus() {
        let mut data = data();
        let mut g = duel(&data);
        let next = adjacent(&data, &mut g);
        let cast = format!("141;{next}");
        fn pression(d: &mut GameData) -> &mut SpellLevel {
            &mut d.spells.get_mut(&141).unwrap().levels[0]
        }
        let l = pression(&mut data);
        (l.delay, l.miss, l.crit) = (63, 2, 0);
        let (f, ended) = g.act(&data, &mut Rng(seed(2, true)), 10, "300", &cast).unwrap();
        assert_eq!((f, ended), (vec!["GA1;302;10;141".to_string(), "GAx;102;10;10,-3".into()], true));
        assert_eq!(g.members[1].lp, 45);
        // Not recorded (the client records `300` only): castable again despite its delay; a critical adds 3 to 1d6+2.
        let l = pression(&mut data);
        (l.miss, l.crit) = (0, 2);
        let f = g.act(&data, &mut Rng(seed(2, true)), 10, "300", &cast).unwrap().0;
        assert_eq!(f[..3], [format!("GA2;300;10;141,{next},801,1,11,1"), "GAx;301;10;141".into(), "GAx;102;10;10,-3".into()]);
        let dmg: i32 = f[3].rsplit(",-").next().unwrap().parse().unwrap();
        assert!((6..=11).contains(&dmg), "1d6+5 → {dmg}");
        g.members[0].ap = 6;
        assert!(g.act(&data, &mut Rng(1), 10, "300", &cast).is_none(), "this cast was recorded");
    }
}
