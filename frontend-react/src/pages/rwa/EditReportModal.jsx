import React from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateComplaint } from '../../store/rwa/complaintsSlice.js';

const editSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long').max(150, 'Title is too long'),
  category: z.enum(['Civil', 'Electrical', 'Water', 'Horticulture'], {
    required_error: 'Please select an infrastructure category',
  }),
  subcategory: z.string().min(2, 'Subcategory is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
  street: z.string().min(3, 'Street address is required'),
  landmark: z.string().min(3, 'Landmark is required'),
  description: z.string().min(10, 'Detailed description must be at least 10 characters'),
});

export default function EditReportModal({ isOpen, complaint, onClose, onSuccess }) {
  const dispatch = useDispatch();
  if (!isOpen || !complaint) return null;

  const loc = complaint.location || {};
  const defaultValues = {
    title: complaint.title || '',
    category: complaint.category || 'Civil',
    subcategory: complaint.subcategory || complaint.subCategory || 'General Maintenance',
    severity: (complaint.severity || 'MEDIUM').toUpperCase(),
    street: loc.street || complaint.street || '',
    landmark: loc.landmark || complaint.location_details || '',
    description: complaint.description || '',
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues,
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        title: data.title,
        category: data.category,
        subcategory: data.subcategory,
        severity: data.severity,
        description: data.description,
        landmark: data.landmark,
        location: {
          sector: loc.sector || complaint.sector,
          block: loc.block || complaint.block,
          street: data.street,
          landmark: data.landmark,
        },
      };

      const updated = await dispatch(
        updateComplaint({ id: complaint.id, payload })
      ).unwrap();
      reset(data);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      alert(`Failed to update complaint: ${typeof err === 'string' ? err : err?.message}`);
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
          maxWidth: 580,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 700 }}>
              ✏️ Edit Report: {complaint.complaint_code || complaint.id}
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Human Fallibility Correction: You can edit details before contractor work begins.
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Issue Title *
            </label>
            <input
              {...register('title')}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: errors.title ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            {errors.title && (
              <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
                {errors.title.message}
              </span>
            )}
          </div>

          {/* Category & Severity Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Category *
              </label>
              <select
                {...register('category')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: errors.category ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="Civil">Civil</option>
                <option value="Electrical">Electrical</option>
                <option value="Water">Water</option>
                <option value="Horticulture">Horticulture</option>
              </select>
              {errors.category && (
                <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {errors.category.message}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Severity Level *
              </label>
              <select
                {...register('severity')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: errors.severity ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="LOW">Low (72h SLA)</option>
                <option value="MEDIUM">Medium (48h SLA)</option>
                <option value="HIGH">High (24h SLA)</option>
                <option value="EMERGENCY">Emergency (6h SLA)</option>
              </select>
            </div>
          </div>

          {/* Subcategory */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Subcategory / Component *
            </label>
            <input
              {...register('subcategory')}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: errors.subcategory ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            {errors.subcategory && (
              <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
                {errors.subcategory.message}
              </span>
            )}
          </div>

          {/* Location details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Street / Lane *
              </label>
              <input
                {...register('street')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: errors.street ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              {errors.street && (
                <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {errors.street.message}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Landmark / Spot *
              </label>
              <input
                {...register('landmark')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: errors.landmark ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              {errors.landmark && (
                <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {errors.landmark.message}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Detailed Description *
            </label>
            <textarea
              {...register('description')}
              rows={3}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: errors.description ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: 14,
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            {errors.description && (
              <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
                {errors.description.message}
              </span>
            )}
          </div>

          {/* Modal Footer */}
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              style={{
                padding: '9px 20px',
                borderRadius: 6,
                background: isSubmitting || !isDirty ? '#94a3b8' : '#2563eb',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                cursor: isSubmitting || !isDirty ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Saving Edits...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

