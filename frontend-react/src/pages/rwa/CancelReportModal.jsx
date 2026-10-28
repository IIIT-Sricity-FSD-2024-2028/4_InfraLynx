import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { complaintApi } from '../../services/api.js';

const cancelSchema = z.object({
  reasonCategory: z.enum([
    'RESOLVED_INTERNALLY',
    'DUPLICATE_REPORT',
    'WRONG_LOCATION',
    'FALSE_ALARM',
    'OTHER',
  ], {
    required_error: 'Please select a reason for cancellation',
  }),
  remarks: z
    .string()
    .min(10, 'Mandatory remarks must be at least 10 characters explaining the cancellation')
    .max(500, 'Remarks cannot exceed 500 characters'),
});

const REASON_LABELS = {
  RESOLVED_INTERNALLY: 'Problem resolved by resident / RWA internally',
  DUPLICATE_REPORT: 'Duplicate ticket filed in error',
  WRONG_LOCATION: 'Incorrect location or domain category selected',
  FALSE_ALARM: 'Inspection revealed no repair needed (False alarm)',
  OTHER: 'Other legitimate operational reason',
};

export default function CancelReportModal({ isOpen, complaint, onClose, onSuccess }) {
  if (!isOpen || !complaint) return null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(cancelSchema),
    defaultValues: {
      reasonCategory: 'RESOLVED_INTERNALLY',
      remarks: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      const fullReason = `${REASON_LABELS[data.reasonCategory] || data.reasonCategory}: ${data.remarks.trim()}`;
      const res = await complaintApi.cancelComplaint(complaint.id, {
        reason: fullReason,
        remarks: data.remarks.trim(),
        category: data.reasonCategory,
      });

      reset();
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      alert(`Failed to cancel complaint: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          width: '100%',
          maxWidth: 520,
          border: '1px solid #fee2e2',
          overflow: 'hidden',
        }}
      >
        {/* Warning Header */}
        <div
          style={{
            padding: '16px 24px',
            background: '#fef2f2',
            borderBottom: '1px solid #fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 17, color: '#991b1b', fontWeight: 700 }}>
              🛑 Cancel Complaint: {complaint.complaint_code || complaint.id}
            </h3>
            <span style={{ fontSize: 12, color: '#b91c1c' }}>
              Action cannot be undone once confirmed.
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: '#991b1b',
            }}
          >
            ✕
          </button>
        </div>

        {/* Warning Banner */}
        <div
          style={{
            margin: '16px 24px 0 24px',
            padding: '12px 14px',
            borderRadius: 8,
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#9a3412',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>⚠️ Notice:</strong> Cancelling this complaint will automatically cancel any open municipal tenders or work orders linked to this report, and notify the Desk Clerk.
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Reason Category */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Cancellation Reason *
            </label>
            <select
              {...register('reasonCategory')}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: errors.reasonCategory ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            >
              {Object.entries(REASON_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Mandatory Remarks & Justification *
            </label>
            <textarea
              {...register('remarks')}
              rows={3}
              placeholder="Explain why this ticket is being cancelled (min. 10 characters)..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: errors.remarks ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: 14,
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            {errors.remarks && (
              <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
                {errors.remarks.message}
              </span>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              paddingTop: 12,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: 6,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Keep Ticket
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 20px',
                borderRadius: 6,
                background: isSubmitting ? '#f87171' : '#dc2626',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

