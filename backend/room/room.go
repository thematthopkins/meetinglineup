package room

import (
    "log"
	"context"
	"fmt"
	"memrace/pb"
)

type RoomConnection struct {
	ChanFromRoomToUser chan<- *MsgToUser
	SessionId          string
}

type MsgFromUser struct {
	Msg              *pb.RoomEventWithMetadata
	Connection    *RoomConnection
	Disconnect       *struct{}
    Connect *struct{}
}

type MsgToUser struct {
	Msg                 *pb.RoomEventWithMetadata
    Connected            chan<- *MsgFromUser
}

func removeIndex(s []*RoomConnection, index int) []*RoomConnection {
	return append(s[:index], s[index+1:]...)
}

func RunRoom(ctx context.Context, roomInbox <-chan *MsgFromUser) {
	log.Println("new room")
	connections := []*RoomConnection{}
    events := []*pb.RoomEventWithMetadata{}

	for {
		msg := <-roomInbox
        if msg.Disconnect != nil {
            toRemove := -1
            for index, conn := range connections {
                if conn == msg.Connection {
                    toRemove = index
                }
            }
            connections = removeIndex(connections, toRemove)
            close(msg.Connection.ChanFromRoomToUser)
        } else if msg.Connect != nil {
            fmt.Println("room received connect")
            connections = append(connections, msg.Connection)
            for _, e := range events {
                msg.Connection.ChanFromRoomToUser <- &MsgToUser{
                    Msg: e,
                }
            }
            fmt.Println("room sent user connections")
        } else if msg.Msg != nil {
            fmt.Printf("msg from user: %+v\n", msg.Msg)
            events = append(events, msg.Msg);
            for _, conn := range connections {
                conn.ChanFromRoomToUser <- &MsgToUser{
                    Msg: msg.Msg,
                }
            }
        }
	}
}

