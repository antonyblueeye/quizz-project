// lib/socket.js – simple wrapper for socket.io client

import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (!socket) {
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    socket = io(origin, {
      path: "/socket.io",
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["polling", "websocket"],
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
