import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './SignupPage.module.css'

export default function EmployeeSignupPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const loadSession = async () => {
      // Supabase invite links put the token in the URL hash.
      // onAuthStateChange fires with SIGNED_IN after the SDK exchanges it.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setEmail(session.user.email)

          const { data: account } = await supabase
            .from('accounts')
            .select('employee_id, employees(name)')
            .eq('id', session.user.id)
            .single()

          if (account?.employees?.name) {
            setEmployeeName(account.employees.name)
          }
        }
      })

      // Also check if there's already a session (e.g. page refresh)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setEmail(session.user.email)

        const { data: account } = await supabase
          .from('accounts')
          .select('employee_id, employees(name)')
          .eq('id', session.user.id)
          .single()

        if (account?.employees?.name) {
          setEmployeeName(account.employees.name)
        }
      }

      return () => subscription.unsubscribe()
    }
    loadSession()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired. Please click the invite link again.')

      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Sign out first, then redirect
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (err) {
      setError(err.message || 'Failed to set password')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.signupBox}>
        <div className={styles.header}>
          <img src="/noellogo.png" alt="NOEL" className={styles.logo} />
          <h2 className={styles.title}>Welcome to the Employee Portal</h2>
          {employeeName && (
            <p className={styles.emailText}>Hi, <strong>{employeeName}</strong></p>
          )}
          {email && (
            <p className={styles.emailText}>Setting up account for: <strong>{email}</strong></p>
          )}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
              placeholder="Choose a password (min 6 characters)"
              minLength={6}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
              placeholder="Confirm your password"
              minLength={6}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Setting up...' : 'Set Password & Access Portal'}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Already have an account? <a href="/login" className={styles.link}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
