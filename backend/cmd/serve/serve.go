package main

import (
	"fmt"
	"log"
	"memrace/server"
	"os"
	"os/signal"
	"strconv"
)

func main() {
	log.SetFlags(0)
    controllMsgsToServer := make(chan server.MsgToServer, 100)
    controllMsgsFromServer := make(chan server.MsgFromServer, 100)
    port, err := getPort(8080)
    if err != nil {
        log.Fatalf("Failed to read port %s", err)
    }
	go server.Run(port, controllMsgsToServer, controllMsgsFromServer)
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, os.Interrupt)
	select {
	case err := <-controllMsgsFromServer:
		log.Fatalf("failed to serve: %v", err)
	case sig := <-sigs:
		log.Fatalf("terminating: %v", sig)
	}
}

func getPort(defaultPort int) (int, error){
	portText, hasPort := os.LookupEnv("PORT")
    if !hasPort {
        return defaultPort, nil
    }
    port, err := strconv.Atoi(portText)
    if err != nil {
        return 0, fmt.Errorf("invalid port: %s", portText)
    }

    return port, nil
}

