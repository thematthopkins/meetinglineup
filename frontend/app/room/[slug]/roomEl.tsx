'use client'

import {ReactElement} from 'react';
import AttendeeEl from './attendeeEl'
import {Room} from './model'
import {Row, Column} from 'app/flex'
import {RoomEvent} from 'app/pb';

export default function RoomEl(props: {m: Room, addEvent: (e:RoomEvent) => void, userIdGenerator: () => string}):ReactElement {
    const maxOrderBy = props.m.attendees.reduce((maxOrderBy, attendee) => {
        return Math.max(maxOrderBy, attendee.order);
    }, 0);
    const addAttendee = function(){
        var intArr = new Int32Array(1);
        crypto.getRandomValues<Int32Array>(intArr);
        props.addEvent(
            {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: props.userIdGenerator(),
                        name: "New Attendee",
                        order: maxOrderBy + Math.abs(intArr[0]) / 2**32,
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

