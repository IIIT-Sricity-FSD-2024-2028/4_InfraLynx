import React from 'react';

/**
 * ComplaintDetailsModal - Displays the complete, untruncated details of a Civil complaint
 * Shows full ID, description, status, priority, complete location, reporter, SLA,
 * contractor/work order (if any), rejection reason (if rejected), photos, and history.
 */
export default function ComplaintDetailsModal({ complaint, onClose }) {
  if (!complaint) return null;

  const code = complaint.complaint_code || complaint.complaintCode || complaint.id || 'N/A';
  const rawId = complaint.raw_id || complaint.id;
  const title = complaint.title || `${complaint.category || 'Civil'}: ${complaint.subcategory || 'General'}`;
  const desc = complaint.description || 'No detailed description provided.';
  const status = (complaint.status || 'REPORTED').toUpperCase();
  const priority = (complaint.priority || complaint.severity || 'MEDIUM').toUpperCase();
  
  // Status badge colors
  const statusColors = {
    REPORTED: { bg: '#e0f2fe', color: '#0369a1', label: 'Reported' },
    UNDER_REVIEW: { bg: '#f1f5f9', color: '#475569', label: 'Under Review' },
    VALIDATED: { bg: '#ede9fe', color: '#6d28d9', label: 'Validated' },
    WORK_ORDER_CREATED: { bg: '#f5f3ff', color: '#7c3aed', label: 'Work Order Created' },
    ASSIGNED: { bg: '#e0e7ff', color: '#3730a3', label: 'Assigned' },
    IN_PROGRESS: { bg: '#fef3c7', color: '#b45309', label: 'In Progress' },
    AWAITING_DEPT_HEAD: { bg: '#fae8ff', color: '#86198f', label: 'Awaiting Dept Head' },
    AWAITING_COO: { bg: '#ffedd5', color: '#c2410c', label: 'Awaiting COO' },
    PENDING_VERIFICATION: { bg: '#e0f2fe', color: '#0284c7', label: 'Pending Verification' },
    COMPLETED: { bg: '#dcfce7', color: '#15803d', label: 'Completed' },
    CLOSED: { bg: '#dcfce7', color: '#166534', label: 'Closed / Verified' },
    REJECTED: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
  };

  const statusStyle = statusColors[status] || { bg: '#f3f4f6', color: '#374151', label: status };

  // Priority badge colors
  const priorityColors = {
    EMERGENCY: { bg: '#fee2e2', color: '#b91c1c' },
    HIGH: { bg: '#ffedd5', color: '#c2410c' },
    MEDIUM: { bg: '#fef3c7', color: '#b45309' },
    LOW: { bg: '#f1f5f9', color: '#475569' },
  };

  const priorityStyle = priorityColors[priority] || priorityColors.MEDIUM;

  const loc = complaint.location || {};
  const sector = complaint.sector || loc.sector || 'Sector 54';
  const block = complaint.block || loc.block || '';
  const street = complaint.street || loc.street || '';
  const landmark = complaint.location_details || loc.landmark || '';
  const assetId = complaint.asset_id || loc.asset_id || complaint.assetId || null;
  const assetName = complaint.asset_name || loc.asset_name || complaint.assetName || null;

  const reporterName = complaint.reported_by_name || 'Citizen Resident';
  const reporterRole = complaint.reported_by_role || 'RWA Member';
  const reporterEmail = complaint.reported_by_email;
  const reporterPhone = complaint.reported_by_phone;
  const reportedAt = complaint.reported_at || complaint.created_at;

  const slaDeadline = complaint.sla_deadline || complaint.slaDeadline;
  const isOverdue = slaDeadline && new Date(slaDeadline) < new Date() && status !== 'COMPLETED' && status !== 'CLOSED';

  const wo = complaint.work_order || null;
  const contractor = complaint.contractor || (wo?.contractor_id ? { id: wo.contractor_id } : null);

  const photos = Array.from(new Set([
    ...(complaint.beforePhotos || []),
    ...(complaint.photos || []),
    ...(complaint.afterPhotos || [])
  ]));

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="panel-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '0',
          border: '1px solid #e2e8f0',
          position: 'relative',
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          background: 'linear-gradient(to right, #faf5ff, #ffffff)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#6d28d9', background: '#ede9fe', padding: '4px 10px', borderRadius: '6px', letterSpacing: '0.05em' }}>
                {code}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: statusStyle.bg, color: statusStyle.color }}>
                {statusStyle.label}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: priorityStyle.bg, color: priorityStyle.color }}>
                {priority} PRIORITY
              </span>
              <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#334155' }}>
                Civil Department
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.3 }}>
              {title}
            </h2>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              {rawId && rawId !== code && <span>UUID: <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{rawId}</code> &bull; </span>}
              Reported on {reportedAt ? new Date(reportedAt).toLocaleString() : 'N/A'}
            </div>
          </div>

          <button 
            onClick={onClose} 
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#64748b',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Content Body */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Rejection Notice if rejected */}
          {status === 'REJECTED' && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>🚫</span>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#991b1b', fontSize: '15px', fontWeight: '700' }}>Complaint Rejected</h4>
                <p style={{ margin: 0, color: '#b91c1c', fontSize: '14px', lineHeight: 1.5 }}>
                  {complaint.rejection_reason || complaint.rejectionReason || 'No specific rejection reason recorded.'}
                </p>
              </div>
            </div>
          )}

          {/* 1. Complete Description Box (Full, no truncation) */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Complete Complaint Description
            </span>
            <div style={{
              fontSize: '15px',
              color: '#1e293b',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontWeight: '400'
            }}>
              {desc}
            </div>
          </div>

          {/* 2. Key Metadata Grid: Location, Reporter, SLA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            {/* Location Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>📍</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Location Details
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#334155' }}>
                <div><strong>Sector:</strong> {sector}</div>
                {block && <div><strong>Block:</strong> {block}</div>}
                {street && <div><strong>Street:</strong> {street}</div>}
                {landmark && <div><strong>Landmark:</strong> {landmark}</div>}
                {assetId && (
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                    Asset: <code>{assetId}</code> {assetName ? `(${assetName})` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Reporter Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>👤</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Reported By
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#334155' }}>
                <div><strong>{reporterName}</strong></div>
                <div style={{ color: '#64748b', fontSize: '13px' }}>Role: {reporterRole}</div>
                {reporterPhone && <div style={{ fontSize: '13px' }}>📞 {reporterPhone}</div>}
                {reporterEmail && <div style={{ fontSize: '13px' }}>✉️ {reporterEmail}</div>}
              </div>
            </div>

            {/* SLA Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>⏱️</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SLA Timeline
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#334155' }}>
                <div>
                  <strong>Target Deadline:</strong>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                    {slaDeadline ? new Date(slaDeadline).toLocaleString() : 'Standard 48-Hour Civil SLA'}
                  </div>
                </div>
                <div style={{ marginTop: '4px' }}>
                  {isOverdue ? (
                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>
                      🚨 SLA Breached / Overdue
                    </span>
                  ) : status === 'COMPLETED' || status === 'CLOSED' ? (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>
                      ✅ Resolved Within SLA
                    </span>
                  ) : (
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>
                      ⚡ SLA Active & On Track
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* 3. Work Order & Contractor Info (if assigned) */}
          {wo ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Associated Civil Work Order: {wo.work_order_number || wo.id}
                </span>
                <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px' }}>
                  Status: {wo.status?.replace(/_/g, ' ') || 'ASSIGNED'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Contractor</span>
                  <strong style={{ color: '#0f172a' }}>{contractor?.company_name || contractor?.name || 'Assigned Civil Contractor'}</strong>
                  {contractor?.contact_person && <div style={{ fontSize: '12px', color: '#64748b' }}>Contact: {contractor.contact_person}</div>}
                  {contractor?.phone && <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {contractor.phone}</div>}
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Estimated Cost</span>
                  <strong style={{ color: '#0f172a', fontSize: '16px' }}>
                    {complaint.estimated_cost ? `₹${Number(complaint.estimated_cost).toLocaleString()}` : 'Pending Contractor Estimate'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Special Instructions</span>
                  <span style={{ color: '#334155', fontSize: '13px' }}>
                    {wo.special_instructions || 'Repair under Civil Annual Maintenance Contract (AMC).'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>
              ℹ️ No contractor work order has been dispatched yet for this complaint. Desk clerks can validate and assign an AMC contractor.
            </div>
          )}

          {/* 4. Photo Evidence Gallery */}
          {photos.length > 0 && (
            <div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>
                Attached Evidence Photos ({photos.length})
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {photos.map((url, i) => (
                  <a 
                    key={i} 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}
                  >
                    <img 
                      src={url} 
                      alt={`Evidence ${i + 1}`} 
                      style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 5. Audit & Action History Timeline */}
          {Array.isArray(complaint.history) && complaint.history.length > 0 && (
            <div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>
                Action & Lifecycle History
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {complaint.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #6366f1', fontSize: '13px' }}>
                    <div style={{ minWidth: '85px', color: '#94a3b8', fontSize: '11px', paddingTop: '2px' }}>
                      {h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>
                        {h.stage || h.action} &bull; <span style={{ fontWeight: '500', color: '#64748b' }}>{h.actor || 'System'}</span>
                      </div>
                      {h.note && <div style={{ color: '#475569', marginTop: '2px' }}>{h.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#f8fafc',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px'
        }}>
          <button 
            type="button"
            className="button button-primary"
            onClick={onClose}
            style={{ padding: '8px 24px', background: '#4f46e5', color: '#ffffff', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}
