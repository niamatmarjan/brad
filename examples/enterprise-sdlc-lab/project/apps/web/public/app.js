(function() {
  'use strict';

  const state = {
    tenantId: 'tenant-acme-global',
    userRole: 'EMPLOYEE',
    filterStatus: '',
    filterCategory: ''
  };

  const elements = {
    tenantSelect: document.getElementById('tenant-select'),
    userRoleSelect: document.getElementById('user-role-select'),
    filterStatus: document.getElementById('filter-status'),
    filterCategory: document.getElementById('filter-category'),
    queueTableBody: document.getElementById('queue-table-body'),
    btnVerifyChain: document.getElementById('btn-verify-chain'),
    btnExportAudit: document.getElementById('btn-export-audit'),
    chainStatusBanner: document.getElementById('chain-status-banner'),
    liveAnnouncer: document.getElementById('live-announcer')
  };

  function announce(message) {
    if (elements.liveAnnouncer) {
      elements.liveAnnouncer.textContent = message;
    }
  }

  function getStatusBadge(status) {
    const classMap = {
      DRAFT: 'badge-draft',
      PENDING_APPROVAL: 'badge-pending',
      APPROVED: 'badge-approved',
      REJECTED: 'badge-rejected',
      ESCALATED: 'badge-escalated'
    };
    return `<span class="badge ${classMap[status] || 'badge-draft'}">${status}</span>`;
  }

  async function fetchQueue() {
    try {
      const params = new URLSearchParams();
      if (state.filterStatus) params.append('status', state.filterStatus);
      if (state.filterCategory) params.append('category', state.filterCategory);

      const url = `/api/v1/change-requests?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          'X-Tenant-ID': state.tenantId,
          'X-User-Role': state.userRole
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      renderQueue(data.items || []);
      announce(`Review queue updated. Showing ${data.items.length} change requests.`);
    } catch (err) {
      elements.queueTableBody.innerHTML = `<tr><td colspan="7" class="error-state">Failed to load queue: ${err.message}</td></tr>`;
      announce('Error loading review queue.');
    }
  }

  function renderQueue(items) {
    if (items.length === 0) {
      elements.queueTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">No change requests match your criteria.</td></tr>`;
      return;
    }

    elements.queueTableBody.innerHTML = items.map(item => `
      <tr>
        <td><code>${item.id.slice(0, 8)}</code></td>
        <td><strong>${escapeHtml(item.title)}</strong></td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.riskLevel)}</td>
        <td>${getStatusBadge(item.status)}</td>
        <td>${item.slaDeadline ? new Date(item.slaDeadline).toLocaleString() : 'N/A'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="alert('Viewing CR ${item.id}')" aria-label="View details for ${escapeHtml(item.title)}">Inspect</button>
        </td>
      </tr>
    `).join('');
  }

  async function verifyChain() {
    try {
      elements.chainStatusBanner.textContent = 'Verifying cryptographic chain integrity...';
      elements.chainStatusBanner.className = 'status-banner';

      const res = await fetch('/api/v1/audit/verify', {
        headers: {
          'X-Tenant-ID': state.tenantId,
          'X-User-Role': 'AUDITOR'
        }
      });

      const data = await res.json();
      if (data.valid) {
        elements.chainStatusBanner.textContent = `PASS: Cryptographic chain valid. ${data.totalRecords} records verified. Head hash: ${data.headHash ? data.headHash.slice(0, 16) + '...' : 'Genesis'}`;
        elements.chainStatusBanner.className = 'status-banner valid';
        announce('Cryptographic audit chain verified successfully.');
      } else {
        elements.chainStatusBanner.textContent = `FAIL: ${data.message}`;
        elements.chainStatusBanner.className = 'status-banner invalid';
        announce('Cryptographic audit chain verification failed.');
      }
    } catch (err) {
      elements.chainStatusBanner.textContent = `Error verifying chain: ${err.message}`;
      elements.chainStatusBanner.className = 'status-banner invalid';
    }
  }

  function exportAudit() {
    window.location.href = `/api/v1/audit/export?format=csv`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Bind Event Listeners
  if (elements.tenantSelect) {
    elements.tenantSelect.addEventListener('change', (e) => {
      state.tenantId = e.target.value;
      fetchQueue();
    });
  }

  if (elements.userRoleSelect) {
    elements.userRoleSelect.addEventListener('change', (e) => {
      state.userRole = e.target.value;
    });
  }

  if (elements.filterStatus) {
    elements.filterStatus.addEventListener('change', (e) => {
      state.filterStatus = e.target.value;
      fetchQueue();
    });
  }

  if (elements.filterCategory) {
    elements.filterCategory.addEventListener('change', (e) => {
      state.filterCategory = e.target.value;
      fetchQueue();
    });
  }

  if (elements.btnVerifyChain) {
    elements.btnVerifyChain.addEventListener('click', verifyChain);
  }

  if (elements.btnExportAudit) {
    elements.btnExportAudit.addEventListener('click', exportAudit);
  }

  // Initial load
  fetchQueue();
})();
