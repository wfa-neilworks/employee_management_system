import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Sidebar.module.css'

const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)

const IconDepartments = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18"/>
    <path d="M5 21V7l7-4 7 4v14"/>
    <path d="M9 21v-4h6v4"/>
    <path d="M9 11h1m4 0h1M9 15h1m4 0h1"/>
  </svg>
)

const IconLockers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M12 3v18"/>
    <circle cx="7.5" cy="12" r="1"/>
    <circle cx="16.5" cy="12" r="1"/>
  </svg>
)

const IconRoster = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
  </svg>
)

const IconTimesheet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/>
    <path d="M8 13h8M8 17h5"/>
  </svg>
)

const IconAttendance = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
)

const IconKnife = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2.5c0 1.5-1.5 6-1.5 6h-2S9.5 4 9.5 2.5a2.5 2.5 0 0 1 5 0z"/>
    <path d="M11 8.5V21"/>
    <path d="M9 21h6"/>
  </svg>
)

const IconReport = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/>
    <path d="M8 18v-4M12 18v-2M16 18v-6"/>
  </svg>
)

const IconPresetData = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
  </svg>
)

const IconAdmin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
  </svg>
)

const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
)

export default function Sidebar({ departments, isOpen }) {
  const { hasPermission } = useAuth()
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(true)
  const [isKnifeDocketsOpen, setIsKnifeDocketsOpen] = useState(true)

  return (
    <aside className={`${styles.sidebar} ${!isOpen ? styles.sidebarHidden : ''}`}>
      <div className={styles.logo}>
        <img src="/logo.png" alt="NL CORP" className={styles.logoImage} />
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
          end
        >
          <span className={styles.navIcon}><IconDashboard /></span>
          <span className={styles.navLabel}>DASHBOARD</span>
        </NavLink>

        <div className={styles.section}>
          <button
            className={styles.sectionHeader}
            onClick={() => setIsDepartmentsOpen(!isDepartmentsOpen)}
          >
            <span className={styles.navIcon}><IconDepartments /></span>
            <span className={styles.navLabel}>DEPARTMENTS</span>
            <span className={`${styles.chevron} ${isDepartmentsOpen ? styles.chevronOpen : ''}`}>
              <IconChevron />
            </span>
          </button>

          {isDepartmentsOpen && (
            <div className={styles.sectionContent}>
              {departments.map((dept) => (
                <NavLink
                  key={dept.id}
                  to={`/department/${dept.id}`}
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                >
                  {dept.display_name}
                </NavLink>
              ))}
              <NavLink
                to="/resigned"
                className={({ isActive }) =>
                  `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                }
              >
                Resigned Employees
              </NavLink>
            </div>
          )}
        </div>

        <NavLink
          to="/roster"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}><IconRoster /></span>
          <span className={styles.navLabel}>ROSTER</span>
        </NavLink>

        <NavLink
          to="/timesheet"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}><IconTimesheet /></span>
          <span className={styles.navLabel}>TIMESHEET</span>
        </NavLink>

        <NavLink
          to="/attendance"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}><IconAttendance /></span>
          <span className={styles.navLabel}>ATTENDANCE</span>
        </NavLink>

        {(hasPermission('view_knife_dockets') || hasPermission('view_transaction_history')) && (
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => setIsKnifeDocketsOpen(!isKnifeDocketsOpen)}
            >
              <span className={styles.navIcon}><IconKnife /></span>
              <span className={styles.navLabel}>KNIFE DOCKETS</span>
              <span className={`${styles.chevron} ${isKnifeDocketsOpen ? styles.chevronOpen : ''}`}>
                <IconChevron />
              </span>
            </button>

            {isKnifeDocketsOpen && (
              <div className={styles.sectionContent}>
                <NavLink
                  to="/knife-dockets"
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                >
                  Knife Dockets
                </NavLink>
                <NavLink
                  to="/transaction-history"
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                >
                  Transaction History
                </NavLink>
              </div>
            )}
          </div>
        )}

        <NavLink
          to="/report"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}><IconReport /></span>
          <span className={styles.navLabel}>REPORT</span>
        </NavLink>

        {hasPermission('manage_preset_data') && (
          <NavLink
            to="/preset-data"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}><IconPresetData /></span>
            <span className={styles.navLabel}>PRESET DATA</span>
          </NavLink>
        )}

        {hasPermission('manage_users') && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}><IconAdmin /></span>
            <span className={styles.navLabel}>ADMIN</span>
          </NavLink>
        )}
      </nav>
    </aside>
  )
}
