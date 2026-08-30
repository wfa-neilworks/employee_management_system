import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import jsPDF from 'jspdf'
import styles from './ReportPage.module.css'

const ALL_COLUMNS = [
  { key: 'payroll_number', label: 'Payroll #' },
  { key: 'name', label: 'Name' },
  { key: 'english_name', label: 'English Name' },
  { key: 'locker_number', label: 'Locker' },
  { key: 'employment_status', label: 'Employment Status' },
  { key: 'wage_status', label: 'Wage Status' },
  { key: 'q_fever', label: 'Q-Fever' },
  { key: 'gears', label: 'Gears' },
  { key: 'start_date', label: 'Start Date' },
]

export default function ReportPage() {
  const { account } = useAuth()

  // Data
  const [departments, setDepartments] = useState([])
  const [employmentStatuses, setEmploymentStatuses] = useState([])
  const [wageStatuses, setWageStatuses] = useState([])

  // Column selection
  const [selectedColumns, setSelectedColumns] = useState(
    Object.fromEntries(ALL_COLUMNS.map(c => [c.key, true]))
  )

  // Filters
  const [selectedDepartments, setSelectedDepartments] = useState([]) // empty = all
  const [selectedEmploymentStatuses, setSelectedEmploymentStatuses] = useState([]) // empty = all
  const [selectedWageStatuses, setSelectedWageStatuses] = useState([]) // empty = all
  const [qFeverFilter, setQFeverFilter] = useState('both') // 'yes' | 'no' | 'both'

  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState(null) // employee rows for preview count

  useEffect(() => {
    fetchPresets()
  }, [])

  const fetchPresets = async () => {
    const [depts, empStatuses, wageStats] = await Promise.all([
      supabase.from('departments').select('id, name, display_name').order('display_name'),
      supabase.from('employment_statuses').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('wage_statuses').select('*').eq('is_active', true).order('sort_order'),
    ])
    setDepartments(depts.data || [])
    setEmploymentStatuses(empStatuses.data || [])
    setWageStatuses(wageStats.data || [])
  }

  const toggleColumn = (key) => {
    setSelectedColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleAll = (checked) => {
    setSelectedColumns(Object.fromEntries(ALL_COLUMNS.map(c => [c.key, checked])))
  }

  const toggleListItem = (list, setList, value) => {
    setList(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const fetchEmployees = async () => {
    let query = supabase
      .from('employees')
      .select('*, employee_gears(gear_type, size), departments(id, display_name)')
      .eq('is_active', true)

    if (selectedDepartments.length > 0) {
      query = query.in('department_id', selectedDepartments)
    }
    if (selectedEmploymentStatuses.length > 0) {
      query = query.in('employment_status', selectedEmploymentStatuses)
    }
    if (selectedWageStatuses.length > 0) {
      query = query.in('wage_status', selectedWageStatuses)
    }
    if (qFeverFilter === 'yes') query = query.eq('q_fever', true)
    if (qFeverFilter === 'no') query = query.eq('q_fever', false)

    // Sort by wage status sort_order then name
    const { data: wsData } = await supabase
      .from('wage_statuses').select('value, sort_order').order('sort_order')
    const wsOrder = {}
    ;(wsData || []).forEach(ws => { wsOrder[ws.value] = ws.sort_order })

    const { data, error } = await query.order('name')
    if (error) throw error

    return (data || []).sort((a, b) => {
      const oa = wsOrder[a.wage_status] ?? 999
      const ob = wsOrder[b.wage_status] ?? 999
      if (oa !== ob) return oa - ob
      return a.name.localeCompare(b.name)
    })
  }

  const getCellValue = (emp, key) => {
    switch (key) {
      case 'payroll_number': return emp.payroll_number || '-'
      case 'name': return emp.name || '-'
      case 'english_name': return emp.english_name || '-'
      case 'locker_number': return emp.locker_number || '-'
      case 'employment_status': return emp.employment_status?.replace(/_/g, ' ') || '-'
      case 'wage_status': return emp.wage_status?.replace(/_/g, ' ') || '-'
      case 'q_fever': return emp.q_fever ? 'Yes' : 'No'
      case 'gears':
        return emp.employee_gears?.length > 0
          ? emp.employee_gears.map(g => {
              const label = g.gear_type.replace(/_/g, ' ')
              return g.size ? `${label} (${g.size})` : label
            }).join(', ')
          : '-'
      case 'start_date':
        return emp.start_date ? new Date(emp.start_date).toLocaleDateString('en-AU') : '-'
      default: return '-'
    }
  }

  const activeColumns = ALL_COLUMNS.filter(c => selectedColumns[c.key])

  const handleGenerate = async () => {
    const anyColumn = activeColumns.length > 0
    if (!anyColumn) return

    setGenerating(true)
    try {
      const employees = await fetchEmployees()
      if (employees.length === 0) {
        alert('No employees match the selected filters.')
        setGenerating(false)
        return
      }
      await generatePDF(employees)
    } catch (err) {
      alert('Error generating report: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const getLogoBase64 = () => new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = '/noel-logo.png'
  })

  const generatePDF = async (employees) => {
    const logoBase64 = await getLogoBase64()

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 14
    const footerY = pageH - 8

    const printedBy = `${account?.first_name || ''} ${account?.last_name || ''}`.trim() || account?.email || 'Unknown'
    const now = new Date()
    const dateTimeStr = now.toLocaleDateString('en-AU') + ' ' + now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })

    // Column widths — distribute evenly across page width minus margins
    const tableW = pageW - margin * 2
    const colW = tableW / activeColumns.length

    const drawPage = (pageNum, totalPages) => {
      // ── LOGO (centered) ───────────────────────────────────────────────────────
      if (logoBase64) {
        const imgProps = doc.getImageProperties(logoBase64)
        const logoH = 14
        const logoW = (imgProps.width / imgProps.height) * logoH
        doc.addImage(logoBase64, 'PNG', (pageW - logoW) / 2, 4, logoW, logoH)
      }

      // ── TABLE HEADER ─────────────────────────────────────────────────────────
      const tableStartY = 22
      const rowH = 8
      const headerH = 9

      doc.setFillColor(30, 30, 30)
      doc.rect(margin, tableStartY, tableW, headerH, 'F')

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(212, 175, 55) // yellow-gold

      activeColumns.forEach((col, i) => {
        const cellX = margin + i * colW
        const cellCenterX = cellX + colW / 2
        doc.text(col.label.toUpperCase(), cellCenterX, tableStartY + 6, { align: 'center', maxWidth: colW - 2 })
      })

      // ── TABLE ROWS ───────────────────────────────────────────────────────────
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)

      let y = tableStartY + headerH
      employees.forEach((emp, rowIdx) => {
        if (rowIdx % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, y, tableW, rowH, 'F')
        }

        doc.setTextColor(30, 30, 30)
        activeColumns.forEach((col, i) => {
          const cellX = margin + i * colW
          const val = getCellValue(emp, col.key)
          // Name is left-aligned, all others centered
          if (col.key === 'name') {
            doc.text(String(val), cellX + 2, y + 5.5, { maxWidth: colW - 4 })
          } else {
            doc.text(String(val), cellX + colW / 2, y + 5.5, { align: 'center', maxWidth: colW - 2 })
          }
        })

        // Row border
        doc.setDrawColor(220, 220, 220)
        doc.line(margin, y + rowH, margin + tableW, y + rowH)

        y += rowH
      })

      // Outer table border
      doc.setDrawColor(180, 180, 180)
      doc.rect(margin, tableStartY, tableW, headerH + employees.length * rowH)

      // Column dividers
      activeColumns.forEach((_, i) => {
        if (i === 0) return
        const x = margin + i * colW
        doc.setDrawColor(200, 200, 200)
        doc.line(x, tableStartY, x, tableStartY + headerH + employees.length * rowH)
      })

      // ── FOOTER ───────────────────────────────────────────────────────────────
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)

      // Left: page number
      doc.text(`Page ${pageNum} of ${totalPages}`, margin, footerY)

      // Center: printed by
      doc.text(`Printed by: ${printedBy}`, pageW / 2, footerY, { align: 'center' })

      // Right: date & time
      doc.text(dateTimeStr, pageW - margin, footerY, { align: 'right' })

      // Footer line
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, footerY - 3, pageW - margin, footerY - 3)
    }

    // Calculate rows per page
    const tableStartY = 22
    const headerH = 9
    const rowH = 8
    const availableH = footerY - 6 - (tableStartY + headerH)
    const rowsPerPage = Math.floor(availableH / rowH)
    const totalPages = Math.ceil(employees.length / rowsPerPage)

    for (let page = 1; page <= totalPages; page++) {
      if (page > 1) doc.addPage()
      const pageEmployees = employees.slice((page - 1) * rowsPerPage, page * rowsPerPage)
      // Temporarily override employees for this page
      const origEmployees = employees.splice(0)
      employees.push(...pageEmployees)
      drawPage(page, totalPages)
      employees.splice(0)
      employees.push(...origEmployees)
    }

    const filename = `employee-report-${now.toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  }

  const allColumnsChecked = ALL_COLUMNS.every(c => selectedColumns[c.key])
  const someColumnsChecked = ALL_COLUMNS.some(c => selectedColumns[c.key])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Report</h1>
          <p className={styles.subtitle}>Configure and generate a custom employee PDF report</p>
        </div>
        <button
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={generating || activeColumns.length === 0}
        >
          {generating ? 'Generating...' : '⬇ Generate PDF'}
        </button>
      </div>

      <div className={styles.sections}>

        {/* COLUMNS */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Columns to Include</h2>
            <label className={styles.checkAll}>
              <input
                type="checkbox"
                checked={allColumnsChecked}
                ref={el => { if (el) el.indeterminate = !allColumnsChecked && someColumnsChecked }}
                onChange={e => toggleAll(e.target.checked)}
              />
              <span>Select All</span>
            </label>
          </div>
          <div className={styles.columnGrid}>
            {ALL_COLUMNS.map(col => (
              <label key={col.key} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedColumns[col.key]}
                  onChange={() => toggleColumn(col.key)}
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Filters</h2>
          <p className={styles.filterHint}>Leave a filter empty to include all values.</p>

          <div className={styles.filterGrid}>

            {/* Department */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Departments</label>
              <div className={styles.checkboxList}>
                {departments.map(dept => (
                  <label key={dept.id} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(dept.id)}
                      onChange={() => toggleListItem(selectedDepartments, setSelectedDepartments, dept.id)}
                    />
                    <span>{dept.display_name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Employment Status */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Employment Status</label>
              <div className={styles.checkboxList}>
                {employmentStatuses.map(s => (
                  <label key={s.value} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedEmploymentStatuses.includes(s.value)}
                      onChange={() => toggleListItem(selectedEmploymentStatuses, setSelectedEmploymentStatuses, s.value)}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Wage Status */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Wage Status</label>
              <div className={styles.checkboxList}>
                {wageStatuses.map(s => (
                  <label key={s.value} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedWageStatuses.includes(s.value)}
                      onChange={() => toggleListItem(selectedWageStatuses, setSelectedWageStatuses, s.value)}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Q-Fever */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Q-Fever</label>
              <div className={styles.checkboxList}>
                {[
                  { value: 'both', label: 'Both' },
                  { value: 'yes', label: 'Yes only' },
                  { value: 'no', label: 'No only' },
                ].map(opt => (
                  <label key={opt.value} className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="qfever"
                      value={opt.value}
                      checked={qFeverFilter === opt.value}
                      onChange={() => setQFeverFilter(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* PREVIEW SUMMARY */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Report Preview</h2>
          <div className={styles.previewTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {activeColumns.map(col => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {activeColumns.length === 0
                    ? <td className={styles.noResults}>Select at least one column</td>
                    : activeColumns.map(col => (
                        <td key={col.key} className={styles.previewCell}>—</td>
                      ))
                  }
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.previewNote}>
            {activeColumns.length} column{activeColumns.length !== 1 ? 's' : ''} selected.
            {selectedDepartments.length > 0 && ` · ${selectedDepartments.length} department(s) filtered.`}
            {selectedEmploymentStatuses.length > 0 && ` · ${selectedEmploymentStatuses.length} employment status(es) filtered.`}
            {selectedWageStatuses.length > 0 && ` · ${selectedWageStatuses.length} wage status(es) filtered.`}
            {qFeverFilter !== 'both' && ` · Q-Fever: ${qFeverFilter === 'yes' ? 'Yes only' : 'No only'}.`}
          </p>
        </div>

      </div>
    </div>
  )
}
