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
	AddConnectionChannel chan<- *room.RoomConnection
	ShutdownChannel      chan<- struct{}
}

func RunSwitchboard(ctx context.Context, addConnectionChannel <-chan *JoinRequest) {
	rooms := map[string]*RoomEntry{}

	for {
		select {
		case joinRequest := <-addConnectionChannel:
			existing, ok := rooms[joinRequest.RoomId]
			if !ok {
				addConnectionChannel := make(chan *room.RoomConnection)
				shutdownChannel := make(chan struct{})
				rooms[joinRequest.RoomId] = &RoomEntry{
					AddConnectionChannel: addConnectionChannel,
					ShutdownChannel:      shutdownChannel,
				}

				existing = rooms[joinRequest.RoomId]

				go room.RunRoom(ctx, addConnectionChannel)
			}
			fmt.Println("sending join request to room")
			existing.AddConnectionChannel <- joinRequest.RoomConnection
		}
	}
}
