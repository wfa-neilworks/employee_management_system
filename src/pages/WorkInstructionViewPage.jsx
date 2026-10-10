import { useState, useEffect, useRef } from 'react'
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

  const buildPrintHTML = (filteredAssignments) => {
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

    const certBlocks = filteredAssignments.map(a => `
      <div style="page-break-inside:avoid;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #ddd;">
        <div style="font-size:13px;line-height:2;margin-bottom:10px;">
          <span style="border-bottom:1px solid #000;display:inline-block;min-width:120px;">${a.employees?.name || ''}</span>
          has been trained in this function by
          <span style="border-bottom:1px solid #000;display:inline-block;min-width:120px;">&nbsp;</span>
          and has been assessed as being competent to perform this function.
        </div>
        <div style="display:flex;gap:24px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;">
            <span style="font-weight:700;font-size:13px;white-space:nowrap;">Signed (Supervisor):</span>
            <span style="flex:1;border-bottom:1px solid #000;min-width:80px;display:inline-block;">&nbsp;</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex:1;">
            <span style="font-weight:700;font-size:13px;">Date:</span>
            <span style="font-size:13px;">${a.signed_at ? fmtDate(a.signed_at) : ''}</span>
          </div>
        </div>
        <div style="font-size:13px;line-height:1.6;margin-bottom:10px;">
          I, <span style="border-bottom:1px solid #000;">${a.employees?.name || ''}${a.employees?.english_name ? ` (${a.employees.english_name})` : ''}</span>,
          have read and understand, these are my work instructions. I agree that I am competent to perform this function.
        </div>
        <div style="display:flex;gap:24px;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;">
            <span style="font-weight:700;font-size:13px;white-space:nowrap;">Signed (Candidate):</span>
            ${a.signature_url
              ? `<img src="${a.signature_url}" style="height:48px;width:auto;object-fit:contain;border-bottom:1px solid #000;" />`
              : `<span style="flex:1;border-bottom:1px solid #000;min-width:80px;display:inline-block;">&nbsp;</span>`
            }
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex:1;">
            <span style="font-weight:700;font-size:13px;">Date:</span>
            <span style="font-size:13px;">${a.signed_at ? fmtDate(a.signed_at) : ''}</span>
          </div>
        </div>
      </div>
    `).join('')

    const keyPointsHTML = wi.key_points?.length > 0 ? `
      <div style="border:1px solid #000;border-top:none;padding:14px 16px;">
        <div style="font-weight:700;font-size:13px;text-align:center;margin-bottom:10px;">KEY POINTS</div>
        <ul style="margin:0;padding-left:24px;">
          ${wi.key_points.map(kp => `<li style="margin-bottom:4px;font-size:13px;">${kp.text}</li>`).join('')}
        </ul>
      </div>
    ` : ''

    const stepsHTML = steps.map(s => `
      <tr style="page-break-inside:avoid;">
        <td style="padding:8px 10px;border:1px solid #000;vertical-align:top;font-size:13px;line-height:1.5;">${s.step_text}</td>
        <td style="padding:8px 10px;border:1px solid #000;vertical-align:top;font-size:13px;line-height:1.5;">
          ${s.criteria_text ? `<p style="margin:0 0 8px;">${s.criteria_text}</p>` : ''}
          ${s.criteria_image_url ? `<img src="${s.criteria_image_url}" style="max-width:100%;max-height:200px;object-fit:contain;display:block;" />` : ''}
        </td>
      </tr>
    `).join('')

    return `<!DOCTYPE html>
<html>
<head>
  <title>${wi.doc_number} - ${wi.title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 20px; font-family: Arial, sans-serif; font-size: 13px; color: #000; }
    @media print { body { margin: 10px; } }
    table { border-collapse: collapse; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;gap:16px;border:1px solid #000;margin-bottom:0;">
    <div style="padding:8px;border-right:1px solid #000;display:flex;align-items:center;">
      <img src="${window.location.origin}/WFA_LOGO.png" style="height:60px;width:auto;" />
    </div>
    <div style="flex:1;padding:0;">
      <div style="font-weight:700;font-size:13px;text-align:center;padding:6px;border-bottom:1px solid #000;">Woodward Foods Australia – Est# 2306</div>
      <div style="display:flex;padding:5px 8px;border-bottom:1px solid #000;font-size:12px;"><span style="font-weight:700;min-width:110px;">Department:</span><span>${wi.departments?.display_name || '—'}</span></div>
      ${wi.location ? `<div style="display:flex;padding:5px 8px;border-bottom:1px solid #000;font-size:12px;"><span style="font-weight:700;min-width:110px;">Location/Section:</span><span>${wi.location}</span></div>` : ''}
      <div style="display:flex;padding:5px 8px;font-size:12px;"><span style="font-weight:700;min-width:110px;">Document No:</span><span>${wi.doc_number}</span></div>
    </div>
  </div>
  <!-- Title table -->
  <table style="width:100%;border:1px solid #000;margin-bottom:0;">
    <tr><td style="padding:7px 10px;border:1px solid #000;font-weight:700;background:#1e3a5f;color:#fff;width:80px;">Title:</td><td style="padding:7px 10px;border:1px solid #000;font-weight:700;background:#1e3a5f;color:#fff;">${wi.title}</td></tr>
    <tr><td style="padding:7px 10px;border:1px solid #000;font-weight:700;background:#1e3a5f;color:#fff;">Aim:</td><td style="padding:7px 10px;border:1px solid #000;">${wi.aim}</td></tr>
    <tr><td style="padding:7px 10px;border:1px solid #000;font-weight:700;background:#1e3a5f;color:#fff;">PPE:</td><td style="padding:7px 10px;border:1px solid #000;">${wi.ppe}</td></tr>
  </table>
  <!-- Steps -->
  <table style="width:100%;border:1px solid #000;margin-bottom:0;">
    <thead>
      <tr>
        <th style="padding:8px 10px;background:#1e3a5f;color:#fff;font-weight:700;font-size:13px;border:1px solid #000;width:50%;text-align:left;">Steps</th>
        <th style="padding:8px 10px;background:#1e3a5f;color:#fff;font-weight:700;font-size:13px;border:1px solid #000;width:50%;text-align:left;">Performance Criteria</th>
      </tr>
    </thead>
    <tbody>${stepsHTML}</tbody>
  </table>
  ${keyPointsHTML}
  <!-- Competency Certificate — always starts on a new page -->
  <div style="page-break-before:always;">
    <div style="border:1px solid #000;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:14px;">COMPETENCY CERTIFICATE</div>
      ${certBlocks}
    </div>
    <!-- Footer -->
    <div style="page-break-inside:avoid;border:1px solid #000;border-top:none;padding:8px 12px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;">
      <div><div>Woodward Foods Australia</div><div>Authorized By: ${wi.authorized_by}</div></div>
      <div style="text-align:center;"><div>Issue No: ${wi.issue_no}</div><div>Date of Revision: ${fmtDate(wi.revision_date)}</div></div>
      <div>Page 1 of 1</div>
    </div>
    <!-- Stamp -->
    <div style="display:flex;justify-content:center;padding:10px 0 0;">
      <img src="${window.location.origin}/noel-logo.png" style="height:40px;width:auto;object-fit:contain;opacity:0.85;" />
    </div>
  </div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`
  }

  const handlePrintAll = () => {
    const html = buildPrintHTML(assignments)
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  const handlePrintEmployee = (assignment) => {
    const html = buildPrintHTML([assignment])
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
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
          <button className={styles.printBtn} onClick={handlePrintAll}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
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
            <img src="/WFA_LOGO.png" alt="WFA" className={styles.docLogo} />
          </div>
          <div className={styles.docHeaderRight}>
            <div className={styles.docHeaderTitle}>Woodward Foods Australia – Est# 2306</div>
            <div className={styles.docHeaderRow}>
              <span className={styles.docHeaderKey}>Department:</span>
              <span>{wi.departments?.display_name || '—'}</span>
            </div>
            {wi.location && (
              <div className={styles.docHeaderRow}>
                <span className={styles.docHeaderKey}>Location/Section:</span>
                <span>{wi.location}</span>
              </div>
            )}
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

        {/* Bottom stamp */}
        <div className={styles.docBottomLogo}>
          <img src="/noel-logo.png" alt="NOEL" className={styles.bottomLogoImg} />
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
                <div className={styles.sigRowRight}>
                  {a.signed_at
                    ? <span className={styles.sigStatus}>Signed {fmt(a.signed_at)}</span>
                    : <span className={styles.sigPending}>Pending</span>
                  }
                  <button className={styles.sigPrintBtn} onClick={() => handlePrintEmployee(a)} title="Print this employee's certificate">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                      <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
