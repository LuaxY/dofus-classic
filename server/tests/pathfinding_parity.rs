//! Pathfinding / line-of-sight parity with the client port: replays every case of tests/fixtures/pathfinding.json
//! (written by web/src/core/pathfinding.parity.test.ts) and expects the exact same paths, directions and verdicts.
use dofus_server::data::GameData;
use dofus_server::map::tacle_zones;
use dofus_server::pathfinding::{check_view, path_find};
use serde::Deserialize;
use std::collections::HashSet;
use std::path::Path;

#[derive(Deserialize)]
struct PathCase {
    map: u32,
    start: i64,
    goal: i64,
    fight: bool,
    ap: i64,
    team: Option<u8>,
    occupants: Vec<(i64, u8)>,
    path: Option<Vec<(i64, i32)>>,
    full: Option<Vec<(i64, i32)>>,
}

#[derive(Deserialize)]
struct ViewCase {
    map: u32,
    from: i64,
    to: i64,
    occupants: Vec<i64>,
    view: bool,
}

#[derive(Deserialize)]
struct Fixture {
    paths: Vec<PathCase>,
    views: Vec<ViewCase>,
}

#[test]
fn same_paths_and_line_of_sight_as_the_client() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let data = GameData::load(&root.join("data")).unwrap();
    let fixture: Fixture = serde_json::from_str(&std::fs::read_to_string(root.join("tests/fixtures/pathfinding.json")).unwrap()).unwrap();
    assert!(fixture.paths.len() > 500 && fixture.views.len() > 300);
    for (i, c) in fixture.paths.iter().enumerate() {
        let map = &data.map_index[&c.map];
        let occupied: HashSet<i64> = c.occupants.iter().map(|o| o.0).collect();
        let zones = tacle_zones(map, c.occupants.iter().copied());
        let adverse = if c.team != Some(0) { 0 } else { 1 };
        let got = path_find(map, &occupied, &zones[adverse], c.fight, if c.fight { c.ap } else { 500 }, c.start, c.goal);
        let (path, full) = got.map_or((None, None), |(p, f)| (Some(p), Some(f)));
        assert_eq!(
            (&path, &full),
            (&c.path, &c.full),
            "path case {i}: map {} {} → {} fight {} ap {}",
            c.map,
            c.start,
            c.goal,
            c.fight,
            c.ap
        );
    }
    for (i, c) in fixture.views.iter().enumerate() {
        let occupied: HashSet<i64> = c.occupants.iter().copied().collect();
        assert_eq!(
            check_view(&data.map_index[&c.map], &occupied, c.from, c.to),
            c.view,
            "view case {i}: map {} {} → {}",
            c.map,
            c.from,
            c.to
        );
    }
}
