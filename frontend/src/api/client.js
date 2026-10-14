// SmartEducator API Client

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export async function apiRequest(endpoint, method = 'GET', data = null, isFormData = false) {
  const headers = {};
  const csrfToken = getCookie('csrftoken');
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const options = {
    method,
    headers,
    credentials: 'include',
  };

  if (data) {
    if (isFormData) {
      options.body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
  }

  try {
    const res = await fetch(`/api${endpoint}`, options);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`API call failed for /api${endpoint}:`, err.message);
    throw err;
  }
}

// Convenience methods
export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login/', 'POST', credentials),
  register: (data) => apiRequest('/auth/register/', 'POST', data),
  tokenLogin: (token) => apiRequest('/auth/token-login/', 'POST', { token }),
  logout: () => apiRequest('/auth/logout/', 'POST'),
  getMe: () => apiRequest('/auth/me/'),
  getGoogleLoginUrl: (origin = '') => apiRequest(`/auth/google/url/${origin ? `?origin=${encodeURIComponent(origin)}` : ''}`),
  updateProfile: (data) => apiRequest('/auth/me/', 'PUT', data),
  uploadProfilePicture: (formData) => apiRequest('/auth/profile/picture/', 'POST', formData, true),
  removeProfilePicture: () => apiRequest('/auth/profile/picture/', 'DELETE'),
  requestPasswordReset: (data) => apiRequest('/auth/password-reset/', 'POST', data),
  confirmPasswordReset: (data) => apiRequest('/auth/password-reset-confirm/', 'POST', data),

  // Chat
  getChatSessions: (query = '') => apiRequest(`/chat/sessions/${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  createChatSession: (title = 'New Chat') => apiRequest('/chat/sessions/', 'POST', { title }),
  getChatDetail: (id) => apiRequest(`/chat/sessions/${id}/`),
  updateChatSession: (id, data) => apiRequest(`/chat/sessions/${id}/`, 'PATCH', data),
  deleteChatSession: (id) => apiRequest(`/chat/sessions/${id}/`, 'DELETE'),
  sendMessage: (id, message, mode = 'EXAM', file = null) => {
    if (file) {
      const formData = new FormData();
      formData.append('message', message || '');
      formData.append('mode', mode);
      formData.append('file', file);
      return apiRequest(`/chat/sessions/${id}/message/`, 'POST', formData, true);
    }
    return apiRequest(`/chat/sessions/${id}/message/`, 'POST', { message, mode });
  },
  clearAllChats: () => apiRequest('/chat/clear-all/', 'DELETE'),

  // Documents
  getDocuments: (query = '', type = '') => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (type) params.append('type', type);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/documents/${qs}`);
  },
  getDocumentDetail: (id) => apiRequest(`/documents/${id}/`),
  uploadDocument: (formData) => apiRequest('/documents/', 'POST', formData, true),
  deleteDocument: (id) => apiRequest(`/documents/${id}/`, 'DELETE'),
  getDriveStatus: () => apiRequest('/documents/drive/status/'),
  syncDrive: () => apiRequest('/documents/drive/sync/', 'POST'),
  disconnectDrive: () => apiRequest('/documents/drive/disconnect/', 'POST'),

  // Settings
  getSettings: () => apiRequest('/settings/'),
  updateSettings: (data) => apiRequest('/settings/', 'PUT', data),
  deleteAllData: () => apiRequest('/settings/delete-all/', 'DELETE'),
};
