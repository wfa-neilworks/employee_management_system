import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

export default function Layout() {
  const { account, signOut } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('display_name')

      if (error) throw error
      setDepartments(data)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className={styles.container}>
      <Sidebar
        departments={departments}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <div className={`${styles.main} ${!isSidebarOpen ? styles.mainExpanded : ''}`}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuButton}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              ☰
            </button>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.accountInfo}>
              <span className={styles.accountType}>{account?.account_type}</span>
              <button className={styles.signOutButton} onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
