import React, { useEffect, useState } from 'react'
import { adminLayoutStyles as s } from '../../assets/dummyStyles'
import AdminSidebar from './AdminSidebar'
import DashboardNavbar from './DashboardNavbar';
import { Outlet } from 'react-router-dom';

const AdminLayout = () => {
    // const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const [isSidebarOpen, setIsSidebarOpen] = useState(false);


 useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true); // always open on desktop
    }
  };

  window.addEventListener("resize", handleResize);
  handleResize();

  return () => window.removeEventListener("resize", handleResize);
}, []);

const handleClose = () => {
  // Only allow closing on mobile
  if (window.innerWidth < 768) {
    setIsSidebarOpen(false);
  }
};


  return (
    <div className={s.layout}>
        <AdminSidebar  isOpen={isSidebarOpen} onClose={handleClose}/>

            <div className={s.mainWrapper}>
                <DashboardNavbar onMenuClick={()=> setIsSidebarOpen(true)}/>
                    <main className={s.mainContent}>

                        <Outlet />

                    </main>

            </div>


    </div>
  )
}

export default AdminLayout