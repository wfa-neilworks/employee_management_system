import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './WorkInstructionEditorPage.module.css'

const MAX_IMG_SIZE = 5 * 1024 * 1024

// Extract code from location/section name: "Kill Floor – Section A" → "KFSA"
function locationCode(name) {
  return name
    .replace(/[–—-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && /[a-zA-Z]/.test(w))
    .map(w => w[0].toUpperCase())
    .join('')
}

export default function WorkInstructionEditorPage() {
  const { id } = useParams() // undefined = new
  const { account } = useAuth()
  const navigate = useNavigate()
  const isNew = !id

  const [departments, setDepartments] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [docNumberPreview, setDocNumberPreview] = useState('')

  const [form, setForm] = useState({
    department_id: '',
    location: '',
    title: '',
    aim: '',
    ppe: '',
    issue_no: 1,
    revision_date: new Date().toISOString().split('T')[0],
    authorized_by: 'QA Manager',
    status: 'draft',
    key_points: [{ text: '' }],
  })

  const [steps, setSteps] = useState([
    { step_text: '', criteria_text: '', criteria_image_url: null, uploading: false, imgError: '' }
  ])

  useEffect(() => {
    fetchDepts()
    if (!isNew) loadWI()
  }, [id])

  const fetchDepts = async () => {
    const { data } = await supabase.from('departments').select('id, display_name').order('display_name')
    setDepartments(data || [])
  }

  const loadWI = async () => {
    const { data: wi } = await supabase
      .from('work_instructions')
      .select('*')
      .eq('id', id)
      .single()
    if (!wi) return

    setForm({
      department_id: wi.department_id || '',
      location: wi.location || '',
      title: wi.title,
      aim: wi.aim,
      ppe: wi.ppe,
      issue_no: wi.issue_no,
      revision_date: wi.revision_date,
      authorized_by: wi.authorized_by,
      status: wi.status,
      key_points: wi.key_points?.length > 0 ? wi.key_points : [{ text: '' }],
    })
    setDocNumberPreview(wi.doc_number)

    const { data: wiSteps } = await supabase
      .from('wi_steps')
      .select('*')
      .eq('wi_id', id)
      .order('order_index')

    if (wiSteps?.length > 0) {
      setSteps(wiSteps.map(s => ({
        id: s.id,
        step_text: s.step_text,
        criteria_text: s.criteria_text || '',
        criteria_image_url: s.criteria_image_url || null,
        uploading: false,
        imgError: '',
      })))
    }
  }

  // Update doc number preview when location changes
  useEffect(() => {
    if (!form.location.trim() || !isNew) return
    const code = locationCode(form.location.trim())
    if (!code) return
    supabase
      .from('work_instructions')
      .select('id', { count: 'exact', head: true })
      .eq('dept_code', code)
      .then(({ count }) => {
        const next = String((count || 0) + 1).padStart(2, '0')
        setDocNumberPreview(`${code}-${next}`)
      })
  }, [form.location])

  // --- Step helpers ---
  const addStep = () => setSteps(p => [...p, { step_text: '', criteria_text: '', criteria_image_url: null, uploading: false, imgError: '' }])
  const removeStep = (i) => setSteps(p => p.filter((_, idx) => idx !== i))
  const moveStep = (i, dir) => setSteps(p => {
    const arr = [...p]; const t = i + dir
    if (t < 0 || t >= arr.length) return p
    ;[arr[i], arr[t]] = [arr[t], arr[i]]; return arr
  })
  const updateStep = (i, field, val) => setSteps(p => {
    const arr = [...p]; arr[i] = { ...arr[i], [field]: val }; return arr
  })

  const fileRefs = useRef([])

  const handleImagePick = async (i, file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      updateStep(i, 'imgError', 'Only JPG and PNG allowed.'); return
    }
    if (file.size > MAX_IMG_SIZE) {
      updateStep(i, 'imgError', 'File must be under 5MB.'); return
    }
    updateStep(i, 'uploading', true)
    updateStep(i, 'imgError', '')

    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const path = `${account.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('wi-images').upload(path, file, { contentType: file.type })
    if (upErr) { updateStep(i, 'uploading', false); updateStep(i, 'imgError', upErr.message); return }

    const { data: { publicUrl } } = supabase.storage.from('wi-images').getPublicUrl(path)
    setSteps(p => { const arr = [...p]; arr[i] = { ...arr[i], criteria_image_url: publicUrl, uploading: false, imgError: '' }; return arr })
  }

  // --- Key point helpers ---
  const addKP = () => setForm(p => ({ ...p, key_points: [...p.key_points, { text: '' }] }))
  const removeKP = (i) => setForm(p => ({ ...p, key_points: p.key_points.filter((_, idx) => idx !== i) }))
  const updateKP = (i, val) => setForm(p => {
    const kp = [...p.key_points]; kp[i] = { text: val }; return { ...p, key_points: kp }
  })

  const handleSave = async (statusOverride) => {
    const saveStatus = statusOverride || form.status
    if (!form.department_id) { setError('Select a department.'); return }
    if (!form.location.trim()) { setError('Location/Section is required.'); return }
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.aim.trim()) { setError('Aim is required.'); return }
    if (!form.ppe.trim()) { setError('PPE is required.'); return }
    if (steps.some(s => s.uploading)) { setError('Wait for images to finish uploading.'); return }
    if (steps.some(s => !s.step_text.trim())) { setError('All steps must have text.'); return }

    setError('')
    setSaving(true)

    const code = locationCode(form.location.trim())

    let wiId = id
    let docNumber = docNumberPreview

    if (isNew) {
      const { count } = await supabase
        .from('work_instructions')
        .select('id', { count: 'exact', head: true })
        .eq('dept_code', code)
      const next = String((count || 0) + 1).padStart(2, '0')
      docNumber = `${code}-${next}`

      const { data: inserted, error: insErr } = await supabase
        .from('work_instructions')
        .insert({
          doc_number: docNumber,
          dept_code: code,
          department_id: form.department_id,
          location: form.location.trim(),
          title: form.title.trim(),
          aim: form.aim.trim(),
          ppe: form.ppe.trim(),
          issue_no: form.issue_no,
          revision_date: form.revision_date,
          authorized_by: form.authorized_by.trim(),
          status: saveStatus,
          key_points: form.key_points.filter(k => k.text.trim()),
          created_by: account.id,
        })
        .select('id')
        .single()

      if (insErr) { setError(insErr.message); setSaving(false); return }
      wiId = inserted.id
    } else {
      const { error: updErr } = await supabase
        .from('work_instructions')
        .update({
          department_id: form.department_id,
          location: form.location.trim(),
          title: form.title.trim(),
          aim: form.aim.trim(),
          ppe: form.ppe.trim(),
          issue_no: form.issue_no,
          revision_date: form.revision_date,
          authorized_by: form.authorized_by.trim(),
          status: saveStatus,
          key_points: form.key_points.filter(k => k.text.trim()),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (updErr) { setError(updErr.message); setSaving(false); return }

      // Delete existing steps and re-insert
      await supabase.from('wi_steps').delete().eq('wi_id', id)
    }

    // Insert steps
    const stepRows = steps.map((s, idx) => ({
      wi_id: wiId,
      order_index: idx,
      step_text: s.step_text.trim(),
      criteria_text: s.criteria_text?.trim() || null,
      criteria_image_url: s.criteria_image_url || null,
    }))
    const { error: stepsErr } = await supabase.from('wi_steps').insert(stepRows)
    if (stepsErr) { setError(stepsErr.message); setSaving(false); return }

    setSaving(false)
    navigate(`/work-instructions/${wiId}`)
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>{isNew ? 'New Work Instruction' : 'Edit Work Instruction'}</h1>
          {docNumberPreview && <p className={styles.docPreview}>Document No: <strong>{docNumberPreview}</strong></p>}
        </div>
        <div className={styles.headerActions}>
          <button className={styles.cancelBtn} onClick={() => navigate('/work-instructions')}>Cancel</button>
          <button className={styles.draftBtn} onClick={() => handleSave('draft')} disabled={saving}>
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button className={styles.publishBtn} onClick={() => handleSave('published')} disabled={saving}>
            {saving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Header fields */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Document Header</h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Department *</label>
            <select
              className={styles.select}
              value={form.department_id}
              onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}
              disabled={!isNew}
            >
              <option value="">Select department...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.display_name}</option>)}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Location / Section *</label>
            <input
              className={styles.input}
              value={form.location}
              placeholder="e.g. Kill Floor"
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              disabled={!isNew}
            />
            {form.location.trim() && (
              <span className={styles.hint}>Code: {locationCode(form.location.trim())}</span>
            )}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Issue No.</label>
            <input className={styles.input} type="number" min="1" value={form.issue_no}
              onChange={e => setForm(p => ({ ...p, issue_no: parseInt(e.target.value) || 1 }))} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Date of Revision</label>
            <input className={styles.input} type="date" value={form.revision_date}
              onChange={e => setForm(p => ({ ...p, revision_date: e.target.value }))} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Authorized By</label>
            <input className={styles.input} value={form.authorized_by}
              onChange={e => setForm(p => ({ ...p, authorized_by: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Title / Aim / PPE */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Work Instruction Details</h2>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Title *</label>
          <input className={styles.input} value={form.title} placeholder="e.g. Load Runner Tree"
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Aim *</label>
          <textarea className={styles.textarea} rows={2} value={form.aim}
            placeholder="To hygienically..."
            onChange={e => setForm(p => ({ ...p, aim: e.target.value }))} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>PPE *</label>
          <input className={styles.input} value={form.ppe} placeholder="GREEN hair net, beard snood..."
            onChange={e => setForm(p => ({ ...p, ppe: e.target.value }))} />
        </div>
      </div>

      {/* Steps */}
      <div className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Steps & Performance Criteria</h2>
          <button className={styles.addRowBtn} onClick={addStep}>+ Add Step</button>
        </div>

        <div className={styles.stepsHeader}>
          <div className={styles.stepsCol}>Steps</div>
          <div className={styles.stepsCol}>Performance Criteria</div>
        </div>

        {steps.map((step, i) => (
          <div key={i} className={styles.stepRow}>
            <div className={styles.stepControls}>
              <button className={styles.moveBtn} onClick={() => moveStep(i, -1)} disabled={i === 0}>▲</button>
              <span className={styles.stepNum}>{i + 1}</span>
              <button className={styles.moveBtn} onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>▼</button>
              <button className={styles.removeBtn} onClick={() => removeStep(i)} disabled={steps.length === 1}>✕</button>
            </div>
            <div className={styles.stepLeft}>
              <textarea
                className={styles.stepTextarea}
                rows={3}
                value={step.step_text}
                placeholder="Describe the step..."
                onChange={e => updateStep(i, 'step_text', e.target.value)}
              />
            </div>
            <div className={styles.stepRight}>
              <textarea
                className={styles.stepTextarea}
                rows={3}
                value={step.criteria_text}
                placeholder="Performance criteria (optional)..."
                onChange={e => updateStep(i, 'criteria_text', e.target.value)}
              />
              {/* Image for this criteria */}
              <div className={styles.criteriaImg}>
                {step.uploading && <div className={styles.imgUploading}>Uploading...</div>}
                {step.criteria_image_url && !step.uploading && (
                  <div className={styles.imgPreviewWrap}>
                    <img src={step.criteria_image_url} alt="" className={styles.imgPreview} />
                    <button className={styles.imgRemoveBtn} onClick={() => updateStep(i, 'criteria_image_url', null)}>Remove image</button>
                  </div>
                )}
                {!step.criteria_image_url && !step.uploading && (
                  <button className={styles.imgAddBtn} onClick={() => fileRefs.current[i]?.click()}>
                    + Add Image
                  </button>
                )}
                {step.imgError && <div className={styles.imgError}>{step.imgError}</div>}
                <input
                  type="file" accept="image/jpeg,image/png"
                  style={{ display: 'none' }}
                  ref={el => fileRefs.current[i] = el}
                  onChange={e => handleImagePick(i, e.target.files[0])}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Points */}
      <div className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Key Points</h2>
          <button className={styles.addRowBtn} onClick={addKP}>+ Add Point</button>
        </div>
        <div className={styles.keyPointList}>
          {form.key_points.map((kp, i) => (
            <div key={i} className={styles.keyPointRow}>
              <span className={styles.bullet}>•</span>
              <input
                className={styles.keyPointInput}
                value={kp.text}
                placeholder="Key point..."
                onChange={e => updateKP(i, e.target.value)}
              />
              <button className={styles.removeBtn} onClick={() => removeKP(i)} disabled={form.key_points.length === 1}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.bottomActions}>
        <button className={styles.cancelBtn} onClick={() => navigate('/work-instructions')}>Cancel</button>
        <button className={styles.draftBtn} onClick={() => handleSave('draft')} disabled={saving}>
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button className={styles.publishBtn} onClick={() => handleSave('published')} disabled={saving}>
          {saving ? 'Saving...' : 'Publish'}
        </button>
      </div>
    </div>
  )
}
