import { useEffect, useRef, useState } from "react";
import { chatMessagesStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useLocation } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config";
import Navbar from "../../components/common/Navbar";
import {
  HiChevronLeft,
  HiOutlineChatAlt2,
  HiOutlineTrash,
  HiPaperAirplane,
} from "react-icons/hi";
import Loader from "../../components/common/Loader";

const ChatMessages = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const { socket, activeChat, setActiveChat, conversations, setConversations } = useChat();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getChatPartner = (chat) => {
    console.log("chat msg", chat)
    if (!chat || !user?._id) return null;
    if (chat.buyer && chat.seller) {
      return user._id === chat.buyer._id ? chat.seller : chat.buyer;
    }
    if (Array.isArray(chat.participants)) {
      return chat.participants.find((p) => p._id !== user._id);
    }
    return null;
  };

  // fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chat/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;
        setConversations(data);

        if (location.state?.chat) {
          const existing = data.find((c) => c._id === location.state.chat._id);
          setActiveChat(existing || location.state.chat);
        }

        setLoading(false);
      } catch (err) {
        console.error("error fetching conversations", err);
        setLoading(false);
      }
    };
    fetchConversations();
  }, [token, location.state, setActiveChat, setConversations]);

  // fetch messages
  useEffect(() => {
    if (!activeChat) return;
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chat/${activeChat._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error("error fetching messages", err);
      }
    };
    fetchMessages();
  }, [activeChat, token]);

  // socket listener
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (data) => {
      setMessages((prev) => {
        if (!activeChat || data.chatId !== activeChat._id) return prev;
        // avoid duplicates
        if (prev.some((m) => m._id === data._id)) return prev;
        return [...prev, data];
      });
    };
    socket.on("receiveMessage", handleMessage);
    return () => socket.off("receiveMessage", handleMessage);
  }, [socket, activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChat?._id]);

  // send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const textToSend = newMessage;
    setNewMessage("");

    try {
      await axios.post(
        `${API_URL}/api/chat/send`,
        { chatId: activeChat._id, text: textToSend },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ❌ don’t append here, rely on socket event
      scrollToBottom();
    } catch (err) {
      console.error("error sending message", err);
    }
  };

  // delete chat
  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat?")) return;
    try {
      await axios.delete(`${API_URL}/api/chat/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) => prev.filter((c) => c._id !== chatId));
      if (activeChat?._id === chatId) setActiveChat(null);
    } catch (err) {
      console.error(err);
    }
  };

  // delete message
  // const handleDeleteMessage = async (chatId, messageId) => {
  //   if (!window.confirm("Delete this message?")) return;
  //   try {
  //     const res = await axios.delete(
  //       `${API_URL}/api/chat/${chatId}/message/${messageId}`,
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     );
  //     setMessages(res.data.chat.messages);
  //   } catch (err) {
  //     console.error("error deleting message", err);
  //   }
  // };

  if (loading) return <Loader />;

  return (
    <div
      className={`${s.chatContainer} ${
        user?.role === "seller" ? s.chatContainerSeller : s.chatContainerNonSeller
      }`}
    >
      {user?.role !== "seller" && <Navbar />}

      {/* SIDEBAR */}
      <div className={`${s.sidebar} ${activeChat ? s.sidebarHidden : ""}`}>
        <div className={s.sidebarHeader}>

          {user.role === "seller" ?           <h2>Seller Message Box</h2> : <h2>Investor Message Box</h2> }
        </div>
        <div className={s.sidebarContent}>
          {conversations.length === 0 ? (
            <div className={s.emptyConversations}>
              <HiOutlineChatAlt2 />
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((chat) => (
            <div
  key={chat._id}
  className={`${s.conversationItem} ${
    activeChat?._id === chat._id ? s.conversationItemActive : ""
  }`}
  onClick={() => setActiveChat(chat)}
>

<div className={s.avatar}>
  {user.role === "seller" ? (
    chat.buyer?.profilePic ? (
      <img
        src={chat.buyer.profilePic}
        alt={chat.buyer.name}
        className={s.avatarImg}
      />
    ) : (
      chat.buyer?.name?.charAt(0).toUpperCase()
    )
  ) : (
    chat.seller?.profilePic ? (
      <img
        src={chat.seller.profilePic}
        alt={chat.seller.name}
        className={s.avatarImg}
      />
    ) : (
      chat.seller?.name?.charAt(0).toUpperCase()
    )
  )}
</div>

<div className={s.conversationInfo}>
  <div className={s.conversationName}>
    {user.role === "seller"
      ? chat.buyer?.name
      : chat.seller?.name}
  </div>

  <div className={s.conversationPreview}>
    {chat.lastMessage?.text || "Start conversation"}
  </div>
</div>


  <button
    onClick={(e) => handleDeleteChat(e, chat._id)}
    className={s.deleteChatButton}
  >
    <HiOutlineTrash />
  </button>
</div>

            ))
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className={s.chatArea}>
        {activeChat ? (
          <>
            <div className={s.chatHeader}>
              <button onClick={() => setActiveChat(null)}>
                <HiChevronLeft />
              </button>
              <div>{getChatPartner(activeChat)?.name}</div>
            </div>

            {/* messages */}
            <div className={s.messagesArea}>
              {messages.map((msg) => (

                <div
  key={msg._id}
  className={`${s.messageBubble} ${
    String(msg.sender?._id || msg.sender) === String(user?._id)
      ? s.messageOwn
      : s.messageOther
  }`}
>
  {/* ✅ Show image if present */}
  {msg.image && (
    <div className={s.messageImageWrapper}>
      <img src={msg.image} alt="property" className={s.messageImage} />
    </div>
  )}

  {/* ✅ Show text if present */}
  {msg.text && <div>{msg.text}</div>}

  {/* {String(msg.sender?._id || msg.sender) === String(user?._id) && (
    <button
      onClick={() => handleDeleteMessage(activeChat._id, msg._id)}
    >
      <HiOutlineTrash />
    </button>
  )} */}
</div>

               
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* input */}
            <form onSubmit={handleSendMessage} className={s.messageForm}>
        

               <textarea
    value={newMessage}
    onChange={(e) => setNewMessage(e.target.value)}
    placeholder="Type message..."
    className={s.messageInput}
    rows={3}   
  />
              <button type="submit" className={s.sendButton}>
                <HiPaperAirplane />
              </button>
            </form>
          </>
        ) : (
          <div>
            <HiOutlineChatAlt2 />
            <p>Select a chat</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessages;
