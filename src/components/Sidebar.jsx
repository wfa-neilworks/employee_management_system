import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

export default function Sidebar({ departments, isOpen }) {
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(true)

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
      </nav>
    </aside>
  )
}
