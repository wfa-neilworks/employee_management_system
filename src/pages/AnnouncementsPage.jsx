import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './AnnouncementsPage.module.css'

const MAX_IMAGES = 2
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

const BLANK_FORM = {
  title: '',
  blocks: [{ type: 'text', value: '' }],
  targetType: 'ALL',
  selectedDepts: [],
  selectedEmployees: [],
}

function announcementToForm(a) {
  const blocks = a.content?.length > 0
    ? a.content.map(b =>
        b.type === 'image'
          ? { type: 'image', value: b.url, uploading: false, error: '' }
          : { type: 'text', value: b.value }
      )
    : [{ type: 'text', value: a.body || '' }]
  return {
    title: a.title,
    blocks,
    targetType: a.target_type || 'ALL',
    selectedDepts: a.target_type === 'DEPARTMENT' ? (a.target_ids || []) : [],
    selectedEmployees: a.target_type === 'INDIVIDUAL' ? (a.target_ids || []) : [],
  }
}

export default function AnnouncementsPage() {
  const { account } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null) // null = create, id = edit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(BLANK_FORM)

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

  const openCreate = () => {
    setEditingId(null)
    setForm(BLANK_FORM)
    setError('')
    setShowForm(true)
  }

  const openEdit = (a) => {
    setEditingId(a.id)
    setForm(announcementToForm(a))
    setError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(BLANK_FORM)
    setError('')
  }

  const toggleItem = (list, setList, id) => {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // --- Block editor helpers ---
  const imageCount = (blocks) => blocks.filter(b => b.type === 'image').length

  const addTextBlock = () =>
    setForm(p => ({ ...p, blocks: [...p.blocks, { type: 'text', value: '' }] }))

  const addImageBlock = () => {
    if (imageCount(form.blocks) >= MAX_IMAGES) return
    setForm(p => ({ ...p, blocks: [...p.blocks, { type: 'image', value: null, uploading: false, error: '' }] }))
  }

  const removeBlock = (idx) =>
    setForm(p => ({ ...p, blocks: p.blocks.filter((_, i) => i !== idx) }))

  const moveBlock = (idx, dir) => {
    setForm(p => {
      const blocks = [...p.blocks]
      const target = idx + dir
      if (target < 0 || target >= blocks.length) return p
      ;[blocks[idx], blocks[target]] = [blocks[target], blocks[idx]]
      return { ...p, blocks }
    })
  }

  const updateTextBlock = (idx, value) => {
    setForm(p => {
      const blocks = [...p.blocks]
      blocks[idx] = { ...blocks[idx], value }
      return { ...p, blocks }
    })
  }

  const handleImagePick = async (idx, file) => {
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setForm(p => { const b = [...p.blocks]; b[idx] = { ...b[idx], error: 'Only JPG and PNG files are allowed.' }; return { ...p, blocks: b } })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setForm(p => { const b = [...p.blocks]; b[idx] = { ...b[idx], error: 'File must be under 5MB.' }; return { ...p, blocks: b } })
      return
    }
    setForm(p => { const b = [...p.blocks]; b[idx] = { ...b[idx], uploading: true, error: '' }; return { ...p, blocks: b } })

    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const path = `${account.id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('announcement-images')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadErr) {
      setForm(p => { const b = [...p.blocks]; b[idx] = { ...b[idx], uploading: false, error: uploadErr.message }; return { ...p, blocks: b } })
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('announcement-images').getPublicUrl(path)
    setForm(p => { const b = [...p.blocks]; b[idx] = { type: 'image', value: publicUrl, uploading: false, error: '' }; return { ...p, blocks: b } })
  }

  const buildContent = () =>
    form.blocks
      .filter(b => b.type === 'text' ? b.value.trim() : b.value)
      .map(b => b.type === 'text' ? { type: 'text', value: b.value.trim() } : { type: 'image', url: b.value })

  const validate = () => {
    if (!form.title.trim()) { setError('Title is required.'); return false }
    const hasContent = form.blocks.some(b => b.type === 'text' ? b.value.trim() : b.value)
    if (!hasContent) { setError('Add at least one text or image block.'); return false }
    if (form.blocks.some(b => b.uploading)) { setError('Please wait for all images to finish uploading.'); return false }
    if (form.targetType === 'DEPARTMENT' && form.selectedDepts.length === 0) { setError('Select at least one department.'); return false }
    if (form.targetType === 'INDIVIDUAL' && form.selectedEmployees.length === 0) { setError('Select at least one employee.'); return false }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setError('')
    setSubmitting(true)

    const content = buildContent()
    const targetIds = form.targetType === 'DEPARTMENT'
      ? form.selectedDepts
      : form.targetType === 'INDIVIDUAL' ? form.selectedEmployees : []

    const payload = {
      title: form.title.trim(),
      body: content.filter(b => b.type === 'text').map(b => b.value).join('\n\n'),
      content,
      target_type: form.targetType,
      target_ids: targetIds,
    }

    let dbError
    if (editingId) {
      const { error } = await supabase.from('announcements').update(payload).eq('id', editingId)
      dbError = error
    } else {
      const { error } = await supabase.from('announcements').insert({
        ...payload,
        is_published: true,
        publish_at: new Date().toISOString(),
        created_by: account.id,
      })
      dbError = error
    }

    setSubmitting(false)
    if (dbError) { setError(dbError.message); return }

    closeForm()
    fetchAnnouncements()
  }

  const handleDelete = async (a) => {
    if (!confirm('Delete this announcement? This cannot be undone.')) return
    const imageBlocks = (a.content || []).filter(b => b.type === 'image')
    for (const block of imageBlocks) {
      try {
        const url = new URL(block.url)
        const path = url.pathname.split('/announcement-images/')[1]
        if (path) await supabase.storage.from('announcement-images').remove([path])
      } catch (_) {}
    }
    await supabase.from('announcements').delete().eq('id', a.id)
    fetchAnnouncements()
  }

  const getTargetLabel = (a) => {
    if (a.target_type === 'ALL') return 'All Employees'
    if (a.target_type === 'DEPARTMENT') {
      const names = departments.filter(d => a.target_ids?.includes(d.id)).map(d => d.display_name)
      return names.length > 0 ? names.join(', ') : 'Selected Departments'
    }
    return `${a.target_ids?.length || 0} Employee(s)`
  }

  const imgCount = imageCount(form.blocks)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Announcements</h1>
          <p className={styles.subtitle}>{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
        </div>
        {!showForm && (
          <button className={styles.newBtn} onClick={openCreate}>
            + New Announcement
          </button>
        )}
      </div>

      {/* Compose / Edit form */}
      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
            <button className={styles.formCancelBtn} onClick={closeForm}>Cancel</button>
          </div>

          {/* Title */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Title *</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Announcement title"
            />
          </div>

          {/* Block editor */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Content</label>
            <div className={styles.blockList}>
              {form.blocks.map((block, idx) => (
                <BlockItem
                  key={idx}
                  block={block}
                  idx={idx}
                  total={form.blocks.length}
                  onMoveUp={() => moveBlock(idx, -1)}
                  onMoveDown={() => moveBlock(idx, 1)}
                  onRemove={() => removeBlock(idx)}
                  onTextChange={val => updateTextBlock(idx, val)}
                  onImagePick={file => handleImagePick(idx, file)}
                />
              ))}
            </div>
            <div className={styles.blockActions}>
              <button className={styles.addBlockBtn} onClick={addTextBlock}>+ Text</button>
              <button
                className={`${styles.addBlockBtn} ${imgCount >= MAX_IMAGES ? styles.addBlockBtnDisabled : ''}`}
                onClick={addImageBlock}
                disabled={imgCount >= MAX_IMAGES}
                title={imgCount >= MAX_IMAGES ? 'Maximum 2 images per announcement' : ''}
              >
                + Image {imgCount > 0 ? `(${imgCount}/${MAX_IMAGES})` : ''}
              </button>
            </div>
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

          {/* Actions */}
          <div className={styles.formActions}>
            {!editingId && (
              <button className={styles.scheduleBtn} disabled title="Scheduling coming soon">
                🕐 Schedule
              </button>
            )}
            <button className={styles.publishBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? (editingId ? 'Saving...' : 'Publishing...')
                : (editingId ? '💾 Save Changes' : '📢 Publish Now')}
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
            <div key={a.id} className={`${styles.card} ${editingId === a.id ? styles.cardEditing : ''}`}>
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
                <div className={styles.cardActions}>
                  <button className={styles.editBtn} onClick={() => openEdit(a)}>Edit</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(a)}>Delete</button>
                </div>
              </div>
              <div className={styles.cardPreview}>
                {(a.content?.length > 0 ? a.content : [{ type: 'text', value: a.body }]).map((block, i) =>
                  block.type === 'image'
                    ? <img key={i} src={block.url} alt="" className={styles.cardPreviewImage} />
                    : <p key={i} className={styles.cardBody}>{block.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BlockItem({ block, idx, total, onMoveUp, onMoveDown, onRemove, onTextChange, onImagePick }) {
  const fileRef = useRef()

  return (
    <div className={styles.block}>
      <div className={styles.blockControls}>
        <button className={styles.blockMoveBtn} onClick={onMoveUp} disabled={idx === 0} title="Move up">▲</button>
        <button className={styles.blockMoveBtn} onClick={onMoveDown} disabled={idx === total - 1} title="Move down">▼</button>
        <span className={styles.blockType}>{block.type === 'text' ? 'TXT' : 'IMG'}</span>
        <button className={styles.blockRemoveBtn} onClick={onRemove} title="Remove block">✕</button>
      </div>
      <div className={styles.blockBody}>
        {block.type === 'text' ? (
          <textarea
            className={styles.blockTextarea}
            value={block.value}
            onChange={e => onTextChange(e.target.value)}
            placeholder="Write your text here..."
            rows={4}
          />
        ) : (
          <div className={styles.imageBlock}>
            {block.uploading && <div className={styles.imageUploading}>Uploading...</div>}
            {block.value && !block.uploading && (
              <img src={block.value} alt="Preview" className={styles.imagePreview} />
            )}
            {!block.value && !block.uploading && (
              <div className={styles.imagePlaceholder} onClick={() => fileRef.current?.click()}>
                <span>Click to choose image</span>
                <span className={styles.imagePlaceholderHint}>JPG or PNG · max 5MB</span>
              </div>
            )}
            {block.error && <div className={styles.imageError}>{block.error}</div>}
            {!block.uploading && (
              <button className={styles.imageChangeBtn} onClick={() => fileRef.current?.click()}>
                {block.value ? 'Change Image' : 'Choose Image'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={e => onImagePick(e.target.files[0])}
            />
          </div>
        )}
      </div>
    </div>
  )
}
