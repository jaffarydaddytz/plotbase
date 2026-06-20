import { useEffect, useState } from "react";
import { landingPageStyles as s } from "../../assets/dummyStyles";
import Navbar from "../../components/common/Navbar";
import {

} from "react-icons/fa";
import {
 
  HiHome,
 
  HiOfficeBuilding,
  HiSearch,
  
} from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import banner from "../../assets/image.jpeg";
import PropertyCard from "../../components/common/PropertyCard";
import axios from "axios";
import API_URL from "../../config";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [propertyType, setPropertyType] = useState("select");

  const [propertyCounts, setPropertyCount] = useState({
    flat: 0,
    villa: 0,
    penthouse: 0,
    commercial: 0,
  });

  const [wishlistedIds, setWishlistedId] = useState([]);

  // ========================
  // LOAD MAIN DATA
  // ========================
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const [propertiesRes, countsRes] = await Promise.all([
          axios.get(`${API_URL}/api/property`),
          axios.get(`${API_URL}/api/property/counts`),
        ]);

        if (!isMounted) return;

        setProperties(
          propertiesRes.data.properties || propertiesRes.data || []
        );
        setPropertyCount(countsRes.data.counts);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError("failed to load properties, please try again");
        console.log("failed api/property", err.response.data);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ========================
  // LOAD WISHLIST
  // ========================
  useEffect(() => {
    if (!user || !token) return;

    let isMounted = true;

    const fetchWishlist = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/wishlist`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isMounted) return;

        setWishlistedId(
          res.data
            .filter((item) => item.property)
            .map((item) => String(item.property._id))
        );
      } catch (err) {
        console.log("failed to fetch wishlist", err.response.data.message);
      }
    };

    fetchWishlist();

    return () => {
      isMounted = false;
    };
  }, [user, token]);

  // ========================
  // TOGGLE WISHLIST
  // ========================
  const handleToggleWishlist = async (propertyId) => {
    try {
      const isWishlisted = wishlistedIds.includes(propertyId);

      if (isWishlisted) {
        await axios.delete(
          `${API_URL}/api/wishlist/${propertyId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setWishlistedId((prev) =>
          prev.filter((id) => id !== propertyId)
        );
      } else {
        await axios.post(
          `${API_URL}/api/wishlist/${propertyId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setWishlistedId((prev) => [...prev, propertyId]);
      }
    } catch (err) {
      console.error("failed to toggle wishlist", err);
    }
  };

  // ========================
  // SEARCH
  // ========================
  const handleSearch = (e) => {
    e.preventDefault();

    const params = new URLSearchParams();

    if (searchTerm) params.append("city", searchTerm);
    if (propertyType !== "select") params.append("type", propertyType);

    navigate(`/properties?${params.toString()}`);
  };

  // ========================
  // UI DATA
  // ========================
  const categories = [
    {
      name: "Modern Flats",
      count: propertyCounts.flat || 0,
      icon: <HiOfficeBuilding size={32} />,
      type: "flat",
    },
    {
      name: "Luxury Villas",
      count: propertyCounts.villa || 0,
      icon: <HiHome size={32} />,
      type: "villa",
    },
    {
      name: "Penthouse",
      count: propertyCounts.penthouse || 0,
      icon: <HiOfficeBuilding size={32} />,
      type: "penthouse",
    },
    {
      name: "Commercial",
      count: propertyCounts.commercial || 0,
      icon: <HiOfficeBuilding size={32} />,
      type: "commercial",
    },
  ];

  return (
    <div className={s.bgMain}>
      <Navbar />

      {/* HERO */}
      <section className={s.heroSection}>
        <div className={s.heroContent}>
          {/* <span className={s.badge}>
            Trusted by 20,000+ investors
          </span> */}

          <h1 className={s.heroTitle}>
            Find your <span className={s.textGradient}>Perfect</span> Next Chapter
          </h1>

          <p className={s.heroSubtitle}>
            Discover verified real estate listings and invest with confidence.
          </p>

          {/* SEARCH */}
          <form onSubmit={handleSearch} className={s.searchForm}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Location"
              className={s.inputTransparent}
            />

            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={s.inputTransparent}
            >
              <option value="select">Select Type</option>
              <option value="flat">Flat</option>
              <option value="villa">Villa</option>
              <option value="penthouse">Penthouse</option>
              <option value="commercial">Commercial</option>
            </select>

            <button className={s.searchButton}>
              <HiSearch size={20} /> Search
            </button>
          </form>
        </div>

        <div className={s.heroImageContainer}>
          <img src={banner} alt="banner" className={s.heroImage} />
        </div>
      </section>

      {/* CATEGORIES */}
      <section className={s.categorySection}>
        <div className={s.categoryGrid}>
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className={s.categoryCard}
              onClick={() =>
                navigate(`/properties?type=${cat.type}`)
              }
            >
              {cat.icon}
              <h3>{cat.name}</h3>
              <p>{cat.count} Properties</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROPERTIES */}
      <section className={s.featuresSection}>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>{error}</p>
        ) : (
          <div className={s.propertiesGrid}>
            {properties
              .slice(0, 6)
              .map((property) => (
                <PropertyCard
                  key={property._id}
                  property={property}
                  isWishlisted={wishlistedIds.includes(
                    String(property._id)
                  )}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className={s.footer}>
        <p>© {new Date().getFullYear()} Plotbase</p>
      </footer>
    </div>
  );
};

export default LandingPage;