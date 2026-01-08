import { useState, useEffect, useRef } from 'react'
import { supabase, PRODUCT_CATEGORIES } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Modal from './Modal'
import SignatureCanvas from 'signature_pad'
import jsPDF from 'jspdf'
import styles from './FormModal.module.css'

const GST_RATE = 0.10 // 10% GST

export default function SellToEmployeeModal({ products, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)

  const signatureCanvasRef = useRef(null)
  const signaturePadRef = useRef(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    // Filter employees based on search
    if (employeeSearch) {
      const filtered = employees.filter(emp =>
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.payroll_number?.toLowerCase().includes(employeeSearch.toLowerCase())
      )
      setFilteredEmployees(filtered)
    } else {
      setFilteredEmployees(employees)
    }
  }, [employeeSearch, employees])

  useEffect(() => {
    // Initialize signature pad when in preview mode
    if (showPreview && signatureCanvasRef.current && !signaturePadRef.current) {
      signaturePadRef.current = new SignatureCanvas(signatureCanvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)'
      })
    }
  }, [showPreview])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*, departments(display_name)')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setEmployees(data || [])
      setFilteredEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const getFilteredProducts = () => {
    if (!productSearch) return products
    return products.filter(p =>
      p.product_code.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.product_name.toLowerCase().includes(productSearch.toLowerCase())
    )
  }

  const handleAddProduct = () => {
    const filteredProds = getFilteredProducts()
    if (filteredProds.length > 0) {
      setSelectedProducts([...selectedProducts, { product: filteredProds[0], quantity: 1 }])
      setProductSearch('') // Clear search after adding
    }
  }

  const handleRemoveProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index))
  }

  const handleProductChange = (index, productId) => {
    const product = products.find(p => p.id === productId)
    const newSelected = [...selectedProducts]
    newSelected[index] = { ...newSelected[index], product }
    setSelectedProducts(newSelected)
  }

  const handleQuantityChange = (index, quantity) => {
    const newSelected = [...selectedProducts]
    newSelected[index] = { ...newSelected[index], quantity: parseInt(quantity) || 1 }
    setSelectedProducts(newSelected)
  }

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, item) => {
      return sum + (item.product.selling_price * item.quantity)
    }, 0)
    const gst = subtotal * GST_RATE
    const total = subtotal + gst
    return { subtotal, gst, total }
  }

  const generateInvoiceNumber = async () => {
    try {
      const { data: sales } = await supabase
        .from('knife_sales')
        .select('invoice_number')
        .order('invoice_number', { ascending: false })
        .limit(1)

      const lastNumber = sales && sales.length > 0
        ? parseInt(sales[0].invoice_number.replace('KD', ''))
        : 0
      return `KD${String(lastNumber + 1).padStart(6, '0')}`
    } catch (error) {
      console.error('Error generating invoice number:', error)
      return `KD${String(Date.now()).slice(-6)}`
    }
  }

  const getCategoryLabel = (value) => {
    const category = PRODUCT_CATEGORIES.find(c => c.value === value)
    return category ? category.label : value
  }

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear()
    }
  }

  const captureSignature = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      return signaturePadRef.current.toDataURL()
    }
    return null
  }

  const generatePDF = (invoiceNumber, employee, items, totals, signature) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const margin = 20
    let yPos = 20

    // Invoice Number - Top Left
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(invoiceNumber, margin, yPos)

    // Date - Top Right
    const today = new Date().toLocaleDateString('en-AU')
    doc.text(today, pageWidth - margin, yPos, { align: 'right' })
    yPos += 15

    // To: Employee
    doc.setFontSize(11)
    doc.text(`To: ${employee.payroll_number || 'N/A'} - ${employee.name}`, margin, yPos)
    yPos += 7

    // From: Wage Status - Department
    const wageStatus = employee.wage_status === 'WFA' ? 'Woodward' : 'Labour Hire'
    doc.text(`From: ${wageStatus} - ${employee.departments?.display_name || 'N/A'}`, margin, yPos)
    yPos += 15

    // Product List Header
    doc.setFont(undefined, 'bold')
    doc.text('QTY', margin, yPos)
    doc.text('Product Details', margin + 20, yPos)
    yPos += 7

    // Product Items
    doc.setFont(undefined, 'normal')
    items.forEach(item => {
      // Quantity
      doc.text(String(item.quantity), margin, yPos)

      // Product Code and Classification
      doc.text(`${item.product.product_code} / ${getCategoryLabel(item.product.category)}`, margin + 20, yPos)
      yPos += 5

      // Product Name
      doc.setFontSize(9)
      doc.text(item.product.product_name, margin + 20, yPos)
      yPos += 4

      // Price + GST
      const itemTotal = item.product.selling_price * item.quantity
      doc.text(`$${itemTotal.toFixed(2)} + GST`, margin + 20, yPos)
      doc.setFontSize(11)
      yPos += 10
    })

    yPos += 5

    // Totals
    doc.setFont(undefined, 'bold')
    doc.text(`Subtotal: $${totals.subtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 7
    doc.text(`GST (10%): $${totals.gst.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 7
    doc.setFontSize(12)
    doc.text(`Total Amount: $${totals.total.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 20

    // Authorization Statement with underlines
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')

    // Text before name
    doc.text('I ', margin, yPos)
    const iWidth = doc.getTextWidth('I ')

    // Employee name with underline
    const nameText = employee.name
    doc.text(nameText, margin + iWidth, yPos)
    const nameWidth = doc.getTextWidth(nameText)
    doc.line(margin + iWidth, yPos + 1, margin + iWidth + nameWidth, yPos + 1) // Underline name

    // Text between name and amount
    const middleText = ', authorize the company to deduct the following amount '
    doc.text(middleText, margin + iWidth + nameWidth, yPos)
    const middleWidth = doc.getTextWidth(middleText)

    // Amount with underline
    const amountText = `$${totals.total.toFixed(2)}`
    const amountX = margin + iWidth + nameWidth + middleWidth
    doc.text(amountText, amountX, yPos)
    const amountWidth = doc.getTextWidth(amountText)
    doc.line(amountX, yPos + 1, amountX + amountWidth, yPos + 1) // Underline amount

    // Remaining text on next line if needed
    yPos += 7
    const endText = ' from my salary for buying tools I need for my work.'
    const splitEndText = doc.splitTextToSize(endText, pageWidth - (margin * 2))
    doc.text(splitEndText, margin, yPos)
    yPos += splitEndText.length * 7 + 10

    // Signature
    if (signature) {
      doc.addImage(signature, 'PNG', margin, yPos, 60, 20)
      yPos += 22
    }

    // Signature Line
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 7
    doc.setFontSize(9)
    doc.text('Employee Signature', margin, yPos)

    return doc
  }

  const handlePreview = () => {
    if (!selectedEmployee) {
      setError('Please select an employee')
      return
    }
    if (selectedProducts.length === 0) {
      setError('Please add at least one product')
      return
    }
    setError('')
    setShowPreview(true)
  }

  const handleFinalSubmit = async () => {
    const signature = captureSignature()
    if (!signature) {
      setError('Please provide a signature')
      return
    }

    setError('')
    setLoading(true)

    try {
      const invoiceNumber = await generateInvoiceNumber()
      const totals = calculateTotals()

      // Prepare items data
      const items = selectedProducts.map(item => ({
        product_id: item.product.id,
        product_code: item.product.product_code,
        product_name: item.product.product_name,
        category: item.product.category,
        quantity: item.quantity,
        unit_price: item.product.selling_price,
        subtotal: item.product.selling_price * item.quantity
      }))

      // Save signature to employee record (replaces old signature)
      const { error: signatureError } = await supabase
        .from('employees')
        .update({ signature: signature })
        .eq('id', selectedEmployee.id)

      if (signatureError) throw signatureError

      // Save transaction to database
      const { error: insertError } = await supabase
        .from('knife_sales')
        .insert([{
          invoice_number: invoiceNumber,
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.name,
          employee_payroll: selectedEmployee.payroll_number,
          wage_status: selectedEmployee.wage_status,
          department_name: selectedEmployee.departments?.display_name || 'N/A',
          sale_date: new Date().toISOString().split('T')[0],
          items: items,
          subtotal: totals.subtotal,
          gst: totals.gst,
          total_amount: totals.total,
          created_by: user.id
        }])

      if (insertError) throw insertError

      // Generate and download PDF
      const pdf = generatePDF(invoiceNumber, selectedEmployee, selectedProducts, totals, signature)
      pdf.save(`${invoiceNumber}_${selectedEmployee.name.replace(/\s+/g, '_')}.pdf`)

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()
  const formatPrice = (price) => `$${price.toFixed(2)}`

  if (showPreview) {
    return (
      <Modal onClose={onClose}>
        <div className={styles.modal} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
          <h2 className={styles.modalTitle}>Invoice Preview</h2>

          {error && <div className={styles.error}>{error}</div>}

          {/* Preview Content */}
          <div style={{ background: 'white', color: 'black', padding: '30px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>KD######</div>
              <div>{new Date().toLocaleDateString('en-AU')}</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div><strong>To:</strong> {selectedEmployee.payroll_number || 'N/A'} - {selectedEmployee.name}</div>
              <div><strong>From:</strong> {selectedEmployee.wage_status === 'WFA' ? 'Woodward' : 'Labour Hire'} - {selectedEmployee.departments?.display_name || 'N/A'}</div>
            </div>

            <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333' }}>
                  <th style={{ textAlign: 'left', padding: '8px', width: '50px' }}>QTY</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Product Details</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>{item.quantity}</td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.product.product_code} / {getCategoryLabel(item.product.category)}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{item.product.product_name}</div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px' }}>
                      {formatPrice(item.product.selling_price * item.quantity)} + GST
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <div>Subtotal: <strong>{formatPrice(totals.subtotal)}</strong></div>
              <div>GST (10%): <strong>{formatPrice(totals.gst)}</strong></div>
              <div style={{ fontSize: '18px', color: '#d4ff00' }}>Total: <strong>{formatPrice(totals.total)}</strong></div>
            </div>

            <div style={{ marginBottom: '20px', fontSize: '12px' }}>
              I {selectedEmployee.name}, authorize the company to deduct the following amount {formatPrice(totals.total)} from my salary for buying tools I need for my work.
            </div>

            {/* Signature Canvas */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Employee Signature:</div>
              <canvas
                ref={signatureCanvasRef}
                width={500}
                height={150}
                style={{ border: '2px solid #333', borderRadius: '4px', touchAction: 'none' }}
              />
              <button
                type="button"
                onClick={clearSignature}
                className={styles.cancelButton}
                style={{ marginTop: '8px', padding: '6px 12px' }}
              >
                Clear Signature
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={styles.cancelButton}
              disabled={loading}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Generate Invoice & Print'}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <div className={styles.modal} style={{ maxWidth: '800px' }}>
        <h2 className={styles.modalTitle}>Sell to Employee</h2>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }} className={styles.form}>
          {/* Employee Selection with Search */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Search Employee *</label>
            <input
              type="text"
              placeholder="Search by name or payroll number..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className={styles.input}
              style={{ marginBottom: '8px' }}
            />
            <select
              value={selectedEmployee?.id || ''}
              onChange={(e) => {
                const emp = employees.find(emp => emp.id === e.target.value)
                setSelectedEmployee(emp)
              }}
              required
              className={styles.select}
            >
              <option value="">-- Select Employee --</option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.payroll_number || 'No Payroll'}) - {emp.departments?.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Products Selection with Search */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Products</label>
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className={styles.input}
              style={{ marginBottom: '8px' }}
            />

            {selectedProducts.map((item, index) => (
              <div key={index} style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    style={{ width: '60px' }}
                    className={styles.input}
                    placeholder="Qty"
                  />
                  <select
                    value={item.product.id}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    className={styles.select}
                    style={{ flex: 1 }}
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.product_code} - {product.product_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(index)}
                    className={styles.cancelButton}
                    style={{ padding: '6px 12px' }}
                  >
                    Remove
                  </button>
                </div>
                {/* Product Details */}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '68px' }}>
                  <div><strong>Category:</strong> {getCategoryLabel(item.product.category)}</div>
                  {item.product.description && <div><strong>Description:</strong> {item.product.description}</div>}
                  <div><strong>Price:</strong> {formatPrice(item.product.selling_price)} each</div>
                  <div><strong>Subtotal:</strong> {formatPrice(item.product.selling_price * item.quantity)}</div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddProduct}
              className={styles.submitButton}
              style={{ marginTop: '8px', padding: '8px 16px' }}
              disabled={getFilteredProducts().length === 0}
            >
              + Add Product
            </button>
          </div>

          {/* Totals Display */}
          {selectedProducts.length > 0 && (
            <div className={styles.formGroup} style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Subtotal:</span>
                <strong>{formatPrice(totals.subtotal)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>GST (10%):</span>
                <strong>{formatPrice(totals.gst)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: 'var(--accent-primary)' }}>
                <span>Total:</span>
                <strong>{formatPrice(totals.total)}</strong>
              </div>
            </div>
          )}

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
              Preview Invoice
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
