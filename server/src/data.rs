//! Game data loaded from server/data/*.json. Every game number lives there, with a `provenance` per entry.
use crate::codec::encode64;
use crate::map::Map;
use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;

#[derive(Deserialize)]
pub struct MapEntry {
    pub id: u32,
    pub width: i32,
    pub height: i32,
    #[serde(rename = "backgroundNum")]
    pub background: u32,
    #[serde(rename = "mapData")]
    pub map_data: String,
    /// Placement cells of team 0 and team 1.
    pub places: [Vec<i64>; 2],
}

#[derive(Deserialize)]
struct WorldEntry {
    id: u32,
    width: i32,
    height: i32,
    #[serde(rename = "backgroundNum")]
    background: u32,
    #[serde(rename = "mapData")]
    map_data: String,
    links: HashMap<i64, (u32, i64)>,
}

/// A role-play map of the social village (stage 3b, `maps.json` `world`): its map-change plates → (map, arrival cell).
pub struct WorldMap {
    pub map: Map,
    pub links: HashMap<i64, (u32, i64)>,
}

#[derive(Deserialize)]
struct MapsFile {
    maps: Vec<MapEntry>,
    world: Vec<WorldEntry>,
}

/// `[count, faces, bonus]`: `count`d`faces` + `bonus`.
pub type Dice = [i32; 3];

#[derive(Deserialize, Clone)]
pub struct CloseCombat {
    pub ap: i32,
    pub dice: Dice,
}

#[derive(Deserialize)]
pub struct ClassDef {
    pub id: u8,
    pub name: String,
    pub lp: i32,
    pub ap: i32,
    pub cc: CloseCombat,
    pub spells: Vec<u32>,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Effect {
    Damage {
        dice: Dice,
    },
    Heal {
        dice: Dice,
    },
    /// Damage to the target, the same amount healed on the caster.
    Drain {
        dice: Dice,
    },
    ApLoss {
        value: i32,
    },
    ApGain {
        value: i32,
    },
    /// Pushes the target `value` cells away from the caster.
    Push {
        value: i32,
    },
    /// Teleports the caster onto the (free) target cell.
    Jump,
    /// Timed moderator: `stat` is `ap` (client effect 1), `damage` (16) or `range` (19).
    Buff {
        stat: String,
        value: i32,
        turns: i32,
    },
    /// Returns `dice` damage to whoever damages the target, for `turns` of its turns.
    Reflect {
        dice: Dice,
        turns: i32,
    },
    SelfDamage {
        dice: Dice,
    },
    StealGold {
        dice: Dice,
    },
}

#[derive(Deserialize)]
pub struct SpellLevel {
    pub ap: i32,
    pub range: i32,
    #[serde(default)]
    pub line: bool,
    #[serde(default)]
    pub los: bool,
    #[serde(default)]
    pub on_itself: bool,
    #[serde(default)]
    pub free_cell: bool,
    #[serde(default)]
    pub per_turn: i32,
    #[serde(default)]
    pub per_target: i32,
    #[serde(default)]
    pub delay: i32,
    /// `P` point, `C<n>` circle of radius n (Manhattan).
    pub zone: String,
    pub effects: Vec<Effect>,
}

#[derive(Deserialize)]
pub struct SpellDef {
    pub id: u32,
    pub name: String,
    /// Element tab `A`/`W`/`E`/`F` (any other value breaks `Player.addSpell`).
    pub element: char,
    pub anim: u32,
    pub launch_type: u32,
    pub levels: Vec<SpellLevel>,
}

#[derive(Deserialize)]
pub struct Rules {
    pub turn_ms: u64,
    pub placement_ms: u64,
    pub max_level: u32,
    /// Total XP needed to reach level `i + 1`.
    pub xp: Vec<u64>,
    pub bonus_per_level: i32,
    pub lp_per_level: i32,
    pub xp_win_per_opponent_level: u64,
    pub xp_loss_per_opponent_level: u64,
    pub gold_win_per_opponent_level: i64,
    /// `SPELL_BOOST_BONUS` (Dofus.Kernel.Init.as:58): bonus points to raise a spell from level i.
    pub spell_boost_bonus: Vec<i32>,
    pub village_map: u32,
    pub default_channel: String,
    pub max_characters: usize,
}

pub struct GameData {
    pub maps: Vec<MapEntry>,
    pub map_index: HashMap<u32, Map>,
    /// Not fight maps: never in `maps`/`map_index` (no placement cells).
    pub world: HashMap<u32, WorldMap>,
    pub classes: HashMap<u8, ClassDef>,
    pub spells: HashMap<u32, SpellDef>,
    pub rules: Rules,
}

fn read<T: serde::de::DeserializeOwned>(dir: &Path, name: &str) -> Result<T, String> {
    let path = dir.join(name);
    let text = std::fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
    serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))
}

