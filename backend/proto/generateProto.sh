#!/bin/bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
FRONTEND_DIR=$DIR/../../frontend
BACKEND_DIR=$DIR/../

function sedi () {
    # sed uses a different arg to omit backups in mac vs linux.  Use this function to work on both.
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i'' "$@"
    fi
}

generateGoPb () {
    GO_DIR="${BACKEND_DIR}/pb"
    GO_FILENAME="${GO_DIR}/${1}"
    SOURCE_FILENAME="${2}"

    protoc \
        --plugin=./protoc_plugins/bin/protoc-gen-go \
        --go_out="${GO_DIR}" \
        --go-grpc_out=${GO_DIR} \
        --go-grpc_opt=paths=source_relative \
        "./${SOURCE_FILENAME}"

    sedi -e "s/protoc[ ]*v3.[0-9]*.[0-9]*/protoc        v3.x.x/g" "${GO_FILENAME}"
    printf '%s\n\n%s\n' "$(cat "${GO_FILENAME}")" "// md5-hash $(md5 -q "./${SOURCE_FILENAME}")" > "${GO_FILENAME}"
}

generateTsPb () {
    TS_DIR="${FRONTEND_DIR}/app"
    TS_FILENAME="${TS_DIR}/${1}"
    SOURCE_FILENAME="${2}"

    npx protoc --ts_out "${TS_DIR}" --proto_path ./ "./${SOURCE_FILENAME}"

    pushd "${TS_DIR}"
    popd
}

pushd "${DIR}"

pushd protoc_plugins
npm install
go mod vendor
go build -o bin/protoc-gen-go vendor/google.golang.org/protobuf/cmd/protoc-gen-go/main.go
popd

generateGoPb pb.pb.go pb.proto
generateTsPb Pb.ts pb.proto

echo successfully completed

