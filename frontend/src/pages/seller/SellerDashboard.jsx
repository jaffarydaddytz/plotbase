import  { useEffect, useState } from "react";
import { sellerDashboardStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";

import axios from "axios";
import API_URL from "../../config";

import {
    HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineLibrary,
  HiOutlinePencilAlt,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineUserGroup,
  HiPlus,
} from "react-icons/hi";

import { Link } from "react-router-dom";
import PropertyCard from "../../components/common/PropertyCard";

const SellerDashboard = () => {
  const { token } = useAuth();

  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    soldProperties: 0,
    totalInquiries: 0,
    totalViews: 0,
  });

  const [properties, setProperties] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, propsRes, inqRes] = await Promise.all([
          axios.get(`${API_URL}/api/property/seller/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/property/my`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/inquiry/seller`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStats(statsRes.data.stats || statsRes.data);

        const props = Array.isArray(propsRes.data)
          ? propsRes.data
          : propsRes.data.properties || [];

        setProperties(props);

        setInquiries(
          Array.isArray(inqRes.data.inquiries)
            ? inqRes.data.inquiries.slice(0, 3)
            : []
        );
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // DELETE PROPERTY
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?"))
      return;

    try {
      await axios.delete(`${API_URL}/api/property/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProperties((prev) => prev.filter((p) => p._id !== id));
    } catch (error) {
      console.error("Failed to delete property:", error);
      alert("Failed to delete property");
    }
  };

  // UPDATE STATUS
  const handleStatusUpdate = async (id, currentStatus) => {
    const newStatus =
      currentStatus === "sold" ? "available" : "sold";

    try {
      await axios.patch(
        `${API_URL}/api/property/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProperties((prev) =>
        prev.map((p) =>
          p._id === id ? { ...p, status: newStatus } : p
        )
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    }
  };

  // EXPORT CSV
  const handleExport = () => {
    const headers = [
      "Title",
      "Location",
      "Type",
      "Price",
      "Status",
      "Views",
    ];

    const rows = properties.map((p) => [
      p.title,
      `${p.area}, ${p.city}`,
      p.propertyType,
      p.price,
      p.status,
      p.views || 0,
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "property_listings.csv";
    a.click();
  };

 if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
    </div>
  );
}

  const statCards = [
    {
      title: "Total Views",
      value: stats.totalViews?.toLocaleString() || 0,
      icon: HiOutlineEye,
    },
    {
      title: "Active Leads",
      value: stats.totalInquiries?.toLocaleString() || 0,
      icon: HiOutlineUserGroup,
    },
    {
      title: "Live Listings",
      value: stats.activeListings?.toLocaleString() || 0,
      icon: HiOutlineLibrary,
    },
    {
      title: "Properties Sold",
      value: stats.soldProperties?.toLocaleString() || 0,
      icon: HiOutlineCheckCircle,
    },
  ];

  const filteredProperties = properties
    .filter((p) =>
      `${p.title || ""} ${p.city || ""} ${p.area || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

  return (
    <>
      <header className={s.header}>
        <div>
          <h1 className={s.headerTitle}>Seller Dashboard</h1>
          <p className={s.headerSubtitle}>
            Manage your property portfolio and track performance
          </p>
        </div>

        <div className={s.headerActions}>
          <button onClick={handleExport} className={s.exportButton}>
            <HiOutlineDownload size={20} /> Export
          </button>

          <Link to="/add-property" className={s.addButton}>
            <HiPlus size={20} /> Add New
          </Link>
        </div>
      </header>

      {/* STATS */}
      <div className={s.statsGrid}>
        {statCards.map((card, i) => (
          <div key={i} className={s.statCard}>
            <div className={s.statIconWrapper}>
              <card.icon size={20} />
            </div>
            <div className={s.statTitle}>{card.title}</div>
            <div className={s.statValue}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* LISTINGS */}
      <div className={s.listingsSection}>
        <div className={s.listingsHeader}>
          <h2 className={s.listingsTitle}>
            Property Listings
          </h2>

          <div className={s.searchWrapper}>
            <HiOutlineSearch className={s.searchIcon} />
            <input
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="Search listing..."
              className={s.searchInput}
            />
          </div>
        </div>

        {filteredProperties.length === 0 ? (
          <div className={s.emptyListings}>
            No Properties found matching "{searchTerm}"
          </div>
        ) : (
          <div className={s.propertiesGrid}>
            {filteredProperties.slice(0, 3).map((p) => (
              <PropertyCard
                key={p._id}
                property={p}
                renderActions={() => (
                  <div className={s.propertyActions}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(
                          p._id,
                          p.status
                        );
                      }}
                      className={s.statusButton(p.status)}
                      title={
                        p.status === "sold"
                          ? "Mark as available"
                          : "Mark as sold"
                      }
                    >
                      <HiOutlineCheckCircle size={14} />{" "}
                      {p.status === "sold"
                        ? "Available"
                        : "Sold"}
                    </button>

                    <Link
                      to={`/edit-property/${p._id}`}
                      className={s.editButton}
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      <HiOutlinePencilAlt size={14} /> Edit
                    </Link>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p._id);
                      }}
                      className={s.deleteButton}
                    >
                      <HiOutlineTrash size={14} /> Delete
                    </button>
                  </div>
                )}
              />
            ))}
          </div>
        )}
      </div>


      {filteredProperties.length > 3 && (
        <div className={s.showMoreWrapper}>
            <Link to="/my-properties" className={s.showMoreButton}>
            Show More Listing{" "}
            <HiOutlinePencilAlt size={18} style={{
                transform: "rotate(90deg)"
            }} />

            </Link>

        </div>
      )}


      <div className={s.widgetsGrid}>
        <div className={s.inquiriesWidget}>
            <h2 className={s.widgetTitle}>Recent Lead Inquiries</h2>
            <p className={s.widgetSubtitle}>
                New Message from potential buyers

            </p>

            <div className={s.inquiriesList}>
                {inquiries.map((inq)=> (
                    <div key={inq._id} className={s.inquiryItem}>
                        <div className={s.inquiryLeft}>
                            <div className={s.inquiryItem}>
                                {inquiries.map((inq) => (
                                    <div key={inq._id} className={s.inquiryItem

                                    }>

                                        <div className={s.inquiryLeft}>

                                            <div className={s.inquiryIcon}>
                                                <HiOutlineBell size={18} color="var(--primary)" />
                                                </div>

                                                <div>
                                                    <div className={s.inquiryName}>
                                                        {inq.buyer?.name || "Potential buyer"}

                                                    </div>

                                                    <div className={s.inquiryProperty}>
                                                        {inq.property?.title?.length > 30 ? inq.property?.title?.slice(0,30) + " ... " : inq.property?.title}

                                                    </div>
                                                </div>
        

                                        </div>



                                        <div className={s.inquiryRight}>
                                            <div className={s.inquiryDate}>
                                                {new Date(inq.createdAt).toLocaleDateString()}
                                                
                                            </div>

                                            <span className={s.inquiryStatus(inq.status)}>
                                                {inq.status === "read" ? "Read" : "New"}
                                            </span>

                                        </div>

                                    </div>
                                ))}


                            </div>

                        </div>

                    </div>
                ))}

                {inquiries.length === 0 && (
                    <p className={s.noInquiries}>
                        No Recent inquiries

                    </p>
                )}

            </div>


        </div>

        <div className={s.tipsWidget}>
            <h2 className={s.widgetsGrid}>Quick Tips</h2>
            <div className={s.tipsList}>
                <div className={s.tipCardHighViews}>
                    <h4 className={s.tipTitleHighViews}>
                        <HiOutlineEye size={16} /> High Views

                    </h4>

                    <p className={s.tipTextHighViews}>
                       Your listings are trending. Try adding video tours 

                    </p>
            



                </div>

<div className={s.tipCardMarket}>
    <h4 className={s.tipTitleMarket}>Market Insight</h4>
    <p className={s.tipTextMarket}>Properties in your area are selling fast</p>

</div>



            </div>

        </div>

      </div>
    </>
  );
};

export default SellerDashboard; 