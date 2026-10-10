//! `dofus-server [addr]` — defaults: `127.0.0.1:5555` (the beta's SERVER_PORT), data from `server/data`, accounts and
//! characters in `server/data/runtime/store.json`. Env: DOFUS_ADDR, DOFUS_DATA, DOFUS_STORE, DOFUS_SEED,
//! DOFUS_TURN_MS, DOFUS_PLACEMENT_MS.
use dofus_server::{data::GameData, net, store::Store, world::World};
use std::path::PathBuf;

#[tokio::main]
async fn main() {
    let env = |k: &str| std::env::var(k).ok();
    let addr = std::env::args().nth(1).or(env("DOFUS_ADDR")).unwrap_or("127.0.0.1:5555".into());
    let data_dir = env("DOFUS_DATA").map(PathBuf::from).unwrap_or(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("data"));
    let store_path = env("DOFUS_STORE").map(PathBuf::from).unwrap_or(data_dir.join("runtime/store.json"));
    let data = GameData::load(&data_dir).unwrap_or_else(|e| panic!("cannot load game data: {e}"));
    let seed = env("DOFUS_SEED")
        .and_then(|s| s.parse().ok())
        .unwrap_or_else(|| std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos() as u64);
    let ms = |k: &str| env(k).and_then(|s| s.parse().ok());
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap_or_else(|e| panic!("cannot listen on {addr}: {e}"));
    println!("dofus-server: ws://{} ({} maps, store {})", listener.local_addr().unwrap(), data.maps.len(), store_path.display());
    let world = World::new(data, Store::open(Some(store_path)), seed);
    net::serve(listener, world, net::Overrides { turn_ms: ms("DOFUS_TURN_MS"), placement_ms: ms("DOFUS_PLACEMENT_MS") }).await;
}
