import { useState, useEffect } from 'react'
import { supabase, PRODUCT_TYPES, PRODUCT_CATEGORIES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AddProductModal from '../components/modals/AddProductModal'
import EditProductModal from '../components/modals/EditProductModal'
import DeleteProductModal from '../components/modals/DeleteProductModal'
import SellToEmployeeModal from '../components/modals/SellToEmployeeModal'
import styles from './KnifeDocketsPage.module.css'

export default function KnifeDocketsPage() {
  const { isProcurement, isAccounts } = useAuth()
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('knife_dockets')
        .select('*')
        .order('product_code')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
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

  const getTypeLabel = (value) => {
    const type = PRODUCT_TYPES.find(t => t.value === value)
    return type ? type.label : value
  }

  const getCategoryLabel = (value) => {
    const category = PRODUCT_CATEGORIES.find(c => c.value === value)
    return category ? category.label : value
  }

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || (
      product.product_code?.toLowerCase().includes(query) ||
      product.product_name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    )

    const matchesType = !filterType || product.product_type === filterType
    const matchesCategory = !filterCategory || product.category === filterCategory

    return matchesSearch && matchesType && matchesCategory
  })

  const clearFilters = () => {
    setSearchQuery('')
    setFilterType('')
    setFilterCategory('')
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Knife Dockets</h1>
          <p className={styles.subtitle}>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isProcurement() && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className={styles.addButton}
              onClick={() => setShowSellModal(true)}
              style={{ background: 'var(--success)' }}
            >
              Sell to Employee
            </button>
            <button
              className={styles.addButton}
              onClick={() => setShowAddModal(true)}
            >
              + Add Product
            </button>
          </div>
        )}
      </div>

      <div className={styles.filterSection}>
        <input
          type="text"
          placeholder="Search by code, name, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Types</option>
          {PRODUCT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Categories</option>
          {PRODUCT_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        {(searchQuery || filterType || filterCategory) && (
          <button onClick={clearFilters} className={styles.clearButton}>
            Clear Filters
          </button>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          <p>No products found.</p>
          {isProcurement() && !searchQuery && !filterType && !filterCategory && (
            <p>Click "Add Product" to create one.</p>
          )}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th className={styles.priceColumn}>Buy Price</th>
                <th className={styles.priceColumn}>Selling Price</th>
                <th>Description</th>
                {isProcurement() && <th className={styles.actionsColumn}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className={styles.codeCell}>{product.product_code}</td>
                  <td>{product.product_name}</td>
                  <td>{getTypeLabel(product.product_type)}</td>
                  <td>{getCategoryLabel(product.category)}</td>
                  <td className={styles.priceColumn}>{formatPrice(product.buy_price)}</td>
                  <td className={styles.priceColumn}>{formatPrice(product.selling_price)}</td>
                  <td className={styles.descriptionCell}>
                    {product.description || '-'}
                  </td>
                  {isProcurement() && (
                    <td className={styles.actionsColumn}>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => setEditingProduct(product)}
                        >
                          Edit
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => setDeletingProduct(product)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchProducts}
        />
      )}

      {showSellModal && (
        <SellToEmployeeModal
          products={products}
          onClose={() => setShowSellModal(false)}
          onSuccess={() => {
            setShowSellModal(false)
            // Optionally refresh products or show success message
          }}
        />
      )}

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={fetchProducts}
        />
      )}

      {deletingProduct && (
        <DeleteProductModal
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onSuccess={fetchProducts}
        />
      )}
    </div>
  )
}
