import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './PresetDataPage.module.css'

const TABS = ['Departments', 'Gear Types', 'Employment Status', 'Wage Status']

export default function PresetDataPage() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Departments')

  useEffect(() => {
    if (!hasPermission('manage_preset_data')) {
      navigate('/')
    }
  }, [])

  if (!hasPermission('manage_preset_data')) {
    return <div className={styles.unauthorized}>You do not have permission to access this page.</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Preset Data</h1>
          <p className={styles.subtitle}>Manage departments, gear types, employment statuses, and wage statuses</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'Departments' && <DepartmentsTab />}
        {activeTab === 'Gear Types' && <GearTypesTab />}
        {activeTab === 'Employment Status' && <EmploymentStatusTab />}
        {activeTab === 'Wage Status' && <WageStatusTab />}
      </div>
    </div>
  )
}

// ─── DEPARTMENTS TAB ──────────────────────────────────────────────────────────

function DepartmentsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('display_name')
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (item) => {
    try {
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('department_id', item.id)
        .eq('is_active', true)

      if (count > 0) {
        setError(`Cannot delete "${item.display_name}" — it has ${count} active employee(s). Move them first.`)
        setDeleteItem(null)
        return
      }

      const { error } = await supabase.from('departments').delete().eq('id', item.id)
      if (error) throw error
      setDeleteItem(null)
      fetchItems()
    } catch (err) {
      setError(err.message)
      setDeleteItem(null)
    }
  }

  return (
    <div>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableHeader}>
        <span className={styles.count}>{items.length} department{items.length !== 1 ? 's' : ''}</span>
        <button className={styles.addButton} onClick={() => { setEditItem(null); setShowForm(true) }}>
          + Add Department
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Internal Key</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={3} className={styles.noResults}>No departments found</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td className={styles.primary}>{item.display_name}</td>
                  <td><span className={styles.code}>{item.name}</span></td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => { setEditItem(item); setShowForm(true) }}>Edit</button>
                      <button className={styles.deleteBtn} onClick={() => setDeleteItem(item)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <DepartmentForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchItems() }}
        />
      )}

      {deleteItem && (
        <ConfirmDelete
          name={deleteItem.display_name}
          onConfirm={() => handleDelete(deleteItem)}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}

function DepartmentForm({ item, onClose, onSuccess }) {
  const isEdit = !!item
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [displayName, setDisplayName] = useState(item?.display_name || '')
  const [internalKey, setInternalKey] = useState(item?.name || '')

  const handleDisplayNameChange = (e) => {
    const val = e.target.value
    setDisplayName(val)
    if (!isEdit) {
      setInternalKey(val.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!displayName.trim() || !internalKey.trim()) return
    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        const { error } = await supabase
          .from('departments')
          .update({ display_name: displayName.trim() })
          .eq('id', item.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({ name: internalKey.trim(), display_name: displayName.trim() })
        if (error) throw error
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>{isEdit ? 'Edit Department' : 'Add Department'}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Display Name *</label>
            <input
              className={styles.input}
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="e.g. Lamb BR"
              disabled={loading}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Internal Key *</label>
            <input
              className={styles.input}
              value={internalKey}
              onChange={e => setInternalKey(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))}
              placeholder="e.g. LAMB_BR"
              disabled={loading || isEdit}
              required
            />
            {!isEdit && <span className={styles.hint}>Auto-generated. Used internally — cannot be changed after creation.</span>}
            {isEdit && <span className={styles.hint}>Internal key cannot be changed after creation.</span>}
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── GEAR TYPES TAB ───────────────────────────────────────────────────────────

function GearTypesTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('gear_types')
        .select('*')
        .order('sort_order')
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (item) => {
    try {
      const { count } = await supabase
        .from('employee_gears')
        .select('id', { count: 'exact', head: true })
        .eq('gear_type', item.value)

      if (count > 0) {
        setError(`Cannot delete "${item.label}" — it is assigned to ${count} employee(s). Remove those assignments first.`)
        setDeleteItem(null)
        return
      }

      const { error } = await supabase.from('gear_types').delete().eq('id', item.id)
      if (error) throw error
      setDeleteItem(null)
      fetchItems()
    } catch (err) {
      setError(err.message)
      setDeleteItem(null)
    }
  }

  return (
    <div>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableHeader}>
        <span className={styles.count}>{items.length} gear type{items.length !== 1 ? 's' : ''}</span>
        <button className={styles.addButton} onClick={() => { setEditItem(null); setShowForm(true) }}>
          + Add Gear Type
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Label</th>
                <th>Internal Key</th>
                <th>Requires Size?</th>
                <th>Size Options</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className={styles.noResults}>No gear types found</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td className={styles.primary}>{item.label}</td>
                  <td><span className={styles.code}>{item.value}</span></td>
                  <td>
                    <span className={item.has_sizes ? styles.badgeYes : styles.badgeNo}>
                      {item.has_sizes ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    {item.has_sizes && item.sizes?.length > 0
                      ? <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.sizes.join(', ')}</span>
                      : <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>—</span>
                    }
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => { setEditItem(item); setShowForm(true) }}>Edit</button>
                      <button className={styles.deleteBtn} onClick={() => setDeleteItem(item)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <GearTypeForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchItems() }}
        />
      )}

      {deleteItem && (
        <ConfirmDelete
          name={deleteItem.label}
          onConfirm={() => handleDelete(deleteItem)}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}

function GearTypeForm({ item, onClose, onSuccess }) {
  const isEdit = !!item
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [label, setLabel] = useState(item?.label || '')
  const [internalKey, setInternalKey] = useState(item?.value || '')
  const [hasSizes, setHasSizes] = useState(item?.has_sizes ?? false)
  const [sizes, setSizes] = useState(item?.sizes || [])
  const [sizeInput, setSizeInput] = useState('')

  const handleLabelChange = (e) => {
    const val = e.target.value
    setLabel(val)
    if (!isEdit) {
      setInternalKey(val.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))
    }
  }

  const handleToggleHasSizes = (val) => {
    setHasSizes(val)
    if (!val) setSizes([])
  }

  const handleAddSize = () => {
    const trimmed = sizeInput.trim()
    if (!trimmed) return
    if (sizes.includes(trimmed)) {
      setSizeInput('')
      return
    }
    setSizes([...sizes, trimmed])
    setSizeInput('')
  }

  const handleSizeInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSize()
    }
  }

  const handleRemoveSize = (size) => {
    setSizes(sizes.filter(s => s !== size))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!label.trim() || !internalKey.trim()) return
    if (hasSizes && sizes.length === 0) {
      setError('Please add at least one size option.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        const { error } = await supabase
          .from('gear_types')
          .update({ label: label.trim(), has_sizes: hasSizes, sizes: hasSizes ? sizes : [] })
          .eq('id', item.id)
        if (error) throw error
      } else {
        const { data: existing } = await supabase
          .from('gear_types')
          .select('id')
          .eq('value', internalKey.trim())
          .maybeSingle()
        if (existing) {
          setError('A gear type with this internal key already exists.')
          setLoading(false)
          return
        }
        const { data: maxOrder } = await supabase
          .from('gear_types')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle()
        const { error } = await supabase
          .from('gear_types')
          .insert({
            value: internalKey.trim(),
            label: label.trim(),
            has_sizes: hasSizes,
            sizes: hasSizes ? sizes : [],
            sort_order: (maxOrder?.sort_order || 0) + 1
          })
        if (error) throw error
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>{isEdit ? 'Edit Gear Type' : 'Add Gear Type'}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Label *</label>
            <input
              className={styles.input}
              value={label}
              onChange={handleLabelChange}
              placeholder="e.g. Mesh Gloves"
              disabled={loading}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Internal Key *</label>
            <input
              className={styles.input}
              value={internalKey}
              onChange={e => setInternalKey(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))}
              placeholder="e.g. MESH_GLOVES"
              disabled={loading || isEdit}
              required
            />
            {!isEdit && <span className={styles.hint}>Auto-generated. Cannot be changed after creation.</span>}
            {isEdit && <span className={styles.hint}>Internal key cannot be changed after creation.</span>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Requires Size?</label>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggleOption} ${!hasSizes ? styles.toggleOptionActive : ''}`}
                onClick={() => handleToggleHasSizes(false)}
                disabled={loading}
              >
                No
              </button>
              <button
                type="button"
                className={`${styles.toggleOption} ${hasSizes ? styles.toggleOptionActive : ''}`}
                onClick={() => handleToggleHasSizes(true)}
                disabled={loading}
              >
                Yes
              </button>
            </div>
          </div>

          {hasSizes && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Size Options *</label>
              <div className={styles.sizeInputRow}>
                <input
                  className={styles.input}
                  value={sizeInput}
                  onChange={e => setSizeInput(e.target.value)}
                  onKeyDown={handleSizeInputKeyDown}
                  placeholder="e.g. Brown, Small, XL..."
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.addSizeBtn}
                  onClick={handleAddSize}
                  disabled={loading || !sizeInput.trim()}
                >
                  Add
                </button>
              </div>
              {sizes.length > 0 && (
                <div className={styles.sizeTagList}>
                  {sizes.map(size => (
                    <span key={size} className={styles.sizeTag}>
                      {size}
                      <button
                        type="button"
                        className={styles.sizeTagRemove}
                        onClick={() => handleRemoveSize(size)}
                        disabled={loading}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <span className={styles.hint}>Press Enter or click Add. These will appear as dropdown options when assigning this gear.</span>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Gear Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── EMPLOYMENT STATUS TAB ────────────────────────────────────────────────────

function EmploymentStatusTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('employment_statuses')
        .select('*')
        .order('sort_order')
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (item) => {
    try {
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('employment_status', item.value)
        .eq('is_active', true)

      if (count > 0) {
        setError(`Cannot delete "${item.label}" — ${count} active employee(s) currently have this status.`)
        setDeleteItem(null)
        return
      }

      const { error } = await supabase.from('employment_statuses').delete().eq('id', item.id)
      if (error) throw error
      setDeleteItem(null)
      fetchItems()
    } catch (err) {
      setError(err.message)
      setDeleteItem(null)
    }
  }

  return (
    <div>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableHeader}>
        <span className={styles.count}>{items.length} status{items.length !== 1 ? 'es' : ''}</span>
        <button className={styles.addButton} onClick={() => { setEditItem(null); setShowForm(true) }}>
          + Add Status
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Label</th>
                <th>Internal Key</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={3} className={styles.noResults}>No statuses found</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td className={styles.primary}>{item.label}</td>
                  <td><span className={styles.code}>{item.value}</span></td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => { setEditItem(item); setShowForm(true) }}>Edit</button>
                      <button className={styles.deleteBtn} onClick={() => setDeleteItem(item)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <StatusForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchItems() }}
        />
      )}

      {deleteItem && (
        <ConfirmDelete
          name={deleteItem.label}
          onConfirm={() => handleDelete(deleteItem)}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}

function StatusForm({ item, onClose, onSuccess }) {
  const isEdit = !!item
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [label, setLabel] = useState(item?.label || '')
  const [internalKey, setInternalKey] = useState(item?.value || '')

  const handleLabelChange = (e) => {
    const val = e.target.value
    setLabel(val)
    if (!isEdit) {
      setInternalKey(val.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!label.trim() || !internalKey.trim()) return
    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        const { error } = await supabase
          .from('employment_statuses')
          .update({ label: label.trim() })
          .eq('id', item.id)
        if (error) throw error
      } else {
        const { data: existing } = await supabase
          .from('employment_statuses')
          .select('id')
          .eq('value', internalKey.trim())
          .maybeSingle()
        if (existing) {
          setError('A status with this internal key already exists.')
          setLoading(false)
          return
        }
        const { data: maxOrder } = await supabase
          .from('employment_statuses')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle()
        const { error } = await supabase
          .from('employment_statuses')
          .insert({ value: internalKey.trim(), label: label.trim(), sort_order: (maxOrder?.sort_order || 0) + 1 })
        if (error) throw error
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>{isEdit ? 'Edit Employment Status' : 'Add Employment Status'}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Label *</label>
            <input
              className={styles.input}
              value={label}
              onChange={handleLabelChange}
              placeholder="e.g. Part Time"
              disabled={loading}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Internal Key *</label>
            <input
              className={styles.input}
              value={internalKey}
              onChange={e => setInternalKey(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))}
              placeholder="e.g. PART_TIME"
              disabled={loading || isEdit}
              required
            />
            {!isEdit && <span className={styles.hint}>Auto-generated. Cannot be changed after creation.</span>}
            {isEdit && <span className={styles.hint}>Internal key cannot be changed after creation.</span>}
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── WAGE STATUS TAB ─────────────────────────────────────────────────────────

function WageStatusTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('wage_statuses')
        .select('*')
        .order('sort_order')
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (item) => {
    try {
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('wage_status', item.value)
        .eq('is_active', true)

      if (count > 0) {
        setError(`Cannot delete "${item.label}" — ${count} active employee(s) currently have this wage status.`)
        setDeleteItem(null)
        return
      }

      const { error } = await supabase.from('wage_statuses').delete().eq('id', item.id)
      if (error) throw error
      setDeleteItem(null)
      fetchItems()
    } catch (err) {
      setError(err.message)
      setDeleteItem(null)
    }
  }

  return (
    <div>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableHeader}>
        <span className={styles.count}>{items.length} wage status{items.length !== 1 ? 'es' : ''}</span>
        <button className={styles.addButton} onClick={() => { setEditItem(null); setShowForm(true) }}>
          + Add Wage Status
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Label</th>
                <th>Internal Key</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={3} className={styles.noResults}>No wage statuses found</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td className={styles.primary}>{item.label}</td>
                  <td><span className={styles.code}>{item.value}</span></td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => { setEditItem(item); setShowForm(true) }}>Edit</button>
                      <button className={styles.deleteBtn} onClick={() => setDeleteItem(item)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <WageStatusForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchItems() }}
        />
      )}

      {deleteItem && (
        <ConfirmDelete
          name={deleteItem.label}
          onConfirm={() => handleDelete(deleteItem)}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}

function WageStatusForm({ item, onClose, onSuccess }) {
  const isEdit = !!item
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [label, setLabel] = useState(item?.label || '')
  const [internalKey, setInternalKey] = useState(item?.value || '')

  const handleLabelChange = (e) => {
    const val = e.target.value
    setLabel(val)
    if (!isEdit) {
      setInternalKey(val.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!label.trim() || !internalKey.trim()) return
    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        const { error } = await supabase
          .from('wage_statuses')
          .update({ label: label.trim() })
          .eq('id', item.id)
        if (error) throw error
      } else {
        const { data: existing } = await supabase
          .from('wage_statuses')
          .select('id')
          .eq('value', internalKey.trim())
          .maybeSingle()
        if (existing) {
          setError('A wage status with this internal key already exists.')
          setLoading(false)
          return
        }
        const { data: maxOrder } = await supabase
          .from('wage_statuses')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle()
        const { error } = await supabase
          .from('wage_statuses')
          .insert({ value: internalKey.trim(), label: label.trim(), sort_order: (maxOrder?.sort_order || 0) + 1 })
        if (error) throw error
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>{isEdit ? 'Edit Wage Status' : 'Add Wage Status'}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Label *</label>
            <input
              className={styles.input}
              value={label}
              onChange={handleLabelChange}
              placeholder="e.g. Labor Hire"
              disabled={loading}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Internal Key *</label>
            <input
              className={styles.input}
              value={internalKey}
              onChange={e => setInternalKey(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))}
              placeholder="e.g. LABOR_HIRE"
              disabled={loading || isEdit}
              required
            />
            {!isEdit && <span className={styles.hint}>Auto-generated. Cannot be changed after creation.</span>}
            {isEdit && <span className={styles.hint}>Internal key cannot be changed after creation.</span>}
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Wage Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── SHARED CONFIRM DELETE ────────────────────────────────────────────────────

function ConfirmDelete({ name, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>Confirm Delete</h2>
        <p className={styles.confirmText}>
          Are you sure you want to delete <strong>{name}</strong>? This cannot be undone.
        </p>
        <div className={styles.formActions}>
          <button className={styles.cancelButton} onClick={onCancel}>Cancel</button>
          <button className={styles.deleteConfirmBtn} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}
