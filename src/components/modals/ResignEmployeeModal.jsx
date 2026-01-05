import { useState, useEffect } from 'react'
import { supabase, TERMINATION_TYPES } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function ResignEmployeeModal({ employee, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [employeeGears, setEmployeeGears] = useState([])
  const [formData, setFormData] = useState({
    resignation_reason: 'RESIGNED',
    end_date: new Date().toISOString().split('T')[0],
    termination_explanation: ''
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

  const hasMeshItems = () => {
    return employeeGears.some(g =>
      g.gear_type === 'MESH_GLOVES' ||
      g.gear_type === 'LONG_MESH_GLOVES' ||
      g.gear_type === 'MESH_APRON'
    )
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
          <p>This action will terminate the employee and mark them as inactive. Please provide the necessary details below.</p>
          {hasMeshItems() && (
            <p style={{marginTop: '10px', fontWeight: 'bold', color: '#ff0000'}}>
              ⚠ This employee has mesh gloves/apron assigned that must be returned!
            </p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Termination Type *</label>
          <select
            name="resignation_reason"
            value={formData.resignation_reason}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={loading}
          >
            {TERMINATION_TYPES.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Last Day of Employment *</label>
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
          <label className={styles.label}>Termination Explanation *</label>
          <textarea
            name="termination_explanation"
            value={formData.termination_explanation}
            onChange={handleChange}
            className={styles.textarea}
            required
            disabled={loading}
            rows="4"
            placeholder="Provide details about the termination..."
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
