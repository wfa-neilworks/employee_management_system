import { useState, useEffect } from 'react'
import { supabase, PRODUCT_CATEGORIES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import jsPDF from 'jspdf'
import styles from './KnifeDocketsPage.module.css'

export default function TransactionHistoryPage() {
  const { isAccounts, user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [activeTab, setActiveTab] = useState('docket') // 'docket' or 'processed'
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    fetchTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const isProcessed = activeTab === 'processed'
      const { data, error} = await supabase
        .from('knife_sales')
        .select('*')
        .eq('processed', isProcessed)
        .order('sale_date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessTransaction = async (transactionId) => {
    if (!confirm('Are you sure this has been processed?')) {
      return
    }

    setProcessing(transactionId)
    try {
      console.log('Processing transaction:', transactionId)
      const { data, error } = await supabase
        .from('knife_sales')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', transactionId)
        .select()

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      console.log('Transaction processed successfully:', data)

      // Refresh the list
      await fetchTransactions()
      console.log('Transaction list refreshed')
    } catch (error) {
      console.error('Error processing transaction:', error)
      alert('Failed to process transaction: ' + error.message)
    } finally {
      setProcessing(null)
    }
  }

  const getCategoryLabel = (value) => {
    const category = PRODUCT_CATEGORIES.find(c => c.value === value)
    return category ? category.label : value
  }

  const formatPrice = (price) => `$${parseFloat(price).toFixed(2)}`
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-AU')

  const filteredTransactions = transactions.filter((transaction) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || (
      transaction.invoice_number.toLowerCase().includes(query) ||
      transaction.employee_name.toLowerCase().includes(query) ||
      transaction.employee_payroll?.toLowerCase().includes(query)
    )

    const transactionDate = new Date(transaction.sale_date)
    const matchesDateFrom = !filterDateFrom || transactionDate >= new Date(filterDateFrom)
    const matchesDateTo = !filterDateTo || transactionDate <= new Date(filterDateTo)

    return matchesSearch && matchesDateFrom && matchesDateTo
  })

  const clearFilters = () => {
    setSearchQuery('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const handlePrintInvoice = async (transaction) => {
    try {
      // Fetch employee to get signature
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('signature')
        .eq('id', transaction.employee_id)
        .single()

      if (empError) {
        console.error('Error fetching employee:', empError)
        // Continue without signature if there's an error
      }

      // Debug: Log signature status
      console.log('Employee data:', employee)
      console.log('Has signature:', !!employee?.signature)
      if (employee?.signature) {
        console.log('Signature length:', employee.signature.length)
        console.log('Signature preview:', employee.signature.substring(0, 50))
      }

      // Generate PDF
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const margin = 15

      // Header - Invoice Number and Date
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text(transaction.invoice_number, margin, 20)
      doc.text(formatDate(transaction.sale_date), pageWidth - margin, 20, { align: 'right' })

      // To and From with underlines
      let yPos = 35
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')

      // To: line
      const toLabel = 'To: '
      doc.text(toLabel, margin, yPos)
      const toLabelWidth = doc.getTextWidth(toLabel)
      const toContent = `${transaction.employee_payroll || 'N/A'} - ${transaction.employee_name}`
      doc.text(toContent, margin + toLabelWidth, yPos)
      const toContentWidth = doc.getTextWidth(toContent)
      doc.line(margin + toLabelWidth, yPos + 1, margin + toLabelWidth + toContentWidth, yPos + 1)
      yPos += 7

      // From: line
      const fromLabel = 'From: '
      doc.text(fromLabel, margin, yPos)
      const fromLabelWidth = doc.getTextWidth(fromLabel)
      const wageDisplay = transaction.wage_status === 'WFA' ? 'Woodward' : 'Labour Hire'
      const fromContent = `${wageDisplay} - ${transaction.department_name}`
      doc.text(fromContent, margin + fromLabelWidth, yPos)
      const fromContentWidth = doc.getTextWidth(fromContent)
      doc.line(margin + fromLabelWidth, yPos + 1, margin + fromLabelWidth + fromContentWidth, yPos + 1)
      yPos += 15

      // Table Header
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text('QTY', margin, yPos)
      doc.text('Product Code/Classification', margin + 15, yPos)
      doc.text('Product Name', margin + 80, yPos)
      doc.text('Price + GST', pageWidth - margin, yPos, { align: 'right' })
      yPos += 5
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 7

      // Table Items
      doc.setFont(undefined, 'normal')
      transaction.items.forEach((item) => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        doc.text(item.quantity.toString(), margin, yPos)
        doc.text(item.product_code, margin + 15, yPos)

        // Wrap product name if too long
        const maxNameWidth = pageWidth - margin - 100
        const nameLines = doc.splitTextToSize(item.product_name, maxNameWidth)
        doc.text(nameLines, margin + 80, yPos)

        doc.text(formatPrice(item.subtotal), pageWidth - margin, yPos, { align: 'right' })
        yPos += Math.max(7, nameLines.length * 5)
      })

      yPos += 5
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 10

      // Totals
      doc.setFont(undefined, 'normal')
      doc.text(`Subtotal: ${formatPrice(transaction.subtotal)}`, pageWidth - margin, yPos, { align: 'right' })
      yPos += 7
      doc.text(`GST (10%): ${formatPrice(transaction.gst)}`, pageWidth - margin, yPos, { align: 'right' })
      yPos += 7
      doc.setFontSize(12)
      doc.text(`Total Amount: ${formatPrice(transaction.total_amount)}`, pageWidth - margin, yPos, { align: 'right' })
      yPos += 20

      // Title - PAYMENT DEDUCTION AUTHORITY (centered with underline)
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      const titleText = 'PAYMENT DEDUCTION AUTHORITY'
      const titleWidth = doc.getTextWidth(titleText)
      const titleX = (pageWidth - titleWidth) / 2
      doc.text(titleText, titleX, yPos)
      doc.line(titleX, yPos + 1, titleX + titleWidth, yPos + 1)
      yPos += 15

      // Authorization Statement with underlines (centered)
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')

      // Calculate total width for centering the first line
      const iText = 'I '
      const nameText = transaction.employee_name
      const middleText = ', do hereby give authority for the amount of '
      const amountText = `${formatPrice(transaction.total_amount)}`

      const iWidth = doc.getTextWidth(iText)
      const nameWidth = doc.getTextWidth(nameText)
      const middleWidth = doc.getTextWidth(middleText)
      const amountWidth = doc.getTextWidth(amountText)
      const firstLineWidth = iWidth + nameWidth + middleWidth + amountWidth
      const startX = (pageWidth - firstLineWidth) / 2

      // First line centered
      let currentX = startX
      doc.text(iText, currentX, yPos)
      currentX += iWidth

      // Employee name with underline
      doc.text(nameText, currentX, yPos)
      doc.line(currentX, yPos + 1, currentX + nameWidth, yPos + 1)
      currentX += nameWidth

      // Text between name and amount
      doc.text(middleText, currentX, yPos)
      currentX += middleWidth

      // Amount with underline
      doc.text(amountText, currentX, yPos)
      doc.line(currentX, yPos + 1, currentX + amountWidth, yPos + 1)
      yPos += 7

      // Remaining text on next line (centered)
      const endText = 'to be deducted from my next salary/wage'
      const endTextWidth = doc.getTextWidth(endText)
      const endTextX = (pageWidth - endTextWidth) / 2
      doc.text(endText, endTextX, yPos)
      yPos += 15

      // Signature - centered
      const signatureWidth = 60
      const signatureHeight = 20
      const signatureX = (pageWidth - signatureWidth) / 2

      if (employee?.signature) {
        doc.addImage(employee.signature, 'PNG', signatureX, yPos, signatureWidth, signatureHeight)
        yPos += signatureHeight + 2
      }

      // Signature Line - centered
      const lineWidth = 100
      const lineX = (pageWidth - lineWidth) / 2
      doc.line(lineX, yPos, lineX + lineWidth, yPos)
      yPos += 5
      doc.text('Employee Signature', pageWidth / 2, yPos, { align: 'center' })

      // Open PDF in new tab instead of downloading
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
    } catch (error) {
      console.error('Error printing invoice:', error)
      alert('Failed to generate invoice PDF')
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Transaction History</h1>
          <p className={styles.subtitle}>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        borderBottom: '2px solid var(--border-color)',
        padding: '0'
      }}>
        <button
          onClick={() => setActiveTab('docket')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'docket' ? '#ff8800' : 'var(--bg-secondary)',
            color: activeTab === 'docket' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'docket' ? '3px solid #ff8800' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s ease'
          }}
        >
          Docket
        </button>
        <button
          onClick={() => setActiveTab('processed')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'processed' ? '#00cc66' : 'var(--bg-secondary)',
            color: activeTab === 'processed' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'processed' ? '3px solid #00cc66' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s ease'
          }}
        >
          Processed Docket
        </button>
      </div>

      <div className={styles.filterSection}>
        <input
          type="text"
          placeholder="Search by invoice, employee name, or payroll..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className={styles.filterSelect}
          placeholder="From Date"
        />
        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className={styles.filterSelect}
          placeholder="To Date"
        />
        {(searchQuery || filterDateFrom || filterDateTo) && (
          <button onClick={clearFilters} className={styles.clearButton}>
            Clear Filters
          </button>
        )}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className={styles.empty}>
          <p>No transactions found.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Employee</th>
                <th>Payroll</th>
                <th>Department</th>
                <th>Items</th>
                <th className={styles.priceColumn}>Subtotal</th>
                <th className={styles.priceColumn}>GST</th>
                <th className={styles.priceColumn}>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className={styles.codeCell}>{transaction.invoice_number}</td>
                  <td>{formatDate(transaction.sale_date)}</td>
                  <td>{transaction.employee_name}</td>
                  <td>{transaction.employee_payroll || 'N/A'}</td>
                  <td>{transaction.department_name}</td>
                  <td>
                    <details>
                      <summary style={{ cursor: 'pointer', color: 'var(--accent-primary)' }}>
                        {transaction.items.length} item{transaction.items.length !== 1 ? 's' : ''}
                      </summary>
                      <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '12px' }}>
                        {transaction.items.map((item, idx) => (
                          <li key={idx}>
                            {item.quantity}x {item.product_code} - {item.product_name}
                            ({getCategoryLabel(item.category)}) - {formatPrice(item.subtotal)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td className={styles.priceColumn}>{formatPrice(transaction.subtotal)}</td>
                  <td className={styles.priceColumn}>{formatPrice(transaction.gst)}</td>
                  <td className={styles.priceColumn} style={{ fontWeight: 'bold' }}>
                    {formatPrice(transaction.total_amount)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handlePrintInvoice(transaction)}
                        className={styles.actionButton}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          background: '#0066cc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#0052a3'}
                        onMouseLeave={(e) => e.target.style.background = '#0066cc'}
                      >
                        🖨️ Print Invoice
                      </button>
                      {isAccounts() && activeTab === 'docket' && (
                        <button
                          onClick={() => handleProcessTransaction(transaction.id)}
                          className={styles.actionButton}
                          disabled={processing === transaction.id}
                          style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            background: processing === transaction.id ? '#cccccc' : '#00cc66',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: processing === transaction.id ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: processing === transaction.id ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          onMouseEnter={(e) => !processing && (e.target.style.background = '#00a352')}
                          onMouseLeave={(e) => !processing && (e.target.style.background = '#00cc66')}
                        >
                          {processing === transaction.id ? '⏳ Processing...' : '✓ Process'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
