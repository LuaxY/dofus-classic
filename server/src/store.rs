//! Accounts and characters, persisted as one JSON file (server/data/runtime/store.json by default).
use crate::data::{Dice, ITEM_DAMAGE, ITEM_KARMA};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Default)]
pub struct Account {
    /// Per padded password position, the still-possible low-6-bit values (see crypt.rs).
    pub password: Vec<u64>,
    #[serde(default)]
    pub friends: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct KnownSpell {
    pub id: u32,
    pub level: usize,
    pub position: Option<u8>,
}

/// An owned item (docs/protocol/items.md). No colour: the entry carries one but `Item.colorObject` has no reader.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Item {
    pub id: u32,
    #[serde(rename = "type")]
    pub kind: u32,
    pub gfx: u32,
    /// Equipment slot 0..5; `None` = in the bag.
    pub position: Option<u8>,
    /// `[id, p1, p2, p3]`, 0 = parameter absent.
    pub effects: Vec<[u32; 4]>,
}

impl Item {
    /// `<idHex>~<typeHex>~<gfxHex>~<RRGGBB>~<positionHex or empty>~<effect>,…`, effect `<idHex>#<p1Hex>#<p2Hex>#<p3Hex>`
    /// (AKSClient/Dofus.CharactersManager.as:176-194, Dofus.DataCenter.Item.as:12-37).
    pub fn entry(&self) -> String {
        let effects: Vec<String> = self.effects.iter().map(|e| format!("{:x}#{:x}#{:x}#{:x}", e[0], e[1], e[2], e[3])).collect();
        let pos = self.position.map_or(String::new(), |p| format!("{p:x}"));
        format!("{:x}~{:x}~{:x}~FFFFFF~{pos}~{}", self.id, self.kind, self.gfx, effects.join(","))
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Character {
    pub id: u32,
    pub account: String,
    pub name: String,
    pub class: u8,
    pub sex: u8,
    /// `0xRRGGBB` or -1 (keep the sprite colour).
    pub colors: [i64; 3],
    pub level: u32,
    pub xp: u64,
    pub gold: i64,
    pub bonus: i32,
    /// Boostable characteristics by `PB` id (6 rFire … 15 intelligence, Dofus.Client.Account.as:169-231).
    pub stats: BTreeMap<u8, i32>,
    pub spells: Vec<KnownSpell>,
    #[serde(default)]
    pub items: Vec<Item>,
}

impl Character {
    pub fn gfx(&self) -> u32 {
        self.class as u32 * 10 + self.sex as u32
    }
    /// Boosted points; karma (13) adds the `p1` of every equipped item's karma effect (rule stated by the project owner).
    pub fn stat(&self, id: u8) -> i32 {
        let equipped = self.items.iter().filter(|i| i.position.is_some()).flat_map(|i| &i.effects);
        self.stats.get(&id).copied().unwrap_or(0)
            + if id == 13 { equipped.filter(|e| e[0] == ITEM_KARMA).map(|e| e[1] as i32).sum() } else { 0 }
    }
    /// Close-combat dice of the weapon in slot 1 (the only slot taking weapons): its damage effect `[count, faces,
    /// bonus]`. Server rule (authored): nothing the client shows depends on it (docs/server.md "Items").
    pub fn weapon_dice(&self) -> Option<Dice> {
        let weapon = self.items.iter().find(|i| i.position == Some(1))?;
        weapon.effects.iter().find(|e| e[0] == ITEM_DAMAGE).map(|e| [e[1] as i32, e[2] as i32, e[3] as i32])
    }
}

#[derive(Serialize, Deserialize, Default)]
pub struct Store {
    pub accounts: BTreeMap<String, Account>,
    pub characters: BTreeMap<u32, Character>,
    pub next_id: u32,
    /// Item ids, global (the client only needs them unique within one inventory).
    #[serde(default)]
    pub next_item: u32,
    #[serde(skip)]
    path: Option<PathBuf>,
}

impl Store {
    /// Loads `path` if it exists. `None` = in memory only (tests).
    pub fn open(path: Option<PathBuf>) -> Store {
        let mut s: Store = path
            .as_ref()
            .and_then(|p| std::fs::read_to_string(p).ok())
            .map(|t| serde_json::from_str(&t).expect("corrupt store file"))
            .unwrap_or_default();
        s.next_id = s.next_id.max(1);
        s.next_item = s.next_item.max(1);
        s.path = path;
        s
    }

    /// Writes the whole file (temp file + rename).
    // ponytail: synchronous full rewrite on every change; fine for a few hundred characters, move to a
    // background flush if it ever shows up in profiles.
    pub fn save(&self) {
        let Some(path) = &self.path else { return };
        if let Some(dir) = path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let tmp = path.with_extension("tmp");
        let ok = std::fs::write(&tmp, serde_json::to_string_pretty(self).unwrap()).and_then(|_| std::fs::rename(&tmp, path));
        if let Err(e) = ok {
            eprintln!("store: cannot write {}: {e}", path.display());
        }
    }

    pub fn by_name(&self, name: &str) -> Option<&Character> {
        self.characters.values().find(|c| c.name.eq_ignore_ascii_case(name))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn item_entries_weapon_dice_and_old_store_files() {
        // A character saved before items existed still loads.
        let old = r#"{"id":1,"account":"a","name":"Bob","class":8,"sex":0,"colors":[-1,-1,-1],"level":1,"xp":0,"gold":0,"bonus":0,"stats":{},"spells":[]}"#;
        let mut c: Character = serde_json::from_str(old).unwrap();
        assert!(c.items.is_empty() && c.weapon_dice().is_none());
        let staff = Item { id: 26, kind: 4, gfx: 3, position: None, effects: vec![[100, 1, 6, 2], [123, 10, 0, 0]] };
        assert_eq!(staff.entry(), "1a~4~3~FFFFFF~~64#1#6#2,7b#a#0#0");
        c.items.push(staff);
        assert!(c.weapon_dice().is_none() && c.stat(13) == 0, "in the bag");
        c.items[0].position = Some(1);
        assert_eq!(c.items[0].entry(), "1a~4~3~FFFFFF~1~64#1#6#2,7b#a#0#0");
        assert_eq!((c.weapon_dice(), c.stat(13)), (Some([1, 6, 2]), 10));
    }
}
