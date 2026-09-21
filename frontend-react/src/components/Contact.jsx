import { useState } from 'react'

export default function Contact() {
  const [sent, setSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section id="contact" className="section" style={{ borderBottom: 'none' }}>
      <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 48 }}>
        <div>
          <div className="eyebrow">Contact</div>
          <h2 style={{ fontSize: 32, marginTop: 10 }}>Talk to us about your township</h2>
          <p style={{ marginTop: 14, fontSize: 15, color: 'var(--ink-soft)', maxWidth: 380 }}>
            Tell us about your departments, contractor base and current process. We'll walk you
            through a setup that fits.
          </p>

          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14.5 }}>
            <div><strong>Email</strong> — contact@timsplatform.in</div>
            <div><strong>Phone</strong> — +91 00000 00000</div>
            <div><strong>Office</strong> — Township Ops Center, Andhra Pradesh, IN</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ border: '1px solid var(--line)', borderRadius: 4, padding: 28, background: 'var(--paper-raised)' }}>
          {sent ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <h3 style={{ fontSize: 18 }}>Message sent</h3>
              <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--ink-soft)' }}>
                We'll get back to you within one business day.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Name" name="name" />
              <Field label="Role" name="role" placeholder="e.g. Township COO" />
              <Field label="Township / Organization" name="org" full />
              <Field label="Email" name="email" type="email" full />
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Message</label>
                <textarea name="message" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1', justifyContent: 'center' }}>
                Send message
              </button>
            </div>
          )}
        </form>
      </div>
      <style>{`
        @media (max-width: 860px) {
          section#contact > .wrap { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

const labelStyle = { display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--ink-soft)' }
const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 3,
  fontFamily: 'var(--font-body)', fontSize: 14.5, background: 'var(--paper)',
}

function Field({ label, name, type = 'text', placeholder, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <label style={labelStyle}>{label}</label>
      <input name={name} type={type} placeholder={placeholder} style={inputStyle} required />
    </div>
  )
}
