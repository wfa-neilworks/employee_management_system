import { useState } from 'react'
import { supabase, LEAVE_TYPES } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function EditLeaveModal({ leave, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    leave_type: leave.leave_type || 'SICK_LEAVE',
    start_date: leave.start_date || '',
    end_date: leave.end_date || '',
    notes: leave.notes || ''
  })

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
      const { error } = await supabase
        .from('leave')
        .update({
          leave_type: formData.leave_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          notes: formData.notes || null,
          updated_by: user.id
        })
        .eq('id', leave.id)

      if (error) throw error

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error updating leave:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Edit Leave - ${leave.employees?.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}

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
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
