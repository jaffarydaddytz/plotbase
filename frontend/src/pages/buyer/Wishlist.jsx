
import { useEffect, useState } from "react";
import { wishlistStyles as s } from "../../assets/dummyStyles"

import Navbar from "../../components/common/Navbar"
import PropertyCard from "../../components/common/PropertyCard"
import { useAuth } from "../../context/AuthContext"
import axios from "axios";
import API_URL from "../../config";
import { HiHeart, HiTrash } from "react-icons/hi";
import { Link } from "react-router-dom";
import Loader from "../../components/common/Loader";





const Wishlist = () => {
  const { token } = useAuth();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWishlist = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/wishlist`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isMounted) return;
        setWishlistItems(res.data);
      } catch (err) {
        if (!isMounted) return;
        console.log("wishlist error", err.response?.data?.message);
        setError("failed to load wishlist");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWishlist();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const removeFromWishlist = async (propertyId) => {
    if (!propertyId) {
      alert("invalid property id");
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/wishlist/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setWishlistItems((prev) =>
        prev.filter(
          (item) =>
            item.property && item.property._id !== propertyId
        )
      );
    } catch (err) {
      console.error(err);
      console.log("error removing wishlist", error)
    }
  };



  if (loading) {
  return (
    
    <Loader/>
   
  );
}


  return (
    <div className={s.pageContainer}>
      <Navbar />

      <main className={s.mainContainer}>
        <div className={s.headingWrapper}>
          <h1 className={s.heading}>Your Wishlist</h1>
          <p className={s.subheading}>
            Properties you've saved for later
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          <div className={s.emptyCard}>

            <div className={s.emptyIconWrapper}>
               <HiHeart size={40} />


            </div>
           

            <h2 className={s.emptyTitle}>
              Your wishlist is empty
            </h2>

            <p className={s.emptyText}>
              Start exploring properties and save your favorite
            </p>

            <Link to="/" className={s.browseButton}>
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className={s.gridContainer}>
            {wishlistItems
              .filter((item) => item.property)
              .map((item) => (
                <PropertyCard
                  key={item._id}
                  property={item.property}
                  renderActions={() => (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFromWishlist(item.property._id);
                      }}
                      className={s.removeButton}
                    >
                      <HiTrash size={18} /> Remove From wishlist
                    </button>
                  )}
                />
              ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Wishlist