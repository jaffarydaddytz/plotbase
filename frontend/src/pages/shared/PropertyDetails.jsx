
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { propertyDetailsStyles as s } from "../../assets/dummyStyles";
import Navbar from "../../components/common/Navbar";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import {
  HiBadgeCheck,
  HiCalendar,
  HiChatAlt,
  HiLocationMarker,
  HiTag,
} from "react-icons/hi";
import API_URL from "../../config";
import Loader from "../../components/common/Loader";

const PropertyDetails = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inquiry, setInquiry] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [inquiryStatus, setInquiryStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [project, setProject] = useState(null);
const [projectGeoJson, setProjectGeoJson] = useState(null);

const onEachFeature = (feature, layer) => {
  const { plotNumber, areaSqm, totalPrice, status } =
    feature.properties;

  layer.bindPopup(`
    <div>
      <strong>Plot: ${plotNumber}</strong><br />
      Area: ${areaSqm.toLocaleString()} sqm<br />
      Price: TZS ${totalPrice.toLocaleString()}<br />
      Status: ${status}
    </div>
  `);
};

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/property/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        console.log("Property details response:", res.data);
        setProperty(res.data.property);
        setSimilarProperties(res.data.similarProperties || []);

        const projectId = "6ab8f65acd0600753f7a92b6";

const projectRes = await axios.get(
  `${API_URL}/api/project/${projectId}`
);

console.log("Project response:", projectRes.data);

setProject(projectRes.data.project);
setProjectGeoJson(projectRes.data.plots);

        // if (user && user.role === "buyer") {
        //   const wishRes = await axios.get(`${API_URL}/api/wishlist`, {
        //     headers: { Authorization: `Bearer ${token}` },
        //   });

        //   const found = wishRes.data.some((item) => item.property?._id == id);
        //   setIsInWishlist(found);
        // }
        setLoading(false);
      } catch (err) {
        setError("Failed to load property details");
        console.log("error property", err);
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, user, token]);

  // to handle wishlist toggle
  const handleWishlistToggle = async () => {
    if (!user) return navigate("/login");
    try {
      if (isInWishlist) {
        await axios.delete(`${API_URL}/api/wishlist/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsInWishlist(false);
      } else {
        await axios.post(
          `${API_URL}/api/wishlist/${id}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setIsInWishlist(true);
      }
    } catch (err) {
      alert("failed to wishlist");
      console.log(err);
    }
  };

  //to handle inquiry submit
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    if (user.role !== "buyer") return alert("only buyers can send inquiries");
    setInquiryStatus({ ...inquiryStatus, loading: true });
    try {
      await axios.post(
        `${API_URL}/api/inquiry`,
        {
          propertyId: id,
          message: inquiry.message,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setInquiryStatus({ loading: false, success: true, error: null });
      setInquiry({ ...inquiry, message: "" });
    } catch (err) {
      console.log(err);
      setInquiryStatus({
        loading: false,
        success: false,
        error: "failed to send inquiry",
      });
    }
  };

  //to start a chat
  const handleChatStart = async () => {
    console.log("CHAT BTN CLICKED");

    if (!user) return navigate("/login");
    if (user.role !== "buyer") {
      alert("Only buyers can chat with sellers");
      return;
    }

    try {
      // 1. Start or fetch chat
      const res = await axios.post(
        `${API_URL}/api/chat/start`,
        {
          propertyId: id,
          sellerId: property.seller._id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const chat = res.data;

      // 2. First message: property info + image
      await axios.post(
        `${API_URL}/api/chat/send`,
        {
          chatId: chat._id,
          text: `🏡 ${property.title}\n💰 Bei: ${property.price}`,
          image: property.images[0],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // 3. Second message: greeting only
      await axios.post(
        `${API_URL}/api/chat/send`,
        {
          chatId: chat._id,
          text: `Hujambo ${property.seller.name.charAt(0).toUpperCase()}${property.seller.name.slice(1).toLowerCase()}! `,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // 4. Navigate to messages view
      navigate("/messages", { state: { chat } });
    } catch (err) {
      console.error(
        "Error starting chat:",
        err.response?.data?.message || err.message,
      );
    }
  };

  if (loading) {
  return <Loader />;
}


  if (error || !property)
    return (
      <div
        className="container"
        style={{ padding: "4rem", textAlign: "center" }}
      >
        {error || "property not found"}
      </div>
    );

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(property.price);

  return (
    <div className={s.pageContainer}>
      <Navbar />

{/* Project Map */}
{projectGeoJson && (
  <div className="mt-4">
    <div
      style={{
        height: "400px",
        width: "100%",
      }}
    >
      <MapContainer
        center={[-5.0727, 30.2298]}
        zoom={17}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

     <GeoJSON
  data={projectGeoJson}
  onEachFeature={onEachFeature}
  style={(feature) => {
    const status = feature.properties?.status;

    if (status === "SOLD") {
      return {
        color: "green",
        fillColor: "green",
        fillOpacity: 0.5,
        weight: 2,
      };
    }

    if (status === "RESERVED") {
      return {
        color: "orange",
        fillColor: "orange",
        fillOpacity: 0.5,
        weight: 2,
      };
    }

    return {
      color: "#3388ff",
      fillColor: "#3388ff",
      fillOpacity: 0.5,
      weight: 2,
    };
  }}
/>
      </MapContainer>
    </div>
  </div>
)}

{/* Project Description & Summary */}
{project && projectGeoJson && (
  <div className="mt-4 rounded-lg bg-white p-5 shadow">

    {/* Project title */}
    <h3 className="text-xl font-semibold">
      {project.title}
    </h3>

    {/* Description */}
    <p className="mt-2 text-gray-600">
      {project.description}
    </p>

    {/* Summary */}
    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">

      {/* Location */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Location
        </p>

        <p className="mt-1 font-semibold">
          {project.location}
        </p>
      </div>

      {/* Total */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Total Plots
        </p>

        <p className="mt-1 text-xl font-semibold">
          {projectGeoJson.features.length}
        </p>
      </div>

      {/* Available */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Available
        </p>

        <p className="mt-1 text-xl font-semibold">
          {
            projectGeoJson.features.filter(
              (feature) =>
                feature.properties.status === "AVAILABLE"
            ).length
          }
        </p>
      </div>

      {/* Sold */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Sold
        </p>

        <p className="mt-1 text-xl font-semibold">
          {
            projectGeoJson.features.filter(
              (feature) =>
                feature.properties.status === "SOLD"
            ).length
          }
        </p>
      </div>
    </div>
  </div>
)}

{/* Project Plots Table */}
{projectGeoJson?.features?.length > 0 && (
  <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">

    <div className="border-b px-5 py-4">
      <h3 className="text-lg font-semibold">
        Project Plots
      </h3>

      <p className="text-sm text-gray-500">
        {projectGeoJson.features.length} plots in this project
      </p>
    </div>

    {/* Scrollable table */}
    <div className="max-h-96 overflow-y-auto overflow-x-auto">
      <table className="w-full text-left text-sm">

        <thead className="sticky top-0 z-10 bg-gray-100">
          <tr>
            <th className="px-5 py-3 font-semibold">
              Plot
            </th>

            <th className="px-5 py-3 font-semibold">
              Size
            </th>

            <th className="px-5 py-3 font-semibold">
              Price
            </th>

            <th className="px-5 py-3 font-semibold">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {projectGeoJson.features.map((feature) => {
            const {
              plotNumber,
              areaSqm,
              totalPrice,
              status,
            } = feature.properties;

            return (
              <tr
                key={feature.properties.id}
                className="border-t hover:bg-gray-50"
              >
                <td className="px-5 py-3 font-medium">
                  {plotNumber}
                </td>

                <td className="px-5 py-3">
                  {areaSqm.toLocaleString()} sqm
                </td>

                <td className="px-5 py-3">
                  TZS {totalPrice.toLocaleString()}
                </td>

                <td className="px-5 py-3">
                  {status}
                </td>
              </tr>
            );
          })}
        </tbody>

      </table>
    </div>
  </div>
)}




      <div className="bg-white shadow-md border border-gray-200 rounded-lg mt-11">
        <div className=" p-2">
          <div className="flex items-center justify-between">
            <h3 className={s.propertyTitle}>{property.title}</h3>
          </div>

          {/* left & right section */}

          <div className="grid grid-cols-1 lg:grid-cols-12  gap-6 ">
            <div className="lg:col-span-5   rounded-sm">
              {/* top */}
            <div className="flex flex-row justify-between gap-3 sm:flex-row border border-gray-200 sm:flex-wrap my-2 p-1 sm:border-0 sm:p-0">
  <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
    <HiTag />
    <span>
      {property.status?.toLowerCase() === "rent"
        ? `TZS${Number(property.price).toLocaleString("en-IN")}`
        : formattedPrice}

      {property.status?.toLowerCase() === "rent" && (
        <span className={s.priceCardPeriod}> /month</span>
      )}
    </span>
  </span>

  <p className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
    <HiLocationMarker />
    <span>{property.city}</span>
      
  </p>

  <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
    <HiCalendar />
    <span>
      {new Date(property?.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}
    </span>
  </span>
</div>

              {/* description */}

              <div>
                <div className={s.descriptionSection}>
                  <div>
                    <h3 className={s.sectionTitle}> Description</h3>
                  </div>

                  <p className={s.descriptionText}>
                    {" "}
                    {property.description ||
                      "no description for this property"}{" "}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6  p-1 rounded-sm ">
              <div className="   ">
                <div className=" relative">
                  <img
                    src={property.images[0]}
                    alt="property image"
                    className={s.galleryImage}
                  />

                  <span
    style={{
      position: "absolute",
      top: "12px",
      left: "12px",
      backgroundColor: "#10B981",
      color: "white",
      padding: "4px 20px",
      borderRadius: "9999px",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "capitalize",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    }}
  >
    {property.propertyType}
  </span>




                </div>

                <div className="w-full flex justify-center mt-4 px-2">
                  <div className={s.sellerCard}>
                    <div className={s.sellerInfo}>
                      <div className={s.sellerAvatar}>
                        <img
                          src={
                            property.seller?.profilePic ||
                            `https://ui-avatars.com/api/?name=${property.seller?.name || "Seller"}&background=0d6e59&color=fff`
                          }
                          alt="Agent"
                          className={s.sellerAvatarImage}
                        />
                      </div>
                      <div className={s.sellerDetails}>
                        <div className={s.sellerNameLink}>
                          <h4 className={s.sellerName}>
                            {property.seller?.name || "Seller"}
                          </h4>
                        </div>
                        <div className={s.sellerVerifiedBadge}>
                          <HiBadgeCheck className={s.verifiedIcon} /> Verified
                          Seller
                        </div>
                      </div>
                    </div>

                    <div className={s.chatButtonWrapper}>
                      <button
                        className={s.chatButton}
                        onClick={handleChatStart}
                      >
                        <HiChatAlt /> Chat
                      </button>
                    </div>

                    {/* Inquiry Form */}
                    {/* <h4 className={s.inquiryFormTitle}>Inquire</h4>
              <form onSubmit={handleInquirySubmit}>
                {user?.role === "buyer" ? (
                  <>
                    <textarea
                      placeholder="Your Message..."
                      value={inquiry.message}
                      onChange={(e) =>
                        setInquiry({ ...inquiry, message: e.target.value })
                      }
                      className={s.inquiryTextarea}
                      required
                    />
                    <button
                      type="submit"
                      className={s.inquirySubmitButton}
                      disabled={inquiryStatus.loading}
                    >
                      {inquiryStatus.loading ? "Sending..." : "Send Inquiry"}
                    </button>
                    {inquiryStatus.success && (
                      <p className={s.inquirySuccessMessage}>Inquiry sent!</p>
                    )}
                  </>
                ) : (
                  <div className={s.inquiryDisabledMessage}>
                    <p className={s.inquiryDisabledText}>
                      {user
                        ? "Only buyers can send inquiries."
                        : "Please login as a buyer to send inquiries."}
                    </p>
                    {!user && (
                      <Link to="/login" className={s.inquiryLoginButton}>
                        Login
                      </Link>
                    )}
                  </div>
                )}
              </form> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
