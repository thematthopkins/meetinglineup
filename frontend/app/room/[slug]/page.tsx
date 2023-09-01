'use client'

import {ReactElement, useState, useEffect} from 'react';
import RoomEl from './roomEl'
import {RoomEvent, RoomEventWithMetadata} from 'app/pb';
import {createTestRoom, applyRoomEvents, eventIdGenerator, userIdGenerator, recalculateRoom} from './model'
import {ReflectionJsonWriter, ReflectionJsonReader, JsonWriteOptions, JsonReadOptions} from "@protobuf-ts/runtime";

/*

var socket = null;

*/


export default function Page():ReactElement {
    console.log('page redrawn');
    var initialEvents = createTestRoom(BigInt(Date.now()), "mySession");
    var initialRoom = applyRoomEvents('my-room-id', initialEvents);
    var [clientEvents, setClientEvents] = useState([] as RoomEventWithMetadata[]);
    var [serverEvents, setServerEvents] = useState([] as RoomEventWithMetadata[]);
    var [isConnected, setIsConnected] = useState(false);
    var [socket] = useState(() =>  {
        return new WebSocket("ws://localhost:8080/room/123");
    });
    var room = recalculateRoom(clientEvents, serverEvents);

    useEffect(() => {
        socket.onopen = function(e) {
          setIsConnected(true);
        };
        var eventsReceivedFromServer = [] as RoomEventWithMetadata[];

        socket.onmessage = function(event) {
          var reader = new ReflectionJsonReader(RoomEventWithMetadata);
          var msgJson = JSON.parse(event.data);
          var msg = {};
          reader.read(msgJson, msg, pbReadOptions());
          
          eventsReceivedFromServer = [...eventsReceivedFromServer, msg];
          setServerEvents(eventsReceivedFromServer);
        };

        socket.onclose = function(event) {
          setIsConnected(false);
          if (event.wasClean) {
            console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
          } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            console.log('[close] Connection died');
          }
        };

        socket.onerror = function(error) {
          setIsConnected(false);
          console.log( error);
        };
        return () => {
            console.log('destructing use effect');
            socket.close();
        };
    }, [ socket ]);

    /*
    useEffect(() => {
        return () => {
            console.log("cleaning up by closing socket");
            socket.close();
        };
    }, events)
    */
    var onAddEvent = function(e:RoomEvent){
        var eventWithMetadata:RoomEventWithMetadata = {
            event: e,
            metadata: {
                createdAt: BigInt(Date.now()),
                id: eventIdGenerator(),
                sessionId: 'my-session-id',
            }
        };
        let pbWriter = new ReflectionJsonWriter(RoomEventWithMetadata);
        let jsonObj = pbWriter.write(eventWithMetadata, pbWriteOptions());
        let message = JSON.stringify(jsonObj);
        socket.send(message);
        setClientEvents([...clientEvents, eventWithMetadata]);
    }


    return <>
        {isConnected ? <div>connected</div>: <div>connecting....</div>}
        <div style={{display: "flex", flexDirection: "row", justifyContent: "center"}}>
            <div style={{width: "400px"}}>
                <RoomEl m={room} addEvent={onAddEvent} userIdGenerator={userIdGenerator}></RoomEl>
            </div>
        </div>
    </>
}

function pbWriteOptions() :JsonWriteOptions{
    return { enumAsInteger: true, emitDefaultValues: false, useProtoFieldName: true}
}

function pbReadOptions() :JsonReadOptions{
    return {     ignoreUnknownFields: true }
}
