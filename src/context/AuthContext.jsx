import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        await fetchAccount(session.user.id)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAccount = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setAccount(data)

      // If user doesn't have first_name and last_name, they need to complete signup
      if (!data.first_name || !data.last_name) {
        console.log('User needs to complete signup - redirecting to /signup')
        return { needsSignup: true }
      }

      return { needsSignup: false }
    } catch (error) {
      console.error('Error fetching account:', error)
      return { needsSignup: false }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      setUser(data.user)
      await fetchAccount(data.user.id)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setAccount(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isHR = () => account?.account_type === 'HR'
  const isProcurement = () => account?.account_type === 'PROCUREMENT'
  const isAccounts = () => account?.account_type === 'ACCOUNTS'
  const isAdmin = () => account?.account_type === 'ADMIN'
  const canEdit = () => isHR() || isProcurement()

  const hasPermission = (permission) => {
    if (!account) return false
    if (account.account_type === 'ADMIN') return true
    return account.permissions?.[permission] === true
  }

  const value = {
    user,
    account,
    loading,
    signIn,
    signOut,
    isHR,
    isProcurement,
    isAccounts,
    isAdmin,
    canEdit,
    hasPermission
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
