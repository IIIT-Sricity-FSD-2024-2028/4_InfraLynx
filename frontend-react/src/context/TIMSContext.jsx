import { createContext, useContext, useState, useEffect } from 'react'
import {
  INITIAL_COMPLAINTS,
  INITIAL_CONTRACTORS,
  INITIAL_AMC_RATE_CARDS,
  INITIAL_CURRENT_USER,
} from './initialData.js'

const TIMSContext = createContext(null)

export function TIMSProvider({ children }) {
  const [complaints, setComplaints] = useState(() => {
    localStorage.removeItem('tims_complaints')
    const saved = localStorage.getItem('tims_complaints_v3')
    return saved ? JSON.parse(saved) : INITIAL_COMPLAINTS
  })

  const [contractors] = useState(INITIAL_CONTRACTORS)
  const [amcRateCards] = useState(INITIAL_AMC_RATE_CARDS)
  const [currentUser, setCurrentUser] = useState(INITIAL_CURRENT_USER)

  // Persist complaints state changes for smooth development experience
  useEffect(() => {
    localStorage.setItem('tims_complaints_v3', JSON.stringify(complaints))
  }, [complaints])

  /**
   * Screen 2 - Report New Issue
   */
  function addComplaint({
    title,
    category,
    subCategory,
    location,
    severity = 'Medium',
    description,
    photos = [],
  }) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const newId = `CMP-2026-${randomSuffix}`

    // Calculate SLA hours
    const slaHoursMap = {
      Emergency: 6,
      High: 24,
      Medium: 48,
      Low: 72,
    }
    const slaHours = slaHoursMap[severity] || 48
    const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString()
    const now = new Date().toISOString()

    const newRecord = {
      id: newId,
      title: title || `${category} - ${subCategory}`,
      category,
      subCategory,
      location: {
        sector: location?.sector || currentUser.sector || 'Sector 4',
        block: location?.block || 'Block A',
        street: location?.street || '',
        assetId: location?.assetId || 'ASSET-GEN-01',
        assetName: location?.assetName || 'General Infrastructure Asset',
        landmark: location?.landmark || '',
        gps: location?.gps || '28.5355° N, 77.3910° E',
      },
      severity,
      slaDeadline,
      status: 'REPORTED',
      description,
      reportedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        sector: currentUser.sector,
      },
      createdAt: now,
      beforePhotos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80'],
      afterPhotos: [],
      assignedContractor: null,
      workOrderId: null,
      inspectionRemarks: null,
      estimateAmount: null,
      completionRemarks: null,
      completedAt: null,
      verification: null,
      dispute: null,
      history: [
        {
          stage: 'REPORTED',
          timestamp: now,
          actor: `${currentUser.name} (${currentUser.title || 'RWA'})`,
          note: `Complaint filed under ${category} (${subCategory}). Severity: ${severity}.`,
        },
      ],
    }

    setComplaints((prev) => [newRecord, ...prev])
    return newRecord
  }

  /**
   * Screen 4 - Confirm Fix (Marks CLOSED)
   */
  function confirmFix(complaintId, { rating = 5, remarks = '' } = {}) {
    const now = new Date().toISOString()

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c

        return {
          ...c,
          status: 'CLOSED',
          verification: {
            verifiedAt: now,
            verifiedBy: `${currentUser.name} (${currentUser.title || 'RWA'})`,
            rating,
            remarks: remarks || 'Resolved verified and approved by RWA.',
          },
          history: [
            ...c.history,
            {
              stage: 'CLOSED',
              timestamp: now,
              actor: `${currentUser.name} (RWA)`,
              note: `Fix confirmed with ${rating}/5 rating. Remarks: ${remarks || 'None'}`,
            },
          ],
        }
      })
    )
  }

  /**
   * Screen 4 - Dispute / Reopen (Marks DISPUTED)
   */
  function disputeComplaint(complaintId, { reason, remarks = '', photos = [] }) {
    const now = new Date().toISOString()

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c

        return {
          ...c,
          status: 'DISPUTED',
          dispute: {
            disputedAt: now,
            disputedBy: `${currentUser.name} (RWA)`,
            reason,
            remarks,
            photos,
          },
          history: [
            ...c.history,
            {
              stage: 'DISPUTED',
              timestamp: now,
              actor: `${currentUser.name} (RWA)`,
              note: `RWA Disputed Repair. Reason: "${reason}". Remarks: "${remarks}". Rework required.`,
            },
          ],
        }
      })
    )
  }

  /**
   * Helper to manually update status (useful for demoing the entire 8-stage lifecycle)
   */
  function updateComplaintStatus(complaintId, newStatus, note = '') {
    const now = new Date().toISOString()
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c
        return {
          ...c,
          status: newStatus,
          history: [
            ...c.history,
            {
              stage: newStatus,
              timestamp: now,
              actor: currentUser.name,
              note: note || `Status updated to ${newStatus}`,
            },
          ],
        }
      })
    )
  }

  /**
   * Reset in-memory state back to original initial data
   */
  function resetDemoData() {
    localStorage.removeItem('tims_complaints')
    setComplaints(INITIAL_COMPLAINTS)
  }

  const value = {
    complaints,
    contractors,
    amcRateCards,
    currentUser,
    setCurrentUser,
    addComplaint,
    confirmFix,
    disputeComplaint,
    updateComplaintStatus,
    resetDemoData,
  }

  return <TIMSContext.Provider value={value}>{children}</TIMSContext.Provider>
}

export function useTIMS() {
  const context = useContext(TIMSContext)
  if (!context) {
    throw new Error('useTIMS must be used within a TIMSProvider')
  }
  return context
}
