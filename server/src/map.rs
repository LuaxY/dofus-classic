//! The pure parts of `Dofus.BattleField.Map.as` the server needs (port of web/src/core/map.ts): pixel layout of
//! active cells (neighbour test), cell height (line of sight) and tackle zones.
use crate::codec::{decode_map, Cell};
use std::collections::HashSet;

pub struct Map {
    pub id: u32,
    pub width: i32,
    pub height: i32,
    pub background: u32,
    pub data: String,
    pub cells: Vec<Cell>,
    /// Pixel x × 2 (integer: half cells are 26.5 px), set on active cells only like `BattleField.Map.build`.
    x2: Vec<Option<i32>>,
}

impl Map {
    pub fn new(id: u32, width: i32, height: i32, background: u32, data: String) -> Map {
        let cells = decode_map(&data);
        // build() walker (BattleField.Map.as:133-147): rows of `width` then `width - 1` cells, odd rows shifted.
        let (mut x, mut dec2, mut last) = (0, 0, width - 1);
        let mut x2 = Vec::with_capacity(cells.len());
        for c in &cells {
            x2.push(c.active.then_some(x * 106 + dec2));
            if x == last {
                x = 0;
                (dec2, last) = if dec2 == 0 { (53, last - 1) } else { (0, last + 1) };
            } else {
                x += 1;
            }
        }
        Map { id, width, height, background, data, cells, x2 }
    }

    pub fn cell(&self, n: i64) -> Option<&Cell> {
        usize::try_from(n).ok().and_then(|i| self.cells.get(i))
    }

    /// `map.data[n].x` with SWF6 `undefined → 0`, doubled.
    pub fn x2(&self, n: i64) -> i32 {
        usize::try_from(n).ok().and_then(|i| self.x2.get(i).copied().flatten()).unwrap_or(0)
    }

    pub fn active(&self, n: i64) -> bool {
        self.cell(n).is_some_and(|c| c.active)
    }

    pub fn walkable(&self, n: i64) -> bool {
        self.cell(n).is_some_and(|c| c.active && c.movement > 1)
    }

    /// getCellHeight (BattleField.Map.as:302-308): groundLevel - 7, +0.5 on a slope; undefined fields → 0.
    pub fn cell_height(&self, n: i64) -> f64 {
        match self.cell(n) {
            Some(c) if c.active => c.ground_level as f64 - 7.0 + if c.ground_slope != 1 { 0.5 } else { 0.0 },
            _ => 0.0,
        }
    }

    /// The 4 neighbour offsets `[W, W-1, -(W-1), -W]` (PathFinding.as:128) — also direction order 0, 1, 3, 2.
    pub fn around(&self) -> [i64; 4] {
        let w = self.width as i64;
        [w, w - 1, -(w - 1), -w]
    }

    /// Offset of one step in direction `dir` (Compressor `nextDist`): 0 +W, 1 +(W-1), 2 -W, 3 -(W-1).
    pub fn dir_offset(&self, dir: i32) -> i64 {
        let w = self.width as i64;
        [w, w - 1, -w, -(w - 1)][dir as usize & 3]
    }
}

/// calculateTacleZone (BattleField.Map.as:309-339): neighbours whose pixel x differs by exactly half a cell, for
/// every character of the team (dead ones still count, from cell 0). Returns [team0, team1].
pub fn tacle_zones(map: &Map, characters: impl IntoIterator<Item = (i64, u8)>) -> [HashSet<i64>; 2] {
    let mut zones = [HashSet::new(), HashSet::new()];
    for (cell, team) in characters {
        let x = map.x2(cell);
        for off in map.around() {
            if (map.x2(cell + off) - x).abs() == 53 && team < 2 {
                zones[team as usize].insert(cell + off);
            }
        }
    }
    zones
}
