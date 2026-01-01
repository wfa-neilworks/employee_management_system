import Modal from './Modal'
import styles from './DayDetailsModal.module.css'

export default function DayDetailsModal({ date, leaves, onClose }) {
  const formatLeaveType = (type) => {
    return type.replace(/_/g, ' ')
  }

  const getLeaveColor = (type) => {
    switch (type) {
      case 'SICK_LEAVE':
        return '#ff8800'
      case 'ANNUAL_LEAVE':
        return '#00ff88'
      case 'LEAVE_WITHOUT_PAY':
        return '#ff0088'
      default:
        return '#888'
    }
  }

  return (
    <Modal title={`People on Leave - ${date}`} onClose={onClose}>
      <div className={styles.leaveList}>
        {leaves.map((leave) => (
          <div key={leave.id} className={styles.leaveItem}>
            <div
              className={styles.leaveTypeIndicator}
              style={{ background: getLeaveColor(leave.leave_type) }}
            ></div>
            <div className={styles.leaveDetails}>
              <div className={styles.employeeName}>
                {leave.employees.name}
              </div>
              <div className={styles.employeeInfo}>
                {leave.employees.departments?.display_name || 'N/A'} • {formatLeaveType(leave.leave_type)}
              </div>
              <div className={styles.leaveDates}>
                {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' - '}
                {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              {leave.notes && (
                <div className={styles.leaveNotes}>
                  {leave.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
