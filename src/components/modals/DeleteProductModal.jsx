import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function DeleteProductModal({ product, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('knife_dockets')
        .delete()
        .eq('id', product.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>Delete Product</h2>

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        <div className={styles.warningBox}>
          <p>Are you sure you want to delete this product? This action cannot be undone.</p>
          <div style={{ marginTop: '16px' }}>
            <strong>Product Code:</strong> {product.product_code}
            <br />
            <strong>Product Name:</strong> {product.product_name}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className={styles.deleteButton}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Product'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
