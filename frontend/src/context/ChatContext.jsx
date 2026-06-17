import React, {
  createContext,
  useEffect,
  useRef,
  useState,
  useContext
} from "react";

import { io } from "socket.io-client";
import API_URL from "../config";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();

  const [socket, setSocket] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [notification, setNotification] = useState([]);

  const activeChatRef = useRef(null);

  // keep latest chat reference
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // reset when user changes
  useEffect(() => {
    setActiveChat(null);
    setNotification([]);
  }, [user]);

  // 🔥 FIXED SOCKET EFFECT (CRITICAL)
  useEffect(() => {
    if (!user) return;

    const newSocket = io(API_URL, {
      transports: ["websocket"] // stops polling spam
    });

    setSocket(newSocket);

    const handleMessage = (data) => {
      if (activeChatRef.current?._id !== data.chatId) {
        setNotification((prev) => [...prev, data]);
      }
    };

    newSocket.on("receiveMessage", handleMessage);

    return () => {
      newSocket.off("receiveMessage", handleMessage);
      newSocket.disconnect(); // 🔥 IMPORTANT
    };
  }, [user]); // ONLY RUN WHEN USER CHANGES

  // join chat
  const joinChat = (chatId) => {
    if (socket) {
      socket.emit("joinChat", chatId);
    }
  };

  // send message
  const sendMessage = (
    chatId,
    text,
    messageId = null,
    createdAt = new Date(),
    image = null
  ) => {
    if (socket && user) {
      const messageData = {
        chatId,
        sender: user._id,
        text,
        createdAt,
        _id: messageId,
        image
      };

      socket.emit("sendMessage", messageData);
      return messageData;
    }

    return null;
  };

  return (
    <ChatContext.Provider
      value={{
        socket,
        activeChat,
        setActiveChat,
        joinChat,
        sendMessage,
        notification,
        setNotification
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);