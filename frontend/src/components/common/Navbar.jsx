
import { navbarStyles as s } from "../../assets/dummyStyles";
import Logo from "./Logo";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { HiMenuAlt3, HiX,  } from "react-icons/hi";
import { useState } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  // to toggle the menu for menu mobile
  const toggleMenu = () => setIsOpen(!isOpen);

  // navlinks
  const navLinks = (
    <>
      {(!user || user.role !== "buyer") && (
        <Link
          to="/properties"
          className={s.navLink}
          onClick={() => setIsOpen(false)}
        >
          Plots
        </Link>
      )}

      {user && user.role === "buyer" && (
        <>
          <Link to="/" className={s.navLink} onClick={() => setIsOpen(false)}>
            Home
          </Link>

          <Link
            to="/properties"
            className={s.navLink}
            onClick={() => setIsOpen(false)}
          >
            Plots
          </Link>

          <Link
            to="/wishlist"
            className={s.navLink}
            onClick={() => setIsOpen(false)}
          >
            Wishlist
          </Link>

          <Link
            to="/messages"
            className={s.navLink}
            onClick={() => setIsOpen(false)}
          >
            Messages
          </Link>

          <Link
            to="/contact"
            className={s.navLink}
            onClick={() => setIsOpen(false)}
          >
            Contact Us
          </Link>
        </>
      )}

      {!user && (
        <>
          <Link to="/login" onClick={() => setIsOpen(false)}>
            Login
          </Link>

          <Link to="/register" onClick={() => setIsOpen(false)}>
            Register
          </Link>
        </>
      )}

      {/* For Seller */}
      {user && user.role === "seller" && (
        <>
          <Link to="/seller/dashboard" onClick={() => setIsOpen(false)}>
            Dashboard
          </Link>
        </>
      )}

      {/* For Admin */}
      {user && user.role === "admin" && (
        <>
          <Link
            to="/admin-dashboard"
            className={s.navLink}
            onClick={() => setIsOpen(false)}
          >
            Admin Panel
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      <nav className={s.nav}>
        <div className={s.container}>
          <div className={s.grid}>
            <div className="justify-self-start">
              <Logo />
            </div>

            <div className={s.desktopMenu}>{navLinks}</div>

            {/* right side */}

            <div className={s.rightSection}>
              {user ? (
                <div className={s.userSection}>
                  <Link to="/profile" className="flex items-center">
                    <img
                      src={
                        user.profilePic ||
                        `https://ui-avatars.com/api/?name=${user.name}&background=0d6e59&color=fff`
                      }
                      alt="profile"
                      className={s.avatar}
                    />
                  </Link>
                  <button onClick={logout} className={s.logoutButton}>
                    Logout
                  </button>
                </div>
              ) : null}





              {/* mobile toggle */}
              <div className={s.mobileToggle} onClick={toggleMenu}>
                {isOpen ? <HiX size={28} /> : <HiMenuAlt3 size={28} />}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={s.backdrop(isOpen)}
        onClick={() => setIsOpen(false)}
      ></div>



      <div className={s.drawer(isOpen)}>
        <div className={s.drawerHeader}>
          <Logo onClick={() => setIsOpen(false)} />

          <HiX
            size={28}
            onClick={() => setIsOpen(false)}
            className={s.drawerCloseIcon}
          />
        </div>

        <div className={s.drawerNavLinks}>{navLinks}</div>

        {user && (
          <div className={s.drawerUserSection}>
            <div className={s.drawerUserInfo}>
              <img
                src={
                  user.profilePic ||
                  `https://ui-avatars.com/api/?name=${user.name}&background=0d6e59&color=fff`
                }
                alt="profile"
                className={s.drawerAvatar}
              />
              <div>
                <div className={s.drawerUserName}>{user.name}</div>
                <div className={s.drawerUserEmail}>{user.email}</div>
              </div>
            </div>

            <button onClick={logout} className={s.logout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;
