import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import styles from './AttendancePage.module.css'

const ATTENDANCE_STATUSES = [
  { value: 'PRESENT', label: 'Present', code: 'P', color: '#00ff88' },
  { value: 'ABSENT', label: 'Absent', code: 'A', color: '#ff0088' },
  { value: 'SICK_LEAVE', label: 'Sick Leave', code: 'SL', color: '#ff8800' },
  { value: 'ANNUAL_LEAVE', label: 'Annual Leave', code: 'AL', color: '#00d4ff' },
  { value: 'LEAVE_WITHOUT_PAY', label: 'Leave Without Pay', code: 'LWP', color: '#888888' },
  { value: 'PUBLIC_HOLIDAY', label: 'Public Holiday', code: 'PH', color: '#d4ff00' },
  { value: 'REST_DAY', label: 'Rest Day', code: 'RD', color: '#aa88ff' }
]

// Helper function to check if a date is a weekend (Saturday = 6, Sunday = 0)
const isWeekend = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

export default function AttendancePage() {
  const { hasPermission } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedDepartments, setSelectedDepartments] = useState([]) // For daily view checkboxes
  const [view, setView] = useState('daily') // 'daily' or 'monthly'
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState({})
  const [departmentData, setDepartmentData] = useState({}) // Store data for each department
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (view === 'daily') {
      if (selectedDepartments.length > 0) {
        fetchDailyDataForMultipleDepartments()
      } else {
        setDepartmentData({})
        setLoading(false)
      }
    } else {
      if (selectedDepartment) {
        fetchMonthlyData()
      }
    }
  }, [selectedDepartments, selectedDepartment, selectedDate, selectedMonth, view])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, display_name')
        .order('display_name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleDepartmentToggle = (deptId) => {
    setSelectedDepartments(prev => {
      if (prev.includes(deptId)) {
        return prev.filter(id => id !== deptId)
      } else {
        return [...prev, deptId]
      }
    })
  }

  const fetchDailyDataForMultipleDepartments = async () => {
    try {
      setLoading(true)
      const deptDataMap = {}

      // Fetch data for each selected department
      for (const deptId of selectedDepartments) {
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .select('id, name, english_name, payroll_number, wage_status')
          .eq('department_id', deptId)
          .eq('is_active', true)

        if (empError) throw empError

        // Sort employees: WFA first, then LABOR_HIRE
        empData.sort((a, b) => {
          if (a.wage_status === 'WFA' && b.wage_status !== 'WFA') return -1
          if (a.wage_status !== 'WFA' && b.wage_status === 'WFA') return 1
          return a.name.localeCompare(b.name)
        })

        // Fetch roster/leave data for selected date
        const { data: leaveData, error: leaveError } = await supabase
          .from('leave')
          .select('employee_id, leave_type')
          .lte('start_date', selectedDate)
          .gte('end_date', selectedDate)
          .in('employee_id', empData.map(e => e.id))

        if (leaveError) throw leaveError

        // Create attendance map with auto-population from roster
        const attMap = {}

        // Auto-populate from roster/leave data
        leaveData.forEach(leave => {
          let status = 'PRESENT'
          switch (leave.leave_type) {
            case 'SICK_LEAVE':
              status = 'SICK_LEAVE'
              break
            case 'ANNUAL_LEAVE':
              status = 'ANNUAL_LEAVE'
              break
            case 'LEAVE_WITHOUT_PAY':
              status = 'LEAVE_WITHOUT_PAY'
              break
            case 'ABSENT':
              status = 'ABSENT'
              break
            case 'PUBLIC_HOLIDAY':
              status = 'PUBLIC_HOLIDAY'
              break
          }

          attMap[leave.employee_id] = {
            employee_id: leave.employee_id,
            date: selectedDate,
            status: status,
            isFromRoster: true
          }
        })

        // Auto-mark as PRESENT for past dates (skip weekends)
        const today = new Date().toISOString().split('T')[0]
        if (selectedDate < today && !isWeekend(selectedDate)) {
          empData.forEach(emp => {
            if (!attMap[emp.id]) {
              attMap[emp.id] = {
                employee_id: emp.id,
                date: selectedDate,
                status: 'PRESENT',
                isAutoPresent: true
              }
            }
          })
        }

        deptDataMap[deptId] = {
          employees: empData,
          attendance: attMap
        }
      }

      setDepartmentData(deptDataMap)
    } catch (error) {
      console.error('Error fetching daily data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDailyData = async () => {
    try {
      setLoading(true)

      // Fetch employees
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, english_name, payroll_number, wage_status')
        .eq('department_id', selectedDepartment)
        .eq('is_active', true)

      if (empError) throw empError

      // Sort employees: WFA first, then LABOR_HIRE
      empData.sort((a, b) => {
        if (a.wage_status === 'WFA' && b.wage_status !== 'WFA') return -1
        if (a.wage_status !== 'WFA' && b.wage_status === 'WFA') return 1
        return a.name.localeCompare(b.name)
      })

      setEmployees(empData)

      // Fetch attendance for selected date
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate)
        .in('employee_id', empData.map(e => e.id))

      if (attError) {
        // If attendance table doesn't exist, continue without existing records
        console.warn('Attendance table query failed:', attError)
        console.warn('Attendance table does not exist. Please run the migration SQL from migrations/create-attendance-table.sql')
        // Don't throw error - continue with empty attendance data
      }

      // Fetch roster/leave data for selected date
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave')
        .select('employee_id, leave_type')
        .lte('start_date', selectedDate)  // Leave starts on or before selected date
        .gte('end_date', selectedDate)    // Leave ends on or after selected date
        .in('employee_id', empData.map(e => e.id))

      if (leaveError) throw leaveError

      console.log('Daily - Fetched leave data:', leaveData)

      // Create attendance map with auto-population from roster
      const attMap = {}

      // First, add existing attendance records (if any)
      if (attData) {
        attData.forEach(att => {
          attMap[att.employee_id] = att
        })
      }

      // Then, auto-populate from roster/leave data if no attendance record exists
      leaveData.forEach(leave => {
        if (!attMap[leave.employee_id]) {
          // Map leave types to attendance statuses
          let status = 'PRESENT'
          switch (leave.leave_type) {
            case 'SICK_LEAVE':
              status = 'SICK_LEAVE'
              break
            case 'ANNUAL_LEAVE':
              status = 'ANNUAL_LEAVE'
              break
            case 'LEAVE_WITHOUT_PAY':
              status = 'LEAVE_WITHOUT_PAY'
              break
            case 'ABSENT':
              status = 'ABSENT'
              break
            case 'PUBLIC_HOLIDAY':
              status = 'PUBLIC_HOLIDAY'
              break
          }

          // Create virtual attendance record (not yet saved to DB)
          attMap[leave.employee_id] = {
            employee_id: leave.employee_id,
            date: selectedDate,
            status: status,
            isFromRoster: true // Flag to indicate it's from roster
          }
          console.log('Daily - Auto-populated:', leave.employee_id, status)
        }
      })

      // Auto-mark as PRESENT for past dates (employees without leaves and without attendance records)
      // Skip weekends (Saturday/Sunday)
      const today = new Date().toISOString().split('T')[0]
      if (selectedDate < today && !isWeekend(selectedDate)) {
        empData.forEach(emp => {
          if (!attMap[emp.id]) {
            // No leave and no attendance record for past date = mark as present
            attMap[emp.id] = {
              employee_id: emp.id,
              date: selectedDate,
              status: 'PRESENT',
              isAutoPresent: true // Flag for auto-present
            }
          }
        })
      }

      console.log('Daily - Final attendance map:', attMap)
      setAttendance(attMap)
    } catch (error) {
      console.error('Error fetching daily data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMonthlyData = async () => {
    try {
      setLoading(true)

      // Fetch employees
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, english_name, payroll_number, wage_status')
        .eq('department_id', selectedDepartment)
        .eq('is_active', true)

      if (empError) throw empError

      // Sort employees
      empData.sort((a, b) => {
        if (a.wage_status === 'WFA' && b.wage_status !== 'WFA') return -1
        if (a.wage_status !== 'WFA' && b.wage_status === 'WFA') return 1
        return a.name.localeCompare(b.name)
      })

      setEmployees(empData)

      // Fetch attendance for selected month
      const startDate = `${selectedMonth}-01`
      const endDate = new Date(selectedMonth + '-01')
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0)
      const endDateStr = endDate.toISOString().split('T')[0]

      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDateStr)
        .in('employee_id', empData.map(e => e.id))

      if (attError) {
        // If attendance table doesn't exist, continue without existing records
        console.warn('Attendance table query failed:', attError)
        console.warn('Attendance table does not exist. Please run the migration SQL from migrations/create-attendance-table.sql')
        // Don't throw error - continue with empty attendance data
      }

      // Fetch roster/leave data for selected month
      // A leave overlaps with the month if: start_date <= month_end AND end_date >= month_start
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave')
        .select('employee_id, leave_type, start_date, end_date')
        .lte('start_date', endDateStr)  // Leave starts before or during the month
        .gte('end_date', startDate)     // Leave ends during or after the month
        .in('employee_id', empData.map(e => e.id))

      if (leaveError) throw leaveError

      console.log('Fetched leave data for month:', leaveData)

      // Create attendance map: employee_id -> { date -> attendance }
      const attMap = {}

      // First, add existing attendance records (if any)
      if (attData) {
        attData.forEach(att => {
          if (!attMap[att.employee_id]) {
            attMap[att.employee_id] = {}
          }
          attMap[att.employee_id][att.date] = att
        })
      }

      // Then, auto-populate from roster/leave data for dates without attendance
      leaveData.forEach(leave => {
        console.log('Processing leave:', leave)

        // Determine the actual date range within the selected month
        const actualStart = leave.start_date > startDate ? leave.start_date : startDate
        const actualEnd = leave.end_date < endDateStr ? leave.end_date : endDateStr

        // Map leave type to attendance status
        let status = 'PRESENT'
        switch (leave.leave_type) {
          case 'SICK_LEAVE':
            status = 'SICK_LEAVE'
            break
          case 'ANNUAL_LEAVE':
            status = 'ANNUAL_LEAVE'
            break
          case 'LEAVE_WITHOUT_PAY':
            status = 'LEAVE_WITHOUT_PAY'
            break
          case 'ABSENT':
            status = 'ABSENT'
            break
          case 'PUBLIC_HOLIDAY':
            status = 'PUBLIC_HOLIDAY'
            break
        }

        // Parse dates properly (avoid timezone issues)
        const [startYear, startMonth, startDay] = actualStart.split('-').map(Number)
        const [endYear, endMonth, endDay] = actualEnd.split('-').map(Number)

        const currentDate = new Date(startYear, startMonth - 1, startDay)
        const endDate = new Date(endYear, endMonth - 1, endDay)

        // Fill in each day of the leave
        while (currentDate <= endDate) {
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

          if (!attMap[leave.employee_id]) {
            attMap[leave.employee_id] = {}
          }

          // Only auto-populate if no attendance record exists for this date
          if (!attMap[leave.employee_id][dateStr]) {
            attMap[leave.employee_id][dateStr] = {
              employee_id: leave.employee_id,
              date: dateStr,
              status: status,
              isFromRoster: true
            }
            console.log('Auto-populated:', leave.employee_id, dateStr, status)
          }

          currentDate.setDate(currentDate.getDate() + 1)
        }
      })

      // Auto-mark as PRESENT for past dates (employees without leaves and without attendance records)
      // Skip weekends (Saturday/Sunday)
      const today = new Date().toISOString().split('T')[0]
      const daysInMonth = getDaysInMonth(selectedMonth)

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`

        // Only auto-mark past dates and skip weekends
        if (dateStr < today && !isWeekend(dateStr)) {
          empData.forEach(emp => {
            if (!attMap[emp.id]) {
              attMap[emp.id] = {}
            }

            if (!attMap[emp.id][dateStr]) {
              // No leave and no attendance record for past date = mark as present
              attMap[emp.id][dateStr] = {
                employee_id: emp.id,
                date: dateStr,
                status: 'PRESENT',
                isAutoPresent: true
              }
            }
          })
        }
      }

      console.log('Final attendance map:', attMap)

      setAttendance(attMap)
    } catch (error) {
      console.error('Error fetching monthly data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (employeeId, status) => {
    if (!hasPermission('manage_attendance')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const attendanceRecord = {
        employee_id: employeeId,
        date: selectedDate,
        status: status,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }

      const existing = attendance[employeeId]

      if (existing && existing.id && !existing.isFromRoster) {
        // Update existing database record
        const { error } = await supabase
          .from('attendance')
          .update(attendanceRecord)
          .eq('id', existing.id)

        if (error) throw error

        // Update local state for existing
        setAttendance(prev => ({
          ...prev,
          [employeeId]: { ...existing, ...attendanceRecord }
        }))
      } else {
        // Insert new record (either no record exists or it's from roster)
        attendanceRecord.created_by = user.id

        const { data, error } = await supabase
          .from('attendance')
          .insert([attendanceRecord])
          .select()
          .single()

        if (error) throw error

        // Update local state
        setAttendance(prev => ({
          ...prev,
          [employeeId]: data
        }))
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
      alert('Failed to update attendance')
    }
  }

  const markAllPresent = async () => {
    if (!hasPermission('manage_attendance')) return
    if (!confirm('Mark all employees as present for this date?')) return

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()

      const records = employees.map(emp => ({
        employee_id: emp.id,
        date: selectedDate,
        status: 'PRESENT',
        created_by: user.id,
        updated_by: user.id
      }))

      // Delete existing records for this date
      await supabase
        .from('attendance')
        .delete()
        .eq('date', selectedDate)
        .in('employee_id', employees.map(e => e.id))

      // Insert new records
      const { data, error } = await supabase
        .from('attendance')
        .insert(records)
        .select()

      if (error) throw error

      // Update local state
      const newAttendance = {}
      data.forEach(att => {
        newAttendance[att.employee_id] = att
      })
      setAttendance(newAttendance)

      alert('All employees marked as present')
    } catch (error) {
      console.error('Error marking all present:', error)
      alert('Failed to mark all present')
    } finally {
      setSaving(false)
    }
  }

  const getDaysInMonth = (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number)
    return new Date(year, month, 0).getDate()
  }

  const getMonthlyStats = (employeeId) => {
    const empAttendance = attendance[employeeId] || {}
    const stats = {
      PRESENT: 0,
      ABSENT: 0,
      SICK_LEAVE: 0,
      ANNUAL_LEAVE: 0,
      LEAVE_WITHOUT_PAY: 0,
      PUBLIC_HOLIDAY: 0,
      REST_DAY: 0
    }

    Object.values(empAttendance).forEach(att => {
      if (stats[att.status] !== undefined) {
        stats[att.status]++
      }
    })

    return stats
  }

  const exportToCSV = () => {
    if (view === 'daily') {
      exportDailyCSV()
    } else {
      exportMonthlyCSV()
    }
  }

  const exportDailyCSV = () => {
    const headers = ['Payroll #', 'Name', 'English Name', 'Status', 'Notes']
    const rows = employees.map(emp => {
      const att = attendance[emp.id]
      return [
        emp.payroll_number || '',
        emp.name,
        emp.english_name || '',
        att ? ATTENDANCE_STATUSES.find(s => s.value === att.status)?.label || '' : '',
        att?.notes || ''
      ]
    })

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${selectedDate}.csv`
    a.click()
  }

  const exportMonthlyCSV = () => {
    const daysInMonth = getDaysInMonth(selectedMonth)
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0')
      return `${selectedMonth}-${day}`
    })

    const headers = ['Payroll #', 'Name', 'English Name', ...dates, 'P', 'A', 'SL', 'AL', 'LWP', 'PH', 'RD']
    const rows = employees.map(emp => {
      const empAtt = attendance[emp.id] || {}
      const stats = getMonthlyStats(emp.id)

      const statusCells = dates.map(date => {
        const att = empAtt[date]
        if (!att) return ''
        const status = ATTENDANCE_STATUSES.find(s => s.value === att.status)
        return status?.code || ''
      })

      return [
        emp.payroll_number || '',
        emp.name,
        emp.english_name || '',
        ...statusCells,
        stats.PRESENT,
        stats.ABSENT,
        stats.SICK_LEAVE,
        stats.ANNUAL_LEAVE,
        stats.LEAVE_WITHOUT_PAY,
        stats.PUBLIC_HOLIDAY,
        stats.REST_DAY
      ]
    })

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${selectedMonth}.csv`
    a.click()
  }

  const renderPieChart = (deptId, deptName) => {
    const deptData = departmentData[deptId]
    if (!deptData) return null

    const { employees: deptEmployees, attendance: deptAttendance } = deptData

    // Calculate attendance statistics
    const stats = {}
    ATTENDANCE_STATUSES.forEach(status => {
      stats[status.value] = deptEmployees.filter(emp => {
        const att = deptAttendance[emp.id]
        return att?.status === status.value
      }).length
    })

    const total = deptEmployees.length
    if (total === 0) {
      return <div className={styles.noData}>No employees in {deptName}</div>
    }

    // Calculate pie slices
    let currentAngle = 0
    const slices = []

    ATTENDANCE_STATUSES.forEach(status => {
      const count = stats[status.value]
      if (count > 0) {
        const percentage = (count / total) * 100
        const angle = (count / total) * 360

        slices.push({
          status: status,
          count: count,
          percentage: percentage,
          startAngle: currentAngle,
          endAngle: currentAngle + angle
        })

        currentAngle += angle
      }
    })

    // SVG pie chart
    const size = 300
    const center = size / 2
    const radius = size / 2 - 20

    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      }
    }

    const describeArc = (x, y, radius, startAngle, endAngle) => {
      const start = polarToCartesian(x, y, radius, startAngle)
      const end = polarToCartesian(x, y, radius, endAngle)
      const largeArcFlag = endAngle - startAngle > 180 ? '1' : '0'

      return [
        'M', x, y,
        'L', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y,
        'Z'
      ].join(' ')
    }

    return (
      <svg width={size} height={size} className={styles.pieChart}>
        {slices.length === 1 ? (
          // Special case: single status = full circle
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill={slices[0].status.color}
            stroke="#fff"
            strokeWidth="2"
          >
            <title>{`${slices[0].status.label}: ${slices[0].count} (${slices[0].percentage.toFixed(1)}%)`}</title>
          </circle>
        ) : (
          // Multiple statuses = pie slices
          slices.map((slice, index) => (
            <g key={slice.status.value}>
              <path
                d={describeArc(center, center, radius, slice.startAngle, slice.endAngle)}
                fill={slice.status.color}
                stroke="#fff"
                strokeWidth="2"
              />
              <title>{`${slice.status.label}: ${slice.count} (${slice.percentage.toFixed(1)}%)`}</title>
            </g>
          ))
        )}
        {/* Center circle for donut effect */}
        <circle
          cx={center}
          cy={center}
          r={radius * 0.5}
          fill="#1a1a1a"
        />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize="32"
          fontWeight="bold"
        >
          {total}
        </text>
        <text
          x={center}
          y={center + 25}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#888"
          fontSize="14"
        >
          Total
        </text>
      </svg>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Attendance Tracking</h1>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${view === 'daily' ? styles.active : ''}`}
            onClick={() => setView('daily')}
          >
            Daily View
          </button>
          <button
            className={`${styles.toggleButton} ${view === 'monthly' ? styles.active : ''}`}
            onClick={() => setView('monthly')}
          >
            Monthly View
          </button>
        </div>
      </div>

      {view === 'daily' ? (
        <div className={styles.dailyViewContainer}>
          <div className={styles.dateSelector}>
            <label className={styles.label}>Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.departmentCheckboxGroup}>
            {departments.map((dept) => (
              <label key={dept.id} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  value={dept.id}
                  checked={selectedDepartments.includes(dept.id)}
                  onChange={() => handleDepartmentToggle(dept.id)}
                  className={styles.checkboxInput}
                />
                <span className={styles.checkboxText}>{dept.display_name}</span>
              </label>
            ))}
          </div>

          {selectedDepartments.length === 0 ? (
            <div className={styles.emptyState}>Please select at least one department to view attendance</div>
          ) : loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <div className={styles.pieChartsGrid}>
              {selectedDepartments.map(deptId => {
                const dept = departments.find(d => d.id === deptId)
                const deptData = departmentData[deptId]
                if (!dept || !deptData) return null

                const { employees: deptEmployees, attendance: deptAttendance } = deptData

                return (
                  <div key={deptId} className={styles.departmentCard}>
                    <div className={styles.pieChartContainer}>
                      <h2 className={styles.chartTitle}>
                        {dept.display_name}
                      </h2>
                      {renderPieChart(deptId, dept.display_name)}
                    </div>

                    <div className={styles.statsGrid}>
                      {ATTENDANCE_STATUSES.map(status => {
                        const count = deptEmployees.filter(emp => {
                          const att = deptAttendance[emp.id]
                          return att?.status === status.value
                        }).length

                        if (count === 0) return null

                        return (
                          <div key={status.value} className={styles.statCard}>
                            <div
                              className={styles.statColor}
                              style={{ backgroundColor: status.color }}
                            ></div>
                            <div className={styles.statInfo}>
                              <div className={styles.statLabel}>{status.label}</div>
                              <div className={styles.statCount}>{count}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.monthlyViewContainer}>
          <div className={styles.controls}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Department *</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className={styles.select}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Month *</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.actions}>
              <button
                onClick={exportToCSV}
                className={styles.exportButton}
                disabled={!selectedDepartment || employees.length === 0}
              >
                Export to CSV
              </button>
            </div>
          </div>

          {!selectedDepartment ? (
            <div className={styles.emptyState}>Please select a department to view attendance</div>
          ) : loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <div className={styles.monthlyView}>
              <div className={styles.monthlyTableContainer}>
            <table className={styles.monthlyTable}>
              <thead>
                <tr>
                  <th className={styles.stickyCol}>Payroll #</th>
                  <th className={styles.stickyCol}>Name</th>
                  {Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => (
                    <th key={i + 1}>{i + 1}</th>
                  ))}
                  <th className={styles.statsCol}>P</th>
                  <th className={styles.statsCol}>A</th>
                  <th className={styles.statsCol}>SL</th>
                  <th className={styles.statsCol}>AL</th>
                  <th className={styles.statsCol}>LWP</th>
                  <th className={styles.statsCol}>PH</th>
                  <th className={styles.statsCol}>RD</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={getDaysInMonth(selectedMonth) + 9} className={styles.noResults}>
                      No active employees in this department
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => {
                    const empAtt = attendance[employee.id] || {}
                    const stats = getMonthlyStats(employee.id)

                    return (
                      <tr key={employee.id}>
                        <td className={styles.stickyCol}>{employee.payroll_number || '-'}</td>
                        <td className={styles.stickyCol}>{employee.name}</td>
                        {Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => {
                          const day = String(i + 1).padStart(2, '0')
                          const date = `${selectedMonth}-${day}`
                          const att = empAtt[date]
                          const status = att ? ATTENDANCE_STATUSES.find(s => s.value === att.status) : null

                          return (
                            <td
                              key={date}
                              className={styles.dayCell}
                              style={{
                                backgroundColor: status ? status.color : 'transparent'
                              }}
                              title={status ? status.label : 'Not marked'}
                            >
                              {status ? status.code : ''}
                            </td>
                          )
                        })}
                        <td className={styles.statsCol}>{stats.PRESENT}</td>
                        <td className={styles.statsCol}>{stats.ABSENT}</td>
                        <td className={styles.statsCol}>{stats.SICK_LEAVE}</td>
                        <td className={styles.statsCol}>{stats.ANNUAL_LEAVE}</td>
                        <td className={styles.statsCol}>{stats.LEAVE_WITHOUT_PAY}</td>
                        <td className={styles.statsCol}>{stats.PUBLIC_HOLIDAY}</td>
                        <td className={styles.statsCol}>{stats.REST_DAY}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

              <div className={styles.legend}>
                <strong>Legend:</strong>
                {ATTENDANCE_STATUSES.map(status => (
                  <div key={status.value} className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ backgroundColor: status.color }}></div>
                    <span>{status.label} ({status.code})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
