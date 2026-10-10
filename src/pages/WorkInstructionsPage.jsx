import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './WorkInstructionsPage.module.css'

const CAN_EDIT = ['ADMIN', 'HR', 'QA']

export default function WorkInstructionsPage() {
  const { account } = useAuth()
  const navigate = useNavigate()
  const [wis, setWis] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [departments, setDepartments] = useState([])

  const canEdit = CAN_EDIT.includes(account?.account_type)

  useEffect(() => {
    fetchWIs()
    fetchDepts()
  }, [])

  const fetchWIs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('work_instructions')
      .select('id, doc_number, title, aim, status, revision_date, department_id, departments(display_name)')
      .order('doc_number')
    setWis(data || [])
    setLoading(false)
  }

  const fetchDepts = async () => {
    const { data } = await supabase.from('departments').select('id, display_name').order('display_name')
    setDepartments(data || [])
  }

  const handleDelete = async (wi) => {
    if (!confirm(`Delete "${wi.doc_number} – ${wi.title}"? This cannot be undone.`)) return
    await supabase.from('work_instructions').delete().eq('id', wi.id)
    fetchWIs()
  }

  const filtered = wis.filter(w => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      w.doc_number?.toLowerCase().includes(q) ||
      w.title?.toLowerCase().includes(q) ||
      w.aim?.toLowerCase().includes(q)
    const matchesDept = !filterDept || w.department_id === filterDept
    return matchesSearch && matchesDept
  })

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Work Instructions</h1>
          <p className={styles.subtitle}>{wis.length} document{wis.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button className={styles.addBtn} onClick={() => navigate('/work-instructions/new')}>
            + New Work Instruction
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div className={styles.filterRow}>
        <input
          className={styles.search}
          placeholder="Search by code, title, aim..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.display_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6M8 13h8M8 17h5"/>
          </svg>
          <p>{search || filterDept ? 'No results found.' : 'No work instructions yet.'}</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Doc No.</th>
                <th>Title</th>
                <th>Department</th>
                <th>Status</th>
                <th>Revision</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(wi => (
                <tr key={wi.id} className={styles.row} onClick={() => navigate(`/work-instructions/${wi.id}`)}>
                  <td className={styles.docNo}>{wi.doc_number}</td>
                  <td className={styles.wiTitle}>{wi.title}</td>
                  <td>{wi.departments?.display_name || '—'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${wi.status === 'published' ? styles.published : styles.draft}`}>
                      {wi.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>{wi.revision_date ? new Date(wi.revision_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                  {canEdit && (
                    <td onClick={e => e.stopPropagation()}>
                      <div className={styles.actions}>
                        <button className={styles.editBtn} onClick={() => navigate(`/work-instructions/${wi.id}/edit`)}>Edit</button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(wi)}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
