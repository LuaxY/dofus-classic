//! WebSocket transport: one protocol message per text frame, no `\0` (web/src/core/connection.ts). Every
//! connection forwards its frames to the single world task and drains its own outgoing channel.
use crate::world::{Event, Sid, World};
use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc::{unbounded_channel, UnboundedSender};
use tokio_tungstenite::tungstenite::Message;

pub struct Overrides {
    pub turn_ms: Option<u64>,
    pub placement_ms: Option<u64>,
}

pub async fn serve(listener: TcpListener, mut world: World, overrides: Overrides) {
    let (events, mut queue) = unbounded_channel::<Event>();
    world.set_timers(events.clone(), overrides.turn_ms, overrides.placement_ms);
    tokio::spawn(async move {
        while let Some(ev) = queue.recv().await {
            world.handle(ev);
        }
    });
    let mut next: Sid = 1;
    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(connection(stream, next, events.clone()));
        next += 1;
    }
}

async fn connection(stream: TcpStream, sid: Sid, events: UnboundedSender<Event>) {
    let Ok(ws) = tokio_tungstenite::accept_async(stream).await else { return };
    let (mut sink, mut source) = ws.split();
    let (tx, mut rx) = unbounded_channel::<String>();
    let _ = events.send(Event::Open(sid, tx));
    let writer = tokio::spawn(async move {
        while let Some(m) = rx.recv().await {
            if sink.send(Message::Text(m.into())).await.is_err() {
                break;
            }
        }
        let _ = sink.close().await;
    });
    while let Some(Ok(msg)) = source.next().await {
        let text = match msg {
            Message::Text(t) => t.to_string(),
            Message::Binary(b) => String::from_utf8_lossy(&b).into_owned(),
            Message::Close(_) => break,
            _ => continue,
        };
        let _ = events.send(Event::Frame(sid, text));
    }
    let _ = events.send(Event::Close(sid));
    writer.abort();
}
