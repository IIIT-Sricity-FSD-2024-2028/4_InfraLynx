export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', padding: '28px 0' }}>
      <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13, color: 'var(--ink-soft)' }}>
        <span>© {new Date().getFullYear()} TIMS — Township Infrastructure Management System</span>
        <span>Built on Annual Maintenance Contracts, not owned inventory</span>
      </div>
    </footer>
  )
}
