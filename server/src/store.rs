//! Accounts and characters, persisted as one JSON file (server/data/runtime/store.json by default).
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
}

impl Character {
    pub fn gfx(&self) -> u32 {
        self.class as u32 * 10 + self.sex as u32
    }
    pub fn stat(&self, id: u8) -> i32 {
        self.stats.get(&id).copied().unwrap_or(0)
    }
}

#[derive(Serialize, Deserialize, Default)]
pub struct Store {
    pub accounts: BTreeMap<String, Account>,
    pub characters: BTreeMap<u32, Character>,
    pub next_id: u32,
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
