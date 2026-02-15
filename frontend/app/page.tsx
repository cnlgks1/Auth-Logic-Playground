'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Shield, Key, Terminal, User, Lock, LogOut, CheckCircle, 
  Smartphone, Settings, Code, Activity, Server, Globe 
} from 'lucide-react';
import { api } from '../lib/api';

export default function LoginPage() {
  // Activity Log State
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auth State
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(10); // Default 10s
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Custom OAuth Credentials
  const [customClientId, setCustomClientId] = useState('');
  const [customClientSecret, setCustomClientSecret] = useState('');
  const [showCustomCreds, setShowCustomCreds] = useState(false);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Timer Countdown Logic
  useEffect(() => {
    if (!accessToken) {
      setTimeLeft(null);
      return;
    }

    try {
      const payloadBase64 = accessToken.split('.')[1];
      const decodedJson = JSON.parse(atob(payloadBase64));
      const exp = decodedJson.exp * 1000; // to ms

      const interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((exp - now) / 1000));
        setTimeLeft(diff);

        if (diff <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    } catch (e) {
      console.error('Failed to parse JWT', e);
    }
  }, [accessToken]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  // 1. ID/PW Login Handler
  const handleLocalLogin = async () => {
    setLoading(true);
    addLog(`🔵 [Client] ID/PW 로그인 시도... (토큰 수명: ${expiresIn}초)`);
    addLog('🔵 [Client] POST /auth/login (admin / 1234)');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: '1234', expiresInSeconds: expiresIn }),
      });
      
      if (!res.ok) throw new Error('로그인 실패');
      
      const data = await res.json();
      addLog(`🟢 [Server] 인증 성공! 엑세스 토큰 발급됨. (만료: ${data.expiresIn}s)`);
      addLog('🟢 [Server] Refresh Token 쿠키 설정 완료 (HttpOnly).');
      
      setAccessToken(data.access_token);
      setUser(data.user);
      addLog('✅ [Client] 로그인 완료.');
    } catch (err) {
      addLog('🔴 [Error] 로그인 실패. 백엔드 연결을 확인하세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. OAuth Handlers
  const handleGoogleLogin = () => {
    const clientId = customClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      addLog('🔴 [Error] Client ID가 없습니다. .env 설정 또는 Custom Mode를 사용하세요.');
      return;
    }
    
    addLog('🔵 [Client] Google OAuth Flow 시작...');
    if (customClientId) addLog(`� [Client] Custom Client ID 사용: ${clientId.substring(0, 10)}...`);
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: window.location.origin,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    
    // Save state
    localStorage.setItem('demo_logs', JSON.stringify([...logs, '🔵 [Client] Google 로그인 페이지로 리디렉션...']));
    localStorage.setItem('demo_expires_in', String(expiresIn));
    if (customClientId) localStorage.setItem('demo_custom_client_id', customClientId);
    if (customClientSecret) localStorage.setItem('demo_custom_client_secret', customClientSecret);
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  // Restore State on Mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('demo_logs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
      localStorage.removeItem('demo_logs');
    }
    
    const savedExpiresIn = localStorage.getItem('demo_expires_in');
    if (savedExpiresIn) {
        setExpiresIn(Number(savedExpiresIn));
        localStorage.removeItem('demo_expires_in');
    }

    const savedClientId = localStorage.getItem('demo_custom_client_id');
    const savedClientSecret = localStorage.getItem('demo_custom_client_secret');
    
    if (savedClientId) {
        setCustomClientId(savedClientId);
        setShowCustomCreds(true);
        localStorage.removeItem('demo_custom_client_id');
    }
    if (savedClientSecret) {
        setCustomClientSecret(savedClientSecret);
        localStorage.removeItem('demo_custom_client_secret');
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleOAuthExchange(code, savedExpiresIn ? Number(savedExpiresIn) : 10, savedClientId, savedClientSecret);
    }
  }, []);

  const handleOAuthExchange = async (code: string, exp: number, cId?: string | null, cSecret?: string | null) => {
    setLoading(true);
    addLog('🟢 [Client] Google 인증 코드(Code) 수신 완료.');
    addLog(`� [Client] POST /auth/exchange (Code 교환 요청)`);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/auth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          clientId: cId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          clientSecret: cSecret || '',
          redirectUri: window.location.origin,
          expiresInSeconds: exp
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Token exchange failed');
      
      const token = data.backend?.access_token || data.access_token;
      
      if (token) {
        addLog('🟢 [Server] Google 토큰 교환 및 검증 성공!');
        addLog(`🟢 [Server] 자체 JWT 발급 완료. (${exp}s 만료)`);
        setAccessToken(token);
        setUser(data.user);
        addLog('✅ [Client] OAuth 로그인 완료.');
      }
    } catch (err: any) {
      addLog(`🔴 [Error] 교환 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestApi = async () => {
    if (!accessToken) return;
    addLog('🔵 [Client] GET /auth/me (Protected Route)');
    addLog(`🔑 Header: Bearer ${accessToken.substring(0, 15)}...`);
    
    try {
      const { response: res, newAccessToken } = await api.request('/auth/me', {}, accessToken);
      
      if (newAccessToken) {
        addLog('🔄 [Client] Access Token이 자동으로 갱신되었습니다 (Silent Refresh).');
        setAccessToken(newAccessToken);
      }

      if (!res.ok) throw new Error('API 요청 실패');

      const data = await res.json();
      addLog(`🟢 [Server] 200 OK: ${data.username || data.email}`);
    } catch (err: any) {
      if (err.message === 'Session expired') {
          addLog('🔴 [Client] 세션 만료 (Refresh Token 유효기간 끝). 로그아웃.');
          logout();
      } else {
        addLog(`🔴 [Error] ${err.message}`);
      }
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    addLog('👋 [Client] 로그아웃.');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 font-sans selection:bg-purple-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full"/>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 blur-[120px] rounded-full"/>
      </div>

      <div className="relative max-w-7xl mx-auto p-4 lg:p-8 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="mb-8 border-b border-white/5 pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Auth Logic Playground</h1>
                  <p className="text-xs text-slate-400 font-medium tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                    SECURE AUTHENTICATION DEMO
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-500 max-w-lg">
                JWT, OAuth 2.0, Refresh Token Rotation, 및 보안 로직을 시각화하여 테스트하는 대시보드입니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
               {/* Token Expiry Control */}
               <div className="flex items-center justify-between md:justify-end gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400"/> Token Life:
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setExpiresIn(Math.max(5, expiresIn - 5))} className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-xs">-</button>
                    <div className="w-12 text-center font-mono font-bold text-cyan-400">{expiresIn}s</div>
                    <button onClick={() => setExpiresIn(expiresIn + 5)} className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-xs">+</button>
                  </div>
               </div>

               {/* Countdown */}
               {accessToken && (
                 <div className="flex items-center justify-between md:justify-center gap-2 bg-gradient-to-r from-purple-900/20 to-cyan-900/20 text-cyan-400 px-4 py-2 rounded-lg border border-cyan-500/20 font-mono text-sm font-bold shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                   <span className="animate-pulse">●</span>
                   <span>Expires in: {timeLeft}s</span>
                 </div>
               )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 grid lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Logins (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* 1. Local Login */}
            <div className={`relative group p-6 rounded-2xl border transition-all duration-300 ${accessToken ? 'bg-white/5 border-white/5 grayscale opacity-60' : 'bg-[#0f1014] border-white/10 hover:border-purple-500/30 shadow-xl'}`}>
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"/>
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-400"/> Local Auth
                </h3>
                <span className="text-[10px] font-bold bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">CASE 1</span>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-400"><span>User:</span> <span className="text-white">admin</span></div>
                  <div className="flex justify-between text-slate-400"><span>Pass:</span> <span className="text-white">**** (1234)</span></div>
                </div>
                <button 
                  onClick={handleLocalLogin}
                  disabled={!!accessToken || loading}
                  className="w-full h-11 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg shadow-purple-900/20 transition-all active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Lock className="w-4 h-4"/>}
                  Sign In
                </button>
              </div>
            </div>

            {/* 2. Google Login */}
            <div className={`relative group p-6 rounded-2xl border transition-all duration-300 ${accessToken ? 'bg-white/5 border-white/5 grayscale opacity-60' : 'bg-[#0f1014] border-white/10 hover:border-cyan-500/30 shadow-xl'}`}>
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"/>
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400"/> OAuth 2.0
                </h3>
                <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">CASE 2</span>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                   <p className="text-xs text-slate-400">Google 계정으로 로그인</p>
                   <button 
                     onClick={() => setShowCustomCreds(!showCustomCreds)}
                     className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-colors ${showCustomCreds ? 'bg-cyan-900/30 text-cyan-300' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                   >
                     <Settings className="w-3 h-3"/> Custom App
                   </button>
                </div>

                {/* Custom Credentials Form */}
                {showCustomCreds && (
                  <div className="space-y-3 bg-black/40 p-3 rounded-lg border border-white/10 animate-in slide-in-from-top-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Client ID</label>
                      <input 
                        className="w-full bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-700" 
                        placeholder={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "Default (.env)" : "Enter Client ID"}
                        value={customClientId}
                        onChange={e => setCustomClientId(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Client Secret</label>
                      <input 
                        type="password"
                        className="w-full bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-700" 
                        placeholder="Enter Client Secret"
                        value={customClientSecret}
                        onChange={e => setCustomClientSecret(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleGoogleLogin}
                  disabled={!!accessToken || loading}
                  className="w-full h-11 bg-white hover:bg-gray-100 text-slate-900 font-bold rounded-lg shadow-lg transition-all active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
                >
                   {loading ? <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"/> : <Smartphone className="w-4 h-4"/>}
                  Google Login
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Console & Action (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-[500px]">
            
            {/* Terminal Window */}
            <div className="flex-1 bg-[#0f1014] rounded-2xl border border-white/10 flex flex-col shadow-2xl relative overflow-hidden group">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>debug_console.log</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"/>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"/>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"/>
                </div>
              </div>

              {/* Log Content */}
              <div className="flex-1 p-4 font-mono text-xs md:text-sm overflow-y-auto space-y-1.5 custom-scrollbar bg-black/50 backdrop-blur-sm">
                {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50 space-y-3">
                    <Code className="w-12 h-12 stroke-[1]"/>
                    <p>Ready to capture auth events...</p>
                  </div>
                )}
                {logs.map((log, i) => (
                   <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-200 pl-2 border-l-2 border-transparent hover:border-white/10 hover:bg-white/5 py-0.5 rounded-r">
                     <span className="text-slate-600 mr-2">{log.substring(0, 10)}</span>
                     <span className={
                        log.includes('[Error]') ? 'text-red-400 font-bold' :
                        log.includes('[Server]') ? 'text-emerald-400' :
                        log.includes('🔑') ? 'text-yellow-400' :
                        'text-slate-300'
                     }>
                       {log.substring(11)}
                     </span>
                   </div>
                ))}
                <div ref={logsEndRef}/>
              </div>
            </div>

            {/* Authenticated Zone */}
            <div className={`rounded-2xl border border-white/10 p-1 relative overflow-hidden transition-all duration-500 ${!accessToken ? 'opacity-50 grayscale pointer-events-none' : 'shadow-[0_0_30px_rgba(168,85,247,0.15)] bg-gradient-to-br from-[#0f1014] to-purple-900/10'}`}>
              <div className="bg-[#0f1014]/80 backdrop-blur rounded-xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                 
                 <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/20 shrink-0">
                      <CheckCircle className="w-6 h-6 text-white"/>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">Protected Session</h3>
                      <p className="text-sm text-slate-400">Authenticated as <span className="text-emerald-400 font-mono">{user?.email || 'admin'}</span></p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={handleTestApi}
                      className="flex-1 md:flex-none px-6 py-3 bg-white/5 hover:bg-white/10 hover:text-white text-slate-300 font-bold rounded-lg border border-white/10 focus:outline-none transition-all flex items-center justify-center gap-2 group"
                    >
                      <Server className="w-4 h-4 text-purple-400 group-hover:text-purple-300"/>
                      Test API
                    </button>
                    <button 
                      onClick={logout}
                      className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-lg border border-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4"/>
                    </button>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
