import React from "react";
import { propertyCardStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { HiArrowsExpand, HiEye, HiHeart, HiLocationMarker, HiOutlineHeart, HiOutlineHome, HiOutlineUserGroup, HiShieldCheck } from "react-icons/hi";

const PropertyCard = ({
  property,
  renderActions,
  isWishlisted,
  onToggleWishlist,
}) => {
    console.log("porperty", property)
  if (!property) return null;

  const { user } = useAuth();
  const navigate = useNavigate();

  //for wishlist click
  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate("/login");
      return;
    }
    if (onToggleWishlist) {
      onToggleWishlist(property._id);
    }
  };



  const formattedPrice = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
}).format(property.price);

  const statusBadgeClass = s.badgeStatus(property.status);

  return (
    <div className={s.card}>
      <Link to={`/property/${property._id}`} className={s.link}>
        <div className={s.imageSection}>
          <img src={property.images} alt={property.title} className={s.image} />

          {/* Top Badges */}
          <div className={s.topBadges}>
            <div className={s.badgesLeft}>
              {renderActions ? (
                <span className={statusBadgeClass}>
                  {property.status === "sale" ? "available" : property.status}
                </span>
              ) : (
                <span className={s.badgeNew}>New</span>
              )}
              <span className={s.badgeVerified}>
                <HiShieldCheck size={14} /> Verified
              </span>
            </div>

            {!user ||
              user.role === "buyer" && (
                <button
                  className={s.wishlistButton(isWishlisted)}
                  onClick={handleWishlistClick}
                >
                  {isWishlisted ? (
                    <HiHeart size={20} />
                  ) : (
                    <HiOutlineHeart size={20} />
                  )}
                </button>
              )}

            {
                  console.log("user",user, user?.role)
            }
          </div>

          <div className={s.priceOverlay}>

            <h3 className={s.price}> {formattedPrice}</h3>
          </div>
        </div>

        <div className={s.content}>
          <div className="flex justify-between items-center">
            <span className={s.propertyType}> {property.propertyType} </span>
            {property.views !== undefined && (
              <div className={s.views}>
                <HiEye size={16} />
                {property.views}
              </div>
            )}
          </div>

          <h4 className={s.title}> {property.title}
          </h4>

          <div className={s.location}>
            <HiLocationMarker className={s.locationIcon} />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                {property.city}
            </span>

          </div>

          <div className={s.specsGrid}>
            {property.propertyType?.toLowerCase() === "commercial"?(
                  <>
                <div className={s.specItem}>
                  <div className={s.specIcon}>
                    <HiOutlineHome size={20} />
                  </div>
                  <div className={s.specValue}>{property.status}</div>
                  <div className={s.specLabel}>Type</div>
                </div>
                <div className={`${s.specItem} ${s.specDivider}`}>
                  <div className={s.specIcon}>
                    <HiArrowsExpand size={20} />
                  </div>
                  <div className={s.specValue}>{property.area}</div>
                  <div className={s.specLabel}>sq  ft</div>
                </div>
                <div className={s.specItem}>
                  <div className={s.specIcon}>
                    <HiShieldCheck size={20} />
                  </div>
                  <div className={s.specValue}>OK</div>
                  <div className={s.specLabel}>Legal</div>
                </div>
              </>
  
            ):(
                 <>
                <div className={s.specItem}>

                  <div className={s.specIcon}><HiOutlineHome size={20} /></div>
                  <div className={s.specValue}>{property.bhk}</div>
                  <div className={s.specLabel}>Beds</div>

                </div>

                <div className={`${s.specItem} ${s.specDivider}`}>
                  
                  <div className={s.specIcon}><HiOutlineUserGroup size={20} /></div>
                  <div className={s.specValue}>
                    {property.bathrooms ||
                      Math.max(1, parseInt(property.bhk) - 1 || 0)}
                  </div>
                  <div className={s.specLabel}>Baths</div>
                </div>



                <div className={s.specItem}>
                  <div className={s.specIcon}>
                    <HiArrowsExpand size={20} />
                  </div>
                  <div className={s.specValue}>{property.area}</div>
                  <div className={s.specLabel}>Sq Ft</div>
                </div>
              </>
            )}

          </div>
{/* view details action  */}
{
    !renderActions && (
        <div className={s.viewDetailsBtn}>
            <button className={s.viewDetailsBtn}>
                View Details

            </button>

        </div>
    )
}


        </div>
      </Link>

      {renderActions &&(
        <div onClick={(e)=>{
            e.preventDefault();
            e.stopPropagation();
        }}  
        onMouseDown={(e)=>e.stopPropagation() } className={s.actionsContainer}>

            {renderActions(property)}

        </div>
      )}
    </div>
  );
};

export default PropertyCard;