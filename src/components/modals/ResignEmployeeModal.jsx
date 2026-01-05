import { useState, useEffect } from 'react'
import { supabase, TERMINATION_TYPES } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './ResignEmployeeModal.module.css'

export default function ResignEmployeeModal({ employee, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [employeeGears, setEmployeeGears] = useState([])
  const [formData, setFormData] = useState({
    termination_type: 'RESIGNED',
    last_day_of_employment: new Date().toISOString().split('T')[0],
    date_of_notice: '',
    termination_explanation: '',
    evidence_attached: 'NO',
    evidence_1: '',
    evidence_2: '',
    termination_completed_by: '',
    termination_completed_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchEmployeeGears()
  }, [employee.id])

  const fetchEmployeeGears = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_gears')
        .select('gear_type')
        .eq('employee_id', employee.id)

      if (error) throw error
      setEmployeeGears(data || [])
    } catch (error) {
      console.error('Error fetching employee gears:', error)
    }
  }

  const hasMeshGloves = () => {
    return employeeGears.some(g =>
      g.gear_type === 'MESH_GLOVES' || g.gear_type === 'LONG_MESH_GLOVES'
    )
  }

  const hasMeshApron = () => {
    return employeeGears.some(g => g.gear_type === 'MESH_APRON')
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: formData.name,
          english_name: formData.english_name || null,
          payroll_number: formData.payroll_number || null,
          department_id: formData.department_id,
          employment_status: formData.employment_status,
          wage_status: formData.wage_status,
          locker_number: formData.locker_number || null,
          start_date: formData.start_date,
          updated_by: user.id
        })
        .eq('id', employee.id)

      if (error) throw error

      if (formData.department_id !== employee.department_id) {
        await supabase
          .from('employee_history')
          .insert([{
            employee_id: employee.id,
            action: 'DEPARTMENT_CHANGE',
            old_value: employee.department_id,
            new_value: formData.department_id,
            changed_by: user.id
          }])
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Edit Employee" onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>English Name</label>
          <input
            type="text"
            name="english_name"
            value={formData.english_name}
            onChange={handleChange}
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Payroll Number</label>
          <input
            type="text"
            name="payroll_number"
            value={formData.payroll_number}
            onChange={handleChange}
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Department *</label>
          <select
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={loading}
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
          <label className={styles.label}>Employment Status *</label>
          <select
            name="employment_status"
            value={formData.employment_status}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={loading}
          >
            {EMPLOYMENT_STATUS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Wage Status *</label>
          <select
            name="wage_status"
            value={formData.wage_status}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={loading}
          >
            {WAGE_STATUS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Locker Number</label>
          <input
            type="text"
            name="locker_number"
            value={formData.locker_number}
            onChange={handleChange}
            className={styles.input}
            disabled={loading}
          />
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

        {error && (
          <div className={styles.error}>{error}</div>
        )}

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
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
