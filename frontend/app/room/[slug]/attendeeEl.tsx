'use client';

import {useState, ChangeEvent, KeyboardEvent} from 'react';
import {Attendee} from './model';
import {Row} from 'app/flex';
import {RoomEvent} from 'app/pb';

export default function AttendeeEl(props: {m: Attendee, addEvent: (e:RoomEvent) => void}) {
    var m = props.m;
    const onRemove = function(){
        props.addEvent(
            {
                event: {
                    oneofKind: "removeUser",
                    removeUser: {
                        userId: m.id
                    }
                },
            }
        );
    };
    var [editingInput, setEditingInput] = useState<string|null>(null);

    const onEditingNameStarted = function(){
        setEditingInput(m.name);
    };

    const onNameChanged = function(){
        props.addEvent(
            {
                event: {
                    oneofKind: "updateUserName",
                    updateUserName: {
                        userId: m.id,
                        name: editingInput!
                    }
                }
            }
        );
        setEditingInput(null);
    };

    const onMarkAbsent = function(){
        props.addEvent(
            {
                event: {
                    oneofKind: "markUserAbsent",
                    markUserAbsent: {
                        userId: m.id,
                    }
                }
            }
        );
    };

    const onMarkPresent = function(){
        props.addEvent(
            {
                event: {
                    oneofKind: "markUserPresent",
                    markUserPresent: {
                        userId: m.id
                    }
                }
            }
        );
    };

    const onEditingNameChanged = function(e:ChangeEvent<HTMLInputElement>){
        setEditingInput((e.target as HTMLInputElement).value);
    }

    const handleKeyDown = (event:KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
          onNameChanged();
      }
    };

    return <Row testId={m.id} childGrow="expandFirstChild">
            {
                editingInput != null ?
                    <input autoFocus onKeyDown={handleKeyDown} onBlur={onNameChanged} type="text" value={editingInput} onChange={onEditingNameChanged}></input>
                    : <div onClick={onEditingNameStarted} style={m.present ? {} : {textDecoration: "line-through"} }>{m.name}</div>
            }
        <button onClick={onRemove}>Remove</button>
        {
            m.present ?
                <button onClick={onMarkAbsent}>Mark Absent</button>
                : <button onClick={onMarkPresent}>Mark Present</button>
        }
    </Row>
}
