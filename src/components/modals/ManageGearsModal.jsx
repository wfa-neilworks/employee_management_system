import { useState, useEffect } from 'react'
import { supabase, GEARS, GLOVE_SIZES } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function ManageGearsModal({ employee, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedGears, setSelectedGears] = useState([])
  const [gloveSize, setGloveSize] = useState('')

  useEffect(() => {
    if (employee.employee_gears) {
      setSelectedGears(employee.employee_gears.map(g => g.gear_type))
      // Set glove size if mesh gloves are assigned
      const meshGlove = employee.employee_gears.find(g => g.gear_type === 'MESH_GLOVES')
      if (meshGlove && meshGlove.size) {
        setGloveSize(meshGlove.size)
      }
    }
  }, [employee])

  const handleGearToggle = (gearType) => {
    if (selectedGears.includes(gearType)) {
      setSelectedGears(selectedGears.filter(g => g !== gearType))
      // Clear glove size if mesh gloves are unchecked
      if (gearType === 'MESH_GLOVES') {
        setGloveSize('')
      }
    } else {
      setSelectedGears([...selectedGears, gearType])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate that glove size is selected if mesh gloves are selected
    if (selectedGears.includes('MESH_GLOVES') && !gloveSize) {
      setError('Please select a size for Mesh Gloves')
      return
    }

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
          assigned_by: user.id,
          // Add size only for mesh gloves
          ...(gearType === 'MESH_GLOVES' && gloveSize ? { size: gloveSize } : {})
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

        {selectedGears.includes('MESH_GLOVES') && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Glove Size *</label>
            <select
              value={gloveSize}
              onChange={(e) => setGloveSize(e.target.value)}
              className={styles.select}
              required
              disabled={loading}
            >
              <option value="">Select size...</option>
              {GLOVE_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        )}

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
