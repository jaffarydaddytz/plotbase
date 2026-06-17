import  { useEffect, useRef, useState, useEffect as useEffectHook, useMemo } from 'react'
import { adminUsersStyles as s } from '../../assets/dummyStyles'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import API_URL from '../../config'
import { HiOutlineFilter, HiOutlineIdentification, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineMail, HiOutlineTrash } from 'react-icons/hi'

const AdminUsers = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [roleFilter, setRoleFilter] = useState("all");
    const [openFilter, setOpenFilter] = useState(false);
    const {token} = useAuth();

    const filterRef = useRef(null);


    // to fetch the users
    useEffect (() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/users`, {
                    headers: {Authorization: `Bearer ${token}`},
                });

                if(res.data.success) {
                    setUsers(res.data.users);
                }
                setLoading(false);

                
            } catch (error) {
                console.error("failed to load users", error);
                setLoading(false);
                
            }
        };

        fetchUsers();
    }, [token]);

    useEffectHook(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setOpenFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") return users;
    return users.filter((user) => user.role === roleFilter);
  }, [users, roleFilter]);


  // to block a particular user
  const handleBlock = async (id) => {
    try {
     const res = await axios.patch(
        `${API_URL}/api/admin/users/${id}/block`,
        {},
        {
            headers: {Authorization: `Bearer ${token}`}
        }
     );

 

     if(res.data.success){
        setUsers(
            users.map((u) => 
                u._id == id ? {...u, isBlocked: res.data.isBlocked}: u,
            )
        )
     }
    } catch (error) {
      
        console.log("failed to block", error)
        
    }
  }


  // to delete particular user
  const handleDelete = async (id) => {
    if(!window.confirm  (
        "are you sure you want to delete this user? this action cannot be undone"
    )) return ;

    try {
        await axios.delete(`${API_URL}/api/admin/users/${id}`, {
            headers : {Authorization : `Bearer ${token}`}
        });
   
        setUsers(users.filter((u) => u._id  !== id));
    } catch (error) {

        console.log("faled to delete user", error)
        
    }

    
  }


  if(loading)
    return (
<div className='loader-full-page'>
    <div className='loader'>

    </div>

</div>

)

  return (

    <>
    <div className={s.containerHeader}>
        <div>
            <h1 className={s.headerTitle} > User Management </h1>
            <p className={s.headerSubtitle} >
                Monitor platform users and access levels.

            </p>
        </div>


        <div className={s.filterWrapper}  ref={filterRef}>
            <button onClick={ () => setOpenFilter(!openFilter)  } className={s.filterButton}>
                <HiOutlineFilter size={18} />
                Filter

            </button>

            {openFilter && (
                <div className={s.filterDropdown}>

                    <button onClick={() => {
                        setRoleFilter("all");
                        setOpenFilter(false);

                    }} className={s.filterOption(roleFilter === "all")}>

                        All Users

                    </button>



                    <button onClick={() => {
                        setRoleFilter("buyer");
                        setOpenFilter(false);

                    }} className={s.filterOption(roleFilter === "buyer")}>

                        All Users

                    </button>

                       <button onClick={() => {
                        setRoleFilter("seller");
                        setOpenFilter(false);

                    }} className={s.filterOption(roleFilter === "seller")}>

                        All Users

                    </button>

                                       
                        <button onClick={() => {
                        setRoleFilter("admin");
                        setOpenFilter(false);

                    }} className={s.filterOption(roleFilter === "admin")}>

                        Admin

                    </button>

                </div>
            )}

        </div>

    </div>


    <div className={s.cardContainer}>
        <div className={s.cardHeader}>
            <div className={s.cardTitleRow}>
                <h2 className={s.cardTitle}>Platform Users</h2>
                <div className={s.userCount}>
                    Showing{" "}
                    <span className={s.userCountSpan}> {filteredUsers.length}  </span> {" "}
                    users

                </div>

            </div>

        </div>

<div className={s.tableWrapper}>
    <table className={s.table}>
           <thead className={s.thead}>
              <tr className={s.tableRow}>
                <th className={s.thUserInfo}>User Info</th>
                <th className={s.thRole}>Role</th>
                <th className={s.thContact}>Contact Details</th>
                <th className={s.thStatus}>Account Status</th>
                <th className={s.thActions}>Actions</th>
              </tr>
            </thead>


            <tbody>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user)=> (
                        <tr key={user._id} className={s.tableRow}>
                            <td className={s.tdUserInfo}>
                                <div className="flex items-center gap-4">

                                    <div className={s.userAvatar}>
                                        {user.name.charAt(0).toUpperCase()}

                                    </div>

                                    <div>
                                        <div className={s.userInfoName}>
                                            {user.name}

                                        </div>

                                        <div className={s.userInfoId}>
                                            ID: {user._id.slice(-8).toUpperCase()}

                                        </div>
                                    </div>

                                </div>

                            </td>

                            <td className={s.tdRole}>
                                <span className={s.roleBadge(user.role)} > {user.role}</span>

                            </td>


                            <td className={s.tdContact}>
                                <div className={s.contactWrapper}>
                                    <div className={s.contactEmail}>
                                        <HiOutlineMail color="#94a2b8" /> {user.email}

                                    </div>

                                    {user.phone && (
                                        <div className={s.contactPhone}>
                                            <HiOutlineIdentification color="#944a3b8" /> {"  "}
                                            {user.phone}

                                        </div>
                                    ) }

                                </div>

                            </td>

                            <td className={s.tdStatus}>
                                {user.isBlocked ? (
                                    <span className={s.statusBadgeBlocked}>
                                        <HiOutlineLockClosed size={14}/> Suspended

                                    </span>
                                ) : (
                                    <span className={s.statusBadgeActive}>
                                        <HiOutlineLockOpen  size={14} /> Active

                                    </span>
                                ) }

                            </td>


                            <td className={s.tdActions}>
                                <div className={s.actionsWrapper}>
                                    <button onClick={ () => handleBlock(user._id)   } className={s.blockButton(user.isBlocked)} title={user.isBlocked ? "Unblock User" : "Block user "}   >
                                        {user.isBlocked ? (
                                            <HiOutlineLockOpen size={18} />
                                        ): (
                                            <HiOutlineLockClosed size={18} />
                                        )}

                                    </button>

                                    <button onClick={()=> handleDelete(user._id)} className={s.deleteButton} title="Delete User" >
                                        <HiOutlineTrash size={18} />

                                    </button>

                                </div>

                            </td>

                        </tr>
                    ) )

                ) : (
                    <tr>
                        <td className={s.emptyState} colSpan="5" >
                            No Users Found for this filter

                        </td>
                    </tr>
                )}
            </tbody>

    </table>

</div>

    </div>
    </>



  )
}

export default AdminUsers