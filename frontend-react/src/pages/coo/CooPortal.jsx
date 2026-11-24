import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTIMS } from '../../context/TIMSContext.jsx';
import {
  fetchCooDashboard,
  fetchCooDepartments,
  fetchCooDeptHeads,
  fetchCooWorkOrders,
  updateCooDepartment,
  assignDeptHead,
  createCooDeptHead,
  unassignCooDeptHead,
  fetchCooDeptStaff,
  escalateCooWorkOrder,
  fetchCooWorkOrderById,
  selectCooDashboard,
  selectCooDepartments,
  selectCooDeptHeads,
  selectCooWorkOrders,
  selectCooStatus,
} from '../../store/coo/cooSlice.js';
import { selectAllContractors } from '../../store/master/masterDataSlice.js';
import CooDashboard from './CooDashboard.jsx';
import DepartmentManagement from './DepartmentManagement.jsx';
import DepartmentHeadManagement from './DepartmentHeadManagement.jsx';
import TownshipWorkOrders from './TownshipWorkOrders.jsx';
import WorkOrderDetailsModal from './WorkOrderDetailsModal.jsx';
import './styles/CooPortal.css';

export default function CooPortal({ onExitToLanding }) {
  const { currentUser } = useTIMS();
  const dispatch = useDispatch();

  // Read server data from Redux store
  const dashboardData = useSelector(selectCooDashboard);
  const departments = useSelector(selectCooDepartments);
  const departmentHeads = useSelector(selectCooDeptHeads);
  const workOrders = useSelector(selectCooWorkOrders);
  const contractors = useSelector(selectAllContractors);
  const cooStatus = useSelector(selectCooStatus);
  const loading = cooStatus === 'loading';

  // Local UI-only state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [woFilters, setWoFilters] = useState({
    departmentId: 'ALL',
    contractorId: 'ALL',
    status: 'ALL',
    priority: 'ALL',
    slaStatus: 'ALL',
    search: '',
  });
  const [inspectWorkOrderId, setInspectWorkOrderId] = useState(null);

  // Initial data load
  useEffect(() => {
    dispatch(fetchCooDashboard());
    dispatch(fetchCooDepartments());
    dispatch(fetchCooDeptHeads());
    dispatch(fetchCooWorkOrders(woFilters));
  }, [dispatch]);

  // Re-fetch work orders when filters change
  const handleFilterChange = (newFilters) => {
    setWoFilters(newFilters);
    dispatch(fetchCooWorkOrders(newFilters));
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

      {/* ── 4 Tab Navigation Bar ── */}
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
        </div>
      </nav>

      {/* ── Main Tab Workspace ── */}
      <main className="coo-main">
        {loading && (
          <div className="coo-loading-state">
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
          />
        )}

        {!loading && activeTab === 'department_heads' && (
          <DepartmentHeadManagement
            departmentHeads={departmentHeads}
            departments={departments}
          />
        )}

        {!loading && activeTab === 'work_orders' && (
          <TownshipWorkOrders
            workOrders={workOrders}
            departments={departments}
            contractors={contractors}
            onViewDetails={(woId) => setInspectWorkOrderId(woId)}
            onFilterChange={handleFilterChange}
            filters={woFilters}
          />
        )}
      </main>

      {/* Work Order Details Modal */}
      {inspectWorkOrderId && (
        <WorkOrderDetailsModal
          workOrderId={inspectWorkOrderId}
          onClose={() => setInspectWorkOrderId(null)}
        />
      )}
    </div>
  );
}
