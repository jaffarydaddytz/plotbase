import React, { useState } from 'react'
import { sellerLayoutStyles as s } from '../../assets/dummyStyles'
import { useAuth } from '../../context/AuthContext'
import SellerSidebar from './SellerSidebar'
import DashboardNavbar from './DashboardNavbar'
import { Outlet, useLocation } from 'react-router-dom'
import PendingApproval from '../../pages/seller/PendingApproval'




const SellerLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen]=useState(false)
    const {user} = useAuth()
    const location = useLocation();


    //allow access to public for seller
    const isPublicDashboardRoute = ['/contact', 'profile' ].includes(
        location.pathname, 
    )

  return (
    <div className={s.container}>
        <SellerSidebar isOpen = {isSidebarOpen}  onClose={()=> setIsSidebarOpen(false)} />

    <div className={s.contentWrapper}>
        <DashboardNavbar  onMenuClick={() => setIsSidebarOpen(true)}/>

            <main className={s.main}>
                {user?.isApproved || isPublicDashboardRoute ? (
                    <Outlet/>
                ): (
                    <PendingApproval />
                )}

            </main>
    </div>


    </div>
  )
}

export default SellerLayout