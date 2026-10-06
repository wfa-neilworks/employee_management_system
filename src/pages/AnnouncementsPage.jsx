import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './AnnouncementsPage.module.css'

export default function AnnouncementsPage() {
  const { account } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    body: '',
    targetType: 'ALL',
    selectedDepts: [],
    selectedEmployees: [],
  })

  useEffect(() => {
    fetchAnnouncements()
    fetchDepartments()
    fetchEmployees()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('*, accounts(first_name, last_name)')
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setLoading(false)
  }

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, display_name')
      .order('display_name')
    setDepartments(data || [])
  }

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, english_name, departments(display_name)')
      .eq('is_active', true)
      .order('name')
    setEmployees(data || [])
  }

  const toggleItem = (list, setList, id) => {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and message are required.')
      return
    }
    if (form.targetType === 'DEPARTMENT' && form.selectedDepts.length === 0) {
      setError('Select at least one department.')
      return
    }
    if (form.targetType === 'INDIVIDUAL' && form.selectedEmployees.length === 0) {
      setError('Select at least one employee.')
      return
    }

    setError('')
    setSubmitting(true)

    const targetIds = form.targetType === 'DEPARTMENT'
      ? form.selectedDepts
      : form.targetType === 'INDIVIDUAL'
        ? form.selectedEmployees
        : []

    const { error: insertErr } = await supabase
      .from('announcements')
      .insert({
        title: form.title.trim(),
        body: form.body.trim(),
        target_type: form.targetType,
        target_ids: targetIds,
        is_published: true,
        publish_at: new Date().toISOString(),
        created_by: account.id,
      })

    setSubmitting(false)

    if (insertErr) {
      setError(insertErr.message)
      return
    }

    setForm({ title: '', body: '', targetType: 'ALL', selectedDepts: [], selectedEmployees: [] })
    setShowForm(false)
    fetchAnnouncements()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement? This cannot be undone.')) return
    await supabase.from('announcements').delete().eq('id', id)
    fetchAnnouncements()
  }

  const getTargetLabel = (a) => {
    if (a.target_type === 'ALL') return 'All Employees'
    if (a.target_type === 'DEPARTMENT') {
      const names = departments
        .filter(d => a.target_ids?.includes(d.id))
        .map(d => d.display_name)
      return names.length > 0 ? names.join(', ') : 'Selected Departments'
    }
    return `${a.target_ids?.length || 0} Employee(s)`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Announcements</h1>
          <p className={styles.subtitle}>{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.newBtn} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {/* Compose form */}
      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>New Announcement</h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>Title *</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Announcement title"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Message *</label>
            <textarea
              className={styles.textarea}
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder="Write your announcement here..."
              rows={5}
            />
          </div>

          {/* Target */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Send To</label>
            <div className={styles.targetTabs}>
              {['ALL', 'DEPARTMENT', 'INDIVIDUAL'].map(t => (
                <button
                  key={t}
                  className={`${styles.targetTab} ${form.targetType === t ? styles.targetTabActive : ''}`}
                  onClick={() => setForm(p => ({ ...p, targetType: t, selectedDepts: [], selectedEmployees: [] }))}
                >
                  {t === 'ALL' ? 'All Employees' : t === 'DEPARTMENT' ? 'By Department' : 'Specific Employees'}
                </button>
              ))}
            </div>
          </div>

          {form.targetType === 'DEPARTMENT' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Departments</label>
              <div className={styles.checkList}>
                {departments.map(d => (
                  <label key={d.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={form.selectedDepts.includes(d.id)}
                      onChange={() => toggleItem(form.selectedDepts, v => setForm(p => ({ ...p, selectedDepts: v(p.selectedDepts) })), d.id)}
                    />
                    <span>{d.display_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.targetType === 'INDIVIDUAL' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Employees</label>
              <div className={styles.checkList}>
                {employees.map(e => (
                  <label key={e.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={form.selectedEmployees.includes(e.id)}
                      onChange={() => toggleItem(form.selectedEmployees, v => setForm(p => ({ ...p, selectedEmployees: v(p.selectedEmployees) })), e.id)}
                    />
                    <span>{e.name}{e.english_name ? ` (${e.english_name})` : ''} · {e.departments?.display_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Publish actions */}
          <div className={styles.formActions}>
            <button className={styles.scheduleBtn} disabled title="Scheduling coming soon">
              🕐 Schedule
            </button>
            <button
              className={styles.publishBtn}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Publishing...' : '📢 Publish Now'}
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}

      {/* Announcements list */}
      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : announcements.length === 0 ? (
        <div className={styles.empty}>No announcements yet. Create one above.</div>
      ) : (
        <div className={styles.list}>
          {announcements.map(a => (
            <div key={a.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <h3 className={styles.cardTitle}>{a.title}</h3>
                  <div className={styles.cardMeta}>
                    <span className={styles.targetBadge}>{getTargetLabel(a)}</span>
                    <span className={styles.metaDot}>·</span>
                    <span>{new Date(a.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className={styles.metaDot}>·</span>
                    <span>By {a.accounts?.first_name} {a.accounts?.last_name}</span>
                  </div>
                </div>
                <button className={styles.deleteBtn} onClick={() => handleDelete(a.id)}>
                  Delete
                </button>
              </div>
              <p className={styles.cardBody}>{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
