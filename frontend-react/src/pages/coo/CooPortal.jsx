import React, { useState, useEffect, useCallback } from 'react';
import { useTIMS } from '../../context/TIMSContext.jsx';
import { cooApi, masterApi } from '../../services/api.js';
import CooDashboard from './CooDashboard.jsx';
import DepartmentManagement from './DepartmentManagement.jsx';
import DepartmentHeadManagement from './DepartmentHeadManagement.jsx';
import TownshipWorkOrders from './TownshipWorkOrders.jsx';
import CooEstimateApprovals from './CooEstimateApprovals.jsx';
import WorkOrderDossierModal from './WorkOrderDossierModal.jsx';
import './styles/CooPortal.css';

export default function CooPortal({ onExitToLanding }) {
  const { currentUser, contractors: fallbackContractors = [] } = useTIMS();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'departments' | 'department_heads' | 'work_orders' | 'approvals'

  // Data states
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [contractors, setContractors] = useState(fallbackContractors);

  // Filters for work orders tab
  const [woFilters, setWoFilters] = useState({
    departmentId: 'ALL',
    contractorId: 'ALL',
    status: 'ALL',
    priority: 'ALL',
    slaStatus: 'ALL',
    search: '',
  });

  // Modal inspection
  const [inspectWorkOrderId, setInspectWorkOrderId] = useState(null);

  // Load all COO data from backend
  const loadCooData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, depts, heads, wos, apps, cnts] = await Promise.allSettled([
        cooApi.getDashboard(),
        cooApi.getDepartments(),
        cooApi.getDepartmentHeads(),
        cooApi.getWorkOrders(woFilters),
        cooApi.getApprovals(),
        masterApi.getContractors(),
      ]);

      if (dash.status === 'fulfilled') setDashboardData(dash.value);
      if (depts.status === 'fulfilled') setDepartments(depts.value);
      if (heads.status === 'fulfilled') setDepartmentHeads(heads.value);
      if (wos.status === 'fulfilled') setWorkOrders(wos.value);
      if (apps.status === 'fulfilled') setApprovals(apps.value);
      if (cnts.status === 'fulfilled') setContractors(cnts.value);
    } catch (err) {
      console.warn('Error loading COO portal data:', err);
    } finally {
      setLoading(false);
    }
  }, [woFilters]);

  useEffect(() => {
    loadCooData();
  }, [loadCooData]);

  // When filters change specifically
  const handleFilterChange = async (newFilters) => {
    setWoFilters(newFilters);
    try {
      const filtered = await cooApi.getWorkOrders(newFilters);
      setWorkOrders(filtered);
    } catch (err) {
      console.warn('Filter work orders note:', err);
    }
  };

  return (
    <div className="coo-portal-root">
      {/* ── Top Executive Header (Matching Landing Page Nav) ── */}
      <header className="coo-header">
        <div className="coo-header-inner">
          <div className="coo-brand-group">
            <div className="coo-brand-logo">🏛️</div>
            <div>
              <div className="coo-brand-title">InfraLynx · Executive Command</div>
              <div className="coo-brand-subtitle">
                Township Chief Operating Officer (COO) Directorate
              </div>
            </div>
          </div>

          <div className="coo-header-right">
            <div className="coo-user-pill">
              <div className="coo-user-avatar">
                {currentUser?.name ? currentUser.name[0] : 'S'}
              </div>
              <div className="coo-user-meta">
                <div className="coo-user-name">
                  {currentUser?.name || 'Col. (Retd.) Sanjeev Dewan'}
                </div>
                <div className="coo-user-role">Township Chief Operating Officer</div>
              </div>
            </div>

            <button onClick={onExitToLanding} className="btn-coo-logout">
              <span>Sign Out</span>
              <span>↪</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 5 Tab Navigation Bar ── */}
      <nav className="coo-nav-bar">
        <div className="coo-nav-inner">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`coo-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <span>📊</span>
            <span>Executive Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`coo-tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          >
            <span>🏛️</span>
            <span>Departments</span>
            <span className="coo-tab-badge">{departments.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('department_heads')}
            className={`coo-tab-btn ${activeTab === 'department_heads' ? 'active' : ''}`}
          >
            <span>👤</span>
            <span>Department Heads</span>
            <span className="coo-tab-badge">{departmentHeads.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('work_orders')}
            className={`coo-tab-btn ${activeTab === 'work_orders' ? 'active' : ''}`}
          >
            <span>📋</span>
            <span>Township Work Orders</span>
            <span className="coo-tab-badge">{workOrders.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`coo-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
          >
            <span>⚖️</span>
            <span>Estimate Approvals</span>
            {approvals.length > 0 && (
              <span className="coo-tab-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                {approvals.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ── Main Tab Workspace ── */}
      <main className="coo-main">
        {loading && (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-soft)' }}>
            ⏳ Synchronizing real-time municipal executive data...
          </div>
        )}

        {!loading && activeTab === 'dashboard' && (
          <CooDashboard
            dashboardData={dashboardData}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {!loading && activeTab === 'departments' && (
          <DepartmentManagement
            departments={departments}
            departmentHeads={departmentHeads}
            onRefresh={loadCooData}
          />
        )}

        {!loading && activeTab === 'department_heads' && (
          <DepartmentHeadManagement
            departmentHeads={departmentHeads}
            departments={departments}
            onRefresh={loadCooData}
          />
        )}

        {!loading && activeTab === 'work_orders' && (
          <TownshipWorkOrders
            workOrders={workOrders}
            departments={departments}
            contractors={contractors}
            onOpenDossier={(woId) => setInspectWorkOrderId(woId)}
            onFilterChange={handleFilterChange}
            filters={woFilters}
          />
        )}

        {!loading && activeTab === 'approvals' && (
          <CooEstimateApprovals
            approvals={approvals}
            onRefresh={loadCooData}
            onOpenDossier={(woId) => setInspectWorkOrderId(woId)}
          />
        )}
      </main>

      {/* ── Deep Work Order Dossier Inspector Modal ── */}
      {inspectWorkOrderId && (
        <WorkOrderDossierModal
          workOrderId={inspectWorkOrderId}
          onClose={() => setInspectWorkOrderId(null)}
          onEscalateSuccess={loadCooData}
        />
      )}
    </div>
  );
}
