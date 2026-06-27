/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import API_URL from "../config";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();

  const socketRef = useRef(null);
  const activeChatRef = useRef(null);

  const [activeChat, setActiveChat] = useState(null);
  const [notification, setNotification] = useState([]);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]); // NEW: store all chats

  // keep latest active chat in ref
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // reset on user change
  useEffect(() => {
    const t = setTimeout(() => {
      setActiveChat(null);
      setNotification([]);
      setMessages([]);
      setConversations([]);
    }, 0);
    return () => clearTimeout(t);
  }, [user]);

  // socket connection
  useEffect(() => {
    if (!user) return;

    const s = io(API_URL, { transports: ["websocket"] });
    socketRef.current = s;
    const t = setTimeout(() => setSocket(s), 0);

    s.emit("setup", user);

    // unified message listener
    s.on("receiveMessage", (data) => {
      if (activeChatRef.current?._id === data.chatId) {
        setMessages((prev) => [...prev, data]);
      } else {
        setNotification((prev) => {
          if (prev.some((n) => n._id === data._id)) return prev;
          return [...prev, data];
        });
      }
    });

    return () => {
      clearTimeout(t);
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user]);

  // join active chat room
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !activeChat?._id) return;
    s.emit("joinChat", activeChat._id);
  }, [activeChat?._id]);

  // NEW: join all user’s chat rooms once conversations are loaded
  useEffect(() => {
    const s = socketRef.current;
    if (!s || conversations.length === 0) return;
    conversations.forEach((chat) => {
      s.emit("joinChat", chat._id);
    });
  }, [socket, conversations]);

  // send message
  const sendMessage = (
    chatId,
    text,
    messageId = null,
    createdAt = new Date(),
    image = null
  ) => {
    if (!socketRef.current || !user) return null;

    const messageData = {
      chatId,
      sender: user._id,
      text,
      createdAt,
      _id: messageId,
      image,
    };

    socketRef.current.emit("sendMessage", messageData);
    return messageData;
  };

  return (
    <ChatContext.Provider
      value={{
        activeChat,
        setActiveChat,
        sendMessage,
        notification,
        setNotification,
        socket,
        messages,
        setMessages,
        conversations,
        setConversations, // expose so ChatMessages can set it
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
