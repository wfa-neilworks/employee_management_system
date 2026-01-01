import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddLeaveModal from '../components/modals/AddLeaveModal'
import styles from './RosterPage.module.css'

export default function RosterPage() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetchLeaves()
  }, [currentDate])

  const fetchLeaves = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('leave')
        .select(`
          *,
          employees (
            id,
            name,
            english_name,
            payroll_number,
            departments (display_name)
          )
        `)
        .order('start_date', { ascending: false })

      if (error) throw error
      setLeaves(data || [])
    } catch (error) {
      console.error('Error fetching leaves:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const formatLeaveType = (type) => {
    return type.replace(/_/g, ' ')
  }

  const getLeaveColor = (type) => {
    switch (type) {
      case 'SICK_LEAVE':
        return '#ff8800'
      case 'ANNUAL_LEAVE':
        return '#00ff88'
      case 'LEAVE_WITHOUT_PAY':
        return '#ff0088'
      default:
        return '#888'
    }
  }

  const getLeavesForDate = (day) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    return leaves.filter((leave) => {
      return dateStr >= leave.start_date && dateStr <= leave.end_date
    })
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.calendarDay}></div>)
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayLeaves = getLeavesForDate(day)
      const today = new Date()
      const isToday =
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()

      days.push(
        <div
          key={day}
          className={`${styles.calendarDay} ${isToday ? styles.today : ''}`}
        >
          <div className={styles.dayNumber}>{day}</div>
          <div className={styles.dayLeaves}>
            {dayLeaves.slice(0, 3).map((leave) => (
              <div
                key={leave.id}
                className={styles.leaveIndicator}
                style={{ background: getLeaveColor(leave.leave_type) }}
                title={`${leave.employees.name} - ${formatLeaveType(leave.leave_type)}`}
              >
                <span className={styles.leaveName}>
                  {leave.employees.name}
                </span>
              </div>
            ))}
            {dayLeaves.length > 3 && (
              <div className={styles.moreIndicator}>
                +{dayLeaves.length - 3} more
              </div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const currentMonthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Roster - Leave Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className={styles.addButton}
        >
          + Add Leave
        </button>
      </div>

      <div className={styles.calendarHeader}>
        <button onClick={previousMonth} className={styles.navButton}>
          ‹ Previous
        </button>
        <h2 className={styles.monthYear}>{currentMonthYear}</h2>
        <button onClick={nextMonth} className={styles.navButton}>
          Next ›
        </button>
      </div>

      <div className={styles.calendar}>
        <div className={styles.calendarWeekdays}>
          <div className={styles.weekday}>Sun</div>
          <div className={styles.weekday}>Mon</div>
          <div className={styles.weekday}>Tue</div>
          <div className={styles.weekday}>Wed</div>
          <div className={styles.weekday}>Thu</div>
          <div className={styles.weekday}>Fri</div>
          <div className={styles.weekday}>Sat</div>
        </div>
        <div className={styles.calendarGrid}>{renderCalendar()}</div>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendTitle}>Leave Types:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ background: getLeaveColor('SICK_LEAVE') }}
            ></span>
            Sick Leave
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ background: getLeaveColor('ANNUAL_LEAVE') }}
            ></span>
            Annual Leave
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ background: getLeaveColor('LEAVE_WITHOUT_PAY') }}
            ></span>
            Leave Without Pay
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddLeaveModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchLeaves}
        />
      )}
    </div>
  )
}
