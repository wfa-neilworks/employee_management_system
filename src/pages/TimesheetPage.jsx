import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './TimesheetPage.module.css'

// Time Selector Component with Dropdowns
function TimeSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)

  // Parse the 24-hour time to 12-hour format
  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: '06', minute: '00', period: 'AM' }
    const [hours, minutes] = timeStr.split(':')
    const hour24 = parseInt(hours)
    const period = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    return {
      hour: String(hour12).padStart(2, '0'),
      minute: minutes,
      period
    }
  }

  // Convert 12-hour format to 24-hour format
  const formatTo24Hour = (hour, minute, period) => {
    let hour24 = parseInt(hour)
    if (period === 'AM' && hour24 === 12) hour24 = 0
    if (period === 'PM' && hour24 !== 12) hour24 += 12
    return `${String(hour24).padStart(2, '0')}:${minute}`
  }

  const { hour, minute, period } = parseTime(value)
  const [selectedHour, setSelectedHour] = useState(hour)
  const [selectedMinute, setSelectedMinute] = useState(minute)
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

  const handleApply = () => {
    const newTime = formatTo24Hour(selectedHour, selectedMinute, selectedPeriod)
    onChange(newTime)
    setIsOpen(false)
  }

  return (
    <div className={styles.timeSelectorContainer}>
      <button
        type="button"
        className={styles.timeButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        {hour}:{minute} {period}
      </button>

      {isOpen && (
        <>
          <div className={styles.timeDropdownOverlay} onClick={() => setIsOpen(false)} />
          <div className={styles.timeDropdown}>
            <div className={styles.timeDropdownHeader}>Select Time</div>
            <div className={styles.timeSelectors}>
              <div className={styles.timeColumn}>
                <label>Hour</label>
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  className={styles.timeSelect}
                >
                  {hours.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className={styles.timeColumn}>
                <label>Minute</label>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className={styles.timeSelect}
                >
                  {minutes.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className={styles.timeColumn}>
                <label>Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className={styles.timeSelect}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div className={styles.timeDropdownActions}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={styles.timeCancelButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className={styles.timeApplyButton}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function TimesheetPage() {
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('06:00')
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [timesheetData, setTimesheetData] = useState(null)

  useEffect(() => {
    fetchDepartments()
  }, [])

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

  const fetchTimesheetData = async () => {
    if (!selectedDepartment) {
      alert('Please select a department')
      return
    }

    setLoading(true)
    try {
      // Fetch employees from selected department
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name, english_name, payroll_number, wage_status')
        .eq('department_id', selectedDepartment)
        .eq('is_active', true)

      if (empError) throw empError

      // Sort employees: WFA first (alphabetically), then LABOR_HIRE (alphabetically)
      employees.sort((a, b) => {
        if (a.wage_status === 'WFA' && b.wage_status !== 'WFA') return -1
        if (a.wage_status !== 'WFA' && b.wage_status === 'WFA') return 1
        return a.name.localeCompare(b.name)
      })

      // Fetch leaves for the selected date
      const { data: leaves, error: leaveError } = await supabase
        .from('leave')
        .select('employee_id, leave_type')
        .lte('start_date', selectedDate)
        .gte('end_date', selectedDate)

      if (leaveError) throw leaveError

      // Create a map of employee leaves
      const leaveMap = {}
      leaves.forEach(leave => {
        leaveMap[leave.employee_id] = leave.leave_type
      })

      // Get department name
      const department = departments.find(d => d.id === selectedDepartment)

      // Prepare timesheet data
      const data = {
        departmentName: department?.display_name || '',
        date: selectedDate,
        startTime: startTime,
        employees: employees.map(emp => ({
          ...emp,
          leaveType: leaveMap[emp.id] || null,
          customStartTime: startTime // Initialize with default start time
        }))
      }

      setTimesheetData(data)
      setShowPreview(true)
    } catch (error) {
      console.error('Error fetching timesheet data:', error)
      alert('Failed to generate timesheet')
    } finally {
      setLoading(false)
    }
  }

  const getLeaveCode = (leaveType) => {
    switch (leaveType) {
      case 'SICK_LEAVE':
        return 'SL'
      case 'ANNUAL_LEAVE':
        return 'AL'
      case 'LEAVE_WITHOUT_PAY':
        return 'LWP'
      case 'ABSENT':
        return 'ABS'
      default:
        return ''
    }
  }

  const handleTimeChange = (employeeId, newTime) => {
    setTimesheetData(prev => ({
      ...prev,
      employees: prev.employees.map(emp =>
        emp.id === employeeId
          ? { ...emp, customStartTime: newTime }
          : emp
      )
    }))
  }

  const handlePrint = () => {
    // Create a new window for printing only the timesheet
    const printWindow = window.open('', '_blank')

    // Generate printable HTML with customStartTime values
    const generatePrintableHTML = () => {
      return `
        <div id="printable-timesheet">
          <div class="header">
            <div class="headerLeft">
              <img
                src="/woodwardlogo.png"
                alt="Woodward Foods"
                class="logo"
                style="height: 30px; width: 30px; max-height: 30px; max-width: 30px;"
              />
              <h2 class="companyName">Woodward Foods Australia</h2>
            </div>
            <div class="attribution">Printed from Noel - Employee Management System</div>
          </div>

          <div class="timesheetInfo">
            <h3>Department: ${timesheetData.departmentName}</h3>
            <p>Date: ${new Date(timesheetData.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>

          <table class="timesheetTable">
            <thead>
              <tr>
                <th>Payroll Number</th>
                <th>Name</th>
                <th>Start Time</th>
                <th>Break</th>
                <th>Time Finish</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${timesheetData.employees.map((employee) => {
                const leaveCode = getLeaveCode(employee.leaveType)
                const isOnLeave = !!leaveCode
                const displayTime = employee.customStartTime || timesheetData.startTime

                return `
                  <tr class="${isOnLeave ? 'onLeave' : ''}">
                    <td>${employee.payroll_number || '-'}</td>
                    <td>${employee.name}${employee.english_name ? ` (${employee.english_name})` : ''}</td>
                    <td>${isOnLeave ? leaveCode : displayTime}</td>
                    <td>${isOnLeave ? leaveCode : ''}</td>
                    <td>${isOnLeave ? leaveCode : ''}</td>
                    <td>${isOnLeave ? leaveCode : ''}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>
      `
    }

    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Timesheet - ${timesheetData.departmentName}</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 15mm;
              }

              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }

              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #000;
                background: white;
              }

              #printable-timesheet {
                background: white;
                padding: 20px;
                color: #000;
              }

              #printable-timesheet .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 15px;
                padding-bottom: 0;
                border-bottom: none;
              }

              #printable-timesheet .headerLeft {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              #printable-timesheet .attribution {
                font-size: 10px;
                color: #666;
                font-style: italic;
              }

              #printable-timesheet img.logo {
                display: block !important;
                max-height: 30px !important;
                max-width: 30px !important;
                height: 30px !important;
                width: 30px !important;
                object-fit: contain !important;
              }

              #printable-timesheet .header img {
                max-height: 30px !important;
                max-width: 30px !important;
                height: 30px !important;
                width: 30px !important;
              }

              #printable-timesheet .companyName {
                font-size: 20px;
                font-weight: 700;
                color: #000;
                margin: 0;
              }

              #printable-timesheet .timesheetInfo {
                margin-bottom: 20px;
              }

              #printable-timesheet .timesheetInfo h3 {
                font-size: 18px;
                font-weight: 600;
                color: #000;
                margin: 0 0 6px 0;
              }

              #printable-timesheet .timesheetInfo p {
                font-size: 14px;
                color: #333;
                margin: 0;
              }

              #printable-timesheet table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }

              #printable-timesheet table th {
                background: #f3f4f6 !important;
                padding: 8px 10px;
                text-align: left;
                font-weight: 600;
                font-size: 14px;
                border: 1px solid #000 !important;
                color: #000;
              }

              #printable-timesheet table td {
                padding: 8px 10px;
                font-size: 13px;
                border: 1px solid #000 !important;
                color: #000;
              }

              #printable-timesheet table tbody tr:nth-child(even) {
                background: #f9fafb !important;
              }

              #printable-timesheet table tbody tr.onLeave {
                background: #ffe5e5 !important;
              }

              #printable-timesheet table tbody tr.onLeave:nth-child(even) {
                background: #ffd5d5 !important;
              }

              @media print {
                @page {
                  size: A4 landscape;
                  margin: 15mm;
                }

                body {
                  print-color-adjust: exact !important;
                  -webkit-print-color-adjust: exact !important;
                }

                img {
                  max-height: 30px !important;
                  max-width: 30px !important;
                  height: 30px !important;
                  width: 30px !important;
                }

                #printable-timesheet table th {
                  background: #f3f4f6 !important;
                  border: 1px solid #000 !important;
                }

                #printable-timesheet table td {
                  border: 1px solid #000 !important;
                }

                #printable-timesheet table tbody tr:nth-child(even) {
                  background: #f9fafb !important;
                }

                #printable-timesheet table tbody tr.onLeave {
                  background: #ffe5e5 !important;
                }

                #printable-timesheet table tbody tr.onLeave:nth-child(even) {
                  background: #ffd5d5 !important;
                }
              }
            </style>
          </head>
          <body>
            ${generatePrintableHTML()}
          </body>
        </html>
      `)
      printWindow.document.close()

      // Wait for images to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.formSection}>
        <h1 className={styles.title}>Timesheet</h1>

        <div className={styles.form}>
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
            <label className={styles.label}>Date *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Start Time *</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={styles.input}
            />
          </div>

          <button
            onClick={fetchTimesheetData}
            className={styles.previewButton}
            disabled={loading || !selectedDepartment}
          >
            {loading ? 'Loading...' : 'Preview Timesheet'}
          </button>
        </div>
      </div>

      {showPreview && timesheetData && (
        <div className={styles.previewSection}>
          <div className={styles.previewActions}>
            <button onClick={handlePrint} className={styles.printButton}>
              Print Timesheet
            </button>
            <button onClick={() => setShowPreview(false)} className={styles.closeButton}>
              Close Preview
            </button>
          </div>

          <div className={styles.printableArea} id="printable-timesheet">
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <img
                  src="/woodwardlogo.png"
                  alt="Woodward Foods"
                  className={styles.logo}
                  style={{ height: '30px', width: '30px', maxHeight: '30px', maxWidth: '30px' }}
                />
                <h2 className={styles.companyName}>Woodward Foods Australia</h2>
              </div>
              <div className={styles.attribution}>
                Printed from Noel - Employee Management System
              </div>
            </div>

            <div className={styles.timesheetInfo}>
              <h3>Department: {timesheetData.departmentName}</h3>
              <p>Date: {new Date(timesheetData.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>

            <table className={styles.timesheetTable}>
              <thead>
                <tr>
                  <th>Payroll Number</th>
                  <th>Name</th>
                  <th>Start Time</th>
                  <th>Break</th>
                  <th>Time Finish</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {timesheetData.employees.map((employee) => {
                  const leaveCode = getLeaveCode(employee.leaveType)
                  const isOnLeave = !!leaveCode

                  return (
                    <tr key={employee.id} className={isOnLeave ? 'onLeave' : ''}>
                      <td>{employee.payroll_number || '-'}</td>
                      <td>
                        {employee.name}
                        {employee.english_name && ` (${employee.english_name})`}
                      </td>
                      <td className="editable-time">
                        {isOnLeave ? (
                          leaveCode
                        ) : (
                          <TimeSelector
                            value={employee.customStartTime || timesheetData.startTime}
                            onChange={(newTime) => handleTimeChange(employee.id, newTime)}
                          />
                        )}
                      </td>
                      <td>{isOnLeave ? leaveCode : ''}</td>
                      <td>{isOnLeave ? leaveCode : ''}</td>
                      <td>{isOnLeave ? leaveCode : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
