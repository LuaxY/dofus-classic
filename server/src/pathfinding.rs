//! Port of web/src/core/pathfinding.ts (`Dofus.PathFinding.as`) with identical tie-breaking, so the server finds the
//! path the client previews: f64 costs in the same evaluation order, open list scanned most-recently-inserted
//! first (AVM1 `for..in` order assumption), strict `<` against an initial minimum of 5000, neighbour order
//! `[W, W-1, -(W-1), -W]`, `bOnthelast` reset per expanded node. Proven by tests/pathfinding_parity.rs against a
//! fixture written by web/src/core/pathfinding.parity.test.ts.
use crate::map::Map;
use std::collections::{HashMap, HashSet};

/// getCaseCoordonnee (PathFinding.as:89-99).
pub fn coords(n: i64, w: i64) -> (i64, i64) {
    let row = n.div_euclid(2 * w - 1);
    let col = (n - row * (2 * w - 1)) % w;
    let y = row - col;
    ((n - (w - 1) * y) / w, y)
}

/// goalDistEstimate (PathFinding.as:79-88): Manhattan distance in diagonal coordinates.
pub fn distance(a: i64, b: i64, w: i64) -> i64 {
    let (p, q) = (coords(a, w), coords(b, w));
    (p.0 - q.0).abs() + (p.1 - q.1).abs()
}

/// getDirection (PathFinding.as:256-283): direction of the step `c2 → c1`, non-aligned pairs classified on x.
pub fn direction(c1: i64, c2: i64, w: i64) -> i32 {
    let (p, q) = (coords(c1, w), coords(c2, w));
    let (dx, dy) = (p.0 - q.0, p.1 - q.1);
    if dx == 0 {
        if dy > 0 {
            1
        } else {
            3
        }
    } else if dx > 0 {
        0
    } else {
        2
    }
}

/// checkAlign (PathFinding.as:315-328).
pub fn aligned(c1: i64, c2: i64, w: i64) -> bool {
    let (p, q) = (coords(c1, w), coords(c2, w));
    p.0 == q.0 || p.1 == q.1
}

/// One `tmpPath`/`tmpFullPath` entry: cell and direction of the step entering it.
pub type Step = (i64, i32);

struct Node {
    num: i64,
    g: i64,
    v: f64,
    f: f64,
    parent: Option<usize>,
}

/// pathFind (PathFinding.as:112-255). `occupied` = cells with a `playerOnID` (the mover's own cell included, as in
/// the client); `tacle` = the adverse team's tackle zone; `max_len` = 500 outside fights, the mover's AP in fights.
/// Returns (`tmpPath` = corners + end, `tmpFullPath` = every cell), start excluded; None = no path.
pub fn path_find(
    map: &Map,
    occupied: &HashSet<i64>,
    tacle: &HashSet<i64>,
    fight: bool,
    max_len: i64,
    begin: i64,
    end: i64,
) -> Option<(Vec<Step>, Vec<Step>)> {
    let w = map.width as i64;
    let mut nodes = vec![Node { num: begin, g: 0, v: 0.0, f: distance(begin, end, w) as f64, parent: None }];
    let mut open: Vec<usize> = vec![0];
    let mut closed: HashMap<i64, f64> = HashMap::new();
    loop {
        let mut best = None;
        let mut min = 5000.0;
        for &i in open.iter().rev() {
            if nodes[i].f < min {
                min = nodes[i].f;
                best = Some(i);
            }
        }
        let cur = best?;
        open.retain(|&i| i != cur);
        let (cnum, cv, cg) = (nodes[cur].num, nodes[cur].v, nodes[cur].g);
        if cnum == end {
            let (mut path, mut full) = (Vec::new(), Vec::new());
            let mut dir = None;
            let mut n = cur;
            while nodes[n].num != begin {
                let p = nodes[n].parent?;
                let d = direction(nodes[n].num, nodes[p].num, w);
                let change = dir != Some(d);
                dir = Some(d);
                full.push((nodes[n].num, d));
                if full.len() as i64 > max_len {
                    return None;
                }
                if change {
                    path.push((nodes[n].num, d));
                }
                n = p;
            }
            path.reverse();
            full.reverse();
            return Some((path, full));
        }
        let mut on_last = false;
        for step in map.around() {
            let next = cnum + step;
            if (map.x2(next) - map.x2(cnum)).abs() >= 54 {
                continue; // |Δx| >= 27 px: row wrap-around
            }
            let movement = map.cell(next).filter(|c| c.active).map(|c| c.movement);
            let tz = tacle.contains(&next);
            if next == end && (movement == Some(1) || tz) {
                on_last = true;
            }
            let free = !occupied.contains(&next);
            let tackle_ok = !fight || !(tz && !on_last);
            let Some(m) = movement else { continue };
            if (m > 1 || on_last) && free && tackle_ok {
                let newv = cv + 1.0 + (5.0 - m as f64) / 5.0;
                let newg = cg + 1;
                let in_open = open.iter().copied().find(|&i| nodes[i].num == next);
                let oldv = in_open.map(|i| nodes[i].v).or_else(|| closed.get(&next).copied());
                if oldv.is_none_or(|o| o > newv) && newg <= max_len {
                    closed.remove(&next);
                    let i = in_open.unwrap_or_else(|| {
                        nodes.push(Node { num: next, g: 0, v: 0.0, f: 0.0, parent: None });
                        open.push(nodes.len() - 1);
                        nodes.len() - 1
                    });
                    let h = distance(next, end, w) as f64;
                    nodes[i] = Node { num: next, g: newg, v: newv, f: newv + h, parent: Some(cur) };
                }
            }
        }
        closed.insert(cnum, cv);
    }
}

