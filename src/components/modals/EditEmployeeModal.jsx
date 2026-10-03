import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function EditEmployeeModal({ employee, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [departments, setDepartments] = useState([])
  const [employmentStatuses, setEmploymentStatuses] = useState([])
  const [wageStatuses, setWageStatuses] = useState([])
  const [formData, setFormData] = useState({
    name: employee.name || '',
    english_name: employee.english_name || '',
    payroll_number: employee.payroll_number || '',
    department_id: employee.department_id || '',
    employment_status: employee.employment_status || '',
    wage_status: employee.wage_status || '',
    locker_number: employee.locker_number || '',
    start_date: employee.start_date || '',
    q_fever: employee.q_fever ?? false
  })

  const [portalEmail, setPortalEmail] = useState(employee.email || '')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteStatus, setInviteStatus] = useState(null) // 'sent' | 'error' | null
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    fetchDepartments()
    fetchEmploymentStatuses()
    fetchWageStatuses()
  }, [])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('display_name')

      if (error) throw error
      setDepartments(data)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchEmploymentStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('employment_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      setEmploymentStatuses(data || [])
    } catch (err) {
      console.error('Error fetching employment statuses:', err)
    }
  }

  const fetchWageStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('wage_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      setWageStatuses(data || [])
    } catch (err) {
      console.error('Error fetching wage statuses:', err)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSendInvite = async () => {
    if (!portalEmail.trim()) return
    setInviteLoading(true)
    setInviteStatus(null)
    setInviteError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-employee`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: portalEmail.trim(),
            employeeId: employee.id,
            redirectTo: `${window.location.origin}/employee-signup`,
          }),
        }
      )

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to send invite')

      setInviteStatus('sent')
    } catch (err) {
      setInviteError(err.message)
      setInviteStatus('error')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: formData.name,
          english_name: formData.english_name || null,
          payroll_number: formData.payroll_number || null,
          department_id: formData.department_id,
          employment_status: formData.employment_status,
          wage_status: formData.wage_status,
          locker_number: formData.locker_number || null,
          start_date: formData.start_date,
          q_fever: formData.q_fever,
          updated_by: user.id
        })
        .eq('id', employee.id)

      if (error) throw error

      if (formData.department_id !== employee.department_id) {
        await supabase
          .from('employee_history')
          .insert([{
            employee_id: employee.id,
            action: 'DEPARTMENT_CHANGE',
            old_value: employee.department_id,
            new_value: formData.department_id,
            changed_by: user.id
          }])
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
    <Modal title="Edit Employee" onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>English Name</label>
          <input
            type="text"
            name="english_name"
            value={formData.english_name}
            onChange={handleChange}
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Payroll Number</label>
          <input
            type="text"
            name="payroll_number"
            value={formData.payroll_number}
            onChange={handleChange}
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Department *</label>
          <select
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={loading}
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.display_name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Employment Status *</label>
          <select
            name="employment_status"
            value={formData.employment_status}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={loading}
          >
            {employmentStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Wage Status *</label>
          <select
            name="wage_status"
            value={formData.wage_status}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={loading}
          >
            {wageStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Locker Number</label>
          <input
            type="text"
            name="locker_number"
            value={formData.locker_number}
            onChange={handleChange}
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Start Date *</label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className={styles.input}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Q-Fever</label>
          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggleOption} ${!formData.q_fever ? styles.toggleOptionActive : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, q_fever: false }))}
              disabled={loading}
            >
              No
            </button>
            <button
              type="button"
              className={`${styles.toggleOption} ${formData.q_fever ? styles.toggleOptionActive : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, q_fever: true }))}
              disabled={loading}
            >
              Yes
            </button>
          </div>
        </div>

        {/* Employee Portal Invite */}
        <div className={styles.inviteSection}>
          <label className={styles.label}>Employee Portal Access</label>
          <p className={styles.inviteHint}>
            {employee.email
              ? `Invite already sent to ${employee.email}. Enter a new email to resend.`
              : 'Add an email to invite this employee to the portal.'}
          </p>
          <div className={styles.inviteRow}>
            <input
              type="email"
              value={portalEmail}
              onChange={(e) => setPortalEmail(e.target.value)}
              className={styles.input}
              placeholder="employee@example.com"
              disabled={inviteLoading}
            />
            <button
              type="button"
              className={styles.inviteButton}
              onClick={handleSendInvite}
              disabled={inviteLoading || !portalEmail.trim()}
            >
              {inviteLoading ? 'Sending...' : employee.email ? 'Resend Invite' : 'Send Invite'}
            </button>
          </div>
          {inviteStatus === 'sent' && (
            <p className={styles.inviteSuccess}>Invitation sent successfully!</p>
          )}
          {inviteStatus === 'error' && (
            <p className={styles.inviteError}>{inviteError}</p>
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
