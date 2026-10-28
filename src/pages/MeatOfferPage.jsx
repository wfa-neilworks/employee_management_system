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

  // Mark placed modal state
  const [placingOrder, setPlacingOrder] = useState(null) // order object
  const [orderNumberInput, setOrderNumberInput] = useState('')
  const [orderNumberError, setOrderNumberError] = useState('')
  const [markingPlaced, setMarkingPlaced] = useState(false)

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
      .select('*, employees(name, english_name, payroll_number, wage_status, departments(display_name)), meat_order_items(*)')
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

  const openMarkPlaced = (order) => {
    setPlacingOrder(order)
    setOrderNumberInput('')
    setOrderNumberError('')
  }

  const handleMarkPlaced = async () => {
    const num = orderNumberInput.trim()
    if (!/^\d{6}$/.test(num)) { setOrderNumberError('Order number must be exactly 6 digits.'); return }
    setMarkingPlaced(true)
    await supabase.from('meat_orders').update({
      status: 'order_placed',
      order_number: num,
      updated_at: new Date().toISOString(),
    }).eq('id', placingOrder.id)
    setMarkingPlaced(false)
    setPlacingOrder(null)
    fetchOrders()
  }

  const handlePrintOrder = (order) => {
    const emp = order.employees || {}
    const items = order.meat_order_items || []
    const placed = order.status === 'order_placed'
    const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

    const itemRows = items.map(item => `
      <tr>
        <td>${item.product_code}</td>
        <td>${item.description}</td>
        <td>${catMap[item.category]?.description || item.category}</td>
        <td style="text-align:center">${Number(item.quantity)}</td>
        <td style="text-align:right">${item.price_per_kg != null ? '$' + Number(item.price_per_kg).toFixed(2) + '/kg' : 'N/A'}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Meat Order</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #111; padding-bottom: 16px; }
      .logo { height: 56px; }
      .header-right { text-align: right; }
      .doc-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
      .order-num { font-size: 13px; color: #555; }
      .status-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
      .status-placed { background: #d1fae5; color: #065f46; }
      .status-pending { background: #fef3c7; color: #92400e; }
      .emp-section { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f5f5f5; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; }
      .emp-row { display: flex; flex-direction: column; gap: 2px; }
      .emp-label { font-size: 10px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.5px; }
      .emp-val { font-size: 13px; font-weight: 600; color: #111; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #111; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 8px 10px; border-bottom: 1px solid #e5e5e5; font-size: 12px; }
      tr:last-child td { border-bottom: none; }
      tr:nth-child(even) td { background: #fafafa; }
      .sig-section { margin-top: 16px; display: flex; justify-content: flex-end; }
      .sig-box { text-align: center; }
      .sig-img { height: 56px; margin-bottom: 4px; border-bottom: 1px solid #111; }
      .sig-label { font-size: 10px; color: #777; }
      .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
      @media print { body { padding: 16px; } }
    </style></head><body>
    <div class="header">
      <img src="${window.location.origin}/WFA_LOGO.png" class="logo" alt="WFA" />
      <div class="header-right">
        <div class="doc-title">Staff Meat Order</div>
        ${order.order_number ? `<div class="order-num">Order No: <strong>${order.order_number}</strong></div>` : ''}
        <div style="margin-top:6px">
          <span class="status-badge ${placed ? 'status-placed' : 'status-pending'}">${placed ? 'Order Placed' : 'Pending'}</span>
        </div>
        <div style="margin-top:4px;font-size:11px;color:#555">Submitted: ${fmtD(order.submitted_at)}</div>
      </div>
    </div>
    <div class="emp-section">
      <div class="emp-row"><span class="emp-label">Employee Name</span><span class="emp-val">${emp.name || '—'}${emp.english_name ? ' (' + emp.english_name + ')' : ''}</span></div>
      <div class="emp-row"><span class="emp-label">Payroll Number</span><span class="emp-val">${emp.payroll_number || '—'}</span></div>
      <div class="emp-row"><span class="emp-label">Department</span><span class="emp-val">${emp.departments?.display_name || '—'}</span></div>
      <div class="emp-row"><span class="emp-label">Wage Status</span><span class="emp-val">${emp.wage_status?.replace(/_/g, ' ') || '—'}</span></div>
    </div>
    <table>
      <thead><tr><th>Code</th><th>Description</th><th>Category</th><th style="text-align:center">Qty (ctns)</th><th style="text-align:right">Price/kg</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    ${order.signature_url ? `
    <div class="sig-section">
      <div class="sig-box">
        <img src="${order.signature_url}" class="sig-img" alt="Signature" />
        <div class="sig-label">Employee Signature</div>
      </div>
    </div>` : ''}
    <div class="footer">Woodward Foods Australia — Staff Meat Offer</div>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 400)
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
            const placed = order.status === 'order_placed'
            return (
              <div key={order.id} className={`${styles.orderCard} ${placed ? styles.orderPlaced : ''}`}>
                <div className={styles.orderCardHeader}>
                  <div>
                    <span className={styles.orderEmp}>{order.employees?.name}</span>
                    {order.employees?.english_name && <span className={styles.orderEmpEng}> ({order.employees.english_name})</span>}
                    <span className={styles.orderDept}>{order.employees?.departments?.display_name}</span>
                    {order.employees?.payroll_number && (
                      <span className={styles.orderMeta}>Payroll: {order.employees.payroll_number}</span>
                    )}
                    {order.employees?.wage_status && (
                      <span className={styles.orderMeta}>{order.employees.wage_status.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  <div className={styles.orderCardRight}>
                    <span className={`${styles.orderStatus} ${placed ? styles.statusPlaced : styles.statusPending}`}>
                      {placed ? 'Order Placed' : 'Pending'}
                    </span>
                    {placed && order.order_number && (
                      <span className={styles.orderNumber}>Order #{order.order_number}</span>
                    )}
                    <span className={styles.orderDate}>{fmt(order.submitted_at)}</span>
                    <div className={styles.orderActions}>
                      {!placed && (
                        <button className={styles.markPlacedBtn} onClick={() => openMarkPlaced(order)}>
                          Mark as Order Placed
                        </button>
                      )}
                      <button className={styles.printOrderBtn} onClick={() => handlePrintOrder(order)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 6 2 18 2 18 9"/>
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                          <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        Print
                      </button>
                    </div>
                  </div>
                </div>
                <table className={styles.orderItemsTable}>
                  <thead>
                    <tr><th>Code</th><th>Description</th><th>Category</th><th>Qty (ctns)</th><th>Price/kg</th></tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td className={styles.codeCell}>{item.product_code}</td>
                        <td>{item.description}</td>
                        <td>{catMap[item.category]?.description || item.category}</td>
                        <td>{Number(item.quantity)}</td>
                        <td className={styles.priceCell}>{fmtPrice(item.price_per_kg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {order.signature_url && (
                  <div className={styles.orderFooter}>
                    <img src={order.signature_url} alt="Signature" className={styles.orderSig} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Mark Placed Modal ── */}
      {placingOrder && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Mark as Order Placed</h3>
              <button className={styles.modalClose} onClick={() => setPlacingOrder(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <p className={styles.modalText}>
              Enter the 6-digit supplier order number for <strong>{placingOrder.employees?.name}</strong>'s order.
            </p>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Order Number</label>
              <input
                className={styles.modalInput}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 123456"
                value={orderNumberInput}
                onChange={e => { setOrderNumberInput(e.target.value.replace(/\D/g, '')); setOrderNumberError('') }}
                onKeyDown={e => e.key === 'Enter' && handleMarkPlaced()}
                autoFocus
              />
              {orderNumberError && <p className={styles.modalError}>{orderNumberError}</p>}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setPlacingOrder(null)}>Cancel</button>
              <button className={styles.modalConfirmBtn} onClick={handleMarkPlaced} disabled={markingPlaced}>
                {markingPlaced ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
