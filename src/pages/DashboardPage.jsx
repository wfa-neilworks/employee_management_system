import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import styles from './DashboardPage.module.css'

const COLORS = ['#d4ff00', '#00ff88', '#00d4ff', '#ff00ff', '#ff8800', '#88ff00', '#ff0088', '#0088ff', '#ffff00', '#00ffff', '#ff00ff']

export default function DashboardPage() {
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    byDepartment: []
  })
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [employeesResult, departmentsResult] = await Promise.all([
        supabase
          .from('employees')
          .select('*, departments(id, display_name)')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('departments')
          .select('*')
          .order('display_name')
      ])

      if (employeesResult.error) throw employeesResult.error
      if (departmentsResult.error) throw departmentsResult.error

      setEmployees(employeesResult.data)
      setDepartments(departmentsResult.data)

      calculateStats(employeesResult.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (employeeData) => {
    const total = employeeData.length

    const byDepartment = {}
    employeeData.forEach((emp) => {
      const deptName = emp.departments?.display_name || 'Unassigned'
      byDepartment[deptName] = (byDepartment[deptName] || 0) + 1
    })

    const chartData = Object.entries(byDepartment).map(([name, value]) => ({
      name,
      value
    }))

    setStats({ total, byDepartment: chartData })
  }

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.english_name?.toLowerCase().includes(query) ||
      emp.payroll_number?.toLowerCase().includes(query) ||
      emp.locker_number?.toLowerCase().includes(query) ||
      emp.departments?.display_name?.toLowerCase().includes(query)
    )
  })

  const handleEmployeeClick = (employee) => {
    if (employee.department_id) {
      navigate(`/department/${employee.department_id}`)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total Employees</div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Employees by Department</h3>
          {stats.byDepartment.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.byDepartment}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.byDepartment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>No data available</div>
          )}
        </div>
      </div>

      <div className={styles.employeesSection}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search employees by name, locker number, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Payroll #</th>
                <th>Name</th>
                <th>English Name</th>
                <th>Department</th>
                <th>Locker</th>
                <th>Employment Status</th>
                <th>Wage Status</th>
                <th>Start Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.noResults}>
                    {searchQuery ? 'No employees found' : 'No employees yet'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => handleEmployeeClick(employee)}
                    className={styles.tableRow}
                  >
                    <td>{employee.payroll_number || '-'}</td>
                    <td>{employee.name}</td>
                    <td>{employee.english_name || '-'}</td>
                    <td>{employee.departments?.display_name || '-'}</td>
                    <td>{employee.locker_number || '-'}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[employee.employment_status?.toLowerCase()]}`}>
                        {employee.employment_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[employee.wage_status?.toLowerCase()]}`}>
                        {employee.wage_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{new Date(employee.start_date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
