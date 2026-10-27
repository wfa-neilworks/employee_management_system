import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './MeatOfferPage.module.css'

export default function MeatOfferPage() {
  const { hasPermission } = useAuth()
  const [tab, setTab] = useState('categories') // categories | products | orders
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // Category form state
  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [catSaving, setCatSaving] = useState(false)
  const [catError, setCatError] = useState('')
  const [catSuccess, setCatSuccess] = useState('')
  const [editingCat, setEditingCat] = useState(null) // category object being edited

  // Product upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [csvPreview, setCsvPreview] = useState(null) // { rows, warnings }
  const fileRef = useRef(null)

  useEffect(() => { fetchCategories(); fetchProducts(); fetchOrders() }, [])

  const fetchCategories = async () => {
    const { data } = await supabase.from('meat_categories').select('*').order('display_order').order('name')
    setCategories(data || [])
    setLoading(false)
  }

  const fetchProducts = async () => {
    const { data } = await supabase.from('meat_products').select('*').order('category').order('product_code')
    setProducts(data || [])
  }

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('meat_orders')
      .select('*, employees(name, english_name, departments(display_name)), meat_order_items(*)')
      .order('submitted_at', { ascending: false })
    setOrders(data || [])
  }

  // ─── Category CRUD ───────────────────────────────────────────────────────

  const startAdd = () => {
    setEditingCat(null)
    setCatForm({ name: '', description: '' })
    setCatError('')
    setCatSuccess('')
  }

  const startEdit = (cat) => {
    setEditingCat(cat)
    setCatForm({ name: cat.name, description: cat.description })
    setCatError('')
    setCatSuccess('')
  }

  const handleCatSave = async () => {
    const name = catForm.name.trim()
    const description = catForm.description.trim()
    if (!name) { setCatError('Category name is required.'); return }
    if (!description) { setCatError('Description is required.'); return }
    setCatSaving(true)
    setCatError('')
    if (editingCat) {
      const { error } = await supabase
        .from('meat_categories')
        .update({ name, description })
        .eq('id', editingCat.id)
      setCatSaving(false)
      if (error) { setCatError(error.message); return }
    } else {
      const { error } = await supabase.from('meat_categories').insert({ name, description })
      setCatSaving(false)
      if (error) { setCatError(error.message); return }
    }
    setCatSuccess(editingCat ? 'Category updated.' : 'Category added.')
    setCatForm({ name: '', description: '' })
    setEditingCat(null)
    fetchCategories()
    setTimeout(() => setCatSuccess(''), 3000)
  }

  const handleCatDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? Products using this category will remain but won't match any category.`)) return
    await supabase.from('meat_categories').delete().eq('id', cat.id)
    fetchCategories()
  }

  const moveCat = async (cat, dir) => {
    const sorted = [...categories].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))
    const idx = sorted.findIndex(c => c.id === cat.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const swap = sorted[swapIdx]
    const orderA = cat.display_order === swap.display_order ? idx * 10 : cat.display_order
    const orderB = cat.display_order === swap.display_order ? swapIdx * 10 : swap.display_order
    await Promise.all([
      supabase.from('meat_categories').update({ display_order: orderB }).eq('id', cat.id),
      supabase.from('meat_categories').update({ display_order: orderA }).eq('id', swap.id),
    ])
    fetchCategories()
  }

  // ─── CSV Upload ──────────────────────────────────────────────────────────

  const parseCSV = (text) => {
    const knownNames = new Set(categories.map(c => c.name.toLowerCase()))
    const lines = text.trim().split('\n').filter(l => l.trim())
    const rows = []
    const warnings = []
    for (const line of lines) {
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
      if (!cols[0] || !cols[1] || !cols[3]) continue
      const rawPrice = cols[2].trim()
      const isNA = rawPrice.toLowerCase() === 'na' || rawPrice === ''
      const price = isNA ? null : parseFloat(rawPrice.replace(/[^0-9.]/g, ''))
      if (!isNA && isNaN(price)) continue
      const catName = cols[3]
      if (!knownNames.has(catName.toLowerCase())) {
        warnings.push(`"${catName}" is not a known category — row skipped: ${cols[0]}`)
        continue
      }
      const canonical = categories.find(c => c.name.toLowerCase() === catName.toLowerCase())
      rows.push({
        product_code: cols[0],
        description: cols[1],
        price_per_kg: price,
        category: canonical.name,
      })
    }
    return { rows, warnings }
  }

  const handleFileChange = (e) => {
    setUploadError('')
    setUploadSuccess('')
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setUploadError('Please select a CSV file.'); return }
    if (categories.length === 0) { setUploadError('Add at least one category before uploading products.'); e.target.value = ''; return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { rows, warnings } = parseCSV(ev.target.result)
      if (rows.length === 0) { setUploadError('No valid rows found. Check CSV format and that categories exist.'); return }
      setCsvPreview({ rows, warnings })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleConfirmUpload = async () => {
    if (!csvPreview) return
    setUploading(true)
    setUploadError('')
    await supabase.from('meat_products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('meat_products').insert(csvPreview.rows)
    setUploading(false)
    if (error) { setUploadError(error.message); return }
    setUploadSuccess(`${csvPreview.rows.length} products uploaded successfully.`)
    setCsvPreview(null)
    fetchProducts()
  }

  const handleMarkPlaced = async (orderId) => {
    await supabase.from('meat_orders').update({ status: 'order_placed', updated_at: new Date().toISOString() }).eq('id', orderId)
    fetchOrders()
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
  const fmtPrice = (p) => p == null ? 'N/A' : `$${Number(p).toFixed(2)}/kg`

  // Group products by category using category description as label
  const catMap = Object.fromEntries(categories.map(c => [c.name, c]))
  const grouped = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})
  const groupedKeys = categories.map(c => c.name).filter(n => grouped[n])

  if (!hasPermission('manage_users')) {
    return <div className={styles.loading}>Access denied.</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff Meat Offer</h1>
          <p className={styles.subtitle}>Manage categories, product catalogue and employee orders</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tabBtn} ${tab === 'categories' ? styles.tabBtnActive : ''}`} onClick={() => setTab('categories')}>
          Categories ({categories.length})
        </button>
        <button className={`${styles.tabBtn} ${tab === 'products' ? styles.tabBtnActive : ''}`} onClick={() => setTab('products')}>
          Products ({products.length})
        </button>
        <button className={`${styles.tabBtn} ${tab === 'orders' ? styles.tabBtnActive : ''}`} onClick={() => setTab('orders')}>
          Orders ({orders.length})
        </button>
      </div>

      {/* ── CATEGORIES TAB ── */}
      {tab === 'categories' && (
        <div>
          {/* Add / Edit form */}
          <div className={styles.catFormPanel}>
            <h3 className={styles.catFormTitle}>{editingCat ? 'Edit Category' : 'Add Category'}</h3>
            <div className={styles.catFormRow}>
              <div className={styles.catFormField}>
                <label className={styles.catFormLabel}>Name <span className={styles.catFormHint}>(used in CSV)</span></label>
                <input
                  className={styles.catFormInput}
                  placeholder="e.g. BEEF"
                  value={catForm.name}
                  onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                  disabled={!!editingCat}
                />
              </div>
              <div className={`${styles.catFormField} ${styles.catFormFieldGrow}`}>
                <label className={styles.catFormLabel}>Description <span className={styles.catFormHint}>(shown as section header to employees)</span></label>
                <input
                  className={styles.catFormInput}
                  placeholder="e.g. Beef Products"
                  value={catForm.description}
                  onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className={styles.catFormActions}>
                {editingCat && (
                  <button className={styles.catCancelBtn} onClick={startAdd}>Cancel</button>
                )}
                <button className={styles.catSaveBtn} onClick={handleCatSave} disabled={catSaving}>
                  {catSaving ? 'Saving...' : editingCat ? 'Update' : 'Add Category'}
                </button>
              </div>
            </div>
            {catError && <p className={styles.catError}>{catError}</p>}
            {catSuccess && <p className={styles.catSuccessMsg}>{catSuccess}</p>}
          </div>

          {/* Category list */}
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : categories.length === 0 ? (
            <div className={styles.empty}>No categories yet. Add one above to get started.</div>
          ) : (
            <div className={styles.catList}>
              {categories.map((cat, idx) => (
                <div key={cat.id} className={`${styles.catRow} ${editingCat?.id === cat.id ? styles.catRowEditing : ''}`}>
                  <div className={styles.catRowOrder}>
                    <button className={styles.catOrderBtn} onClick={() => moveCat(cat, -1)} disabled={idx === 0} title="Move up">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                    </button>
                    <button className={styles.catOrderBtn} onClick={() => moveCat(cat, 1)} disabled={idx === categories.length - 1} title="Move down">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                  </div>
                  <div className={styles.catRowInfo}>
                    <span className={styles.catRowName}>{cat.name}</span>
                    <span className={styles.catRowDesc}>{cat.description}</span>
                  </div>
                  <div className={styles.catRowMeta}>
                    <span className={styles.catRowCount}>{grouped[cat.name]?.length || 0} products</span>
                  </div>
                  <div className={styles.catRowBtns}>
                    <button className={styles.catEditBtn} onClick={() => startEdit(cat)}>Edit</button>
                    <button className={styles.catDeleteBtn} onClick={() => handleCatDelete(cat)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {tab === 'products' && (
        <div>
          <div className={styles.uploadSection}>
            <div className={styles.uploadInfo}>
              <h3 className={styles.uploadTitle}>Upload Product List</h3>
              <p className={styles.uploadHint}>
                CSV format: <code>product_code, description, price_per_kg, category</code> — category must match an existing category name exactly (case-insensitive). Uploading replaces all current products.
              </p>
              {categories.length > 0 && (
                <p className={styles.uploadCatList}>
                  Known categories: {categories.map(c => <code key={c.id}>{c.name}</code>).reduce((a, b) => [a, ', ', b])}
                </p>
              )}
            </div>
            <button
              className={styles.uploadBtn}
              onClick={() => fileRef.current?.click()}
              disabled={categories.length === 0}
              title={categories.length === 0 ? 'Add categories first' : ''}
            >
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

          {csvPreview && (
            <div className={styles.previewPanel}>
              <div className={styles.previewHeader}>
                <span className={styles.previewCount}>{csvPreview.rows.length} products ready to upload</span>
                <div className={styles.previewActions}>
                  <button className={styles.cancelPreviewBtn} onClick={() => setCsvPreview(null)}>Cancel</button>
                  <button className={styles.confirmUploadBtn} onClick={handleConfirmUpload} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Confirm & Replace'}
                  </button>
                </div>
              </div>
              {csvPreview.warnings.length > 0 && (
                <div className={styles.previewWarnings}>
                  <strong>{csvPreview.warnings.length} row{csvPreview.warnings.length !== 1 ? 's' : ''} skipped (unknown category):</strong>
                  <ul className={styles.previewWarningList}>
                    {csvPreview.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              <div className={styles.previewTableWrap}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr><th>Code</th><th>Description</th><th>Price/kg</th><th>Category</th></tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td className={styles.codeCell}>{r.product_code}</td>
                        <td>{r.description}</td>
                        <td>{fmtPrice(r.price_per_kg)}</td>
                        <td>{r.category}</td>
                      </tr>
                    ))}
                    {csvPreview.rows.length > 20 && (
                      <tr><td colSpan={4} className={styles.previewMore}>...and {csvPreview.rows.length - 20} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <div className={styles.empty}>No products yet. Upload a CSV to get started.</div>
          ) : (
            <div className={styles.categoryList}>
              {groupedKeys.map(catName => {
                const cat = catMap[catName]
                return (
                  <div key={catName} className={styles.categoryBlock}>
                    <div className={styles.categoryHeader}>
                      <div>
                        <span className={styles.categoryName}>{cat?.description || catName}</span>
                        <span className={styles.categoryCode}>{catName}</span>
                      </div>
                      <span className={styles.categoryCount}>{grouped[catName].length} products</span>
                    </div>
                    <table className={styles.productTable}>
                      <thead>
                        <tr><th>Code</th><th>Description</th><th>Price/kg</th></tr>
                      </thead>
                      <tbody>
                        {grouped[catName].map(p => (
                          <tr key={p.id}>
                            <td className={styles.codeCell}>{p.product_code}</td>
                            <td>{p.description}</td>
                            <td className={styles.priceCell}>{fmtPrice(p.price_per_kg)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
              {/* Ungrouped products (category not in categories table) */}
              {products.filter(p => !catMap[p.category]).length > 0 && (
                <div className={styles.categoryBlock}>
                  <div className={styles.categoryHeader}>
                    <span className={styles.categoryName} style={{ color: 'var(--warning)' }}>Unknown Category</span>
                    <span className={styles.categoryCount}>{products.filter(p => !catMap[p.category]).length} products</span>
                  </div>
                  <table className={styles.productTable}>
                    <thead><tr><th>Code</th><th>Description</th><th>Price/kg</th><th>Category</th></tr></thead>
                    <tbody>
                      {products.filter(p => !catMap[p.category]).map(p => (
                        <tr key={p.id}>
                          <td className={styles.codeCell}>{p.product_code}</td>
                          <td>{p.description}</td>
                          <td className={styles.priceCell}>{fmtPrice(p.price_per_kg)}</td>
                          <td className={styles.codeCell}>{p.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {tab === 'orders' && (
        <div className={styles.orderList}>
          {orders.length === 0 ? (
            <div className={styles.empty}>No orders yet.</div>
          ) : orders.map(order => {
            const items = order.meat_order_items || []
            const total = items.reduce((sum, i) => sum + (i.price_per_kg != null ? Number(i.price_per_kg) * Number(i.quantity) : 0), 0)
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
                        <td>{catMap[item.category]?.description || item.category}</td>
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
