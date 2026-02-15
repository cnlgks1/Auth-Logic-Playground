export const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export const api = {
  // Generic fetch wrapper
  request: async (endpoint: string, options: RequestOptions = {}, token?: string | null) => {
    let headers = options.headers || {};
    
    // 1. Attach Access Token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    headers['Content-Type'] = 'application/json';

    let response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    // 2. Intercept 401 (Unauthorized) -> Try Refresh
    if (response.status === 401 && token) {
      console.log('🔄 [API] Access Token expired. Attempting refresh...');
      
      try {
        // Call Refresh Endpoint (Cookie is sent automatically)
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, { 
            method: 'POST',
            credentials: 'include' // Important: Send Cookies
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const newAccessToken = data.access_token;
          
          console.log('✅ [API] Token refreshed successfully!');
          
          // 3. Retry Confirmation (In a real app, update global state here)
          // For this function, we just retry the request with the new token
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
          
          // Return new token along with response so calling component can update state
          return { response, newAccessToken };
        } else {
            console.error('❌ [API] Refresh failed. User needs to login again.');
            throw new Error('Session expired');
        }
      } catch (err) {
        console.error('❌ [API] Refresh Error:', err);
        throw err;
      }
    }

    return { response, newAccessToken: null };
  },
};
