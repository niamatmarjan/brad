import React, { useState, useEffect } from 'react';
import { createApiClient } from './api';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
  SUBMITTED: 'bg-blue-50 text-blue-800 border-blue-300',
  APPROVED: 'bg-teal-50 text-teal-800 border-teal-300',
  REJECTED: 'bg-red-50 text-red-800 border-red-300',
  ASSIGNED: 'bg-purple-50 text-purple-800 border-purple-300',
  IN_PROGRESS: 'bg-amber-50 text-amber-800 border-amber-300',
  REVIEW_REQUESTED: 'bg-indigo-50 text-indigo-800 border-indigo-300',
  QA_PENDING: 'bg-cyan-50 text-cyan-800 border-cyan-300',
  VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  COMPLETED: 'bg-green-100 text-green-900 border-green-400'
};

const PRIORITY_COLORS = {
  LOW: 'text-gray-600',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-amber-600 font-semibold',
  CRITICAL: 'text-red-600 font-bold'
};

export default function App() {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [selectedReq, setSelectedReq] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals & Inputs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('INFRASTRUCTURE');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newCriteriaTitle, setNewCriteriaTitle] = useState('');
  const [newCriteriaText, setNewCriteriaText] = useState('');

  // Action notes inputs
  const [actionNotes, setActionNotes] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [qaOwnerId, setQaOwnerId] = useState('');

  // Defect inputs
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [defectTitle, setDefectTitle] = useState('');
  const [defectSeverity, setDefectSeverity] = useState('MAJOR');
  const [defectSteps, setDefectSteps] = useState('');
  const [defectExpected, setDefectExpected] = useState('');
  const [defectActual, setDefectActual] = useState('');

  const api = createApiClient(activeUser);

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 6000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
    fetchReadiness();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus, filterCategory]);

  useEffect(() => {
    if (selectedReqId) {
      fetchRequestDetails(selectedReqId);
    } else {
      setSelectedReq(null);
    }
  }, [selectedReqId]);

  const fetchUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.data);
      if (res.data.length > 0 && !activeUser) {
        setActiveUser(res.data[0]);
      }
    } catch (err) {
      showNotification('Failed to load users: ' + err.message, true);
    }
  };

  const fetchRequests = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const res = await api.getRequests(params);
      setRequests(res.data);
    } catch (err) {
      showNotification('Failed to load requests: ' + err.message, true);
    }
  };

  const fetchRequestDetails = async (id) => {
    try {
      const res = await api.getRequest(id);
      setSelectedReq(res.data);
    } catch (err) {
      showNotification('Failed to load details: ' + err.message, true);
    }
  };

  const fetchReadiness = async () => {
    try {
      const res = await api.getReadiness();
      setReadiness(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Action handlers
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createRequest({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
        requirements: newCriteriaTitle ? [{ title: newCriteriaTitle, acceptance_criteria: newCriteriaText }] : []
      });
      showNotification(`Created request ${res.data.id}`);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewCriteriaTitle('');
      setNewCriteriaText('');
      await fetchRequests();
      await fetchReadiness();
      setSelectedReqId(res.data.id);
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleAction = async (actionFn, desc) => {
    try {
      await actionFn();
      showNotification(`${desc} successful`);
      setActionNotes('');
      await fetchRequests();
      await fetchRequestDetails(selectedReqId);
      await fetchReadiness();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleAddCriteria = async (e) => {
    e.preventDefault();
    if (!newCriteriaTitle || !newCriteriaText) return;
    try {
      await api.addRequirement(selectedReqId, newCriteriaTitle, newCriteriaText);
      showNotification('Acceptance criterion added');
      setNewCriteriaTitle('');
      setNewCriteriaText('');
      await fetchRequestDetails(selectedReqId);
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleToggleCriteria = async (reqId, currentMet) => {
    try {
      await api.toggleRequirement(selectedReqId, reqId, !currentMet);
      await fetchRequestDetails(selectedReqId);
      await fetchReadiness();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleCreateDefect = async (e) => {
    e.preventDefault();
    try {
      await api.addDefect(selectedReqId, {
        title: defectTitle,
        severity: defectSeverity,
        steps_to_reproduce: defectSteps,
        expected_behavior: defectExpected,
        actual_behavior: defectActual
      });
      showNotification('Defect logged');
      setShowDefectModal(false);
      setDefectTitle('');
      setDefectSteps('');
      setDefectExpected('');
      setDefectActual('');
      await fetchRequestDetails(selectedReqId);
      await fetchReadiness();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleUpdateDefect = async (defId, status) => {
    try {
      await api.updateDefectStatus(selectedReqId, defId, status, 'Status transition in QA panel');
      showNotification(`Defect updated to ${status}`);
      await fetchRequestDetails(selectedReqId);
      await fetchReadiness();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      {/* Top Navigation */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚡</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>RelayDesk</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Cross-Team Service Request Platform (v0.5.0)</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {readiness && (
            <button
              onClick={() => setShowReadinessModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: readiness.isReleaseReady ? '#86efac' : '#fcd34d',
                backgroundColor: readiness.isReleaseReady ? '#f0fdf4' : '#fffbeb',
                color: readiness.isReleaseReady ? '#166534' : '#92400e',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <span>{readiness.isReleaseReady ? '🟢 Ready for Release' : '🟡 In Flight / Gated'}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>({readiness.counts.completed} completed, {readiness.counts.openDefects} defects)</span>
            </button>
          )}

          {/* Active Persona Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Active Role:</span>
            <select
              value={activeUser ? activeUser.id : ''}
              onChange={(e) => {
                const u = users.find(x => x.id === e.target.value);
                setActiveUser(u);
              }}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role}) — {u.department}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {errorMsg && (
        <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '10px 24px', fontSize: '14px' }}>
          <strong>Error: </strong> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', color: '#15803d', padding: '10px 24px', fontSize: '14px' }}>
          <strong>Success: </strong> {successMsg}
        </div>
      )}

      {/* Main Content Layout */}
      <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: selectedReqId ? '1fr 1.3fr' : '1fr', gap: '24px' }}>
        {/* Left Column: Requests List & Filter */}
        <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Service Requests ({requests.length})</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              + New Request
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="REVIEW_REQUESTED">REVIEW_REQUESTED</option>
              <option value="QA_PENDING">QA_PENDING</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            >
              <option value="">All Categories</option>
              <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
              <option value="SECURITY_ACCESS">SECURITY_ACCESS</option>
              <option value="DATA_PIPELINE">DATA_PIPELINE</option>
              <option value="APP_INTEGRATION">APP_INTEGRATION</option>
            </select>
          </div>

          {/* Request Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '72vh', overflowY: 'auto' }}>
            {requests.map(r => {
              const isSelected = r.id === selectedReqId;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReqId(r.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: isSelected ? '#2563eb' : '#e2e8f0',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>{r.id}</span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontWeight: '600',
                      backgroundColor: '#f1f5f9'
                    }}>
                      {r.status}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                    {r.title}
                  </h3>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                    <span>{r.category}</span>
                    <span style={{ color: r.priority === 'CRITICAL' ? '#dc2626' : r.priority === 'HIGH' ? '#d97706' : '#64748b', fontWeight: '600' }}>
                      {r.priority}
                    </span>
                  </div>

                  {r.is_blocked === 1 && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                      🚨 Blocked: {r.blocker_reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Detailed View & Action Panels */}
        {selectedReq && (
          <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>{selectedReq.id}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
                    {selectedReq.status}
                  </span>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#475569', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    {selectedReq.category}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: selectedReq.priority === 'CRITICAL' ? '#dc2626' : '#d97706' }}>
                    {selectedReq.priority}
                  </span>
                </div>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 'bold' }}>{selectedReq.title}</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>{selectedReq.description}</p>
              </div>
              <button onClick={() => setSelectedReqId(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Stakeholder Ownership Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '12px 0', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div><strong style={{ color: '#64748b' }}>Requester:</strong><br />{selectedReq.requester_name || selectedReq.requester_id}</div>
              <div><strong style={{ color: '#64748b' }}>Approver:</strong><br />{selectedReq.approver_name || selectedReq.approver_id || '—'}</div>
              <div><strong style={{ color: '#64748b' }}>Assignee:</strong><br />{selectedReq.assignee_name || selectedReq.assignee_id || 'Unassigned'}</div>
              <div><strong style={{ color: '#64748b' }}>QA Lead:</strong><br />{selectedReq.qa_owner_name || selectedReq.qa_owner_id || 'Unassigned'}</div>
            </div>

            {/* Requirements & Acceptance Criteria (SDLC Gate) */}
            <div style={{ margin: '16px 0', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>Requirements & Acceptance Criteria ({selectedReq.requirements.length})</h4>
              </div>

              {selectedReq.requirements.map(reqItem => (
                <div key={reqItem.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: '1px dashed #e2e8f0', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={reqItem.is_met === 1}
                    onChange={() => handleToggleCriteria(reqItem.id, reqItem.is_met === 1)}
                    style={{ marginTop: '2px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong>{reqItem.title}</strong>
                    <div style={{ color: '#64748b' }}>{reqItem.acceptance_criteria}</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: reqItem.is_met ? '#16a34a' : '#d97706' }}>
                    {reqItem.is_met ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>
              ))}

              {/* Add Criteria Form */}
              <form onSubmit={handleAddCriteria} style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Criteria title..."
                  value={newCriteriaTitle}
                  onChange={(e) => setNewCriteriaTitle(e.target.value)}
                  style={{ flex: 1, padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
                <input
                  type="text"
                  placeholder="Acceptance condition..."
                  value={newCriteriaText}
                  onChange={(e) => setNewCriteriaText(e.target.value)}
                  style={{ flex: 2, padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
                <button type="submit" style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Add</button>
              </form>
            </div>

            {/* SDLC Transition Controls */}
            <div style={{ margin: '16px 0', padding: '14px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold' }}>Workflow Actions</h4>

              {/* Action Notes Input */}
              <input
                type="text"
                placeholder="Action notes or decision rationale..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '10px' }}
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {/* DRAFT -> SUBMIT */}
                {selectedReq.status === 'DRAFT' && (
                  <button
                    onClick={() => handleAction(() => api.submitRequest(selectedReq.id), 'Submit for Approval')}
                    style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Submit for Approval
                  </button>
                )}

                {/* SUBMITTED -> APPROVE / REJECT */}
                {selectedReq.status === 'SUBMITTED' && (
                  <>
                    <button
                      onClick={() => handleAction(() => api.approveRequest(selectedReq.id, actionNotes), 'Approve')}
                      style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Approve Request
                    </button>
                    <button
                      onClick={() => handleAction(() => api.rejectRequest(selectedReq.id, actionNotes || 'Rejected by policy'), 'Reject')}
                      style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Reject Request
                    </button>
                  </>
                )}

                {/* APPROVED -> ASSIGN */}
                {selectedReq.status === 'APPROVED' && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="">Select Engineer...</option>
                      {users.filter(u => u.role === 'ENGINEER').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAction(() => api.assignRequest(selectedReq.id, assigneeId, 'USR-QA-01'), 'Assign Engineer')}
                      style={{ backgroundColor: '#7c3aed', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Assign Work
                    </button>
                  </div>
                )}

                {/* ASSIGNED -> START */}
                {selectedReq.status === 'ASSIGNED' && (
                  <button
                    onClick={() => handleAction(() => api.startWork(selectedReq.id), 'Start Fulfillment')}
                    style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Start Fulfillment
                  </button>
                )}

                {/* IN_PROGRESS -> BLOCK/UNBLOCK, REQUEST REVIEW */}
                {selectedReq.status === 'IN_PROGRESS' && (
                  <>
                    {selectedReq.is_blocked === 0 ? (
                      <button
                        onClick={() => handleAction(() => api.blockRequest(selectedReq.id, actionNotes || 'Dependency blocked'), 'Flag Blocker')}
                        style={{ backgroundColor: '#e11d48', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        🚨 Flag Blocker
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(() => api.unblockRequest(selectedReq.id), 'Unblock')}
                        style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        ✅ Clear Blocker
                      </button>
                    )}

                    <button
                      onClick={() => handleAction(() => api.requestReview(selectedReq.id, actionNotes), 'Request Review')}
                      style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Request Peer Review
                    </button>
                  </>
                )}

                {/* REVIEW_REQUESTED -> SUBMIT QA */}
                {selectedReq.status === 'REVIEW_REQUESTED' && (
                  <button
                    onClick={() => handleAction(() => api.submitQa(selectedReq.id, actionNotes), 'Handoff to QA')}
                    style={{ backgroundColor: '#0891b2', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Submit to QA
                  </button>
                )}

                {/* QA_PENDING -> VERIFY / RETURN */}
                {selectedReq.status === 'QA_PENDING' && (
                  <>
                    <button
                      onClick={() => handleAction(() => api.verifyRequest(selectedReq.id, actionNotes), 'Verify QA Pass')}
                      style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Verify (Pass QA Gate)
                    </button>
                    <button
                      onClick={() => handleAction(() => api.reopenRequest(selectedReq.id, actionNotes || 'Defects found'), 'Return for Correction')}
                      style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Return for Correction
                    </button>
                  </>
                )}

                {/* VERIFIED -> COMPLETE */}
                {selectedReq.status === 'VERIFIED' && (
                  <button
                    onClick={() => handleAction(() => api.completeRequest(selectedReq.id), 'Complete & Close')}
                    style={{ backgroundColor: '#15803d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Complete & Close
                  </button>
                )}
              </div>
            </div>

            {/* QA & Defect Tracking */}
            <div style={{ margin: '16px 0', padding: '14px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#991b1b' }}>Defect Tracking ({selectedReq.defects.length})</h4>
                <button
                  onClick={() => setShowDefectModal(true)}
                  style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  + Log Defect
                </button>
              </div>

              {selectedReq.defects.length === 0 ? (
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Zero open defects recorded for this request.</p>
              ) : (
                selectedReq.defects.map(d => (
                  <div key={d.id} style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '4px', marginBottom: '6px', border: '1px solid #fee2e2', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong>{d.id}: {d.title}</strong>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: d.status === 'CLOSED' || d.status === 'RETEST_PASSED' ? '#dcfce7' : '#fee2e2', fontWeight: 'bold' }}>
                        {d.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginBottom: '6px' }}>{d.steps_to_reproduce}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {d.status === 'OPEN' && (
                        <button onClick={() => handleUpdateDefect(d.id, 'FIXED')} style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#dbeafe', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Mark Fixed</button>
                      )}
                      {d.status === 'FIXED' && (
                        <>
                          <button onClick={() => handleUpdateDefect(d.id, 'RETEST_PASSED')} style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#dcfce7', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Retest Pass</button>
                          <button onClick={() => handleUpdateDefect(d.id, 'RETEST_FAILED')} style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Retest Fail</button>
                        </>
                      )}
                      {d.status === 'RETEST_PASSED' && (
                        <button onClick={() => handleUpdateDefect(d.id, 'CLOSED')} style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Close Defect</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Audit History Timeline */}
            <div style={{ margin: '16px 0', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Audit History ({selectedReq.audit.length})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                {selectedReq.audit.map(item => (
                  <div key={item.id} style={{ borderLeft: '2px solid #cbd5e1', paddingLeft: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span><strong>{item.actor_name || item.actor_id}</strong> ({item.actor_role})</span>
                      <span>{item.timestamp}</span>
                    </div>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.action} {item.to_status ? `→ ${item.to_status}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modal: New Service Request */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '500px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>Create Service Request (Module A)</h3>
            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Description</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                    <option value="SECURITY_ACCESS">SECURITY_ACCESS</option>
                    <option value="DATA_PIPELINE">DATA_PIPELINE</option>
                    <option value="APP_INTEGRATION">APP_INTEGRATION</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Initial Requirement / Criteria</label>
                <input
                  type="text"
                  placeholder="Criterion title"
                  value={newCriteriaTitle}
                  onChange={(e) => setNewCriteriaTitle(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '6px', boxSizing: 'border-box' }}
                />
                <input
                  type="text"
                  placeholder="Acceptance condition"
                  value={newCriteriaText}
                  onChange={(e) => setNewCriteriaText(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 14px', borderRadius: '4px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Defect */}
      {showDefectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '500px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: '#b91c1c' }}>Log QA Defect (Module B)</h3>
            <form onSubmit={handleCreateDefect} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Defect Title</label>
                <input
                  type="text"
                  required
                  value={defectTitle}
                  onChange={(e) => setDefectTitle(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Severity</label>
                <select
                  value={defectSeverity}
                  onChange={(e) => setDefectSeverity(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="MAJOR">MAJOR</option>
                  <option value="MINOR">MINOR</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Steps to Reproduce</label>
                <textarea
                  required
                  rows={2}
                  value={defectSteps}
                  onChange={(e) => setDefectSteps(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Expected Behavior</label>
                <input
                  type="text"
                  required
                  value={defectExpected}
                  onChange={(e) => setDefectExpected(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Actual Behavior</label>
                <input
                  type="text"
                  required
                  value={defectActual}
                  onChange={(e) => setDefectActual(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDefectModal(false)}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 14px', borderRadius: '4px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Record Defect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Release Readiness Dashboard */}
      {showReadinessModal && readiness && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '560px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>System Release Readiness Dashboard</h3>
              <button onClick={() => setShowReadinessModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: readiness.isReleaseReady ? '#f0fdf4' : '#fffbeb',
              border: '1px solid',
              borderColor: readiness.isReleaseReady ? '#86efac' : '#fcd34d',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '24px' }}>{readiness.isReleaseReady ? '✅' : '⚠️'}</span>
              <div>
                <strong style={{ fontSize: '14px', color: readiness.isReleaseReady ? '#166534' : '#92400e' }}>
                  {readiness.isReleaseReady ? 'Release Gate Passed' : 'Release Gated / Blocked'}
                </strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  {readiness.isReleaseReady ? 'Zero open defects, zero blocked items, all gates verified.' : 'Resolve open defects, blocked items, or incomplete verification before release.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', display: 'block' }}>{readiness.counts.totalRequests}</span>
                <span style={{ color: '#64748b' }}>Total Requests</span>
              </div>
              <div style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', display: 'block', color: '#16a34a' }}>{readiness.counts.completed}</span>
                <span style={{ color: '#64748b' }}>Completed</span>
              </div>
              <div style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', display: 'block', color: readiness.counts.openDefects > 0 ? '#dc2626' : '#16a34a' }}>
                  {readiness.counts.openDefects}
                </span>
                <span style={{ color: '#64748b' }}>Open Defects</span>
              </div>
            </div>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>SDLC Release Gate Verification</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                <span>Gate 1: Zero Open Defects</span>
                <strong style={{ color: readiness.gates.zeroOpenDefects ? '#16a34a' : '#dc2626' }}>
                  {readiness.gates.zeroOpenDefects ? 'PASS' : 'FAIL'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                <span>Gate 2: Zero Blocked Work Items</span>
                <strong style={{ color: readiness.gates.zeroBlockedItems ? '#16a34a' : '#dc2626' }}>
                  {readiness.gates.zeroBlockedItems ? 'PASS' : 'FAIL'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                <span>Gate 3: Verified Work Present</span>
                <strong style={{ color: readiness.gates.verifiedWorkPresent ? '#16a34a' : '#d97706' }}>
                  {readiness.gates.verifiedWorkPresent ? 'PASS' : 'PENDING'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                <span>Gate 4: All Criteria Verified</span>
                <strong style={{ color: readiness.gates.allAcceptanceCriteriaMet ? '#16a34a' : '#dc2626' }}>
                  {readiness.gates.allAcceptanceCriteriaMet ? 'PASS' : 'FAIL'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
