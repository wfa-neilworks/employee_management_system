import { useState, useEffect } from 'react'
import { supabase, LEAVE_TYPES } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function AddLeaveModal({ onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [showEmployeeList, setShowEmployeeList] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    leave_type: 'SICK_LEAVE',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = employees.filter((emp) =>
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.english_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.payroll_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredEmployees(filtered)
      setShowEmployeeList(true)
    } else {
      setFilteredEmployees([])
      setShowEmployeeList(false)
    }
  }, [searchQuery, employees])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, english_name, payroll_number, departments(display_name)')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleEmployeeSelect = (employee) => {
    setFormData({
      ...formData,
      employee_id: employee.id,
      employee_name: employee.name
    })
    setSearchQuery(employee.name)
    setShowEmployeeList(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('leave')
        .insert([{
          employee_id: formData.employee_id,
          leave_type: formData.leave_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          notes: formData.notes || null,
          created_by: user.id,
          updated_by: user.id
        }])
        .select()

      if (error) throw error

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error adding leave:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Add Employee Leave" onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGroup}>
          <label className={styles.label}>Search Employee *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or payroll number..."
              className={styles.input}
              required
              disabled={loading}
            />
            {showEmployeeList && filteredEmployees.length > 0 && (
              <div className={styles.employeeList}>
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className={styles.employeeItem}
                    onClick={() => handleEmployeeSelect(employee)}
                  >
                    <div className={styles.employeeName}>{employee.name}</div>
                    <div className={styles.employeeInfo}>
                      {employee.payroll_number && `#${employee.payroll_number}`}
                      {employee.departments?.display_name && ` • ${employee.departments.display_name}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Leave Type *</label>
          <select
            name="leave_type"
            value={formData.leave_type}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={loading}
          >
            {LEAVE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Start Date *</label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className={styles.input}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>End Date *</label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            className={styles.input}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className={styles.textarea}
            rows={3}
            disabled={loading}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || !formData.employee_id}
          >
            {loading ? 'Adding...' : 'Add Leave'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
