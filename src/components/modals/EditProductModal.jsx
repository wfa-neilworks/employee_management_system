import { useState, useEffect } from 'react'
import { supabase, PRODUCT_TYPES, PRODUCT_CATEGORIES, calculateSellingPrice } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import styles from './FormModal.module.css'

export default function EditProductModal({ product, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    product_type: 'KNIFE',
    category: 'CUTTING_TOOLS',
    buy_price: '',
    description: '',
    notes: ''
  })

  useEffect(() => {
    if (product) {
      setFormData({
        product_code: product.product_code || '',
        product_name: product.product_name || '',
        product_type: product.product_type || 'KNIFE',
        category: product.category || 'CUTTING_TOOLS',
        buy_price: product.buy_price?.toString() || '',
        description: product.description || '',
        notes: product.notes || ''
      })
    }
  }, [product])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const calculatedSellingPrice = formData.buy_price ? calculateSellingPrice(formData.buy_price) : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const buyPrice = parseFloat(formData.buy_price)
      const sellingPrice = calculateSellingPrice(buyPrice)

      const { data, error } = await supabase
        .from('knife_dockets')
        .update({
          product_code: formData.product_code,
          product_name: formData.product_name,
          product_type: formData.product_type,
          category: formData.category,
          buy_price: buyPrice,
          selling_price: sellingPrice,
          description: formData.description || null,
          notes: formData.notes || null,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)
        .select()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Product code already exists. Please use a different code.')
        }
        throw error
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <Modal onClose={onClose}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>Edit Product</h2>

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="product_code" className={styles.label}>
              Product Code *
            </label>
            <input
              type="text"
              id="product_code"
              name="product_code"
              value={formData.product_code}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="product_name" className={styles.label}>
              Product Name *
            </label>
            <input
              type="text"
              id="product_name"
              name="product_name"
              value={formData.product_name}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="product_type" className={styles.label}>
              Product Type *
            </label>
            <select
              id="product_type"
              name="product_type"
              value={formData.product_type}
              onChange={handleChange}
              required
              className={styles.select}
            >
              {PRODUCT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className={styles.select}
            >
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="buy_price" className={styles.label}>
              Buy Price *
            </label>
            <input
              type="number"
              id="buy_price"
              name="buy_price"
              value={formData.buy_price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className={styles.input}
            />
            {formData.buy_price && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Calculated Selling Price: <strong style={{ color: 'var(--accent-primary)' }}>{formatPrice(calculatedSellingPrice)}</strong>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className={styles.textarea}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notes" className={styles.label}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className={styles.textarea}
            />
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
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
