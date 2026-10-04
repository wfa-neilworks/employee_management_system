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
    <path d="M12 2H8.5l-.5 2.5A7 7 0 0 0 5 6.5L2.5 6 1 9l2 1.5a7 7 0 0 0 0 3L1 15l1.5 3 2.5-.5A7 7 0 0 0 8 19.5l.5 2.5h3.5"/>
    <path d="M15.5 2.5l-.5 2A7 7 0 0 1 18 7l2-.5L21.5 9 20 10.5"/>
    <circle cx="12" cy="12" r="3"/>
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

const IconLogout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const NAV_TABS = [
  { key: 'profile', label: 'Profile', icon: IconProfile },
  { key: 'gears', label: 'Gears', icon: IconGear },
  { key: 'leave', label: 'Leave', icon: IconLeave },
  { key: 'knife', label: 'Knife', icon: IconKnife },
]

function ProfileTab({ employee }) {
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

  useEffect(() => {
    if (account?.employee_id) {
      fetchEmployee(account.employee_id)
    }
  }, [account])

  const fetchEmployee = async (employeeId) => {
    const { data } = await supabase
      .from('employees')
      .select('*, departments(display_name)')
      .eq('id', employeeId)
      .single()
    if (data) setEmployee(data)
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab employee={employee} />
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
        <div className={styles.topBarLeft}>
          <img src="/noellogo.png" alt="NOEL" className={styles.topLogo} />
        </div>
        <div className={styles.topBarRight}>
          <button className={styles.logoutBtn} onClick={handleSignOut}>
            <IconLogout />
          </button>
        </div>
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
            <span className={styles.navIcon}><Icon /></span>
            <span className={styles.navLabel}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
