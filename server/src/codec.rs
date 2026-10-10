//! Compact encodings of docs/protocol/encodings.md: the 64-char alphabet, map cells (`Dofus.Compressor.as:19-76`),
//! paths (`:170-236`) and 2-char cell codes (`GPS`, path start).

pub use crate::crypt::HASH as ALPHABET;

pub fn encode64(v: u32) -> char {
    ALPHABET[(v & 63) as usize] as char
}

pub fn decode64(c: char) -> Option<u32> {
    ALPHABET.iter().position(|&a| a as char == c).map(|i| i as u32)
}

/// One decoded map cell. Inactive cells keep only `active = false` (the client decodes nothing else).
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Cell {
    pub active: bool,
    pub line_of_sight: bool,
    pub ground_rot: u32,
    pub ground_level: u32,
    pub movement: u32,
    pub ground_num: u32,
    pub ground_slope: u32,
    pub ground_flip: bool,
    pub object1_num: u32,
    pub object1_rot: u32,
    pub object1_flip: bool,
    pub object2_flip: bool,
    pub object2_interactive: bool,
    pub object2_num: u32,
}

/// Compressor.uncompressMap: 10 chars per cell. `layerGroundFlip` is always false (client bug, `:61`); unknown
/// chars decode as 0 like `undefined` in SWF6 bit operations.
pub fn decode_map(data: &str) -> Vec<Cell> {
    let chars: Vec<char> = data.chars().collect();
    chars
        .chunks(10)
        .map(|c| {
            let o = |k: usize| c.get(k).and_then(|&ch| decode64(ch)).unwrap_or(0);
            if (o(0) & 0x20) == 0 {
                return Cell::default();
            }
            Cell {
                active: true,
                line_of_sight: o(0) & 1 == 1,
                ground_rot: (o(1) & 0x30) >> 4,
                ground_level: o(1) & 0x0f,
                movement: (o(2) & 0x38) >> 3,
                ground_num: ((o(2) & 7) << 6) + o(3),
                ground_slope: (o(4) & 0x3c) >> 2,
                ground_flip: false,
                object1_num: ((o(4) & 1) << 12) + (o(5) << 6) + o(6),
                object1_rot: (o(7) & 0x30) >> 4,
                object1_flip: o(7) & 8 != 0,
                object2_flip: o(7) & 4 != 0,
                object2_interactive: o(7) & 2 != 0,
                object2_num: ((o(7) & 1) << 12) + (o(8) << 6) + o(9),
            }
        })
        .collect()
}

/// Exact inverse of the cell record (encodings.md "Encoder").
pub fn encode_cell(c: &Cell) -> String {
    if !c.active {
        return "a".repeat(10);
    }
    let b = |v: bool| v as u32;
    [
        (1 << 5) | b(c.line_of_sight),
        (c.ground_rot << 4) | c.ground_level,
        (c.movement << 3) | (c.ground_num >> 6),
        c.ground_num & 63,
        (c.ground_slope << 2) | (b(c.ground_flip) << 1) | (c.object1_num >> 12),
        (c.object1_num >> 6) & 63,
        c.object1_num & 63,
        (c.object1_rot << 4)
            | (b(c.object1_flip) << 3)
            | (b(c.object2_flip) << 2)
            | (b(c.object2_interactive) << 1)
            | (c.object2_num >> 12),
        (c.object2_num >> 6) & 63,
        c.object2_num & 63,
    ]
    .into_iter()
    .map(encode64)
    .collect()
}

/// `GPS` / path-start cell code: `chr64(cell >> 6) chr64(cell & 63)`.
pub fn cell_code(cell: i32) -> String {
    format!("{}{}", encode64((cell as u32 >> 6) & 63), encode64(cell as u32 & 63))
}

/// Compressor.compressPath: `(dir << 4 | (num >> 6) & 15)`, `num & 63` per step.
pub fn compress_path(steps: &[(i32, i32)]) -> String {
    steps.iter().flat_map(|&(num, dir)| [encode64((((num >> 6) & 15) + (dir << 4)) as u32), encode64((num & 63) as u32)]).collect()
}

/// Compressor.extractFullPath, first half: the waypoint cells (direction bits dropped). None on an odd length or a
/// char outside the alphabet.
pub fn extract_path(s: &str) -> Option<Vec<i32>> {
    let c: Vec<char> = s.chars().collect();
    if !c.len().is_multiple_of(2) {
        return None;
    }
    c.chunks(2).map(|p| Some((((decode64(p[0])? & 15) << 6) | decode64(p[1])?) as i32)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn path_and_cell_codes_match_the_documented_examples() {
        assert_eq!(compress_path(&[(130, 0), (144, 1)]), "ccsq");
        assert_eq!(format!("{}{}", cell_code(100), compress_path(&[(130, 0), (144, 1)])), "bKccsq");
        assert_eq!(extract_path("bKccsq"), Some(vec![100, 130, 144]));
        assert_eq!(format!("{}{}", cell_code(100), cell_code(115)), "bKbZ");
        assert_eq!(cell_code(300), "eS");
    }

    #[test]
    fn documented_cells_of_map_507() {
        let c = decode_map("HhGienViaa");
        assert!(c[0].active && c[0].line_of_sight && c[0].object1_flip);
        assert_eq!((c[0].ground_level, c[0].movement, c[0].ground_num, c[0].ground_slope, c[0].object1_num), (7, 4, 8, 1, 879));
        assert_eq!(decode_map("Hhqieqgaaa")[0].object1_num, 1030);
        assert!(!decode_map("bhGaeaaaaa")[0].active);
    }

    #[test]
    fn map_encoding_round_trip() {
        // The vendor record of an inactive cell (`bhGaeaaaaa`) and the ground flip bit are not preserved, so the
        // round trip is on decoded cells: decode(encode(decode(x))) == decode(x).
        let data = &crate::data::GameData::load(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("data").as_path()).unwrap().maps;
        for m in data {
            let cells = decode_map(&m.map_data);
            let encoded: String = cells.iter().map(encode_cell).collect();
            assert_eq!(encoded.len(), m.map_data.len());
            assert_eq!(decode_map(&encoded), cells, "map {}", m.id);
        }
    }
}
