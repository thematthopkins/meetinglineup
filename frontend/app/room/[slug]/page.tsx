'use client'

import {ReactElement, useState} from 'react';
import RoomEl from './roomEl'
import {RoomEvent, RoomEventWithMetadata} from 'app/pb';
import {createTestRoom, applyRoomEvents, eventIdGenerator} from './model'

let socket = new WebSocket("ws://localhost:8080");

socket.onopen = function(e) {
  socket.send("My name is John");
};

socket.onmessage = function(event) {
  console.log(`[message] Data received from server: ${event.data}`);
};

socket.onclose = function(event) {
  if (event.wasClean) {
    console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    console.log('[close] Connection died');
  }
};

socket.onerror = function(error) {
  alert(`[error]`);
};

export default function Page():ReactElement {
    var initialEvents = createTestRoom(BigInt(Date.now()), "mySession");
    var initialRoom = applyRoomEvents('my-room-id', initialEvents);
    var [events, setEvents] = useState(initialEvents);
    var [room, setRoom] = useState(initialRoom);
    var onAddEvent = function(e:RoomEvent){
        var eventWithMetadata:RoomEventWithMetadata = {
            event: e,
            metadata: {
                createdAt: BigInt(Date.now()),
                id: eventIdGenerator(),
                sessionId: 'my-session-id',
            }
        }
        var newEvents = [...events, eventWithMetadata];
        var newRoom = applyRoomEvents('my-room-id', newEvents);

        setEvents(newEvents);
        setRoom(newRoom);
    }
    return <>
        <div style={{display: "flex", flexDirection: "row", justifyContent: "center"}}>
            <div style={{width: "400px"}}>
                <RoomEl m={room} addEvent={onAddEvent}></RoomEl>
            </div>
        </div>
    </>
}
