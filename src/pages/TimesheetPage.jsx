import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './TimesheetPage.module.css'

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
        .select('id, name, english_name, payroll_number')
        .eq('department_id', selectedDepartment)
        .eq('is_active', true)
        .order('payroll_number')

      if (empError) throw empError

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
          leaveType: leaveMap[emp.id] || null
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
      default:
        return ''
    }
  }

  const handlePrint = () => {
    // Create a new window for printing only the timesheet
    const printWindow = window.open('', '_blank')
    const printContent = document.getElementById('printable-timesheet')

    if (printWindow && printContent) {
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
                gap: 8px;
                margin-bottom: 15px;
                padding-bottom: 0;
                border-bottom: none;
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
              }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
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
              <img
                src="/woodwardlogo.png"
                alt="Woodward Foods"
                className={styles.logo}
                style={{ height: '30px', width: '30px', maxHeight: '30px', maxWidth: '30px' }}
              />
              <h2 className={styles.companyName}>Woodward Foods Australia</h2>
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
                    <tr key={employee.id}>
                      <td>{employee.payroll_number || '-'}</td>
                      <td>
                        {employee.name}
                        {employee.english_name && ` (${employee.english_name})`}
                      </td>
                      <td>{isOnLeave ? leaveCode : timesheetData.startTime}</td>
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
