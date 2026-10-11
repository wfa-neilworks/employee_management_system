import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PERMISSIONS } from '../lib/permissions'
import styles from './AdminPage.module.css'

const STAFF_ROLES = ['ADMIN', 'HR', 'QA', 'PROCUREMENT', 'ACCOUNTS']

export default function AdminPage() {
  const { hasPermission, user } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingStates, setSavingStates] = useState({})

  // Invite state
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('HR')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  useEffect(() => {
    if (!hasPermission('manage_users')) {
      navigate('/')
      return
    }
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('email')

      if (error) throw error
      setAccounts(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (accountId, permissionKey, currentValue) => {
    // Prevent admin from removing their own manage_users permission
    if (accountId === user.id && permissionKey === 'manage_users') {
      return
    }

    const account = accounts.find(a => a.id === accountId)
    if (!account) return

    // ADMIN users always have all permissions - don't allow toggling
    if (account.account_type === 'ADMIN') return

    const updatedPermissions = {
      ...account.permissions,
      [permissionKey]: !currentValue
    }

    // Optimistic update
    setAccounts(prev => prev.map(a =>
      a.id === accountId
        ? { ...a, permissions: updatedPermissions }
        : a
    ))

    setSavingStates(prev => ({ ...prev, [accountId]: 'saving' }))

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ permissions: updatedPermissions })
        .eq('id', accountId)

      if (error) throw error

      setSavingStates(prev => ({ ...prev, [accountId]: 'saved' }))
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [accountId]: null }))
      }, 2000)
    } catch (err) {
      // Revert on error
      setAccounts(prev => prev.map(a =>
        a.id === accountId
          ? { ...a, permissions: account.permissions }
          : a
      ))
      setSavingStates(prev => ({ ...prev, [accountId]: 'error' }))
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [accountId]: null }))
      }, 3000)
    }
  }

  const handleInvite = async () => {
    setInviteError('')
    setInviteSuccess('')
    if (!inviteEmail.trim()) { setInviteError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) { setInviteError('Enter a valid email.'); return }

    setInviting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-staff`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      }
    )
    const json = await res.json()
    setInviting(false)
    if (!res.ok || json.error) {
      setInviteError(json.error || 'Failed to send invite.')
    } else {
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()} as ${inviteRole}.`)
      setInviteEmail('')
      setInviteRole('HR')
      fetchAccounts()
    }
  }

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN': return styles.roleAdmin
      case 'HR': return styles.roleHR
      case 'PROCUREMENT': return styles.roleProcurement
      case 'ACCOUNTS': return styles.roleAccounts
      default: return ''
    }
  }

  if (!hasPermission('manage_users')) {
    return <div className={styles.unauthorized}>You do not have permission to access this page.</div>
  }

  if (loading) {
    return <div className={styles.loading}>Loading accounts...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.subtitle}>{accounts.length} registered accounts</p>
        </div>
        <button className={styles.inviteBtn} onClick={() => { setShowInvite(v => !v); setInviteError(''); setInviteSuccess('') }}>
          + Invite User
        </button>
      </div>

      {showInvite && (
        <div className={styles.invitePanel}>
          <h3 className={styles.invitePanelTitle}>Invite Staff User</h3>
          <div className={styles.inviteRow}>
            <div className={styles.inviteField}>
              <label className={styles.inviteLabel}>Email Address</label>
              <input
                className={styles.inviteInput}
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <div className={styles.inviteField}>
              <label className={styles.inviteLabel}>Role</label>
              <select
                className={styles.inviteSelect}
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
              >
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button className={styles.inviteSendBtn} onClick={handleInvite} disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          {inviteError && <p className={styles.inviteError}>{inviteError}</p>}
          {inviteSuccess && <p className={styles.inviteSuccess}>{inviteSuccess}</p>}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              {PERMISSIONS.map(p => (
                <th key={p.key} className={styles.permissionHeader} title={p.description}>
                  {p.label}
                </th>
              ))}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={PERMISSIONS.length + 3} className={styles.noResults}>
                  No accounts found
                </td>
              </tr>
            ) : (
              accounts.map(account => (
                <tr key={account.id}>
                  <td>
                    <div>{account.first_name} {account.last_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {account.email}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.roleBadge} ${getRoleBadgeClass(account.account_type)}`}>
                      {account.account_type}
                    </span>
                  </td>
                  {PERMISSIONS.map(p => {
                    const isOn = account.account_type === 'ADMIN' ? true : account.permissions?.[p.key] === true
                    const isDisabled = account.account_type === 'ADMIN' || (account.id === user.id && p.key === 'manage_users')

                    return (
                      <td key={p.key} className={styles.permissionCell}>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={isOn}
                            disabled={isDisabled}
                            onChange={() => handleToggle(account.id, p.key, isOn)}
                          />
                          <span className={styles.toggleSlider}></span>
                        </label>
                      </td>
                    )
                  })}
                  <td>
                    {savingStates[account.id] === 'saving' && (
                      <span className={`${styles.saveStatus} ${styles.saving}`}>Saving...</span>
                    )}
                    {savingStates[account.id] === 'saved' && (
                      <span className={`${styles.saveStatus} ${styles.saved}`}>Saved</span>
                    )}
                    {savingStates[account.id] === 'error' && (
                      <span className={`${styles.saveStatus} ${styles.saveError}`}>Error</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
