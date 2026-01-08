import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Sidebar.module.css'

export default function Sidebar({ departments, isOpen }) {
  const { isProcurement } = useAuth()
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
          <span className={styles.navIcon}>📊</span>
          <span className={styles.navLabel}>DASHBOARD</span>
        </NavLink>

        <div className={styles.section}>
          <button
            className={styles.sectionHeader}
            onClick={() => setIsDepartmentsOpen(!isDepartmentsOpen)}
          >
            <span className={styles.navIcon}>🏢</span>
            <span className={styles.navLabel}>DEPARTMENTS</span>
            <span className={`${styles.chevron} ${isDepartmentsOpen ? styles.chevronOpen : ''}`}>
              ›
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

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.navIcon}>🔒</span>
            <span className={styles.navLabel}>LOCKERS</span>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.comingSoon}>Coming Soon</div>
          </div>
        </div>

        <NavLink
          to="/roster"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}>📅</span>
          <span className={styles.navLabel}>ROSTER</span>
        </NavLink>

        <NavLink
          to="/timesheet"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}>📋</span>
          <span className={styles.navLabel}>TIMESHEET</span>
        </NavLink>

        <NavLink
          to="/attendance"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}>✅</span>
          <span className={styles.navLabel}>ATTENDANCE</span>
        </NavLink>

        {isProcurement() && (
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => setIsKnifeDocketsOpen(!isKnifeDocketsOpen)}
            >
              <span className={styles.navIcon}>🔪</span>
              <span className={styles.navLabel}>KNIFE DOCKETS</span>
              <span className={`${styles.chevron} ${isKnifeDocketsOpen ? styles.chevronOpen : ''}`}>
                ›
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
      </nav>
    </aside>
  )
}
