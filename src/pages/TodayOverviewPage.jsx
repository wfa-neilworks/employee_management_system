import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './TodayOverviewPage.module.css'

const LEAVE_CONFIG = {
  SICK_LEAVE:        { label: 'Sick Leave',         color: '#ff6b6b' },
  ANNUAL_LEAVE:      { label: 'Annual Leave',        color: '#4caf50' },
  LEAVE_WITHOUT_PAY: { label: 'Leave Without Pay',   color: '#ff9800' },
  ABSENT:            { label: 'Absent (No Notice)',   color: '#f44336' },
  PUBLIC_HOLIDAY:    { label: 'Public Holiday',       color: '#2196f3' },
}

export default function TodayOverviewPage() {
  const [grouped, setGrouped] = useState([]) // [{ dept, employees: [...] }]
  const [loading, setLoading] = useState(true)
  const [today] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchToday()
  }, [])

  const fetchToday = async () => {
    setLoading(true)

    // Fetch all leave records covering today
    const { data: leaves, error } = await supabase
      .from('leave')
      .select('*, employees(id, name, english_name, departments(id, display_name))')
      .lte('start_date', today)
      .gte('end_date', today)

    if (error) { setLoading(false); return }

    // Group by department
    const deptMap = {}
    for (const leave of (leaves || [])) {
      const emp = leave.employees
      if (!emp) continue
      const dept = emp.departments
      const deptId = dept?.id || 'unknown'
      const deptName = dept?.display_name || 'Unknown Department'

      if (!deptMap[deptId]) deptMap[deptId] = { deptName, employees: [] }
      deptMap[deptId].employees.push({
        id: emp.id,
        name: emp.name,
        english_name: emp.english_name,
        leave_type: leave.leave_type,
        notes: leave.notes,
        start_date: leave.start_date,
        end_date: leave.end_date,
      })
    }

    // Sort departments alphabetically, sort employees within by name
    const result = Object.values(deptMap)
      .sort((a, b) => a.deptName.localeCompare(b.deptName))
      .map(d => ({ ...d, employees: d.employees.sort((a, b) => a.name.localeCompare(b.name)) }))

    setGrouped(result)
    setLoading(false)
  }

  const totalOnLeave = grouped.reduce((sum, d) => sum + d.employees.length, 0)

  const fmt = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Today's Overview</h1>
          <p className={styles.subtitle}>
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchToday}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {Object.entries(LEAVE_CONFIG).map(([key, { label, color }]) => (
          <div key={key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color }} />
            <span className={styles.legendLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Summary stat */}
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalOnLeave}</div>
          <div className={styles.statLabel}>Employee{totalOnLeave !== 1 ? 's' : ''} on Leave Today</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{grouped.length}</div>
          <div className={styles.statLabel}>Department{grouped.length !== 1 ? 's' : ''} Affected</div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : grouped.length === 0 ? (
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <p>No employees on leave today.</p>
        </div>
      ) : (
        <div className={styles.deptGrid}>
          {grouped.map(({ deptName, employees }) => (
            <div key={deptName} className={styles.deptCard}>
              <div className={styles.deptHeader}>
                <span className={styles.deptName}>{deptName}</span>
                <span className={styles.deptCount}>{employees.length} on leave</span>
              </div>
              <div className={styles.empList}>
                {employees.map((emp, i) => {
                  const cfg = LEAVE_CONFIG[emp.leave_type] || { label: emp.leave_type, color: '#888' }
                  const isMultiDay = emp.start_date !== emp.end_date
                  return (
                    <div key={i} className={styles.empRow} style={{ borderLeftColor: cfg.color }}>
                      <div className={styles.empInfo}>
                        <span className={styles.empName}>{emp.name}</span>
                        {emp.english_name && <span className={styles.empEnglish}>{emp.english_name}</span>}
                        {emp.notes && <span className={styles.empNotes}>{emp.notes}</span>}
                        {isMultiDay && (
                          <span className={styles.empDates}>{fmt(emp.start_date)} → {fmt(emp.end_date)}</span>
                        )}
                      </div>
                      <span className={styles.leaveBadge} style={{ background: cfg.color + '22', color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
