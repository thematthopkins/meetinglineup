package main

import (
	_ "github.com/jalandis/elm-protobuf/cmd/protoc-gen-elm"
	_ "google.golang.org/grpc/cmd/protoc-gen-go-grpc"
	_ "google.golang.org/protobuf/cmd/protoc-gen-go"
)

func main() {
	//"This is just here to force go to manage the imported dependencies above, which are used by the protobuf code generators"
}
