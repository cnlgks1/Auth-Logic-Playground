'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, Key, ArrowRight, Terminal, User, Lock, LogOut, CheckCircle, Smartphone } from 'lucide-react';
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
      // Simple JWT parse to find exp
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
    addLog(`🔵 [Client] 아이디/비밀번호 로그인 시도... (토큰 수명: ${expiresIn}초)`);
    addLog('🔵 [Client] 서버(/auth/login)로 인증 요청 전송 (admin / 1234)');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: '1234', expiresInSeconds: expiresIn }),
      });
      
      if (!res.ok) throw new Error('로그인 실패');
      
      const data = await res.json();
      addLog(`🟢 [Server] 인증 성공! JWT Access Token 발급됨. (만료: ${data.expiresIn})`);
      addLog('🟢 [Server] Refresh Token은 HttpOnly Cookie로 구워짐.');
      
      setAccessToken(data.access_token);
      setUser(data.user);
      addLog('✅ [Client] 로그인 완료. API 테스트가 가능합니다.');
    } catch (err) {
      addLog('🔴 [Error] 로그인 실패. 백엔드가 켜져있는지 확인하세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. OAuth Handlers
  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      addLog('🔴 [Error] Google Client ID가 없습니다. .env.local을 확인하세요.');
      return;
    }
    
    addLog('🔵 [Client] Google OAuth 인증 시작...');
    addLog('🔵 [Client] 구글 로그인 페이지로 이동합니다.');
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'http://localhost:3000',
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    
    // Save state including expiresIn
    localStorage.setItem('demo_logs', JSON.stringify([...logs, '🔵 [Client] 구글 로그인 페이지로 이동합니다.']));
    localStorage.setItem('demo_expires_in', String(expiresIn)); // Persist Expiry setting
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  // Check for OAuth Code on Mount
  useEffect(() => {
    // Restore logs
    const savedLogs = localStorage.getItem('demo_logs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
      localStorage.removeItem('demo_logs');
    }
    
    // Restore Expiry (because page reloaded)
    const savedExpiresIn = localStorage.getItem('demo_expires_in');
    if (savedExpiresIn) {
        setExpiresIn(Number(savedExpiresIn));
        localStorage.removeItem('demo_expires_in');
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleOAuthExchange(code, savedExpiresIn ? Number(savedExpiresIn) : 10);
    }
  }, []);

  const handleOAuthExchange = async (code: string, exp: number) => {
    setLoading(true);
    addLog('🟢 [Client] 구글에서 돌아왔습니다! 인증 코드(Code) 수신함.');
    
    addLog(`⚡️ [Client] 요청할 토큰 만료 시간: ${exp}초`);

    addLog('🔵 [Client] 서버(/auth/exchange)로 코드 전송 및 교환 요청...');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/auth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          clientSecret: '', // Public client
          redirectUri: 'http://localhost:3000',
          expiresInSeconds: exp // Send param to backend
        }),
      });
      
      const data = await res.json();
      
      const token = data.backend?.access_token || data.access_token;
      
      if (token) {
        addLog('🟢 [Server] 구글 토큰 교환 성공!');
        addLog(`🟢 [Server] 사용자 정보로 우리 서버 전용 JWT 발급 완료. (${exp}초 만료)`);
        setAccessToken(token);
        setUser(data.user);
        addLog('✅ [Client] OAuth 로그인 완료.');
      } else {
        addLog('🔴 [Error] 토큰을 받지 못했습니다. 응답을 확인하세요.');
      }
    } catch (err) {
      addLog('🔴 [Error] 교환 실패. 백엔드 로그를 확인하세요.');
    } finally {
      setLoading(false);
    }
  };


  // 3. Test API Handler
  const handleTestApi = async () => {
    if (!accessToken) return;
    addLog('🔵 [Client] 보호된 API (/auth/me) 요청 시도...');
    addLog(`🔑 Header: "Authorization: Bearer ${accessToken.substring(0, 10)}..."`);
    
    try {
      // Use our custom API wrapper that handles auto-refresh
      const { response: res, newAccessToken } = await api.request('/auth/me', {}, accessToken);
      
      if (newAccessToken) {
        addLog('🔄 [Client] (Auto-Refresh) 새 토큰으로 갱신되었습니다!');
        setAccessToken(newAccessToken);
      }

      if (!res.ok) throw new Error('API 요청 실패');

      const data = await res.json();
      addLog(`🟢 [Server] 응답 수신: 200 OK`);
      addLog(`📄 Data: ${JSON.stringify(data)}`);
    } catch (err: any) {
      if (err.message === 'Session expired') {
          addLog('🔴 [Client] Refresh Token도 만료되었습니다. 로그아웃 처리.');
          logout();
      } else {
        addLog('🔴 [Error] API 요청 실패 ' + err.message);
      }
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    addLog('👋 [Client] 로그아웃 되었습니다.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col lg:h-screen lg:overflow-hidden">
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-6 flex flex-col lg:h-full">
        
        {/* Header */}
        <header className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Auth Logic Playground</h1>
            <p className="text-slate-400 text-sm md:text-base mb-2">
              <span className="text-cyan-400 font-bold">ID/PW</span> vs <span className="text-emerald-400 font-bold">OAuth</span> 동작 원리 시각화 데모
            </p>
            
            {/* Custom Expiry Input */}
            <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
              <span className="text-sm font-bold text-slate-400">⚡️ Access Token 수명(초):</span>
              <input 
                type="number" 
                value={expiresIn} 
                onChange={e => setExpiresIn(Number(e.target.value))}
                className="w-16 bg-slate-800 text-white text-center rounded border border-slate-600 focus:outline-none focus:border-cyan-500 font-bold"
                min="1"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="text-left md:text-right text-xs text-slate-500 font-mono bg-slate-900 p-2 rounded border border-slate-800">
              <p>Backend: :3001 (NestJS)</p>
              <p>Frontend: :3000 (Next.js)</p>
            </div>
            {/* Countdown Timer */}
            {accessToken && (
               <div className={`px-4 py-2 rounded font-mono font-bold border ${
                 (timeLeft && timeLeft < 5) ? 'bg-red-950 text-red-500 border-red-900 animate-pulse' : 'bg-slate-900 text-cyan-400 border-slate-700'
               }`}>
                 ⏱ Token Expires in: {timeLeft !== null ? `${timeLeft}s` : 'Computing...'}
               </div>
            )}
          </div>
        </header>

        {/* Main Grid - On Desktop, takes remaining height and manages internal scroll */}
        <div className="flex-1 grid lg:grid-cols-3 gap-6 lg:min-h-0">
          
          {/* Column 1: Login Methods */}
          <div className="space-y-6 lg:overflow-y-auto lg:pr-2 custom-scrollbar">
            
            {/* Local Login Card */}
            <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 transition-all ${accessToken ? 'opacity-50 grayscale' : 'hover:border-slate-600 shadow-lg'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-800 rounded-lg"><Key className="w-5 h-5 text-cyan-400"/></div>
                <h2 className="font-bold text-lg text-white">1. 일반 로그인</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded text-sm font-mono text-slate-400 border border-slate-800">
                  <div className="flex justify-between"><span>ID:</span> <span className="text-white">admin</span></div>
                  <div className="flex justify-between"><span>PW:</span> <span className="text-white">1234</span></div>
                </div>
                <button 
                  onClick={handleLocalLogin}
                  disabled={!!accessToken || loading}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition-colors shadow-lg active:scale-95 transform duration-100"
                >
                  로그인 (JWT 발급)
                </button>
                <p className="text-xs text-slate-500 text-center">아이디/비번 검증 ➔ Access/Refresh Token 발급</p>
              </div>
            </div>

            {/* OAuth Login Card */}
            <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 transition-all ${accessToken ? 'opacity-50 grayscale' : 'hover:border-slate-600 shadow-lg'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-800 rounded-lg"><Smartphone className="w-5 h-5 text-emerald-400"/></div>
                <h2 className="font-bold text-lg text-white">2. 구글 로그인</h2>
              </div>
               <div className="space-y-3">
                 <div className="bg-slate-950 p-3 rounded text-sm font-mono text-slate-400 border border-slate-800">
                  <span className="text-emerald-500 font-bold block mb-1">Zero-Config Mode</span>
                  <div className="text-xs opacity-70">.env 설정값을 자동으로 로드합니다.</div>
                </div>
                <button 
                  onClick={handleGoogleLogin}
                  disabled={!!accessToken || loading}
                  className="w-full py-3 bg-white hover:bg-slate-100 disabled:bg-slate-800 disabled:text-slate-500 text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-95 transform duration-100"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  Google Login
                </button>
                <p className="text-xs text-slate-500 text-center">인증 코드 교환 ➔ JWT 발급</p>
              </div>
            </div>

          </div>

          {/* Column 2 & 3: Logs & Result */}
          <div className="lg:col-span-2 flex flex-col gap-6 lg:h-full lg:overflow-hidden">
            
            {/* Live Activity Log */}
            <div className="flex-1 bg-black rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl min-h-[300px]">
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Live Activity Log</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Console Output</span>
              </div>
              <div className="flex-1 p-4 font-mono text-sm overflow-y-auto space-y-2 custom-scrollbar bg-black/50 backdrop-blur">
                {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-2 opacity-50">
                    <Terminal className="w-8 h-8"/>
                    <p>대기 중... 왼쪽에서 로그인을 시작하세요</p>
                  </div>
                )}
                {logs.map((log, i) => (
                  <div key={i} className="border-l-2 border-slate-800 pl-3 py-1 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className={
                      log.includes('[Server]') ? 'text-emerald-400 font-semibold' :
                      log.includes('[Error]') ? 'text-red-400 font-bold' :
                      log.includes('[Client]') ? 'text-blue-400' : 'text-slate-300'
                    }>
                      {log}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Test Area */}
            <div className={`shrink-0 bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all duration-300 ${!accessToken ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100 ring-1 ring-purple-500/50 shadow-purple-900/10 shadow-lg'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-purple-500/10 rounded-lg"><Lock className="w-5 h-5 text-purple-400"/></div>
                   <div>
                     <h2 className="font-bold text-white text-lg">인증 테스트 (Protected API)</h2>
                     <p className="text-xs text-slate-400">발급된 JWT를 헤더에 싣고 <code>/auth/me</code>를 호출합니다.</p>
                   </div>
                </div>
                {accessToken && (
                   <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 rounded border border-red-500/20 hover:bg-red-500/10 transition-colors">
                    <LogOut className="w-3 h-3"/> 로그아웃
                   </button>
                )}
              </div>
              
              <div className="mt-5 flex flex-col md:flex-row gap-4">
                 <button 
                  onClick={handleTestApi}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <CheckCircle className="w-4 h-4" />
                  내 정보 조회 (API Test)
                </button>
                {user && (
                  <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 p-3 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
                    {user.picture ? <img src={user.picture} className="w-10 h-10 rounded-full border border-slate-700"/> : <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700"><User className="w-5 h-5 text-slate-400"/></div>}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{user.name || user.firstName}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    </div>
                    <div className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">Active</div>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
