import { useState, useEffect, useRef, useCallback } from 'react'
import SignaturePad from 'signature_pad'
import { useAuth } from '../context/AuthContext'
import { supabase, PRODUCT_TYPES, PRODUCT_CATEGORIES } from '../lib/supabase'
import styles from './EmployeePortal.module.css'

const IconProfile = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)

const IconGear = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)

const IconLeave = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
  </svg>
)

const IconKnife = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2.5c0 1.5-1.5 6-1.5 6h-2S9.5 4 9.5 2.5a2.5 2.5 0 0 1 5 0z"/>
    <path d="M11 8.5V21"/>
    <path d="M9 21h6"/>
  </svg>
)

const IconWorkInstruction = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/>
    <path d="M8 13h8M8 17h5"/>
  </svg>
)

const IconBell = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const IconAnnouncement = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
)

// Profile removed from bottom nav
const NAV_TABS = [
  { key: 'announcement', label: 'Updates', icon: IconAnnouncement },
  { key: 'gears', label: 'Gears', icon: IconGear },
  { key: 'leave', label: 'Leave', icon: IconLeave },
  { key: 'knife', label: 'Knife', icon: IconKnife },
  { key: 'wi', label: 'Work Inst.', icon: IconWorkInstruction },
]

function ProfileTab({ employee, onSignOut }) {
  if (!employee) return <div className={styles.loading}>Loading profile...</div>

  return (
    <div className={styles.tabContent}>
      <div className={styles.avatarSection}>
        <div className={styles.avatar}>{employee.name?.charAt(0).toUpperCase()}</div>
        <h2 className={styles.employeeName}>{employee.name}</h2>
        {employee.english_name && <p className={styles.englishName}>{employee.english_name}</p>}
        <span className={styles.deptBadge}>{employee.departments?.display_name}</span>
      </div>

      <div className={styles.detailsCard}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Payroll Number</span>
          <span className={styles.detailValue}>{employee.payroll_number || '—'}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Employment Status</span>
          <span className={styles.detailValue}>{employee.employment_status?.replace(/_/g, ' ') || '—'}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Wage Status</span>
          <span className={styles.detailValue}>{employee.wage_status?.replace(/_/g, ' ') || '—'}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Locker Number</span>
          <span className={styles.detailValue}>{employee.locker_number || '—'}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Start Date</span>
          <span className={styles.detailValue}>
            {employee.start_date ? new Date(employee.start_date).toLocaleDateString('en-AU') : '—'}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Q-Fever</span>
          <span className={`${styles.detailValue} ${employee.q_fever ? styles.qfeverYes : styles.qfeverNo}`}>
            {employee.q_fever ? 'Vaccinated' : 'Not Vaccinated'}
          </span>
        </div>
      </div>

      <div className={styles.logoutSection}>
        <button className={styles.logoutBtn} onClick={onSignOut}>
          <IconLogout /> Sign Out
        </button>
      </div>
    </div>
  )
}

