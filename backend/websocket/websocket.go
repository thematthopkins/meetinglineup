package websocket

import (
	"fmt"
    "io"
	"github.com/google/uuid"
	"google.golang.org/protobuf/encoding/protojson"
    "github.com/gobwas/ws"
    "github.com/gobwas/ws/wsutil"
	"log"
	"memrace/pb"
	"memrace/room"
	"memrace/switchboard"
	"net/http"
	"strings"
)

func ForwardNextMessageFromUserToRoom(userConnection io.ReadWriter, roomInbox chan<- *room.MsgFromUser, roomConnection room.RoomConnection) (err error, shouldDisconnect bool){
    msgData, op, err := wsutil.ReadClientData(userConnection)
    if err != nil {
        return fmt.Errorf("failed to read client data: %w", err), false
    }
    fmt.Printf("read data from websocket: %s\n", msgData)

    if op == ws.OpClose {
        fmt.Println("closed connection")
        return nil, true
    } else if op == ws.OpText{
        msg := pb.RoomEventWithMetadata{}
        err = protojson.Unmarshal(msgData, &msg)
        if err != nil {
            roomInbox <- &room.MsgFromUser{
                Connection: &roomConnection,
                Msg:        &msg,
            }
            return
        }

        roomInbox <- &room.MsgFromUser{
            Connection: &roomConnection,
            Msg:        &msg,
        }
        return nil, false
    } else {
        return fmt.Errorf("closed connection from unexpected op: %v", op), false
    }
}

func Serve(w http.ResponseWriter, r *http.Request, switchboardChannel chan<- *switchboard.JoinRequest) {
	pathParts := strings.Split(r.URL.Path, "/")
	roomId := strings.ToLower(pathParts[len(pathParts)-1])
    conn, _, _, err := ws.UpgradeHTTP(r, w)
    if err != nil {
        log.Printf("error on connection %e", err)
        return
    }

	chanFromRoomToUser := make(chan *room.MsgToUser)

	roomConnection := room.RoomConnection{
		ChanFromRoomToUser: chanFromRoomToUser,
		SessionId:          uuid.New().String(),
	}

	fmt.Println("sending join request to switchboard")
	switchboardChannel <- &switchboard.JoinRequest{
		RoomId:         roomId,
		RoomConnection: &roomConnection,
	}
	fmt.Println("sent join request to switchboard")

    connectionResult := <-chanFromRoomToUser
    if connectionResult.Connected == nil {
        fmt.Println("unexpected initial message")
        return
    }

    roomInbox := connectionResult.Connected

	go func() {
		for {
            err, shouldDisconnect := ForwardNextMessageFromUserToRoom(conn, roomInbox, roomConnection)
            if err != nil || shouldDisconnect {
                if err != nil {
                    log.Printf("Error from client: %v", err)
                }
                conn.Close()
                roomInbox <- &room.MsgFromUser{
                    Connection: &roomConnection,
                    Disconnect: &struct{}{},
                }
                return
            }

		}
	}()

	for {
		msg := <-chanFromRoomToUser
        if msg.Msg == nil {
            fmt.Println("unexpected message type from roo")
            return
        }
        writePb(conn, msg.Msg)
	}
}

func writePb(conn io.Writer, fromRoom *pb.RoomEventWithMetadata) error {
	json, err := protojson.Marshal(fromRoom)
	if err != nil {
		return fmt.Errorf("failed to marshal: %w", err)
	}
    fmt.Printf("writing pb: %s\n", json)
    err = wsutil.WriteServerMessage(conn, ws.OpText, json)
    if err != nil {
        return fmt.Errorf("failed to write to client %w", err)
    }
    return nil
}
