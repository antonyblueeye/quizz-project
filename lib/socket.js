// lib/socket.js – simple wrapper for socket.io client

import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
}

export function emitWhenReady(socket, event, payload) {
  if (socket.connected) {
    socket.emit(event, payload);
    return;
  }
  socket.once("connect", () => socket.emit(event, payload));
}
