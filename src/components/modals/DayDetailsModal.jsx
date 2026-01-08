import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'
import EditLeaveModal from './EditLeaveModal'
import styles from './DayDetailsModal.module.css'

export default function DayDetailsModal({ date, leaves, onClose, onUpdate, canEdit = true }) {
  const [editingLeave, setEditingLeave] = useState(null)
  const [deleting, setDeleting] = useState(null)

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

  const handleDelete = async (leaveId) => {
    if (!confirm('Are you sure you want to delete this leave record?')) {
      return
    }

    setDeleting(leaveId)
    try {
      const { error } = await supabase
        .from('leave')
        .delete()
        .eq('id', leaveId)

      if (error) throw error

      onUpdate?.()
      // If no more leaves, close the modal
      if (leaves.length === 1) {
        onClose()
      }
    } catch (error) {
      console.error('Error deleting leave:', error)
      alert('Failed to delete leave: ' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleEditSuccess = () => {
    setEditingLeave(null)
    onUpdate?.()
  }

  return (
    <>
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
              {canEdit && (
                <div className={styles.leaveActions}>
                  <button
                    onClick={() => setEditingLeave(leave)}
                    className={styles.editButton}
                    disabled={deleting === leave.id}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(leave.id)}
                    className={styles.deleteButton}
                    disabled={deleting === leave.id}
                  >
                    {deleting === leave.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {editingLeave && (
        <EditLeaveModal
          leave={editingLeave}
          onClose={() => setEditingLeave(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
