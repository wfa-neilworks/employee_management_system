import { useState, useEffect } from 'react'
import { supabase, DEPARTMENTS, EMPLOYMENT_STATUS, WAGE_STATUS } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function AddEmployeeModal({ departmentId, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    english_name: '',
    payroll_number: '',
    department_id: departmentId || '',
    employment_status: 'CASUAL',
    wage_status: 'WFA',
    locker_number: '',
    start_date: new Date().toISOString().split('T')[0]
  })

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
            {DEPARTMENTS.map((dept) => (
              <option key={dept.value} value={dept.value}>
                {dept.label}
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
            {loading ? 'Adding...' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
