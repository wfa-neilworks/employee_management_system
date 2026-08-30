import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function AddEmployeeModal({ departmentId, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [departments, setDepartments] = useState([])
  const [employmentStatuses, setEmploymentStatuses] = useState([])
  const [wageStatuses, setWageStatuses] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    english_name: '',
    payroll_number: '',
    department_id: departmentId || '',
    employment_status: '',
    wage_status: '',
    locker_number: '',
    start_date: new Date().toISOString().split('T')[0],
    q_fever: false
  })

  useEffect(() => {
    fetchDepartments()
    fetchEmploymentStatuses()
    fetchWageStatuses()
  }, [])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, display_name')
        .order('display_name')

      if (error) throw error
      setDepartments(data || [])
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const fetchEmploymentStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('employment_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      const statuses = data || []
      setEmploymentStatuses(statuses)
      if (statuses.length > 0) {
        setFormData(prev => ({ ...prev, employment_status: statuses[0].value }))
      }
    } catch (err) {
      console.error('Error fetching employment statuses:', err)
    }
  }

  const fetchWageStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('wage_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      const statuses = data || []
      setWageStatuses(statuses)
      if (statuses.length > 0) {
        setFormData(prev => ({ ...prev, wage_status: statuses[0].value }))
      }
    } catch (err) {
      console.error('Error fetching wage statuses:', err)
    }
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
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          name: formData.name,
          english_name: formData.english_name || null,
          payroll_number: formData.payroll_number || null,
          department_id: formData.department_id,
          employment_status: formData.employment_status,
          wage_status: formData.wage_status,
          locker_number: formData.locker_number || null,
          start_date: formData.start_date,
          q_fever: formData.q_fever,
          created_by: user.id,
          updated_by: user.id,
          is_active: true
        }])
        .select()

      if (error) throw error

      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Add New Employee" onClose={onClose}>
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
            {employmentStatuses.map((status) => (
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
            {wageStatuses.map((status) => (
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

        <div className={styles.formGroup}>
          <label className={styles.label}>Q-Fever</label>
          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggleOption} ${!formData.q_fever ? styles.toggleOptionActive : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, q_fever: false }))}
              disabled={loading}
            >
              No
            </button>
            <button
              type="button"
              className={`${styles.toggleOption} ${formData.q_fever ? styles.toggleOptionActive : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, q_fever: true }))}
              disabled={loading}
            >
              Yes
            </button>
          </div>
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
            {loading ? 'Adding...' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
