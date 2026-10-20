// API Client for RelayDesk Web Interface

export function createApiClient(activeUser) {
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(activeUser ? { 'x-user-id': activeUser.id, 'x-role': activeUser.role } : {})
  });

  const request = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  };

  return {
    getUsers: () => request('/api/users'),
    getRequests: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/requests${qs ? '?' + qs : ''}`);
    },
    getRequest: (id) => request(`/api/requests/${id}`),
    createRequest: (body) => request('/api/requests', { method: 'POST', body: JSON.stringify(body) }),
    updateRequest: (id, body) => request(`/api/requests/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    submitRequest: (id) => request(`/api/requests/${id}/submit`, { method: 'POST' }),
    approveRequest: (id, notes) => request(`/api/requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) }),
    rejectRequest: (id, notes) => request(`/api/requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ notes }) }),
    assignRequest: (id, assignee_id, qa_owner_id) => request(`/api/requests/${id}/assign`, { method: 'POST', body: JSON.stringify({ assignee_id, qa_owner_id }) }),
    startWork: (id) => request(`/api/requests/${id}/start`, { method: 'POST' }),
    blockRequest: (id, reason) => request(`/api/requests/${id}/block`, { method: 'POST', body: JSON.stringify({ reason }) }),
    unblockRequest: (id) => request(`/api/requests/${id}/unblock`, { method: 'POST' }),
    requestReview: (id, notes) => request(`/api/requests/${id}/request-review`, { method: 'POST', body: JSON.stringify({ notes }) }),
    submitQa: (id, notes) => request(`/api/requests/${id}/submit-qa`, { method: 'POST', body: JSON.stringify({ notes }) }),
    verifyRequest: (id, notes) => request(`/api/requests/${id}/verify`, { method: 'POST', body: JSON.stringify({ notes }) }),
    reopenRequest: (id, notes) => request(`/api/requests/${id}/reopen`, { method: 'POST', body: JSON.stringify({ notes }) }),
    completeRequest: (id) => request(`/api/requests/${id}/complete`, { method: 'POST' }),
    addRequirement: (id, title, acceptance_criteria) => request(`/api/requests/${id}/requirements`, { method: 'POST', body: JSON.stringify({ title, acceptance_criteria }) }),
    toggleRequirement: (id, reqId, is_met) => request(`/api/requests/${id}/requirements/${reqId}`, { method: 'PATCH', body: JSON.stringify({ is_met }) }),
    addDefect: (id, defect) => request(`/api/requests/${id}/defects`, { method: 'POST', body: JSON.stringify(defect) }),
    updateDefectStatus: (id, defId, status, notes) => request(`/api/requests/${id}/defects/${defId}`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
    addComment: (id, body, comment_type) => request(`/api/requests/${id}/comments`, { method: 'POST', body: JSON.stringify({ body, comment_type }) }),
    getAudit: (id) => request(`/api/requests/${id}/audit`),
    getReadiness: () => request('/api/readiness')
  };
}
