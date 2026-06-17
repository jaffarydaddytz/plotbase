import React, { useEffect, useState } from "react";
import { landingPageStyles as s } from "../../assets/dummyStyles";
import Navbar from "../../components/common/Navbar";
import {FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter} from 'react-icons/fa'
import {
  HiCurrencyDollar,
  HiHome,
  HiLightningBolt,
  HiLocationMarker,
  HiMail,
  HiOfficeBuilding,
  HiOutlineLocationMarker,
  HiPhone,
  HiSearch,
  HiShieldCheck,
  HiVideoCamera,
} from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import banner from '../../assets/image.jpeg'
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

  useEffect(() => {
    fetchProperties();
    fetchCounts();
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  //to fetchwishlist
  const fetchWishlist = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/wishlist`, {
        header: { Authorization: `Bearer ${token}` },
      });

      setWishlistedIds(
        res.data
          .filter((item) => item.property)
          .map((item) => String(item.property._id)),
      );
    } catch (err) {
      console.error("failed to fetch wishlist", err);
    }
  };

  //to remove wishlist
  const handleToggleWishlist = async (propertyId) => {
    try {
      const isWishlisted = wishlistedIds.includes(propertyId);
      if (isWishlisted) {
        await axios.delete(`${API_URL}/api/wishlist$(propertyId)`, {
          header: { Authorization: `Bearer ${token}` },
        });
        setWishlistedId((prev) => prev.filter((id) => id !== propertyId));
      } else {
        await axios.post(
          `${API_URL}/api/wishlist/${propertyId} `,
          {},
          {
            header: { Authorization: `Bearer ${token}` },
          },
        ); // to add
        setWishlistedIds((prev) => [...prev, propertyId]);
      }
    } catch (err) {
      console.error("failed to toggle wishlist", err);
    }
  };

  //to fetch counts
  const fetchCounts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/property/counts`);
      if (res.data.success) {
        setPropertyCount(res.data.counts);
      }
    } catch (err) {
      console.error("failed to fetch property counts", err);
    }
  };

  //to search properties

  const fetchProperties = async (search = "") => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/property?city=${search}`);
      setProperties(res.data.properties || res.data || []);
      setError(null);
    } catch (err) {
      setError("failed to load properties, please try again");
    } finally {
      setLoading(false);
    }
  };

  //handlesearch
  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.append("city", searchTerm);
    if (propertyType !== "select Type") params.append("type ", propertyType);
    navigate(`/properties?${params.toString()}`);
  };

  //categories
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
      name: "commercial",
      count: propertyCounts.commercial || 0,
      icon: <HiOfficeBuilding size={32} />,
      type: "commercial",
    },
  ];

  const features = [
    {
      title: "verified Trust",
      desc: "Every listing is stringly audited for ownership, condition, and legality",
      icon: <HiShieldCheck size={24} />,
    },
    {
      title: "smart Search",
      desc: "Our AI-driven algorithmns help youfind the best matches based on preferences.",
      icon: <HiLightningBolt size={24} />,
    },
    {
      title: "Best Value",
      desc: "direct-from-owner listings and zero-comission options to ensure competitive price",
      icon: <HiCurrencyDollar size={24} />,
    },
    {
      title: "Virtual Tours",
      desc: "High-definition   3D tours allow you to experience the property from home.",
      icon: <HiVideoCamera size={24} />,
    },
  ];

  return (
    <div className={s.bgMain}>
      <Navbar />

      {/* hero section */}
      <section className={s.heroSection}>
        <div className={s.heroContent}>
          <span className={s.badge}>Trusted by 20,000+ investors </span>
          <h1 className={s.heroTitle}>
            Find your <span className={s.textGradient}>Perfect</span> Next
            Chapter.
          </h1>
          <p className={s.heroSubtitle}>
            Experience the most advanced real estate search platfrom. Discover
            verified listings, connect with top Real Estate Companies, and find
            Residential and Farm Plots you deserve.
          </p>

          <form onSubmit={handleSearch} className={s.searchForm}>
            <div className={s.searchField}>
              <div className={s.textPrimary}>
                <HiLocationMarker size={26} />
              </div>

              <div className={s.flexCol}>
                <label className={s.labelSmall}>Location</label>
                <input
                  type="text"
                  placeholder="where are you looking"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={s.inputTransparent}
                />
              </div>

              <div className={s.searchDivider}></div>

              <div className={s.searchField}>
                <div className={s.textPrimary}>
                  <HiHome size={26} />
                </div>

                <div className={s.flexCol}>
                  <label className={s.labelSmall}>Property Type</label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className={`${s.inputTransparent} cursor-pointer`}
                  >
                    <option value="Select Type">Select Type</option>
                    <option value="flat">Flat</option>
                    <option value="villa">Villa</option>
                    <option value="penthouse">Penthouse</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
              </div>

              <button type="submit" className={s.searchButton}>
                <HiSearch size={22} /> Search
              </button>
            </div>
          </form>

          {/* stats */}
          <div className={s.statsContainer}>
          <div className={s.statItemFlex}>
            <h3 className={s.statsNumber}>12k+</h3>
            <p className={s.statLabel}>Ready Properties</p>
          </div>

          <div className={s.statItemBorder}>
            <h3 className={s.statsNumber}>500+</h3>
            <p className={s.statLabel}>Companies</p>
          </div>

           <div className={s.statItemBorder}>
            <h3 className={s.statsNumber}>4.9/5</h3>
            <p className={s.statLabel}>Investors Rating</p>
          </div>
        </div>
        </div>

              {/* hero image */}
          <div className={s.heroImageContainer}>
            <div className={s.imageWrapper}>
              <img src={banner} alt="banner" className={s.heroImage}/>

              <div className={s.verifiedBadge}>
                <div className={s.badgeIconWrapper}>
                  <HiShieldCheck size={24} className="text-primary" />

                </div>
                
              <h4 className={s.badgeTitle}>Verified Plots  </h4>
              <p className={s.badgeText}>Inspected by plotbaseXperts</p>

              </div>

            </div>

         

          </div>
      </section>


      {/* category section */}

      <section className={s.categorySection}>
        <div className={s.container}>
          <div className={s.categoryHeader}>
            <div className={s.categoryHeaderText}>
              <h2 className={s.categoryTitle}> Browse by Category</h2>
              <p>
                Explore curated collection of properties tailored to your specific  lifestyle and needs
              </p>

            </div>

          </div>

          <div className={s.categoryGrid}>
            {
              categories.map((cat, idx)=> (
              <div key={idx} className={s.categoryCard} onClick={()=> navigate(`/properties?type=${cat.type}`)} > 
              <div className={s.categoryIconWrapper}>
                {cat.icon} </div>
                <h3 className={s.categoryName}>{cat.name}</h3>
                <p className={s.categoryCount}>{cat.count.toLocaleString()} Properties</p>

             
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* Feature Sections */}
      <section className={s.featuredSection}>
        <div className={s.featuresContainer}>
          <div className={s.featuresList}>
            {
              features.map((f, idx) => (
                <div key={idx} className={s.featureCard} style={{animationDelay: `${idx * 0.1}s`}}>
                  <div className={s.featureIconWrapper}>
                    {f.icon}

                  </div>
                  <h3 className={s.featureTitle}>{f.title}</h3>
                  <p className={s.featureDesc}>{f.desc}</p>


                </div>
              ))
            }

          </div>

          <div className={s.featuresContent}>
            <h2 className={s.featuresHeading}>Why Plotbase <br/> is the <span className={s.textGradient}> Preffered Choice </span>    </h2>

            <p className={s.featuresSubtext}>
              we've reinveted the property search from the ground up. By focusing on transpareny, technological precision, and user-centeric design, we help you find plot you need.

            </p>

            <ul className={s.featuresListItems}>
              {
                [
                  "Direct connection with certified agents",
                  "Real-time market valuation data",
                  "Secure document management system",
                  "24/7 Premium customer support",
                ].map((item, idx)=> (
                  <li key={idx} className={s.listItem}>
                    <HiLightningBolt className="text-primary" />{item}

                  </li>
                ))
              }

            </ul>

            <a href="#process" className={s.learnMoreLink}> Learn More about our process &rarr; </a>

          </div>

        </div>

      </section>


      {/* How it works  */}

      <section id="process" className={s.processSection}>
        <div className={s.container}>
          <div className={s.processHeader}>
            <span className={s.processBadge}> How it works

            </span>

            <h2 className={s.processTitle}>
              Our seamless <span className={s.textGradient}>Process</span>

            </h2>

            <p className={s.processSubtitle}>
              We've simplified thejourney of finding your dream plot into three clear, stress-free steps

            </p>

          </div>

          <div className={s.processGrid}>
            
            {[
              {
                step: "01",
                title: "Smart Search",
                desc: "Leverage our AI-driven Smart Search algorithms to find the best property matches tailored to your specific preferences.",
                icon: <HiLightningBolt size={32} />,
              },
              {
                step: "02",
                title: "Virtual Tours",
                desc: "Experience your future home from anywhere with our high-definition 3D virtual tours and immersive walkthroughs.",
                icon: <HiVideoCamera size={32} />,
              },
              {
                step: "03",
                title: "Verified Trust",
                desc: "Every listing is strictly audited for ownership and condition, ensuring your peace of mind and a secure transaction.",
                icon: <HiShieldCheck size={32} />,
              },
            ].map((p, idx) => (

              <div key={idx} className={s.processCard}>
                <div className={s.stepNumber}>{p.step}</div>
                <div className={s.processIconWrapper}> {p.icon}</div>
                <h3 className={s.processCardTitle}>{p.title}</h3>
                <p className={s.processCardDesc}> {p.desc} </p>

              </div>
      
            ))}
        
          </div>

        </div>

      </section>

      {/* feature collection */}
      <section className={s.featuredSection}>
        <div className={s.container}>
          <div className={s.featuredHeader}>
            <span className={s.featuredBadge}>Handpicked For You</span>
            <h2 className={s.featureTitle}> 
              Featured collections
               </h2>
               <p className={s.featuredSubtitle}>
                Discover high-value properties curated by our experts for their exceptional design, location, and investment potential.

               </p>

          </div>

          {loading ? (
            <div className={s.loadingContainer}>
              <div className={s.loader}> 

              </div>

            </div>
          ): error ? (
            <div className={s.errorContainer}>
              <p>
                {error}
              </p>

            </div>
          ): (
            <div className={s.propertiesGrid}> 
             {properties
                .filter((p) => p)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 6)
                .map((property) => (
                  <PropertyCard
                    key={property._id}
                    property={property}
                    isWishlisted={wishlistedIds.includes(String(property._id))}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}


            </div>
          )}


          <div className={s.discoverButtonContainer}>
            <button onClick={()=> navigate("/properties")} className={s.discoverButton}>
              Discover More Plots

            </button>

          </div>

        </div>

      </section>

      {/* footer */}
      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerMainGrid}>
            <div className={s.footerBrand}>
              <div >
                <div >
                  plotbase
                </div>
                <p>
                  The most trusted platform for buying residential and agricultural plots. We make plots hunting seamless
                </p>

                <div className={s.socialIcons}>
                  {
                    [FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn].map((Icon, idx) =>(

                      <a href="#" key={idx} className={s.socialIcon}>
                        <Icon size={16} />
                      </a>
                    ))
                  }

                </div>
              </div>



              
            </div>

{/* Column 2: Quick Links */}
            <div>
              <h4 className={s.footerHeading}>Company</h4>
              <ul className={s.footerLinks}>
                <li>
                  <a href="/" className={s.footerLink}>
                    Home
                  </a>
                </li>
                <li>
                  <a href="/properties" className={s.footerLink}>
                    Property
                  </a>
                </li>
                <li>
                  <a href="/wishlist" className={s.footerLink}>
                    Wishlist
                  </a>
                </li>
                <li>
                  <a href="/contact" className={s.footerLink}>
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact Info */}
            <div>
              <h4 className={s.footerHeading}>Support</h4>
              <ul className={s.footerLinks}>
                <li className={s.contactInfo}>
                  <HiMail className="text-primary text-xl" />{" "}
                 info@plotbase.co.tz
                </li>
                <li className={s.contactInfo}>
                  <HiPhone className="text-primary text-xl" /> +255 785 907 500
                </li>
                <li className={s.contactInfoStart}>
                  <HiLocationMarker
                    className={`text-primary ${s.contactIcon}`}
                  />
                  Goba, dsm
                </li>
              </ul>
            </div>

            {/* column 4 */}

            <div>
              <h4 className={s.footerHeading}>
                Newsletter
              </h4>

              <p className={s.newsletterDesc}>
                subscribe to get the latest listings and market insights, directly in your inbox

              </p>

              <div className={s.newsletterInputWrapper}>
                <input type="email" placeholder="Enter your email" className={s.newsletterInput}/>

                <button className={s.newsletterButton}>
                  Join

                </button>

              </div>
            </div>





          </div>

{/* bottom bar */}
<div className={s.bottomBar}>
  <div className={s.bottomBarFlex}>
    <p>
      &copy; {new Date().getFullYear()} plotbase Technologies. All rights reserved
    </p>

    <div className={s.footerLegalLinks}>
      <a href="#" className={s.footerLink}>Privacy Policy</a>
          <a href="#" className={s.footerLink}>Terms of service</a>

    <a href="#" className={s.footerLink}>Cookies Settings</a>


    </div>

  </div>

</div>

        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
