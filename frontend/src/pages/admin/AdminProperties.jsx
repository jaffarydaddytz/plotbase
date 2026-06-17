import  { useEffect, useState } from 'react'
import { adminPropertiesStyles as s } from '../../assets/dummyStyles'
import { useAuth } from '../../context/AuthContext'
import PropertyCard from '../../components/common/PropertyCard'
import axios from 'axios'
import API_URL from '../../config'
import { HiOutlineExternalLink, HiOutlineTrash } from 'react-icons/hi'
import { Link } from 'react-router-dom'

const AdminProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token , user} = useAuth();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/admin/properties`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const props = Array.isArray(res.data)
          ? res.data
          : res.data.properties || [];

        setProperties(props);
      } catch (error) {
        console.log("failed to load properties", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchProperties();
  }, [token]);



  
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this property?"))
      return;

    try {
      console.log("USER id ", user)
      console.log("USER ", token)
      await axios.delete(
        `${API_URL}/api/admin/properties/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setProperties((prev) => prev.filter((p) => p._id !== id));
    } catch (error) {
      
      console.log("failed to delete property", error);
  
      
    }
  };

  if (loading) {
    return (
      <div className={s.loaderFullPage}>
        <div className={s.loader}>
            Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={s.headerContainer}>
        <h1 className={s.pageTitle}>Property Moderation</h1>
        <p className={s.pageSubtitle}>
          Review and manage all property listings
        </p>
      </div>

      <div className={s.headerContainer}>
        {properties.length === 0 ? (
          <div className={s.emptyStateCard}>
            No properties pending moderation
          </div>
        ) : (
          <div className={s.propertiesGrid}>
            {properties.map((p) => (
              <PropertyCard
                key={p._id}
                property={p}
                renderActions={() => (
                  <div className={s.actionWrapper}>
                    <div className={s.sellerInfo}>
                      <div className={s.sellerName}>
                        Seller: {p.seller?.name || "unknown"}
                      </div>

                      <div className={s.sellerEmail}>
                        {p.seller?.email}
                      </div>

                      <div className={s.buttonGroup}>
                        <Link
                          to={`/property/${p._id}`}
                          className={s.viewLink}
                        >
                          <HiOutlineExternalLink size={16} />
                        </Link>

                        <button
                          onClick={() => handleDelete(p._id)}
                          className={s.deleteButton}
                        >
                          <HiOutlineTrash size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminProperties