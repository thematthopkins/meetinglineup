'use client'

import {ReactElement} from 'react';
import AttendeeEl from './attendeeEl'
import {Room} from './model'
import {Row, Column} from 'app/flex'
import {RoomEvent} from 'app/pb';

export default function RoomEl(props: {m: Room, addEvent: (e:RoomEvent) => void}):ReactElement {
    const addAttendee = function(){
        props.addEvent(
            {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: "new-user-id",
                        name: "New Attendee",
                        order: 1000.0
                    }
                }
            }
        );
    }

    var m = props.m;
    return <Column>
        <Row>{m.name}</Row>

        <Row>Attendees</Row>
        <Row>
            {
                m.attendees.map(a => 
                    <Row key={a.id}>
                        <AttendeeEl m={a} addEvent={props.addEvent}></AttendeeEl>
                    </Row>
                )
            }
        </Row>
        <button onClick={addAttendee}>
            Add Attendee
        </button>
    </Column>
}

