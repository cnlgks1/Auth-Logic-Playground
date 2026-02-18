export const API_URL = ''; // Relative path for proxy

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export const api = {
  // Generic fetch wrapper
  request: async (endpoint: string, options: RequestOptions = {}, token?: string | null, expiresInSeconds?: number) => {
    let headers = options.headers || {};

    // 1. Attach Access Token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    headers['Content-Type'] = 'application/json';

    let response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    console.log(`📡 [API] Initial Response: ${response.status} ${response.statusText}`);

    // 2. Intercept 401 (Unauthorized) -> Try Refresh
    if (response.status === 401 && token) {
      console.log('🔄 [API] Access Token 만료됨 (401). 자동 갱신 시도 중...');

      try {
        // Call Refresh Endpoint (Cookie is sent automatically)
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Important: Send Cookies
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresInSeconds })
        });

        console.log(`🔄 [API] Refresh Response: ${refreshRes.status}`);

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const newAccessToken = data.access_token;

          console.log('✅ [API] 토큰 자동 갱신 성공!');

          // 3. Retry Confirmation (In a real app, update global state here)
          // For this function, we just retry the request with the new token
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

          // Return new token along with response so calling component can update state
          return { response, newAccessToken };
        } else {
          let errorMsg = refreshRes.statusText;
          try {
            const errData = await refreshRes.json();
            errorMsg = errData.message || errorMsg;
          } catch (e) { }

          console.error(`❌ [API] 갱신 실패: ${refreshRes.status} ${errorMsg}`);
          throw new Error(`자동 갱신 실패: ${errorMsg}`);
        }
      } catch (err) {
        console.error('❌ [API] Refresh Error:', err);
        throw err;
      }
    } else if (response.status === 401) {
      console.warn('⚠️ [API] 401 received but no token provided (or null). Cannot refresh.');
    }

    return { response, newAccessToken: null };
  },
};