#[derive(Deserialize)]
struct ClassesFile {
    classes: Vec<ClassDef>,
}

#[derive(Deserialize)]
struct SpellsFile {
    spells: Vec<SpellDef>,
}

impl GameData {
    pub fn load(dir: &Path) -> Result<GameData, String> {
        let MapsFile { maps, world } = read(dir, "maps.json")?;
        let map_index = maps.iter().map(|m| (m.id, Map::new(m.id, m.width, m.height, m.background, m.map_data.clone()))).collect();
        let world = world
            .into_iter()
            .map(|w| (w.id, WorldMap { map: Map::new(w.id, w.width, w.height, w.background, w.map_data), links: w.links }))
            .collect();
        let classes = read::<ClassesFile>(dir, "classes.json")?.classes.into_iter().map(|c| (c.id, c)).collect();
        let spells = read::<SpellsFile>(dir, "spells.json")?.spells.into_iter().map(|s| (s.id, s)).collect();
        let data = GameData { maps, map_index, world, classes, spells, rules: read(dir, "rules.json")? };
        data.validate()?;
        Ok(data)
    }

    fn validate(&self) -> Result<(), String> {
        if !self.world.contains_key(&self.rules.village_map) {
            return Err(format!("rules.village_map {} not in maps.json world", self.rules.village_map));
        }
        // The arrival cell must exist on the map left too: the walker gets its new `GM` entry before the new map.
        for w in self.world.values() {
            for (&plate, &(to, cell)) in &w.links {
                let dest = self.world.get(&to).ok_or(format!("world map {} links to unknown map {to}", w.map.id))?;
                if !w.map.walkable(plate) || !dest.map.walkable(cell) || dest.map.cells.len() != w.map.cells.len() {
                    return Err(format!("world map {} plate {plate}: unwalkable, or {to} of another size", w.map.id));
                }
            }
        }
        for c in self.classes.values() {
            for id in &c.spells {
                let s = self.spells.get(id).ok_or(format!("class {} lists unknown spell {id}", c.id))?;
                if !"AWEF".contains(s.element) || s.levels.is_empty() {
                    return Err(format!("spell {id}: bad element or no level"));
                }
                for l in &s.levels {
                    if [l.range, l.ap, l.per_turn, l.per_target, l.delay].iter().any(|v| !(0..=63).contains(v)) {
                        return Err(format!("spell {id}: a 1-char base-64 field is outside 0..=63"));
                    }
                    if !(l.zone == "P" || l.zone.strip_prefix('C').is_some_and(|r| r.parse::<u32>().is_ok())) {
                        return Err(format!("spell {id}: zone must be P or C<radius>"));
                    }
                    if l.on_itself && l.los {
                        return Err(format!("spell {id}: castable on oneself but needs line of sight (never true in the client)"));
                    }
                }
            }
        }
        if self.rules.xp.len() < self.rules.max_level as usize {
            return Err("rules.xp shorter than max_level".into());
        }
        Ok(())
    }

    /// Spell entry `<id>~<level>~<zones>~<flags15>` (docs/protocol/spells.md). `position` = bar slot 1..8.
    pub fn spell_entry(&self, id: u32, level: usize, position: Option<u8>) -> String {
        let s = &self.spells[&id];
        let l = &s.levels[level - 1];
        let b = |v: bool| if v { '1' } else { '0' };
        let (shape, size) = l.zone.split_at(1);
        let flags: String = [
            '1', // class spell → "Guild" tab
            s.element,
            '0', // m_EffectType, unused by the client
            b(l.on_itself),
            b(l.line),
            encode64(l.range as u32),
            encode64(l.ap as u32),
            b(l.los),
            b(l.free_cell),
            'a', // m_CriticalHit / m_Criticalfailure: unused by the client (no criticals on this server)
            'a',
            encode64(l.per_turn as u32),
            encode64(l.per_target as u32),
            encode64(l.delay as u32),
            encode64(position.unwrap_or(0) as u32),
        ]
        .into_iter()
        .collect();
        format!("{id}~{level}~{shape}{}~{flags}", encode64(size.parse().unwrap_or(1)))
    }
}
