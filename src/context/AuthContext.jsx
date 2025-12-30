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
    } catch (error) {
      console.error('Error fetching account:', error)
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

  const value = {
    user,
    account,
    loading,
    signIn,
    signOut,
    isHR,
    isProcurement
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
