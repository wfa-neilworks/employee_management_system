import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './WorkInstructionViewPage.module.css'

const CAN_EDIT = ['ADMIN', 'HR', 'QA']

export default function WorkInstructionViewPage() {
  const { id } = useParams()
  const { account } = useAuth()
  const navigate = useNavigate()

  const [wi, setWi] = useState(null)
  const [steps, setSteps] = useState([])
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  // Assign panel
  const [showAssign, setShowAssign] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Sign on behalf (admin/HR/QA picks employee present with them)
  const [signingFor, setSigningFor] = useState(null)

  const canEdit = CAN_EDIT.includes(account?.account_type)

  useEffect(() => { fetchAll() }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: wiData }, { data: stepsData }, { data: assignData }, { data: empData }] = await Promise.all([
      supabase.from('work_instructions').select('*, departments(display_name)').eq('id', id).single(),
      supabase.from('wi_steps').select('*').eq('wi_id', id).order('order_index'),
      supabase.from('wi_assignments').select('*, employees(id, name, english_name)').eq('wi_id', id).order('assigned_at'),
      supabase.from('employees').select('id, name, english_name, departments(display_name)').eq('is_active', true).order('name'),
    ])
    setWi(wiData)
    setSteps(stepsData || [])
    setAssignments(assignData || [])
    setEmployees(empData || [])
    setLoading(false)
  }

  const handleAssign = async (emp) => {
    const already = assignments.find(a => a.employee_id === emp.id)
    if (already) return
    setAssigning(true)
    await supabase.from('wi_assignments').insert({
      wi_id: id,
      employee_id: emp.id,
      assigned_by: account.id,
    })
    setAssigning(false)
    setAssignSearch('')
    fetchAll()
  }

  const handleRemoveAssignment = async (assignId) => {
    if (!confirm('Remove this employee from this work instruction?')) return
    await supabase.from('wi_assignments').delete().eq('id', assignId)
    fetchAll()
  }

  const handleSign = async (assignment) => {
    const now = new Date().toISOString()
    // Admin/HR/QA sign on behalf — no signature image, just timestamp
    await supabase.from('wi_assignments').update({
      signed_at: now,
      signed_by_account_id: account.id,
    }).eq('id', assignment.id)
    setSigningFor(null)
    fetchAll()
  }

  const filteredEmployees = employees.filter(e => {
    const q = assignSearch.toLowerCase()
    if (!q) return true
    return e.name?.toLowerCase().includes(q) || e.english_name?.toLowerCase().includes(q)
  }).filter(e => !assignments.find(a => a.employee_id === e.id))

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!wi) return <div className={styles.loading}>Work instruction not found.</div>

  const signedCount = assignments.filter(a => a.signed_at).length

  return (
    <div className={styles.container}>
      {/* Page actions */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/work-instructions')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <div className={styles.headerActions}>
          {canEdit && (
            <>
              <button className={styles.assignBtn} onClick={() => setShowAssign(v => !v)}>
                {showAssign ? 'Close' : '+ Assign Employees'}
              </button>
              <button className={styles.editBtn} onClick={() => navigate(`/work-instructions/${id}/edit`)}>
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Assign panel */}
      {showAssign && canEdit && (
        <div className={styles.assignPanel}>
          <h3 className={styles.assignTitle}>Assign Employees</h3>
          <input
            className={styles.assignSearch}
            placeholder="Search employee name..."
            value={assignSearch}
            onChange={e => setAssignSearch(e.target.value)}
            autoFocus
          />
          <div className={styles.assignList}>
            {filteredEmployees.length === 0 ? (
              <p className={styles.assignEmpty}>{assignSearch ? 'No employees found.' : 'All employees already assigned.'}</p>
            ) : filteredEmployees.slice(0, 10).map(e => (
              <button key={e.id} className={styles.assignEmpBtn} onClick={() => handleAssign(e)} disabled={assigning}>
                <span className={styles.assignEmpName}>{e.name}</span>
                {e.english_name && <span className={styles.assignEmpEng}>{e.english_name}</span>}
                <span className={styles.assignEmpDept}>{e.departments?.display_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WI Document */}
      <div className={styles.document}>
        {/* Company header */}
        <div className={styles.docHeader}>
          <div className={styles.docHeaderLeft}>
            <img src="/noellogo.png" alt="NOEL" className={styles.docLogo} />
          </div>
          <div className={styles.docHeaderRight}>
            <div className={styles.docHeaderTitle}>Woodward Foods Australia – Est# 2306</div>
            <div className={styles.docHeaderRow}>
              <span className={styles.docHeaderKey}>Department:</span>
              <span>{wi.departments?.display_name || '—'}</span>
            </div>
            <div className={styles.docHeaderRow}>
              <span className={styles.docHeaderKey}>Document No:</span>
              <span>{wi.doc_number}</span>
            </div>
          </div>
        </div>

        {/* Title block */}
        <table className={styles.titleTable}>
          <tbody>
            <tr><td className={styles.titleKey}>Title:</td><td className={styles.titleVal}>{wi.title}</td></tr>
            <tr><td className={styles.titleKey}>Aim:</td><td>{wi.aim}</td></tr>
            <tr><td className={styles.titleKey}>PPE:</td><td>{wi.ppe}</td></tr>
          </tbody>
        </table>

        {/* Steps table */}
        <table className={styles.stepsTable}>
          <thead>
            <tr>
              <th className={styles.stepsThLeft}>Steps</th>
              <th className={styles.stepsThRight}>Performance Criteria</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => (
              <tr key={i}>
                <td className={styles.stepsTdLeft}>{s.step_text}</td>
                <td className={styles.stepsTdRight}>
                  {s.criteria_text && <p className={styles.criteriaText}>{s.criteria_text}</p>}
                  {s.criteria_image_url && <img src={s.criteria_image_url} alt="" className={styles.criteriaImg} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Key Points */}
        {wi.key_points?.length > 0 && (
          <div className={styles.keyPoints}>
            <div className={styles.keyPointsTitle}>KEY POINTS</div>
            <ul className={styles.keyPointsList}>
              {wi.key_points.map((kp, i) => <li key={i}>{kp.text}</li>)}
            </ul>
          </div>
        )}

        {/* Competency Certificate */}
        <div className={styles.cert}>
          <div className={styles.certTitle}>COMPETENCY CERTIFICATE</div>

          {assignments.length === 0 ? (
            <p className={styles.certNoAssign}>No employees assigned yet.</p>
          ) : (
            assignments.map(a => (
              <div key={a.id} className={styles.certBlock}>
                <div className={styles.certSupervisorLine}>
                  <span className={styles.certDots}>{a.employees?.name}</span>
                  <span> has been trained in this function by </span>
                  <span className={styles.certDots}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  <span> and has been assessed as being competent to perform this function.</span>
                </div>
                <div className={styles.certRow}>
                  <div className={styles.certField}>
                    <span className={styles.certFieldLabel}>Signed (Supervisor):</span>
                    <span className={styles.certFieldLine}></span>
                  </div>
                  <div className={styles.certField}>
                    <span className={styles.certFieldLabel}>Date:</span>
                    <span className={styles.certFieldValue}>{a.signed_at ? fmt(a.signed_at) : ''}</span>
                  </div>
                </div>
                <div className={styles.certCandidateLine}>
                  I, <span className={styles.certUnderline}>{a.employees?.name}{a.employees?.english_name ? ` (${a.employees.english_name})` : ''}</span>, have read and understand, these are my work instructions. I agree that I am competent to perform this function.
                </div>
                <div className={styles.certRow}>
                  <div className={styles.certField}>
                    <span className={styles.certFieldLabel}>Signed (Candidate):</span>
                    {a.signed_at ? (
                      a.signature_url ? (
                        <img src={a.signature_url} alt="Signature" className={styles.certSigImg} />
                      ) : (
                        <span className={styles.certSigned}>✓ Signed {fmt(a.signed_at)}</span>
                      )
                    ) : (
                      canEdit ? (
                        <button className={styles.signBtn} onClick={() => handleSign(a)}>
                          Sign on behalf
                        </button>
                      ) : (
                        <span className={styles.certFieldLine}></span>
                      )
                    )}
                  </div>
                  <div className={styles.certField}>
                    <span className={styles.certFieldLabel}>Date:</span>
                    <span className={styles.certFieldValue}>{a.signed_at ? fmt(a.signed_at) : ''}</span>
                  </div>
                </div>

                {canEdit && !a.signed_at && (
                  <button className={styles.removeAssignBtn} onClick={() => handleRemoveAssignment(a.id)}>
                    Remove assignment
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.docFooter}>
          <div className={styles.footerLeft}>
            <div>Woodward Foods Australia</div>
            <div>Authorized By: &nbsp; {wi.authorized_by}</div>
          </div>
          <div className={styles.footerCenter}>
            <div>Issue No: &nbsp; {wi.issue_no}</div>
            <div>Date of Revision: &nbsp; {fmt(wi.revision_date)}</div>
          </div>
          <div className={styles.footerRight}>Page 1 of 1</div>
        </div>
      </div>

      {/* Signature summary */}
      {assignments.length > 0 && (
        <div className={styles.sigSummary}>
          <h3 className={styles.sigSummaryTitle}>Signature Status</h3>
          <p className={styles.sigSummaryCount}>{signedCount} of {assignments.length} signed</p>
          <div className={styles.sigList}>
            {assignments.map(a => (
              <div key={a.id} className={`${styles.sigRow} ${a.signed_at ? styles.sigRowSigned : ''}`}>
                <span className={styles.sigName}>{a.employees?.name}</span>
                {a.signed_at
                  ? <span className={styles.sigStatus}>Signed {fmt(a.signed_at)}</span>
                  : <span className={styles.sigPending}>Pending</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
