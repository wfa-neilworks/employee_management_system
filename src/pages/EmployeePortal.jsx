import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './EmployeePortal.module.css'

const IconProfile = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)

const IconGear = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)

const IconLeave = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
  </svg>
)

const IconKnife = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2.5c0 1.5-1.5 6-1.5 6h-2S9.5 4 9.5 2.5a2.5 2.5 0 0 1 5 0z"/>
    <path d="M11 8.5V21"/>
    <path d="M9 21h6"/>
  </svg>
)

const IconBell = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const IconAnnouncement = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const NAV_TABS = [
  { key: 'profile', label: 'Profile', icon: IconProfile },
  { key: 'announcement', label: 'Updates', icon: IconAnnouncement },
  { key: 'gears', label: 'Gears', icon: IconGear },
  { key: 'leave', label: 'Leave', icon: IconLeave },
  { key: 'knife', label: 'Knife', icon: IconKnife },
]

function ProfileTab({ employee, onSignOut }) {
  if (!employee) {
    return <div className={styles.loading}>Loading profile...</div>
  }

  return (
    <div className={styles.tabContent}>
      {/* Avatar */}
      <div className={styles.avatarSection}>
        <div className={styles.avatar}>
          {employee.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className={styles.employeeName}>{employee.name}</h2>
        {employee.english_name && (
          <p className={styles.englishName}>{employee.english_name}</p>
        )}
        <span className={styles.deptBadge}>{employee.departments?.display_name}</span>
      </div>

      {/* Details */}
      <div className={styles.detailsCard}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Payroll Number</span>
          <span className={styles.detailValue}>{employee.payroll_number || '—'}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Employment Status</span>
          <span className={styles.detailValue}>{employee.employment_status?.replace(/_/g, ' ') || '—'}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Wage Status</span>
          <span className={styles.detailValue}>{employee.wage_status?.replace(/_/g, ' ') || '—'}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Locker Number</span>
          <span className={styles.detailValue}>{employee.locker_number || '—'}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Start Date</span>
          <span className={styles.detailValue}>
            {employee.start_date ? new Date(employee.start_date).toLocaleDateString('en-AU') : '—'}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Q-Fever</span>
          <span className={`${styles.detailValue} ${employee.q_fever ? styles.qfeverYes : styles.qfeverNo}`}>
            {employee.q_fever ? 'Vaccinated' : 'Not Vaccinated'}
          </span>
        </div>
      </div>

      {/* Logout */}
      <div className={styles.logoutSection}>
        <button className={styles.logoutBtn} onClick={onSignOut}>
          <IconLogout />
          Sign Out
        </button>
      </div>
    </div>
  )
}

function AnnouncementTab({ announcements, unreadIds, onRead }) {
  if (announcements.length === 0) {
    return (
      <div className={styles.comingSoon}>
        <div className={styles.comingSoonIcon}>📢</div>
        <h3 className={styles.comingSoonTitle}>No Announcements</h3>
        <p className={styles.comingSoonText}>Check back later for updates from management.</p>
      </div>
    )
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.announcementList}>
        {announcements.map(a => {
          const isUnread = unreadIds.has(a.id)
          return (
            <div
              key={a.id}
              className={`${styles.announcementCard} ${isUnread ? styles.announcementUnread : ''}`}
              onClick={() => isUnread && onRead(a.id)}
            >
              {isUnread && <span className={styles.unreadDot} />}
              <div className={styles.announcementMeta}>
                <span className={styles.announcementDate}>
                  {new Date(a.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {isUnread && <span className={styles.newBadge}>NEW</span>}
              </div>
              <h3 className={styles.announcementTitle}>{a.title}</h3>
              <p className={styles.announcementBody}>{a.body}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ComingSoon({ label }) {
  return (
    <div className={styles.comingSoon}>
      <div className={styles.comingSoonIcon}>🚧</div>
      <h3 className={styles.comingSoonTitle}>{label}</h3>
      <p className={styles.comingSoonText}>This feature is coming soon.</p>
    </div>
  )
}

export default function EmployeePortal() {
  const { account, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [employee, setEmployee] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [unreadIds, setUnreadIds] = useState(new Set())

  useEffect(() => {
    if (account?.employee_id) {
      fetchEmployee(account.employee_id)
    }
    fetchAnnouncements()
  }, [account])

  const fetchEmployee = async (employeeId) => {
    const { data } = await supabase
      .from('employees')
      .select('*, departments(display_name)')
      .eq('id', employeeId)
      .single()
    if (data) setEmployee(data)
  }

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) {
      setAnnouncements(data)
      // Track which ones are unread using localStorage
      const readKey = `read_announcements_${account?.id}`
      const readIds = new Set(JSON.parse(localStorage.getItem(readKey) || '[]'))
      const unread = new Set(data.map(a => a.id).filter(id => !readIds.has(id)))
      setUnreadIds(unread)
    }
  }

  const markRead = (id) => {
    const readKey = `read_announcements_${account?.id}`
    const readIds = new Set(JSON.parse(localStorage.getItem(readKey) || '[]'))
    readIds.add(id)
    localStorage.setItem(readKey, JSON.stringify([...readIds]))
    setUnreadIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab employee={employee} onSignOut={handleSignOut} />
      case 'announcement': return <AnnouncementTab announcements={announcements} unreadIds={unreadIds} onRead={markRead} />
      case 'gears': return <ComingSoon label="My Gears" />
      case 'leave': return <ComingSoon label="Leave Application" />
      case 'knife': return <ComingSoon label="Knife Dockets" />
      default: return null
    }
  }

  return (
    <div className={styles.portal}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <img src="/noellogo.png" alt="NOEL" className={styles.topLogo} />
        <button
          className={`${styles.bellBtn} ${unreadIds.size > 0 ? styles.bellActive : ''}`}
          onClick={() => setActiveTab('announcement')}
        >
          <IconBell />
          {unreadIds.size > 0 && (
            <span className={styles.bellBadge}>
              {unreadIds.size > 9 ? '9+' : unreadIds.size}
            </span>
          )}
        </button>
      </header>

      {/* Page content */}
      <main className={styles.main}>
        {renderTab()}
      </main>

      {/* Bottom nav */}
      <nav className={styles.bottomNav}>
        {NAV_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`${styles.navTab} ${activeTab === key ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <span className={styles.navIcon}>
              <Icon />
              {key === 'announcement' && unreadIds.size > 0 && (
                <span className={styles.navDot} />
              )}
            </span>
            <span className={styles.navLabel}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
