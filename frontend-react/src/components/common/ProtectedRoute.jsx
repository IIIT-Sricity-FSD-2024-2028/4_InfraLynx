import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../../services/api.js';

/**
 * ProtectedRoute — Role-Based Access Control wrapper for React Router
 * Enforces session authentication and verified role authorization.
 */
export default function ProtectedRoute({ children, allowedRoles = [], portalName = 'Portal' }) {
  const location = useLocation();
  const isAuthed = authApi.isAuthenticated();
  const cachedUser = authApi.getCachedUser();

  // 1. Unauthenticated -> Redirect to landing with return location
  if (!isAuthed || !cachedUser) {
    return <Navigate to="/" state={{ from: location, authRequired: true, portalName }} replace />;
  }

  // 2. Role validation
  const userRole = (cachedUser.role || '').toUpperCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  // TOWNSHIP_COO has executive override across municipal operational portals
  const hasAccess =
    normalizedAllowed.includes(userRole) ||
    (userRole === 'TOWNSHIP_COO' && !normalizedAllowed.includes('SUPER_ADMIN'));

  if (!hasAccess) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '32px 40px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          maxWidth: 480,
          textAlign: 'center',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, color: '#1e293b', marginBottom: 8, fontWeight: 700 }}>
            Access Restricted: {portalName}
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Your account role (<strong>{userRole}</strong>) does not have operational permissions to access the {portalName}.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: '#2563eb',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return children;
}

