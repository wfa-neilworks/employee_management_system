import { useState, useEffect } from 'react'
import { supabase, GEARS } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function ManageGearsModal({ employee, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedGears, setSelectedGears] = useState([])

  useEffect(() => {
    if (employee.employee_gears) {
      setSelectedGears(employee.employee_gears.map(g => g.gear_type))
    }
  }, [employee])

  const handleGearToggle = (gearType) => {
    if (selectedGears.includes(gearType)) {
      setSelectedGears(selectedGears.filter(g => g !== gearType))
    } else {
      setSelectedGears([...selectedGears, gearType])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await supabase
        .from('employee_gears')
        .delete()
        .eq('employee_id', employee.id)

      if (selectedGears.length > 0) {
        const gearsToInsert = selectedGears.map(gearType => ({
          employee_id: employee.id,
          gear_type: gearType,
          assigned_by: user.id
        }))

        const { error: insertError } = await supabase
          .from('employee_gears')
          .insert(gearsToInsert)

        if (insertError) throw insertError
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
    <Modal title={`Manage Gears: ${employee.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Select Gears</label>
          <div className={styles.checkboxGroup}>
            {GEARS.map((gear) => (
              <label key={gear.value} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedGears.includes(gear.value)}
                  onChange={() => handleGearToggle(gear.value)}
                  disabled={loading}
                  className={styles.checkbox}
                />
                <span>{gear.label}</span>
              </label>
            ))}
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
            {loading ? 'Saving...' : 'Save Gears'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
