import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { getAccessToken } from "../services/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

export function useSocket() {
  const socket = useMemo(() => {
    return io(SOCKET_URL, {
      autoConnect: false,
      auth: { token: getAccessToken() }
    });
  }, []);

  useEffect(() => {
    socket.auth = { token: getAccessToken() };
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
}
