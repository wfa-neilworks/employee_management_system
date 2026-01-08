import { useState, useEffect } from 'react'
import { supabase, PRODUCT_CATEGORIES } from '../lib/supabase'
import jsPDF from 'jspdf'
import styles from './KnifeDocketsPage.module.css'

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const { data, error} = await supabase
        .from('knife_sales')
        .select('*')
        .order('sale_date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
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

      // To and From
      let yPos = 35
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      doc.text(`To: ${transaction.employee_payroll || 'N/A'} - ${transaction.employee_name}`, margin, yPos)
      yPos += 7
      const wageDisplay = transaction.wage_status === 'WFA' ? 'Woodward' : 'Labour Hire'
      doc.text(`From: ${wageDisplay} - ${transaction.department_name}`, margin, yPos)
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

      // Authorization Statement with underlines
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text('I ', margin, yPos)
      const iWidth = doc.getTextWidth('I ')

      // Employee name with underline
      const nameText = transaction.employee_name
      doc.text(nameText, margin + iWidth, yPos)
      const nameWidth = doc.getTextWidth(nameText)
      doc.line(margin + iWidth, yPos + 1, margin + iWidth + nameWidth, yPos + 1)

      // Text between name and amount
      const middleText = ', authorize the company to deduct the following amount '
      doc.text(middleText, margin + iWidth + nameWidth, yPos)
      const middleWidth = doc.getTextWidth(middleText)

      // Amount with underline
      const amountText = `${formatPrice(transaction.total_amount)}`
      const amountX = margin + iWidth + nameWidth + middleWidth
      doc.text(amountText, amountX, yPos)
      const amountWidth = doc.getTextWidth(amountText)
      doc.line(amountX, yPos + 1, amountX + amountWidth, yPos + 1)

      // Remaining text on next line
      yPos += 7
      const endText = ' from my salary for buying tools I need for my work.'
      const splitEndText = doc.splitTextToSize(endText, pageWidth - (margin * 2))
      doc.text(splitEndText, margin, yPos)
      yPos += splitEndText.length * 7 + 10

      // Signature
      if (employee?.signature) {
        doc.addImage(employee.signature, 'PNG', margin, yPos, 60, 20)
        yPos += 22
      }

      // Signature Line
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 5
      doc.text('Employee Signature', margin, yPos)

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
                    <button
                      onClick={() => handlePrintInvoice(transaction)}
                      className={styles.actionButton}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Print Invoice
                    </button>
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