function AnnouncementTab({ announcements, unreadIds, onRead }) {
  const [selected, setSelected] = useState(null)

  const handleOpen = (a) => {
    if (unreadIds.has(a.id)) onRead(a.id)
    setSelected(a)
  }

  // Detail view
  if (selected) {
    const blocks = selected.content?.length > 0
      ? selected.content
      : [{ type: 'text', value: selected.body }]

    return (
      <div className={styles.tabContent}>
        <div className={styles.detailBack}>
          <button className={styles.backBtn} onClick={() => setSelected(null)}>
            <IconBack /> Back
          </button>
        </div>
        <div className={styles.announcementDetail}>
          <p className={styles.announcementDetailDate}>
            {new Date(selected.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}
            {new Date(selected.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            {selected.accounts && (
              <> · Published by {selected.accounts.first_name} {selected.accounts.last_name}</>
            )}
          </p>
          <h2 className={styles.announcementDetailTitle}>{selected.title}</h2>
          <div className={styles.announcementDetailContent}>
            {blocks.map((block, i) =>
              block.type === 'image'
                ? <img key={i} src={block.url} alt="" className={styles.announcementDetailImage} />
                : <p key={i} className={styles.announcementDetailBody}>{block.value}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // List view
  if (announcements.length === 0) {
    return (
      <div className={styles.comingSoon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--text-secondary)'}}>
          <path d="M3 11l19-9-9 19-2-8-8-2z"/>
        </svg>
        <h3 className={styles.comingSoonTitle}>No Announcements</h3>
        <p className={styles.comingSoonText}>Check back later for updates from management.</p>
      </div>
    )
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.announcementList}>
        {announcements.map(a => {
          const isUnread = unreadIds.has(a.id)
          return (
            <button
              key={a.id}
              className={`${styles.announcementCard} ${isUnread ? styles.announcementUnread : ''}`}
              onClick={() => handleOpen(a)}
            >
              <div className={styles.announcementCardLeft}>
                {isUnread && <span className={styles.unreadDot} />}
                <div>
                  <h3 className={styles.announcementTitle}>{a.title}</h3>
                  <span className={styles.announcementDate}>
                    {new Date(a.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(a.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className={styles.announcementCardRight}>
                {isUnread && <span className={styles.newBadge}>NEW</span>}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const LEAVE_CONFIG = {
  SICK_LEAVE:        { label: 'Sick Leave',         color: '#ff6b6b' },
  ANNUAL_LEAVE:      { label: 'Annual Leave',        color: '#4caf50' },
  LEAVE_WITHOUT_PAY: { label: 'Leave Without Pay',   color: '#ff9800' },
  ABSENT:            { label: 'Absent (No Notice)',   color: '#f44336' },
  PUBLIC_HOLIDAY:    { label: 'Public Holiday',       color: '#2196f3' },
}

function LeaveTab({ employeeId, accountId }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [leaveType, setLeaveType] = useState('SICK_LEAVE')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const fetchLeaves = async () => {
    if (!employeeId) return
    const { data } = await supabase
      .from('leave')
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false })
    setLeaves(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchLeaves() }, [employeeId])

  const handleApply = () => {
    setLeaveType('SICK_LEAVE')
    setReason('')
    setSubmitError('')
    setSubmitSuccess(false)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (leaveType === 'SICK_LEAVE' && !reason.trim()) {
      setSubmitError('Please provide a reason.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('leave').insert({
      employee_id: employeeId,
      leave_type: leaveType,
      start_date: today,
      end_date: today,
      notes: reason.trim() || null,
      created_by: accountId,
      updated_by: accountId,
    })
    setSubmitting(false)
    if (error) { setSubmitError(error.message); return }
    setSubmitSuccess(true)
    setShowForm(false)
    setReason('')
    fetchLeaves()
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.leaveHeader}>
        <button className={styles.applyLeaveBtn} onClick={handleApply}>+ Apply For Leave</button>
      </div>

      {/* Leave application form */}
      {showForm && (
        <div className={styles.leaveForm}>
          <div className={styles.leaveFormHeader}>
            <h3 className={styles.leaveFormTitle}>Apply For Leave</h3>
            <button className={styles.leaveFormClose} onClick={() => setShowForm(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className={styles.leaveFormGroup}>
            <label className={styles.leaveFormLabel}>Leave Type</label>
            <select
              className={styles.leaveFormSelect}
              value={leaveType}
              onChange={e => { setLeaveType(e.target.value); setSubmitError('') }}
            >
              <option value="SICK_LEAVE">Sick Leave</option>
              <option value="ANNUAL_LEAVE">Annual Leave</option>
            </select>
          </div>

          {leaveType === 'ANNUAL_LEAVE' ? (
            <div className={styles.annualLeaveNotice}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              ANNUAL LEAVE SHOULD BE FILED IN HR OFFICE.
            </div>
          ) : (
            <div className={styles.leaveFormGroup}>
              <label className={styles.leaveFormLabel}>Reason *</label>
              <textarea
                className={styles.leaveFormTextarea}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe your reason for sick leave..."
                rows={4}
              />
            </div>
          )}

          {submitError && <div className={styles.leaveFormError}>{submitError}</div>}

          {leaveType === 'SICK_LEAVE' && (
            <button
              className={styles.leaveSubmitBtn}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      )}

      {submitSuccess && (
        <div className={styles.leaveSuccessBanner}>
          Sick leave submitted successfully.
        </div>
      )}
      <div className={styles.leaveLegend}>
        {Object.entries(LEAVE_CONFIG).map(([key, { label, color }]) => (
          <div key={key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color }} />
            <span className={styles.legendLabel}>{label}</span>
          </div>
        ))}
      </div>
      {loading ? (
        <div className={styles.loading}>Loading leave records...</div>
      ) : leaves.length === 0 ? (
        <div className={styles.comingSoon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--text-secondary)'}}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
          </svg>
          <h3 className={styles.comingSoonTitle}>No Leave Records</h3>
          <p className={styles.comingSoonText}>Your leave history will appear here.</p>
        </div>
      ) : (
        <div className={styles.leaveList}>
          {leaves.map(leave => {
            const config = LEAVE_CONFIG[leave.leave_type] || { label: leave.leave_type, color: '#888' }
            const start = new Date(leave.start_date)
            const end = new Date(leave.end_date)
            const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
            return (
              <div key={leave.id} className={styles.leaveCard} style={{ borderLeftColor: config.color }}>
                <div className={styles.leaveCardTop}>
                  <span className={styles.leaveTypeBadge} style={{ background: config.color + '22', color: config.color }}>
                    {config.label}
                  </span>
                  <span className={styles.leaveDays}>{days} day{days !== 1 ? 's' : ''}</span>
                </div>
                <div className={styles.leaveDates}>
                  {start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {days > 1 && <> → {end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                </div>
                {leave.notes && <p className={styles.leaveNotes}>{leave.notes}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ComingSoon({ label }) {
  return (
    <div className={styles.comingSoon}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--text-secondary)'}}>
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      <h3 className={styles.comingSoonTitle}>{label}</h3>
      <p className={styles.comingSoonText}>This feature is coming soon.</p>
    </div>
  )
}

const KNIFE_SECTIONS = [
  { key: 'pricing', label: 'Pricing' },
  { key: 'dockets', label: 'My Dockets' },
]

function KnifeTab() {
  const [section, setSection] = useState('pricing')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('knife_dockets').select('*').order('product_code')
      setProducts(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const getTypeLabel = (v) => PRODUCT_TYPES.find(t => t.value === v)?.label || v
  const getCategoryLabel = (v) => PRODUCT_CATEGORIES.find(c => c.value === v)?.label || v
  const fmt = (price) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(price)

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    if (q && !p.product_code?.toLowerCase().includes(q) && !p.product_name?.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) return false
    if (filterType && p.product_type !== filterType) return false
    if (filterCategory && p.category !== filterCategory) return false
    return true
  })

  const hasFilters = search || filterType || filterCategory
  const activeFilterCount = [filterType, filterCategory].filter(Boolean).length

  const clearFilters = () => {
    setSearch('')
    setFilterType('')
    setFilterCategory('')
  }

  return (
    <div className={styles.tabContent}>
      {/* Section tabs */}
      <div className={styles.knifeSectionTabs}>
        {KNIFE_SECTIONS.map(s => (
          <button
            key={s.key}
            className={`${styles.knifeSectionTab} ${section === s.key ? styles.knifeSectionTabActive : ''}`}
            onClick={() => s.key !== 'dockets' && setSection(s.key)}
            disabled={s.key === 'dockets'}
            title={s.key === 'dockets' ? 'Coming soon' : ''}
          >
            {s.label}
            {s.key === 'dockets' && <span className={styles.knifeSoonBadge}>Soon</span>}
          </button>
        ))}
      </div>

      {section === 'pricing' && (
        loading ? (
          <div className={styles.loading}>Loading pricing...</div>
        ) : (
          <>
            {/* Search + filter bar */}
            <div className={styles.knifeSearchRow}>
              <input
                className={styles.knifeSearch}
                placeholder="Search by code, name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                className={`${styles.knifeFilterBtn} ${showFilters ? styles.knifeFilterBtnActive : ''}`}
                onClick={() => setShowFilters(v => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filter
                {activeFilterCount > 0 && <span className={styles.knifeFilterCount}>{activeFilterCount}</span>}
              </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className={styles.knifeFilterPanel}>
                <div className={styles.knifeFilterGroup}>
                  <label className={styles.knifeFilterLabel}>Type</label>
                  <div className={styles.knifeFilterChips}>
                    <button
                      className={`${styles.knifeChip} ${!filterType ? styles.knifeChipActive : ''}`}
                      onClick={() => setFilterType('')}
                    >All</button>
                    {PRODUCT_TYPES.map(t => (
                      <button
                        key={t.value}
                        className={`${styles.knifeChip} ${filterType === t.value ? styles.knifeChipActive : ''}`}
                        onClick={() => setFilterType(v => v === t.value ? '' : t.value)}
                      >{t.label}</button>
                    ))}
                  </div>
                </div>

                <div className={styles.knifeFilterGroup}>
                  <label className={styles.knifeFilterLabel}>Category</label>
                  <div className={styles.knifeFilterChips}>
                    <button
                      className={`${styles.knifeChip} ${!filterCategory ? styles.knifeChipActive : ''}`}
                      onClick={() => setFilterCategory('')}
                    >All</button>
                    {PRODUCT_CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        className={`${styles.knifeChip} ${filterCategory === c.value ? styles.knifeChipActive : ''}`}
                        onClick={() => setFilterCategory(v => v === c.value ? '' : c.value)}
                      >{c.label}</button>
                    ))}
                  </div>
                </div>

                {hasFilters && (
                  <button className={styles.knifeClearBtn} onClick={clearFilters}>Clear all filters</button>
                )}
              </div>
            )}

            {/* Results count */}
            <div className={styles.knifeResultsCount}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
              {hasFilters && ` · filtered`}
            </div>

            {filtered.length === 0 ? (
              <div className={styles.comingSoon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--text-secondary)'}}>
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <h3 className={styles.comingSoonTitle}>No Results</h3>
                <p className={styles.comingSoonText}>Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className={styles.knifeList}>
                {filtered.map(p => (
                  <div key={p.id} className={styles.knifeCard}>
                    <div className={styles.knifeCardTop}>
                      <div>
                        <span className={styles.knifeCode}>{p.product_code}</span>
                        <h3 className={styles.knifeName}>{p.product_name}</h3>
                      </div>
                      <div className={styles.knifePrice}>{fmt(p.selling_price)}</div>
                    </div>
                    <div className={styles.knifeMeta}>
                      <span className={styles.knifeBadge}>{getTypeLabel(p.product_type)}</span>
                      <span className={styles.knifeBadge}>{getCategoryLabel(p.category)}</span>
                    </div>
                    {p.description && <p className={styles.knifeDesc}>{p.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}

function SignatureModal({ assignment, employee, onClose, onSigned }) {
  const canvasRef = useRef(null)
  const padRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!canvasRef.current) return
    padRef.current = new SignaturePad(canvasRef.current, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(0,0,0)',
    })
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d').scale(ratio, ratio)
      padRef.current.clear()
    }
    resizeCanvas()
    return () => { if (padRef.current) padRef.current.off() }
  }, [])

  const handleClear = () => padRef.current?.clear()

  const handleSubmit = async () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError('Please draw your signature.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const dataUrl = padRef.current.toDataURL('image/png')
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const path = `signatures/${assignment.id}.png`
      const { error: uploadError } = await supabase.storage
        .from('wi-signatures')
        .upload(path, blob, { contentType: 'image/png', upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('wi-signatures').getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('wi_assignments')
        .update({ signed_at: new Date().toISOString(), signature_url: publicUrl })
        .eq('id', assignment.id)
      if (updateError) throw updateError

      onSigned()
    } catch (e) {
      setError(e.message || 'Failed to save signature.')
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.sigModalOverlay}>
      <div className={styles.sigModal}>
        <div className={styles.sigModalHeader}>
          <h3 className={styles.sigModalTitle}>Sign Work Instruction</h3>
          <button className={styles.sigModalClose} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p className={styles.sigModalText}>
          I, <strong>{employee?.name}</strong>, have read and understand these work instructions. I agree that I am competent to perform this function.
        </p>
        <div className={styles.sigCanvasWrap}>
          <canvas ref={canvasRef} className={styles.sigCanvas} />
          <span className={styles.sigCanvasHint}>Draw your signature above</span>
        </div>
        {error && <p className={styles.sigError}>{error}</p>}
        <div className={styles.sigModalActions}>
          <button className={styles.sigClearBtn} onClick={handleClear} disabled={submitting}>Clear</button>
          <button className={styles.sigSubmitBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Confirm & Sign'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkInstructionTab({ employeeId, employee }) {
  const [wis, setWis] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [steps, setSteps] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [signingModal, setSigningModal] = useState(false)

  useEffect(() => {
    if (!employeeId) return
    const fetch = async () => {
      const { data } = await supabase
        .from('wi_assignments')
        .select('*, work_instructions(id, doc_number, title, dept_code, location, status, aim, ppe, key_points, departments(display_name))')
        .eq('employee_id', employeeId)
        .order('assigned_at', { ascending: false })
      setWis((data || []).filter(a => a.work_instructions?.status === 'published'))
      setLoading(false)
    }
    fetch()
  }, [employeeId])

  const openWI = async (item) => {
    setLoadingDetail(true)
    setSelected(item.work_instructions)
    setAssignment(item)
    const { data } = await supabase
      .from('wi_steps')
      .select('*')
      .eq('wi_id', item.work_instructions.id)
      .order('order_index')
    setSteps(data || [])
    setLoadingDetail(false)
  }

  const handleSigned = async () => {
    setSigningModal(false)
    if (!employeeId) return
    const { data } = await supabase
      .from('wi_assignments')
      .select('*, work_instructions(id, doc_number, title, dept_code, location, status, aim, ppe, key_points, departments(display_name))')
      .eq('employee_id', employeeId)
      .order('assigned_at', { ascending: false })
    const updated = (data || []).filter(a => a.work_instructions?.status === 'published')
    setWis(updated)
    const refreshed = updated.find(a => a.id === assignment?.id)
    if (refreshed) setAssignment(refreshed)
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  // Detail view
  if (selected) {
    return (
      <div className={styles.tabContent}>
        {signingModal && (
          <SignatureModal
            assignment={assignment}
            employee={employee}
            onClose={() => setSigningModal(false)}
            onSigned={handleSigned}
          />
        )}
        <div className={styles.detailBack}>
          <button className={styles.backBtn} onClick={() => { setSelected(null); setAssignment(null); setSteps([]) }}>
            <IconBack /> Back
          </button>
        </div>

        {loadingDetail ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          <div className={styles.wiDetail}>
            {/* Document */}
            <div className={styles.wiDocument}>
              {/* Header */}
              <div className={styles.wiDocHeader}>
                <div className={styles.wiDocHeaderLeft}>
                  <img src="/noellogo.png" alt="NOEL" className={styles.wiDocLogo} />
                </div>
                <div className={styles.wiDocHeaderRight}>
                  <div className={styles.wiDocHeaderTitle}>Woodward Foods Australia – Est# 2306</div>
                  <div className={styles.wiDocHeaderRow}>
                    <span className={styles.wiDocHeaderKey}>Department:</span>
                    <span>{selected.departments?.display_name || '—'}</span>
                  </div>
                  {selected.location && (
                    <div className={styles.wiDocHeaderRow}>
                      <span className={styles.wiDocHeaderKey}>Location/Section:</span>
                      <span>{selected.location}</span>
                    </div>
                  )}
                  <div className={styles.wiDocHeaderRow}>
                    <span className={styles.wiDocHeaderKey}>Document No:</span>
                    <span>{selected.doc_number}</span>
                  </div>
                </div>
              </div>

              {/* Title table */}
              <table className={styles.wiTitleTable}>
                <tbody>
                  <tr><td className={styles.wiTitleKey}>Title:</td><td className={styles.wiTitleVal}>{selected.title}</td></tr>
                  <tr><td className={styles.wiTitleKey}>Aim:</td><td>{selected.aim}</td></tr>
                  <tr><td className={styles.wiTitleKey}>PPE:</td><td>{selected.ppe}</td></tr>
                </tbody>
              </table>

              {/* Steps */}
              <table className={styles.wiStepsTable}>
                <thead>
                  <tr>
                    <th className={styles.wiStepsTh}>Steps</th>
                    <th className={styles.wiStepsTh}>Performance Criteria</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s, i) => (
                    <tr key={i}>
                      <td className={styles.wiStepsTd}>{s.step_text}</td>
                      <td className={styles.wiStepsTd}>
                        {s.criteria_text && <p style={{margin:'0 0 6px'}}>{s.criteria_text}</p>}
                        {s.criteria_image_url && <img src={s.criteria_image_url} alt="" style={{maxWidth:'100%',maxHeight:'180px',objectFit:'contain'}} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Key points */}
              {selected.key_points?.length > 0 && (
                <div className={styles.wiKeyPoints}>
                  <div className={styles.wiKeyPointsTitle}>KEY POINTS</div>
                  <ul className={styles.wiKeyPointsList}>
                    {selected.key_points.map((kp, i) => <li key={i}>{kp.text}</li>)}
                  </ul>
                </div>
              )}

              {/* Cert section */}
              <div className={styles.wiCert}>
                <div className={styles.wiCertTitle}>COMPETENCY CERTIFICATE</div>
                <p className={styles.wiCertText}>
                  I, <strong>{employee?.name}{employee?.english_name ? ` (${employee.english_name})` : ''}</strong>, have read and understand, these are my work instructions. I agree that I am competent to perform this function.
                </p>
                <div className={styles.wiCertSigRow}>
                  <div className={styles.wiCertSigLabel}>Signed (Candidate):</div>
                  {assignment?.signed_at ? (
                    <div className={styles.wiCertSigned}>
                      <img src={assignment.signature_url} alt="Signature" className={styles.wiCertSigImg} />
                      <span className={styles.wiCertSignedDate}>Signed {fmt(assignment.signed_at)}</span>
                    </div>
                  ) : (
                    <button className={styles.wiSignBtn} onClick={() => setSigningModal(true)}>
                      Tap to Sign
                    </button>
                  )}
                </div>
                {assignment?.signed_at && (
                  <div className={styles.wiCertDateRow}>
                    <span className={styles.wiCertSigLabel}>Date:</span>
                    <span>{fmt(assignment.signed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List view
  if (loading) return <div className={styles.tabContent}><div className={styles.loading}>Loading...</div></div>

  if (wis.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.comingSoon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--text-secondary)'}}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>
          </svg>
          <h3 className={styles.comingSoonTitle}>No Work Instructions</h3>
          <p className={styles.comingSoonText}>You have no work instructions assigned to you yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.wiList}>
        {wis.map(item => {
          const wi = item.work_instructions
          const signed = !!item.signed_at
          return (
            <button key={item.id} className={styles.wiCard} onClick={() => openWI(item)}>
              <div className={styles.wiCardLeft}>
                <span className={styles.wiCardDocNo}>{wi?.doc_number}</span>
                <span className={styles.wiCardTitle}>{wi?.title}</span>
                <span className={styles.wiCardDept}>{wi?.departments?.display_name}</span>
              </div>
              <div className={styles.wiCardRight}>
                <span className={`${styles.wiCardStatus} ${signed ? styles.wiCardSigned : styles.wiCardPending}`}>
                  {signed ? 'Signed' : 'Pending'}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function EmployeePortal() {
  const { account, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('announcement')
  const [showProfile, setShowProfile] = useState(false)
  const [employee, setEmployee] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [unreadIds, setUnreadIds] = useState(new Set())

  useEffect(() => {
    if (account?.employee_id) fetchEmployee(account.employee_id)
    fetchAnnouncements()
  }, [account])

  const fetchEmployee = async (employeeId) => {
    const { data } = await supabase
      .from('employees')
      .select('*, departments(display_name)')
      .eq('id', employeeId)
      .single()
    if (data) setEmployee(data)
  }

  const fetchAnnouncements = async () => {
    if (!account?.employee_id) return

    const { data: emp } = await supabase
      .from('employees')
      .select('department_id')
      .eq('id', account.employee_id)
      .single()

    const { data } = await supabase
      .from('announcements')
      .select('*, accounts(first_name, last_name)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (data) {
      const filtered = data.filter(a => {
        if (a.target_type === 'ALL') return true
        if (a.target_type === 'DEPARTMENT') return a.target_ids?.includes(emp?.department_id)
        if (a.target_type === 'INDIVIDUAL') return a.target_ids?.includes(account.employee_id)
        return false
      })
      setAnnouncements(filtered)

      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('employee_id', account.employee_id)

      const readSet = new Set((reads || []).map(r => r.announcement_id))
      setUnreadIds(new Set(filtered.map(a => a.id).filter(id => !readSet.has(id))))
    }
  }

  const markRead = async (id) => {
    if (!account?.employee_id) return
    setUnreadIds(prev => { const n = new Set(prev); n.delete(id); return n })
    await supabase
      .from('announcement_reads')
      .upsert({ announcement_id: id, employee_id: account.employee_id }, { onConflict: 'announcement_id,employee_id' })
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const renderMain = () => {
    if (showProfile) return <ProfileTab employee={employee} onSignOut={handleSignOut} />
    switch (activeTab) {
      case 'announcement': return <AnnouncementTab announcements={announcements} unreadIds={unreadIds} onRead={markRead} />
      case 'gears': return <ComingSoon label="My Gears" />
      case 'leave': return <LeaveTab employeeId={account?.employee_id} accountId={account?.id} />
      case 'knife': return <KnifeTab />
      case 'wi': return <WorkInstructionTab employeeId={account?.employee_id} employee={employee} />
      default: return null
    }
  }

  return (
    <div className={styles.portal}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <img src="/noellogo.png" alt="NOEL" className={styles.topLogo} />
        <div className={styles.topBarRight}>
          {/* Profile avatar button */}
          <button
            className={`${styles.profileBtn} ${showProfile ? styles.profileBtnActive : ''}`}
            onClick={() => setShowProfile(v => !v)}
          >
            <IconProfile />
          </button>
          {/* Bell */}
          <button
            className={`${styles.bellBtn} ${unreadIds.size > 0 ? styles.bellActive : ''}`}
            onClick={() => { setShowProfile(false); setActiveTab('announcement') }}
          >
            <IconBell />
            {unreadIds.size > 0 && (
              <span className={styles.bellBadge}>{unreadIds.size > 9 ? '9+' : unreadIds.size}</span>
            )}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className={styles.main}>
        {renderMain()}
      </main>

      {/* Bottom nav — hidden when profile is open */}
      {!showProfile && (
        <nav className={styles.bottomNav}>
          {NAV_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`${styles.navTab} ${activeTab === key ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <span className={styles.navIcon}>
                <Icon />
                {key === 'announcement' && unreadIds.size > 0 && <span className={styles.navDot} />}
              </span>
              <span className={styles.navLabel}>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
