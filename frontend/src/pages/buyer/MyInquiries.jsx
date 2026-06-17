import  { useEffect, useState } from 'react';
import { myInquiriesStyles as s } from '../../assets/dummyStyles';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import API_URL from '../../config';
import {
  HiCalendar,
  HiChatAlt2,
  HiCheckCircle,
  HiExternalLink,
  HiHome,
  HiMail,
  HiOutlineChatAlt2,
  HiPhone,
  HiUser
} from 'react-icons/hi';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';

const MyInquiries = () => {
  const { user, token } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // =========================
  // FETCH INQUIRIES
  // =========================
  useEffect(() => {
    const fetchInquiries = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const endpoint = user?.role === "seller" ? "seller" : "my";

        const res = await axios.get(
          `${API_URL}/api/inquiry/${endpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        console.log("API RESPONSE:", res.data);

        const response = res.data;

        // ✅ SAFE NORMALIZATION (fix map crash forever)
        let formatted = [];

        if (Array.isArray(response)) {
          formatted = response;
        } else if (Array.isArray(response?.data)) {
          formatted = response.data;
        } else if (Array.isArray(response?.inquiries)) {
          formatted = response.inquiries;
        } else {
          formatted = [];
        }

        setInquiries(formatted);
      } catch (error) {
        console.error("error fetching inquiries", error);
        setError(error.response?.data?.message || "Failed to fetch inquiries");
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
  }, [user, token]);

  // =========================
  // MARK AS READ
  // =========================
  const markRead = async (id) => {
    try {
      await axios.patch(
        `${API_URL}/api/inquiry/${id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setInquiries((prev) =>
        Array.isArray(prev)
          ? prev.map((inq) =>
              inq._id === id ? { ...inq, isRead: true } : inq
            )
          : []
      );
    } catch (error) {
      console.error("failed to mark read", error);
    }
  };

  // =========================
  // START CHAT
  // =========================
  const handleStartChat = async (inq) => {
    try {
      const res = await axios.post(
        `${API_URL}/api/chat/start`,
        {
          propertyId: inq.property?._id,
          buyerId: inq.buyer?._id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      navigate('/chat-messages', {
        state: { chat: res.data }
      });
    } catch (error) {
      console.error("error starting chat", error);
      alert("Failed to start chat. Please try again later.");
    }
  };

  // =========================
  // LOADING STATE
  // =========================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // =========================
  // ERROR STATE
  // =========================
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  const isSeller = user?.role === "seller";

  return (
    <div className={user?.role !== "seller" ? s.bgBgAltMinH : s.bgTransparentHAuto}>
      {user?.role !== "seller" && <Navbar />}

      <div className={`${s.containerFadeIn} ${user?.role !== "seller" ? s.py12Pt12 : s.pt0}`}>
        
        {/* HEADER */}
        <div className={s.mb12}>
          <h1 className={s.heading}>
            {isSeller ? "customer inquiries" : "my inquiries"}
          </h1>
          <p className={s.textMuted}>
            {isSeller
              ? "Review and respond to interest in your properties"
              : "Track the status of your property inquiries"}
          </p>
        </div>

        {/* EMPTY STATE */}
        {(!Array.isArray(inquiries) || inquiries.length === 0) ? (
          <div className={s.cardPremiumPy16Px8TextCenter}>
            <div className={s.iconContainer}>
              <HiOutlineChatAlt2 size={40} />
            </div>

            <h2 className={s.mb4}>
              No inquiries {isSeller ? "received" : "sent"}
            </h2>

            <p className={s.textDangerMb4}>
              {isSeller
                ? "You haven't received any inquiries yet."
                : "You haven't sent any inquiries yet."}
            </p>

            <Link to="/" className={s.btnPrimary}>
              {isSeller ? "improve my listings" : "Discover properties"}
            </Link>
          </div>
        ) : (
          // LIST
          <div className={s.flexColGap6}>

            {(Array.isArray(inquiries) ? inquiries : []).map((inq) => (
              <div key={inq._id} className={s.inquiryCard}>

                <div className={s.inquiryMain}>
                  <div className={s.iconWrapper}>
                    <HiHome className={s.iconSize} />
                  </div>

                  <div className={s.flex1}>

                    <div className={s.titleRow}>
                      <h3 className={s.titleText}>
                        {inq.property?.title}
                      </h3>

                      <span className={`${s.badge} ${inq.isRead ? s.badgeRead : s.badgeNew}`}>
                        {inq.isRead ? "READ" : "NEW"}
                      </span>
                    </div>

                    {/* SELLER INFO */}
                    {isSeller && (
                      <div className={s.buyerInfo}>
                        <div className={s.infoItem}>
                          <HiUser /> {inq.buyer?.name}
                        </div>
                        <div className={s.infoItem}>
                          <HiMail /> {inq.buyer?.email}
                        </div>
                        <div className={s.infoItem}>
                          <HiPhone /> {inq.buyer?.phone || "N/A"}
                        </div>
                      </div>
                    )}

                    <p className={s.message}>{inq.message}</p>

                    <div className={s.meta}>
                      <div>
                        <HiCalendar />{" "}
                        {new Date(inq.createdAt).toLocaleDateString()}
                      </div>

                      {!isSeller && (
                        <div>
                          <HiCheckCircle />{" "}
                          {inq.isRead ? "Seller Viewed" : "Waiting for seller"}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* ACTIONS */}
                <div className={s.actions}>

                  <Link
                    to={`/property/${inq.property?._id}`}
                    className={s.btnOutline}
                  >
                    View Property <HiExternalLink />
                  </Link>

                  {isSeller && !inq.isRead && (
                    <button
                      onClick={() => markRead(inq._id)}
                      className={s.btnPrimaryWhitespaceNowrap}
                    >
                      Mark as Read
                    </button>
                  )}

                  {isSeller && (
                    <button
                      onClick={() => handleStartChat(inq)}
                      className={s.btnMessage}
                    >
                      <HiChatAlt2 /> Message
                    </button>
                  )}

                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
};

export default MyInquiries;