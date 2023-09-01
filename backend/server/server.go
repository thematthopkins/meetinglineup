package server

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
    "memrace/switchboard"
	"runtime"
    "memrace/websocket"
	"time"
)


type MsgToServer  struct {
    requestShutdown bool
};


type MsgFromServer struct {
    shutdownCompleted *struct{error}
    bootCompleted bool
}

          
// run starts a http.Server for the passed in address
// with all requests handled by echoServer.
func Run(port int, controllMsgsToServer <-chan MsgToServer, controllMsgsFromServer chan<- MsgFromServer) {
    s, errc, err := startHttpServer(port)
    if err != nil {
        controllMsgsFromServer <- MsgFromServer{
            shutdownCompleted: &struct{error}{err},
        }
        return
    }

	go func() {
		for {
			fmt.Printf("goroutines: %d\n", runtime.NumGoroutine())
			time.Sleep(1 * time.Second)
		}
	}()

	select {
	case err := <-errc:
        controllMsgsFromServer <- MsgFromServer{
            shutdownCompleted: &struct{error}{err},
        }
	case sig := <-controllMsgsToServer:
        if !sig.requestShutdown {
            controllMsgsFromServer <- MsgFromServer{
                shutdownCompleted: &struct{error}{fmt.Errorf("unexpected message to server")},
            }
        }
        
        ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
        defer cancel()

        s.Shutdown(ctx)
	}
}

func startHttpServer(port int)(*http.Server, <-chan error, error){
	errc := make(chan error, 1)

	l, err := net.Listen("tcp", fmt.Sprintf(":%v", port))
	if err != nil {
        return nil, nil, err
	}
	log.Printf("listening on http://%v", l.Addr())

	mux := http.NewServeMux()
	addRoutes(mux)

    s := &http.Server{
		Handler:      mux,
		ReadTimeout:  time.Second * 10,
		WriteTimeout: time.Second * 10,
	}

	go func() {
		errc <- s.Serve(l)
	}()
    return s, errc, nil
}

func addRoutes(mux *http.ServeMux) {
	addConnectionChannel := make(chan *switchboard.JoinRequest)

	go switchboard.RunSwitchboard(context.Background(), addConnectionChannel)

	mux.HandleFunc("/room/", func(w http.ResponseWriter, r *http.Request) {
		websocket.Serve(w, r, addConnectionChannel)
	})
}
