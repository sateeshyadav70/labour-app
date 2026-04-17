import { io } from "socket.io-client";
import { getSocketBaseUrl } from "./api";

let socketInstance = null;
let socketToken = null;

const getAuthOptions = (token) => {
  if (!token) {
    return {};
  }

  return {
    auth: { token },
    query: { token },
  };
};

export const connectAppSocket = (token = null) => {
  if (socketInstance && socketToken === token) {
    return socketInstance;
  }

  disconnectAppSocket();

  socketToken = token || null;
  socketInstance = io(getSocketBaseUrl(), {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 15000,
    ...getAuthOptions(token),
  });

  return socketInstance;
};

export const getAppSocket = () => socketInstance;

export const disconnectAppSocket = () => {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
  }

  socketInstance = null;
  socketToken = null;
};

