import styles from './Modal.module.css'

export default function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${wide ? styles.wide : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}
