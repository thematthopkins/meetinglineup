import {RoomEvent, RoomEventWithMetadata, EventMetadata} from 'app/pb'


export interface Attendee {
    id: string;
    name: string;
    order: number;
    present: Boolean;
}

export interface Room {
    id: string;
    name: string;
    attendees: Attendee[];
}

export function applyRoomEvents(id: string, events: RoomEventWithMetadata[]) : Room {
    const eventsWithUndo = roomEventsWithMetadataAndUndo(events);

    var r:Room = {
        id: id,
        name: "",
        attendees: [],
    }

    return eventsWithUndo.reduce((r, e) => applyRoomEvent(r, e), r);
}

function applyRoomEvent(room: Room, event: RoomEventWithMetadataAndUndo): Room { 
    if(event.undone){
        return room;
    }
    var e = event.event!.event!;
    switch(e.oneofKind){
        case undefined:
            throw "undefined";

        case "updateRoomName":
            return {...room, name: e.updateRoomName.name};

        case "addUser":
            return {...room, attendees: [...room.attendees, {
                id: e.addUser.userId,
                name: e.addUser.name,
                order: e.addUser.order,
                present: true,
            }]};

        case "markUserPresent":
            var userId = e.markUserPresent.userId;
            return {...room, attendees: room.attendees.map(a => {
                if(a.id == userId){
                    return {...a, present: true};
                }else{
                    return a;
                }
            })};

        case "markUserAbsent":
            var userId = e.markUserAbsent.userId;
            return {...room, attendees: room.attendees.map(a => {
                if(a.id == userId){
                    return {...a, present: false};
                }else{
                    return a;
                }
            })};
        case "removeUser":
            var userId = e.removeUser.userId;
            return {...room, attendees: room.attendees.filter(a => a.id != userId)};

        case "updateUserName":
            var userId = e.updateUserName.userId;
            var name = e.updateUserName.name;
            return {...room, attendees: room.attendees.map(a => {
                if(a.id == userId){
                    return {...a, name: name};
                }else{
                    return a;
                }
            })};

        case "reorderUser":
            var userId = e.reorderUser.userId;
            var order = e.reorderUser.order;
            return {...room, attendees: room.attendees.map(a => {
                if(a.id == userId){
                    return {...a, order: order};
                }else{
                    return a;
                }
            })};

        case "undo":
            return room;

        case "redo":
            return room;

        default:
          return assertNever(e);
    }
}

function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

type EventIdGenerator = () => string;

export function eventIdGenerator():string {
    return crypto.randomUUID();
}

export function userIdGenerator():string {
    return crypto.randomUUID();
}

type TimeRetriever = () => BigInt;

export function currentTimeRetriever():BigInt {
    return BigInt(Date.now());
}

export function createUndoEvent(
    sessionId: string,
    events: RoomEventWithMetadataAndUndo[],
    idGenerator:EventIdGenerator = eventIdGenerator,
    timeRetriever: TimeRetriever = currentTimeRetriever):(RoomEventWithMetadata|null) {
    const eventToUndo = events.findLast(e => e.metadata.sessionId == sessionId && e.undone == false);
    if(eventToUndo == null){
        return null;
    }

    return {
        event: {
            event: {
                oneofKind: "undo",
                undo: {
                    eventId: eventToUndo.metadata.id
                }
            }
        },
        metadata: {
            id: idGenerator(),
            createdAt: timeRetriever() as bigint,
            sessionId: sessionId,
        }
    };
}

function roomEventsWithMetadataAndUndo(events: RoomEventWithMetadata[]): RoomEventWithMetadataAndUndo[]{
    
    return events.reduce(function(accum:RoomEventWithMetadataAndUndo[], e:RoomEventWithMetadata):RoomEventWithMetadataAndUndo[]{
        switch(e.event?.event.oneofKind){
            case "undo":
                var targetId = e.event?.event.undo.eventId;
                return accum.map(
                    accumEvent => 
                    accumEvent.metadata.id == targetId ?
                    {...accumEvent, undone: true} :
                    accumEvent);
            case "redo":
                var targetId = e.event?.event.redo.eventId;
                return accum.map(
                    accumEvent => 
                    accumEvent.metadata.id == targetId ?
                    {...accumEvent, undone: false} :
                    accumEvent);
            default:
                return [...accum, {
                    metadata: e.metadata!,
                    event: e.event!,
                    undone: false
                }];
        }
    }, []);
}

export interface RoomEventWithMetadataAndUndo {
    metadata: EventMetadata;
    event: RoomEvent;
    undone: boolean;
}

export function createTestRoom(timestamp: BigInt, userId: string): RoomEventWithMetadata[] {
   var events:Array<RoomEvent> = [
    {
        event: {
            oneofKind: "updateRoomName",
            updateRoomName: {
                name: "My Stand Up Meeting"
            },
        }
    },
    {
        event: {
            oneofKind: "addUser",
            addUser: {
                userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                order: 100.0,
                name: "That Guy Who Talks Too Much",
            },
        },
    },
    {
        event: {
            oneofKind: "addUser",
            addUser: {
                userId: "EBE6B93B-E59A-43F7-A730-408494F5EEF3",
                order: 200.0,
                name: "That Guy Who's Always on Vacation",
            }
        },
    },
    {
        event: {
            oneofKind: "markUserAbsent",
            markUserAbsent: {
                userId: "EBE6B93B-E59A-43F7-A730-408494F5EEF3",
            }
        }
    },
   ];

   return events.map(e => ({
       event: e,
       metadata: ({
            id: crypto.randomUUID(),
            createdAt: timestamp,
            sessionId: userId,
       } as EventMetadata)
    }));
}

