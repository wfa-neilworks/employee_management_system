import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import DepartmentPage from './pages/DepartmentPage'
import RosterPage from './pages/RosterPage'
import TimesheetPage from './pages/TimesheetPage'
import AttendancePage from './pages/AttendancePage'
import KnifeDocketsPage from './pages/KnifeDocketsPage'
import TransactionHistoryPage from './pages/TransactionHistoryPage'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, account, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  // If user is authenticated but hasn't completed signup, redirect to signup
  if (account && (!account.first_name || !account.last_name)) {
    return <Navigate to="/signup" />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="department/:departmentId" element={<DepartmentPage />} />
        <Route path="resigned" element={<DepartmentPage />} />
        <Route path="roster" element={<RosterPage />} />
        <Route path="timesheet" element={<TimesheetPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="knife-dockets" element={<KnifeDocketsPage />} />
        <Route path="transaction-history" element={<TransactionHistoryPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App
