package main

import (
	"context"
	firebase "firebase.google.com/go/v4"
	"fmt"
	"google.golang.org/api/option"
	"log"
	"memrace/switchboard"
	"memrace/websocket"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"time"
)

func main() {
	log.SetFlags(0)

	err := run()
	if err != nil {
		log.Fatal(err)
	}
}

// run starts a http.Server for the passed in address
// with all requests handled by echoServer.
func run() error {
	portText, hasPort := os.LookupEnv("PORT")
	port := 8088
	err := (error)(nil)
	if hasPort {
		port, err = strconv.Atoi(portText)
		if err != nil {
			log.Fatalf("invalid port: %s", portText)
		}
	}

	firebaseConfig, hasFirebaseConfig := os.LookupEnv("FIREBASE_CONFIG")
	if !hasFirebaseConfig {
		log.Fatalf("missing FIREBASE_CONFIG env var.  set it to the json file contents")
	}
	clientOption := option.WithCredentialsJSON(([]byte)(firebaseConfig))

	fbApp, err := firebase.NewApp(context.Background(), nil, clientOption)
	if err != nil {
		log.Fatalf("firebase init failed: %e", err)
	}

	l, err := net.Listen("tcp", fmt.Sprintf(":%v", port))
	if err != nil {
		return err
	}
	log.Printf("listening on http://%v", l.Addr())

	mux := http.NewServeMux()
	addRoutes(mux, fbApp)

	s := &http.Server{
		Handler:      mux,
		ReadTimeout:  time.Second * 10,
		WriteTimeout: time.Second * 10,
	}
	errc := make(chan error, 1)
	go func() {
		errc <- s.Serve(l)
	}()

	go func() {
		for {
			fmt.Printf("goroutines: %d\n", runtime.NumGoroutine())
			time.Sleep(1 * time.Second)
		}
	}()

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, os.Interrupt)
	select {
	case err := <-errc:
		log.Printf("failed to serve: %v", err)
	case sig := <-sigs:
		log.Printf("terminating: %v", sig)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()

	return s.Shutdown(ctx)
}

func addRoutes(mux *http.ServeMux, fbApp *firebase.App) {
	addConnectionChannel := make(chan *switchboard.JoinRequest)

	go switchboard.RunSwitchboard(context.Background(), addConnectionChannel)

	mux.HandleFunc("/room/", func(w http.ResponseWriter, r *http.Request) {
		websocket.Serve(fbApp, w, r, addConnectionChannel)
	})
}
