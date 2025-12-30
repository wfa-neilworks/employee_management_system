import { useState } from 'react'
import { supabase, RESIGNATION_REASONS } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function ResignEmployeeModal({ employee, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    resignation_reason: 'RESIGN',
    end_date: new Date().toISOString().split('T')[0]
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
      const { error } = await supabase
        .from('employees')
        .update({
          is_active: false,
          end_date: formData.end_date,
          resignation_reason: formData.resignation_reason,
          updated_by: user.id
        })
        .eq('id', employee.id)

      if (error) throw error

      await supabase
        .from('employee_history')
        .insert([{
          employee_id: employee.id,
          action: 'RESIGNED',
          new_value: formData.resignation_reason,
          changed_by: user.id
        }])

      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Resign Employee: ${employee.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.warningBox}>
          <p>Are you sure you want to resign this employee? This action will mark them as inactive but they will remain in the database.</p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Reason *</label>
          <select
            name="resignation_reason"
            value={formData.resignation_reason}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={loading}
          >
            {RESIGNATION_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
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
            className={`${styles.submitButton} ${styles.dangerButton}`}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Resignation'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
