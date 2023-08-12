package websocket

import (
	"context"
	firebase "firebase.google.com/go/v4"
	"fmt"
	"github.com/google/uuid"
	"google.golang.org/protobuf/encoding/protojson"
	"log"
	"memrace/pb"
	"memrace/room"
	"memrace/switchboard"
	"net/http"
	"nhooyr.io/websocket"
	"strings"
)

func Serve(firebaseApp *firebase.App, w http.ResponseWriter, r *http.Request, switchboardChannel chan<- *switchboard.JoinRequest) {
	ctx := r.Context()

	auth, err := firebaseApp.Auth(ctx)
	if err != nil {
		log.Fatalf("failed to init firebase auth: %v", err)
	}

	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		Subprotocols:   []string{"race-v1"},
		OriginPatterns: []string{"localhost:3002"},
	})
	if err != nil {
		fmt.Printf("accept websocket failed %v", err)
		return
	}
	pathParts := strings.Split(r.URL.Path, "/")
	roomId := strings.ToLower(pathParts[len(pathParts)-1])
	defer c.Close(websocket.StatusInternalError, "the sky is falling")

	if c.Subprotocol() != "race-v1" {
		c.Close(websocket.StatusPolicyViolation, "client must speak the race-v1 subprotocol")
	}

	msg, err := readPb(c, ctx)
	if err != nil {
		c.Close(websocket.StatusInternalError, "unexpected message type")
	}

	joinMsg := msg.GetJoin()
	if joinMsg == nil {
		c.Close(websocket.StatusInternalError, "unexpected message type")
	}

	token, err := auth.VerifyIDToken(ctx, joinMsg.Token)
	if err != nil {
		c.Close(websocket.StatusInternalError, fmt.Sprintf("Invalid token: %s", err))
	}
	user := room.User{
		Id:    token.Claims["user_id"].(string),
		Email: token.Claims["email"].(string),
		Name:  token.Claims["name"].(string),
	}
	chanFromUserToRoom := make(chan *room.MsgFromUser)
	chanFromRoomToUser := make(chan *room.MsgToUser, 20)

	rooomConnection := room.RoomConnection{
		ChanFromUserToRoom: chanFromUserToRoom,
		ChanFromRoomToUser: chanFromRoomToUser,
		User:               user,
		SessionId:          uuid.New().String(),
	}

	fmt.Println("sending join request to switchboard")
	switchboardChannel <- &switchboard.JoinRequest{
		RoomId:         roomId,
		RoomConnection: &rooomConnection,
	}
	fmt.Println("sent join request to switchboard")

	incomingWebsocketMessage := make(chan *pb.ToRoom, 3)

	go func() {
		for {
			msg, err := readPb(c, ctx)
			if websocket.CloseStatus(err) == websocket.StatusNormalClosure {
				fmt.Println("closed connection")
				c.Close(websocket.StatusInternalError, fmt.Sprintf("closed: %s", err))
				incomingWebsocketMessage <- nil
				return
			}
			if err != nil {
				fmt.Println("closed connection from error")
				c.Close(websocket.StatusInternalError, fmt.Sprintf("read failed: %s", err))
				incomingWebsocketMessage <- nil
				return
			}

			incomingWebsocketMessage <- msg
		}
	}()

	for {
		select {
		case msg := <-incomingWebsocketMessage:
			if msg != nil {
				chanFromUserToRoom <- &room.MsgFromUser{
					Connection: &rooomConnection,
					Msg:        msg,
				}
			} else {
				chanFromUserToRoom <- &room.MsgFromUser{
					Connection: &rooomConnection,
					Disconnect: &struct{}{},
				}
			}

		case msg := <-chanFromRoomToUser:
			if msg.DisconnectCompleted != nil {
				close(chanFromRoomToUser)
				close(chanFromUserToRoom)
				close(incomingWebsocketMessage)
				r.Body.Close()
				fmt.Println("finished closing")
				return
			} else if msg.Msg != nil {
				writePb(c, ctx, msg.Msg)
			}
		}
	}
}

func readPb(conn *websocket.Conn, ctx context.Context) (*pb.ToRoom, error) {
	messageType, msgData, err := conn.Read(ctx)
	if err != nil {
		return nil, fmt.Errorf("read pb failded: %w", err)
	}
	if messageType != websocket.MessageText {
		return nil, fmt.Errorf("expected text message type")
	}

	msg := pb.ToRoom{}
	err = protojson.Unmarshal(msgData, &msg)
	if err != nil {
		return nil, fmt.Errorf("unmarshal failed %v", err)
	}

	return &msg, nil
}

func writePb(conn *websocket.Conn, ctx context.Context, fromRoom *pb.FromRoom) error {
	json, err := protojson.Marshal(fromRoom)
	if err != nil {
		return fmt.Errorf("failed to marshal: %w", err)
	}
	err = conn.Write(ctx, websocket.MessageText, json)
	if err != nil {
		return fmt.Errorf("failed to marshal: %w", err)
	}
	return nil
}
