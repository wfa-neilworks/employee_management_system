import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './SignupPage.module.css'

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Get the user's email from the session (they clicked the invite link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setEmail(session.user.email)
        setUserId(session.user.id)
      }
    }
    checkSession()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!firstName.trim()) {
      setError('First name is required')
      return
    }

    if (!lastName.trim()) {
      setError('Last name is required')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      // Save first name and last name to accounts table
      // Use upsert (insert or update) in case the account doesn't exist yet
      const { error: accountError } = await supabase
        .from('accounts')
        .upsert({
          id: userId,
          email: email,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (accountError) throw accountError

      // Success - redirect to dashboard
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to complete signup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.signupBox}>
        <div className={styles.header}>
          <img src="/logo.png" alt="Company Logo" className={styles.logo} />
          <h2 className={styles.title}>Set Your Password</h2>
          {email && (
            <p className={styles.emailText}>
              Creating account for: <strong>{email}</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="firstName" className={styles.label}>First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
              placeholder="Enter your first name"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="lastName" className={styles.label}>Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
              placeholder="Enter your last name"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
              placeholder="Enter your password (min 6 characters)"
              minLength={6}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
            <input
              id="confirmPassword"
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

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Setting password...' : 'Set Password & Continue'}
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
