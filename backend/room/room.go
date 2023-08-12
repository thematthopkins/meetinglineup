package room

import (
	"context"
	"fmt"
	"memrace/pb"
)

type User struct {
	Id    string
	Name  string
	Email string
}

type RoomConnection struct {
	DisconnectedToRoom <-chan struct{}
	ChanFromUserToRoom <-chan *MsgFromUser
	ChanFromRoomToUser chan<- *MsgToUser
	User               User
	SessionId          string
}

type MsgFromUser struct {
	Connection *RoomConnection
	Msg        *pb.ToRoom
	Disconnect *struct{}
}

type MsgToUser struct {
	Msg                 *pb.FromRoom
	DisconnectCompleted *struct{}
}

func removeIndex(s []*RoomConnection, index int) []*RoomConnection {
	return append(s[:index], s[index+1:]...)
}

func RunRoom(ctx context.Context, addConnectionChannel <-chan *RoomConnection) {
	fmt.Println("new room")
	msgFromUsers := make(chan *MsgFromUser)
	connections := []*RoomConnection{}
	name := "Temp room"

	for {
		select {
		case msg := <-msgFromUsers:
			if msg.Disconnect != nil {
				toRemove := -1
				for index, conn := range connections {
					if conn == msg.Connection {
						toRemove = index
					}
				}
				connections = removeIndex(connections, toRemove)
				for _, conn := range connections {
					conn.ChanFromRoomToUser <- &MsgToUser{
						Msg: &pb.FromRoom{
							FromRoomMsg: &pb.FromRoom_UserRemoved_{
								UserRemoved: &pb.FromRoom_UserRemoved{
									User: userToPb(&msg.Connection.User),
								},
							}},
					}
				}
				msg.Connection.ChanFromRoomToUser <- &MsgToUser{
					DisconnectCompleted: &struct{}{},
				}
			} else if msg.Msg != nil {
				fmt.Printf("msg from user: %+v\n", msg.Msg)
			}

		case newConnection := <-addConnectionChannel:
			fmt.Println("got connection")
			go func() {
				for msg := range newConnection.ChanFromUserToRoom {
					msgFromUsers <- msg
					if msg.Disconnect != nil {
						break
					}
				}
			}()

			fmt.Println("sending user addes messages")
			for _, conn := range connections {
				conn.ChanFromRoomToUser <- &MsgToUser{
					Msg: &pb.FromRoom{
						FromRoomMsg: &pb.FromRoom_UserAdded_{
							UserAdded: &pb.FromRoom_UserAdded{
								User: userToPb(&newConnection.User),
							},
						},
					},
				}
			}
			fmt.Println("sent user addes messages")

			connections = append(connections, newConnection)
			pbUsers := []*pb.User{}
			for _, u := range connections {
				pbUsers = append(pbUsers, userToPb(&u.User))
			}
			newConnection.ChanFromRoomToUser <- &MsgToUser{
				Msg: &pb.FromRoom{
					FromRoomMsg: &pb.FromRoom_JoinCompleted_{
						JoinCompleted: &pb.FromRoom_JoinCompleted{
							SessionId: newConnection.SessionId,
							RoomState: &pb.RoomState{
								Name:  name,
								Users: pbUsers,
							},
						},
					}},
			}

		}
	}
}

func userToPb(u *User) *pb.User {
	return &pb.User{
		Name: u.Name,
		Id:   u.Id,
	}
}
