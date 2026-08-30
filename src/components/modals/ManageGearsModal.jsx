import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function ManageGearsModal({ employee, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gearTypes, setGearTypes] = useState([])
  const [selectedGears, setSelectedGears] = useState([])
  // sizes keyed by gear value, e.g. { MESH_GLOVES: 'BROWN' }
  const [sizes, setSizes] = useState({})

  useEffect(() => {
    fetchGearTypes()
  }, [])

  const fetchGearTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('gear_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      setGearTypes(data || [])

      // Pre-populate from existing employee gear assignments
      if (employee.employee_gears) {
        setSelectedGears(employee.employee_gears.map(g => g.gear_type))
        const existingSizes = {}
        employee.employee_gears.forEach(g => {
          if (g.size) existingSizes[g.gear_type] = g.size
        })
        setSizes(existingSizes)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGearToggle = (gearValue) => {
    if (selectedGears.includes(gearValue)) {
      setSelectedGears(selectedGears.filter(g => g !== gearValue))
      setSizes(prev => {
        const next = { ...prev }
        delete next[gearValue]
        return next
      })
    } else {
      setSelectedGears([...selectedGears, gearValue])
    }
  }

  const handleSizeChange = (gearValue, size) => {
    setSizes(prev => ({ ...prev, [gearValue]: size }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate: any selected gear with has_sizes must have a size entered
    const gearTypeMap = Object.fromEntries(gearTypes.map(g => [g.value, g]))
    for (const gearValue of selectedGears) {
      const gearType = gearTypeMap[gearValue]
      if (gearType?.has_sizes && !sizes[gearValue]?.trim()) {
        setError(`Please enter a size for "${gearType.label}"`)
        return
      }
    }

    setLoading(true)
    try {
      await supabase.from('employee_gears').delete().eq('employee_id', employee.id)

      if (selectedGears.length > 0) {
        const gearsToInsert = selectedGears.map(gearValue => ({
          employee_id: employee.id,
          gear_type: gearValue,
          assigned_by: user.id,
          ...(sizes[gearValue] ? { size: sizes[gearValue] } : {})
        }))

        const { error: insertError } = await supabase.from('employee_gears').insert(gearsToInsert)
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
          {gearTypes.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '12px' }}>
              No gear types configured. Add them in Preset Data.
            </div>
          ) : (
            <div className={styles.checkboxGroup}>
              {gearTypes.map((gear) => (
                <div key={gear.value}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedGears.includes(gear.value)}
                      onChange={() => handleGearToggle(gear.value)}
                      disabled={loading}
                      className={styles.checkbox}
                    />
                    <span>{gear.label}</span>
                  </label>

                  {selectedGears.includes(gear.value) && gear.has_sizes && (
                    <div style={{ marginLeft: '30px', marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Enter size (e.g. Brown, Medium, L)..."
                        value={sizes[gear.value] || ''}
                        onChange={(e) => handleSizeChange(gear.value, e.target.value)}
                        className={styles.input}
                        disabled={loading}
                        style={{ marginTop: '4px' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
