package switchboard

import (
	"context"
	"fmt"
	"memrace/room"
)

type JoinRequest struct {
	RoomConnection *room.RoomConnection
	RoomId         string
}

type RoomEntry struct {
	RoomInbox chan *room.MsgFromUser
	ShutdownChannel      chan<- struct{}
}

func RunSwitchboard(ctx context.Context, addConnectionChannel <-chan *JoinRequest) {
	rooms := map[string]*RoomEntry{}

	for {
		joinRequest := <-addConnectionChannel
        existing, ok := rooms[joinRequest.RoomId]
        if !ok {
            roomInbox := make(chan *room.MsgFromUser)
            shutdownChannel := make(chan struct{})
            rooms[joinRequest.RoomId] = &RoomEntry{
                RoomInbox: roomInbox,
                ShutdownChannel:      shutdownChannel,
            }

            existing = rooms[joinRequest.RoomId]

            go room.RunRoom(ctx, roomInbox)
        }
        fmt.Println("sending user connetion notification")
        joinRequest.RoomConnection.ChanFromRoomToUser <- &room.MsgToUser{
            Connected: existing.RoomInbox,
        }
        fmt.Println("sending room connection notification")
        existing.RoomInbox <- &room.MsgFromUser{
            Connection: joinRequest.RoomConnection,
            Connect: &struct{}{},
        }
	}
}
