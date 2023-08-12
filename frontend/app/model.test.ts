import {Room, createTestRoom, applyRoomEvents, RoomEventWithMetadataAndUndo, createUndoEvent} from './room/[slug]/model';
import {RoomEvent, RoomEventWithMetadata} from 'app/pb';
import {expect, test} from '@jest/globals';

function withMetadata(events: RoomEvent[]): RoomEventWithMetadataAndUndo[]{
   return events.map(e => ({
       event: e,
       undone: false,
       metadata: {
            id: "0CA8AD6E-B5C0-4C1B-8AF0-FE41409EFA59",
            createdAt: BigInt(111222333),
            sessionId: 'asdf',
       }
    }));
}

test('default room', () => {
    var events = createTestRoom(BigInt(123), "mySession");
    var room = applyRoomEvents("myRoomId", events);

    expect(room).toEqual({
        id: 'myRoomId',
        name: 'My Stand Up Meeting',
        attendees: [
            {
                id: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                name: "That Guy Who Talks Too Much",
                order: 100,
                present: true,
            },
            {
                id: "EBE6B93B-E59A-43F7-A730-408494F5EEF3",
                name: "That Guy Who's Always on Vacation",
                order: 200,
                present: false,
            },
        ],
    } as Room)
});

test('mark available', () => {
    var events:RoomEvent[] = [
        {
            event: {
                oneofKind: "addUser",
                addUser: {
                    userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                    order: 100,
                    name: "Bob",
                }
            }
        },
        {
            event: {
                oneofKind: "markUserPresent",
                markUserPresent: {
                    userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                }
            }
        },
        {
            event: {
                oneofKind: "markUserAbsent",
                markUserAbsent: {
                    userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                }
            }
        },
    ];

    var room = applyRoomEvents("myRoomId", withMetadata(events));

    expect(room).toEqual({
        id: 'myRoomId',
        name: '',
        attendees: [
            {
                id: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                name: "Bob",
                order: 100,
                present: false,
            },
        ],
    } as Room)
});

test('remove', () => {
    var events:RoomEvent[] = [
        {
            event: {
                oneofKind: "addUser",
                addUser: {
                    userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                    order: 100,
                    name: "Bob",
                }
            }
        },
        {
            event: {
                oneofKind: "addUser",
                addUser: {
                    userId: "90E2C1BB-FFE6-452D-A241-A36588D75410",
                    order: 200,
                    name: "Fred",
                }
            }
        },
        {
            event: {
                oneofKind: "removeUser",
                removeUser: {
                    userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                }
            }
        },
    ];

    var room = applyRoomEvents("myRoomId", withMetadata(events));

    expect(room).toEqual({
        id: 'myRoomId',
        name: '',
        attendees: [
            {
                id: "90E2C1BB-FFE6-452D-A241-A36588D75410",
                name: "Fred",
                order: 200,
                present: true,
            },
        ],
    } as Room)
});

test('update user name', () => {
    var events:RoomEvent[] = [
        {
            event: {
                oneofKind: "addUser",
                addUser: {
                    userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                    order: 100,
                    name: "Bob",
                }
            }
        },
        {
            event: {
                oneofKind: "addUser",
                addUser: {
                    userId: "90E2C1BB-FFE6-452D-A241-A36588D75410",
                    order: 200,
                    name: "Fred",
                }
            }
        },
        {
            event: {
                oneofKind: "updateUserName",
                updateUserName: {
                    userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                    name: "Timmy",
                }
            }
        },
        {
            event: {
                oneofKind: "updateUserName",
                updateUserName: {
                    userId: "B549E1DF-5473-453C-A1DC-2E5AA0D9144D",
                    name: "NoSuchUser",
                }
            }
        },
    ];

    var room = applyRoomEvents("myRoomId", withMetadata(events));

    expect(room).toEqual({
        id: 'myRoomId',
        name: '',
        attendees: [
            {
                id: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                name: "Timmy",
                order: 100,
                present: true,
            },
            {
                id: "90E2C1BB-FFE6-452D-A241-A36588D75410",
                name: "Fred",
                order: 200,
                present: true,
            },
        ],
    } as Room)
});


test('undo', () => {
    var events:RoomEventWithMetadata[] = [
        {
            event: {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                        order: 100,
                        name: "Bob",
                    }
                }
            },
            metadata: {
                id: "1",
                createdAt: BigInt(123),
                sessionId: "session-a",
            },
        },
        {
            event: {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                        order: 200,
                        name: "Bob2",
                    }
                }
            },
            metadata: {
                id: "2",
                createdAt: BigInt(123),
                sessionId: "session-a",
            },
        },
        {
            event: {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                        order: 300,
                        name: "Bob3",
                    }
                }
            },
            metadata: {
                id: "3",
                createdAt: BigInt(123),
                sessionId: "some-other-session",
            },
        },
        {
            event: {
                event: {
                    oneofKind: "undo",
                    undo: {
                        eventId: "2",
                    }
                }
            },
            metadata: {
                id: "4",
                createdAt: BigInt(123),
                sessionId: "some-other-session",
            },
        },
    ];


    var room = applyRoomEvents("myRoomId", events);
    expect(room).toEqual({
        id: 'myRoomId',
        name: '',
        attendees: [
            {
                id: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                name: "Bob",
                order: 100,
                present: true,
            },
            {
                id: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                name: "Bob3",
                order: 300,
                present: true,
            },
        ],
    } as Room)
});

test('undo with no events generates no event', () => {
    var events:RoomEventWithMetadataAndUndo[] = [
        {
            event: {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                        order: 100,
                        name: "Bob",
                    }
                }
            },
            metadata: {
                id: "1",
                createdAt: BigInt(123),
                sessionId: "session-a",
            },
            undone: true
        },
    ];

    var undone = createUndoEvent("my-user-id", events)
    expect(undone).toEqual(null);
});

test('undo with matching events undoes the last non-undone event', () => {
    var events:RoomEventWithMetadataAndUndo[] = [
        {
            event: {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                        order: 100,
                        name: "Bob",
                    }
                }
            },
            metadata: {
                id: "earliest-event-in-session",
                createdAt: BigInt(123),
                sessionId: "session-a",
            },
            undone: false
        },
        {
            event: {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                        order: 100,
                        name: "Bob",
                    }
                }
            },
            metadata: {
                id: "latest-non-undone-event-in-session",
                createdAt: BigInt(123),
                sessionId: "session-a",
            },
            undone: false
        },
        {
            event: {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                        order: 100,
                        name: "Bob",
                    }
                }
            },
            metadata: {
                id: "latest-event-for-session",
                createdAt: BigInt(123),
                sessionId: "session-a",
            },
            undone: true
        },
        {
            event: {
                event: {
                    oneofKind: "addUser",
                    addUser: {
                        userId: "2857267B-9CF5-4A74-B56D-D99A90CDFD57",
                        order: 100,
                        name: "Bob",
                    }
                }
            },
            metadata: {
                id: "other-session",
                createdAt: BigInt(123),
                sessionId: "session-b",
            },
            undone: false
        },
    ];

    var undone = createUndoEvent("session-a", events, () => "new-event-id", () => BigInt(112233))
    expect(undone).toEqual({
        event: {
            event: {
                oneofKind: "undo",
                undo: {
                    eventId: "latest-non-undone-event-in-session"
                }
            }
        },
        metadata: {
            id: "new-event-id",
            createdAt: BigInt(112233),
            sessionId: "session-a",
        }
    });
});

