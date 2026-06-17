import React from "react";
import { sellerSidebarStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import Logo from "./Logo";
import {
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineLogout,
  HiOutlineSupport,
  HiOutlineUser,
  HiOutlineViewGrid,
} from "react-icons/hi";
import { NavLink } from "react-router-dom";

const SellerSidebar = ({ isOpen, onClose }) => {
  const { logout } = useAuth();

  const navItems = [
    { name: "Dashboard", icon: HiOutlineViewGrid, path: "/dashboard" },
    { name: "My Listings", icon: HiOutlineClipboardList, path: "/my-properties" },
    { name: "Leads", icon: HiOutlineChartBar, path: "/inquiries" },
    { name: "Messages", icon: HiOutlineViewGrid, path: "/chat-messages" },
    { name: "Profile", icon: HiOutlineUser, path: "/profile" },
    { name: "Support", icon: HiOutlineSupport, path: "/contact" },
  ];

  return (
    <>
      <div
        className={`${s.backdrop} ${isOpen ? s.backdropVisible : s.backdropHidden}`}
        onClick={onClose}
      />

      <aside
        className={`${s.sidebar} ${isOpen ? s.sidebarOpen : s.sidebarClosed}`}
      >
        <div className={s.logoContainer}>
          <Logo fontSize="1.25rem" iconSize={20} />
        </div>

        <nav className={s.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `${s.navLink} ${isActive ? s.navLinkActive : ""}`
              }
            >
              <item.icon size={20} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className={s.logoutContainer}>
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className={s.logoutButton}
          >
            <HiOutlineLogout size={20} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default SellerSidebar;