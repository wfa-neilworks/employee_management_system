import { useState, useEffect } from 'react'
import { supabase, PRODUCT_CATEGORIES } from '../lib/supabase'
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
