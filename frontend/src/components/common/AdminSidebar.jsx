import React from 'react'
import { adminSidebarStyles as s } from '../../assets/dummyStyles'
import { useAuth } from '../../context/AuthContext'
import Logo from '../common/Logo';
import { HiOutlineChatAlt2, HiOutlineLibrary, HiOutlineLogout, HiOutlineMail, HiOutlineUserCircle, HiOutlineUsers, HiOutlineViewGrid } from 'react-icons/hi';
import { NavLink } from 'react-router-dom';


const AdminSidebar = ({isOpen, onClose }) => {
const {logout} = useAuth();
const navItems = [
  { name: "Overview", icon: HiOutlineViewGrid, path: "/admin-dashboard" },
  { name: "Users", icon: HiOutlineUsers, path: "/admin/users" },
  {
    name: "Seller Requests",
    icon: HiOutlineUserCircle,
    path: "/admin/seller-requests",
  },
  { name: "Properties", icon: HiOutlineLibrary, path: "/admin/properties" },
  { name: "Inquiries", icon: HiOutlineChatAlt2, path: "/admin/inquiries" },
  { name: "Contact Inbox", icon: HiOutlineMail, path: "/admin/contacts" },
];

const handleClose = () => {
  console.log('handleClose called, width:', window.innerWidth);
  if (window.innerWidth < 768) {
    setIsSidebarOpen(false);
  }
};


  return (
   <>
    <div className={s.backdrop(isOpen)} onClick={onClose} />

    <aside className={s.sidebar(isOpen)}>
      <div className={s.logoContainer}>
        <Logo fontSize='1.25rem' iconSize={20} />
      </div>

      <nav className={s.navContainer}>
        {navItems.map((item) => (
          <NavLink key={item.name} to={item.path}  className={({isActive}) => s.navLink(isActive)}>
            <item.icon size={20} />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className={s.logoContainer}>
        <button onClick={() => { onClose(); logout(); }} className={s.logoutButton}>
          <HiOutlineLogout size={20} />
          Logout
        </button>
      </div>
    </aside>
  </>
  )
}

export default AdminSidebar