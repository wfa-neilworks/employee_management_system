import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AddEmployeeModal from '../components/modals/AddEmployeeModal'
import EditEmployeeModal from '../components/modals/EditEmployeeModal'
import ResignEmployeeModal from '../components/modals/ResignEmployeeModal'
import ManageGearsModal from '../components/modals/ManageGearsModal'
import styles from './DepartmentPage.module.css'

export default function DepartmentPage() {
  const { departmentId } = useParams()
  const { isHR, isProcurement } = useAuth()
  const [department, setDepartment] = useState(null)
  const [employees, setEmployees] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [resigningEmployee, setResigningEmployee] = useState(null)
  const [managingGearsEmployee, setManagingGearsEmployee] = useState(null)

  useEffect(() => {
    if (departmentId) {
      fetchData()
    }
  }, [departmentId])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [deptResult, empResult] = await Promise.all([
        supabase
          .from('departments')
          .select('*')
          .eq('id', departmentId)
          .single(),
        supabase
          .from('employees')
          .select('*, employee_gears(gear_type)')
          .eq('department_id', departmentId)
          .eq('is_active', true)
          .order('name')
      ])

      if (deptResult.error) throw deptResult.error
      if (empResult.error) throw empResult.error

      setDepartment(deptResult.data)
      setEmployees(empResult.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.english_name?.toLowerCase().includes(query) ||
      emp.payroll_number?.toLowerCase().includes(query) ||
      emp.locker_number?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{department?.display_name}</h1>
          <p className={styles.subtitle}>{employees.length} employees</p>
        </div>
        {isHR() && (
          <button
            className={styles.addButton}
            onClick={() => setShowAddModal(true)}
          >
            + Add Employee
          </button>
        )}
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search employees..."
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
              <th>Locker</th>
              <th>Employment Status</th>
              <th>Wage Status</th>
              <th>Gears</th>
              <th>Start Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="9" className={styles.noResults}>
                  {searchQuery ? 'No employees found' : 'No employees in this department'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.payroll_number || '-'}</td>
                  <td>{employee.name}</td>
                  <td>{employee.english_name || '-'}</td>
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
                  <td>
                    <div className={styles.gears}>
                      {employee.employee_gears?.length > 0 ? (
                        employee.employee_gears.map((gear, idx) => (
                          <span key={idx} className={styles.gearBadge}>
                            {gear.gear_type.replace('_', ' ')}
                          </span>
                        ))
                      ) : (
                        <span className={styles.noGears}>No gears</span>
                      )}
                    </div>
                  </td>
                  <td>{new Date(employee.start_date).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actions}>
                      {isHR() && (
                        <>
                          <button
                            className={styles.actionButton}
                            onClick={() => setEditingEmployee(employee)}
                          >
                            Edit
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.resignButton}`}
                            onClick={() => setResigningEmployee(employee)}
                          >
                            Resign
                          </button>
                        </>
                      )}
                      {isProcurement() && (
                        <button
                          className={styles.actionButton}
                          onClick={() => setManagingGearsEmployee(employee)}
                        >
                          Manage Gears
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddEmployeeModal
          departmentId={departmentId}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchData}
        />
      )}

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSuccess={fetchData}
        />
      )}

      {resigningEmployee && (
        <ResignEmployeeModal
          employee={resigningEmployee}
          onClose={() => setResigningEmployee(null)}
          onSuccess={fetchData}
        />
      )}

      {managingGearsEmployee && (
        <ManageGearsModal
          employee={managingGearsEmployee}
          onClose={() => setManagingGearsEmployee(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}
