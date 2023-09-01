package server_test

import (
	"memrace/server"
	"testing"
)

func TestUserConnects(t *testing.T){
}


func withServer(t *testing.T, inner func()){
    controllMsgsToServer := make(chan server.MsgToServer, 100)
    controllMsgsFromServer := make(chan server.MsgFromServer, 100)
	go server.Run(controllMsgsToServer, controllMsgsFromServer)
    firstMsg := <- controllMsgsFromServer
    if firstMsg != server.MsgFromServerBootComplete {
        fmt.Errorf("failed to boot")
    }
}
