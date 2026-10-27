import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './MeatOfferPage.module.css'

export default function MeatOfferPage() {
  const { hasPermission } = useAuth()
  const [tab, setTab] = useState('products') // products | orders
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [csvPreview, setCsvPreview] = useState(null) // parsed rows before confirm
  const fileRef = useRef(null)

  useEffect(() => { fetchProducts(); fetchOrders() }, [])

  const fetchProducts = async () => {
    const { data } = await supabase.from('meat_products').select('*').order('category').order('product_code')
    setProducts(data || [])
    setLoading(false)
  }

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('meat_orders')
      .select('*, employees(name, english_name, departments(display_name)), meat_order_items(*)')
      .order('submitted_at', { ascending: false })
    setOrders(data || [])
  }

  const parseCSV = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim())
    const rows = []
    for (const line of lines) {
      // Handle quoted fields
      const cols = []
      let cur = '', inQuote = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') { inQuote = !inQuote }
        else if (c === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
        else { cur += c }
      }
      cols.push(cur.trim())
      if (cols.length < 4) continue
      const price = parseFloat(cols[2].replace(/[^0-9.]/g, ''))
      if (!cols[0] || !cols[1] || isNaN(price) || !cols[3]) continue
      rows.push({
        product_code: cols[0],
        description: cols[1],
        price_per_kg: price,
        category: cols[3],
      })
    }
    return rows
  }

  const handleFileChange = (e) => {
    setUploadError('')
    setUploadSuccess('')
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setUploadError('Please select a CSV file.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result)
      if (rows.length === 0) { setUploadError('No valid rows found. Check CSV format: code, description, price, category.'); return }
      setCsvPreview(rows)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleConfirmUpload = async () => {
    if (!csvPreview) return
    setUploading(true)
    setUploadError('')
    // Delete all existing products
    await supabase.from('meat_products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    // Insert new
    const { error } = await supabase.from('meat_products').insert(csvPreview)
    setUploading(false)
    if (error) { setUploadError(error.message); return }
    setUploadSuccess(`${csvPreview.length} products uploaded successfully.`)
    setCsvPreview(null)
    fetchProducts()
  }

  const handleMarkPlaced = async (orderId) => {
    await supabase.from('meat_orders').update({ status: 'order_placed', updated_at: new Date().toISOString() }).eq('id', orderId)
    fetchOrders()
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
  const fmtPrice = (p) => `$${Number(p).toFixed(2)}/kg`

  // Group products by category
  const grouped = products.reduce((acc, p) => {
    const cat = p.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const categories = Object.keys(grouped).sort()

  if (!hasPermission('manage_users')) {
    return <div className={styles.loading}>Access denied.</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff Meat Offer</h1>
          <p className={styles.subtitle}>Manage product catalogue and employee orders</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tabBtn} ${tab === 'products' ? styles.tabBtnActive : ''}`} onClick={() => setTab('products')}>
          Products ({products.length})
        </button>
        <button className={`${styles.tabBtn} ${tab === 'orders' ? styles.tabBtnActive : ''}`} onClick={() => setTab('orders')}>
          Orders ({orders.length})
        </button>
      </div>

      {tab === 'products' && (
        <div>
          {/* Upload section */}
          <div className={styles.uploadSection}>
            <div className={styles.uploadInfo}>
              <h3 className={styles.uploadTitle}>Upload Product List</h3>
              <p className={styles.uploadHint}>CSV format: <code>product_code, description, price_per_kg, category</code> — uploading replaces all current products.</p>
            </div>
            <button className={styles.uploadBtn} onClick={() => fileRef.current?.click()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Select CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          {uploadError && <div className={styles.uploadError}>{uploadError}</div>}
          {uploadSuccess && <div className={styles.uploadSuccess}>{uploadSuccess}</div>}

          {/* CSV Preview */}
          {csvPreview && (
            <div className={styles.previewPanel}>
              <div className={styles.previewHeader}>
                <span className={styles.previewCount}>{csvPreview.length} products ready to upload</span>
                <div className={styles.previewActions}>
                  <button className={styles.cancelPreviewBtn} onClick={() => setCsvPreview(null)}>Cancel</button>
                  <button className={styles.confirmUploadBtn} onClick={handleConfirmUpload} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Confirm & Replace'}
                  </button>
                </div>
              </div>
              <div className={styles.previewTableWrap}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr><th>Code</th><th>Description</th><th>Price/kg</th><th>Category</th></tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td className={styles.codeCell}>{r.product_code}</td>
                        <td>{r.description}</td>
                        <td>{fmtPrice(r.price_per_kg)}</td>
                        <td>{r.category}</td>
                      </tr>
                    ))}
                    {csvPreview.length > 20 && (
                      <tr><td colSpan={4} className={styles.previewMore}>...and {csvPreview.length - 20} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Product list grouped by category */}
          {loading ? (
            <div className={styles.loading}>Loading products...</div>
          ) : products.length === 0 ? (
            <div className={styles.empty}>No products yet. Upload a CSV to get started.</div>
          ) : (
            <div className={styles.categoryList}>
              {categories.map(cat => (
                <div key={cat} className={styles.categoryBlock}>
                  <div className={styles.categoryHeader}>
                    <span className={styles.categoryName}>{cat}</span>
                    <span className={styles.categoryCount}>{grouped[cat].length} products</span>
                  </div>
                  <table className={styles.productTable}>
                    <thead>
                      <tr><th>Code</th><th>Description</th><th>Price/kg</th></tr>
                    </thead>
                    <tbody>
                      {grouped[cat].map(p => (
                        <tr key={p.id}>
                          <td className={styles.codeCell}>{p.product_code}</td>
                          <td>{p.description}</td>
                          <td className={styles.priceCell}>{fmtPrice(p.price_per_kg)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className={styles.orderList}>
          {orders.length === 0 ? (
            <div className={styles.empty}>No orders yet.</div>
          ) : orders.map(order => {
            const items = order.meat_order_items || []
            const total = items.reduce((sum, i) => sum + (Number(i.price_per_kg) * Number(i.quantity)), 0)
            return (
              <div key={order.id} className={`${styles.orderCard} ${order.status === 'order_placed' ? styles.orderPlaced : ''}`}>
                <div className={styles.orderCardHeader}>
                  <div>
                    <span className={styles.orderEmp}>{order.employees?.name}</span>
                    {order.employees?.english_name && <span className={styles.orderEmpEng}> ({order.employees.english_name})</span>}
                    <span className={styles.orderDept}>{order.employees?.departments?.display_name}</span>
                  </div>
                  <div className={styles.orderCardRight}>
                    <span className={`${styles.orderStatus} ${order.status === 'order_placed' ? styles.statusPlaced : styles.statusPending}`}>
                      {order.status === 'order_placed' ? 'Order Placed' : 'Pending'}
                    </span>
                    <span className={styles.orderDate}>{fmt(order.submitted_at)}</span>
                    {order.status === 'pending' && (
                      <button className={styles.markPlacedBtn} onClick={() => handleMarkPlaced(order.id)}>
                        Mark as Order Placed
                      </button>
                    )}
                  </div>
                </div>
                <table className={styles.orderItemsTable}>
                  <thead>
                    <tr><th>Code</th><th>Description</th><th>Category</th><th>Qty (kg)</th><th>Price/kg</th><th>Subtotal</th></tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td className={styles.codeCell}>{item.product_code}</td>
                        <td>{item.description}</td>
                        <td>{item.category}</td>
                        <td>{Number(item.quantity).toFixed(3)}</td>
                        <td>{fmtPrice(item.price_per_kg)}</td>
                        <td className={styles.priceCell}>${(Number(item.price_per_kg) * Number(item.quantity)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className={styles.orderFooter}>
                  <span className={styles.orderTotal}>Est. Total: ${total.toFixed(2)}</span>
                  {order.signature_url && (
                    <img src={order.signature_url} alt="Signature" className={styles.orderSig} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