/// checkRange (PathFinding.as:329-368), moderated: the own cell only for self-castable spells, range
/// `max(1, range + RANGE moderator)`, cross only for line spells, no minimum range.
pub fn check_range(w: i64, from: i64, to: i64, line_only: bool, range: i64, range_mod: i64, on_itself: bool) -> bool {
    if from == to && !on_itself {
        return false;
    }
    if line_only && !aligned(from, to, w) {
        return false;
    }
    distance(from, to, w) <= (range + range_mod).max(1)
}

/// JS `Math.round`: halves go toward +∞ (Rust's `round` goes away from zero).
fn js_round(x: f64) -> f64 {
    let f = x.floor();
    if x - f >= 0.5 {
        f + 1.0
    } else {
        f
    }
}

/// checkView (PathFinding.as:369-444) + checkCellView (:445-462): line of sight over terrain height, characters
/// (height 1.5, every class) blocking only intermediate cells. Same cell → false (0/0 eye line).
pub fn check_view(map: &Map, occupied: &HashSet<i64>, c1: i64, c2: i64) -> bool {
    let w = map.width as i64;
    let p = |c| {
        let (x, y) = coords(c, w);
        (x as f64, y as f64)
    };
    let ((x1, y1), (x2, y2)) = (p(c1), p(c2));
    let z = |c: i64| map.cell_height(c) + if occupied.contains(&c) { 1.5 } else { 0.0 };
    let (z1, zdiff) = (z(c1), z(c2) - z(c1));
    let d = (y1 - y2).abs().max((x1 - x2).abs());
    let cell_view = |x: f64, y: f64, last: bool| -> bool {
        let num = x * w as f64 + y * (w - 1) as f64;
        let n = num as i64;
        let cd = if num.fract() == 0.0 { map.cell(n) } else { None };
        let dist = (y1 - y).abs().max((x1 - x).abs());
        let eh = (dist / d) * zdiff + z1;
        let h = if cd.is_some() { map.cell_height(n) } else { 0.0 };
        let blocking = cd.is_some() && occupied.contains(&n) && !(dist == 0.0 || last || (x2 == x && y2 == y));
        (cd.is_some_and(|c| c.active && c.line_of_sight) && h <= eh && !blocking) || last
    };
    let a = (y1 - y2) / (x1 - x2);
    let b = y1 - a * x1;
    let dx = if x2 - x1 >= 0.0 { 1.0 } else { -1.0 };
    let dy = if y2 - y1 >= 0.0 { 1.0 } else { -1.0 };
    let mut last_y = y1;
    let mut x = x1 + 0.5 * dx;
    while x * dx <= x2 * dx {
        let y = a * x + b;
        let (dest, scan) = if dy > 0.0 { (js_round(y), (y - 0.5).ceil()) } else { ((y - 0.5).ceil(), js_round(y)) };
        let mut yy = last_y;
        while yy * dy <= scan * dy {
            if !cell_view(x - dx / 2.0, yy, false) {
                return false;
            }
            yy += dy;
        }
        last_y = dest;
        x += dx;
    }
    let mut yy = last_y;
    while yy * dy <= y2 * dy {
        if !cell_view(x - 0.5 * dx, yy, false) {
            return false;
        }
        yy += dy;
    }
    cell_view(x - 0.5 * dx, yy - dy, true)
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::codec::{compress_path, encode_cell, Cell};

    /// Open flat map: every cell active, walkable (movement 4), line of sight, level 7, flat.
    pub fn open_map(w: i32, h: i32) -> Map {
        let c = Cell { active: true, line_of_sight: true, movement: 4, ground_level: 7, ground_slope: 1, ..Default::default() };
        Map::new(0, w, h, 0, encode_cell(&c).repeat((w * h + (w - 1) * (h - 1)) as usize))
    }

    #[test]
    fn coordinates_round_trip_and_directions() {
        for n in 0..196 {
            let (x, y) = coords(n, 9);
            assert_eq!(x * 9 + y * 8, n);
        }
        assert_eq!(coords(20, 5), (4, 0));
        assert_eq!([direction(25, 20, 5), direction(24, 20, 5), direction(15, 20, 5), direction(16, 20, 5)], [0, 1, 2, 3]);
    }

    #[test]
    fn tie_break_most_recent_open_node_wins() {
        // Same hand trace as pathfinding.test.ts: 20 → 29 on a 5-wide open map goes through 24 (y+1) first.
        let m = open_map(5, 5);
        let (path, full) = path_find(&m, &HashSet::new(), &HashSet::new(), false, 500, 20, 29).unwrap();
        assert_eq!(path, vec![(24, 1), (29, 0)]);
        assert_eq!(full, vec![(24, 1), (29, 0)]);
        assert_eq!(compress_path(&path.iter().map(|&(n, d)| (n as i32, d)).collect::<Vec<_>>()), "qyaD");
    }

    #[test]
    fn fight_caps_length_by_ap_and_respects_tackle_zones() {
        let m = open_map(5, 5);
        let none = HashSet::new();
        assert!(path_find(&m, &none, &none, true, 1, 20, 29).is_none());
        assert_eq!(path_find(&m, &none, &none, true, 2, 20, 29).unwrap().1.len(), 2);
        let zones = crate::map::tacle_zones(&m, [(30, 1)]);
        assert_eq!(zones[1], HashSet::from([35, 34, 26, 25]));
        let full = path_find(&m, &none, &zones[1], true, 10, 20, 34).unwrap().1;
        assert_eq!(full.last().unwrap().0, 34);
        assert!(!full[..full.len() - 1].iter().any(|s| [35, 26, 25].contains(&s.0)));
    }

    #[test]
    fn range_and_view_basics() {
        let m = open_map(9, 9);
        assert!(!check_range(9, 40, 40, false, 3, 0, false));
        assert!(check_range(9, 40, 40, false, 3, 0, true));
        assert!(check_range(9, 40, 49, false, 1, 0, false));
        assert!(check_range(9, 40, 49, false, 0, -5, false)); // min range 1
        assert!(!check_range(9, 40, 57, true, 5, 0, false)); // 57 = x+1, y+1: not aligned
        assert!(check_view(&m, &HashSet::new(), 40, 76));
        assert!(!check_view(&m, &HashSet::from([58]), 40, 76)); // character in between (76 = x+4, 58 = x+2)
        assert!(!check_view(&m, &HashSet::new(), 40, 40));
    }
}
