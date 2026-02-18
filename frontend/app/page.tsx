'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Shield, Key, Terminal, Code, Activity, Server, Clock, RefreshCw, LogOut, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { api } from '../lib/api';
import SecurityControlPanel from '../components/SecurityControlPanel';

/**
 * ----------------------------------------------------------------------------------
 * [JWT 인증 로직 플레이그라운드]
 * 
 * 목적: 
 * Access Token(AT)과 Refresh Token(RT)의 수명을 직접 조절하며,
 * 토큰 만료 시 클라이언트와 서버가 어떻게 상호작용하는지 눈으로 확인하는 학습용 페이지입니다.
 * 
 * 핵심 개념:
 * 1. Access Token (AT): 수명이 짧음. API 요청 시 헤더(Authorization)에 담아 보냄. (메모리에 저장)
 * 2. Refresh Token (RT): 수명이 김. AT 재발급 용도. (브라우저 쿠키에 HttpOnly로 안전하게 저장)
 * 3. Silent Refresh: 사용자가 모르게 백그라운드에서 AT를 새로 받아오는 기술.
 * ----------------------------------------------------------------------------------
 */
export default function LoginPage() {
  
  // ==================================================================================
  // 1. 상태 관리 (State Management)
  // ==================================================================================

  // 📝 로그 출력을 위한 상태
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 🔐 인증 관련 상태
  // accessToken: 실제 API 요청에 사용할 인증권 (이게 없으면 로그인 안 된 거임)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); // 로그인한 사용자 정보
  const [loading, setLoading] = useState(false); // 로딩 중 표시
  
  // ⚙️ 설정값 (사용자가 UI에서 조절 가능)
  const [expiresIn, setExpiresIn] = useState(10); // Access Token 수명 (초 단위)
  const [refreshTokenLife, setRefreshTokenLife] = useState(604800); // Refresh Token 수명 (기본 7일)
  const [autoRefresh, setAutoRefresh] = useState(true); // 자동 갱신 기능을 켤지 말지
  
  // ⏱️ 시각적 타이머 상태
  const [atTimeLeft, setAtTimeLeft] = useState<number | null>(null); // AT 남은 시간
  const [rtTimeLeft, setRtTimeLeft] = useState<number | null>(null); // RT 남은 시간 (가상)


  // ==================================================================================
  // 2. 부수 효과 (Effects & Timers)
  // ==================================================================================

  // 📜 로그가 추가될 때마다 스크롤을 맨 아래로 내림
  useEffect(() => {
    if (logsEndRef.current && logsEndRef.current.parentElement) {
        logsEndRef.current.parentElement.scrollTop = logsEndRef.current.parentElement.scrollHeight;
    }
  }, [logs]);

  /**
   * ⏰ 토큰 만료 카운트다운 로직
   * - Access Token이 발급되면 그 안에 담긴 만료 시간(exp)을 읽어서 남은 시간을 계산함.
   * - 매 1초마다 남은 시간을 갱신하여 화면에 보여줌.
   * - [중요] '자동 갱신'이 켜져 있으면, 만료 2초 전에(미리) 새 토큰을 요청함!
   */
  useEffect(() => {
    if (!accessToken) {
      setAtTimeLeft(null);
      // 참고: rtTimeLeft는 로그아웃 시에만 초기화함 (RT는 AT가 죽어도 살아있을 수 있으니까)
      return;
    }

    try {
      // JWT 디코딩: Base64로 인코딩된 토큰의 중간 부분(Payload)을 열어봅니다.
      // 실제 서비스에선 'jwt-decode' 라이브러리를 쓰면 더 편해요.
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expMs = payload.exp * 1000; // 서버가 준 만료 시간 (밀리초 변환)
      
      const interval = setInterval(() => {
        const now = Date.now();
        // 0초 밑으로는 내려가지 않도록 함
        const atDiff = Math.max(0, Math.ceil((expMs - now) / 1000));
        setAtTimeLeft(atDiff);
        
        // Refresh Token 타이머는 가상으로 1초씩 줄어들게 구현 (실제 RT는 쿠키에 있어서 못 읽음)
        setRtTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));

        // 🔄 [자동 갱신 트리거]
        // 토큰 죽기 2초 전(atDiff === 2)이고, 자동 갱신이 켜져 있다면(autoRefresh) 백그라운드 갱신 시도!
        if (atDiff === 2 && !loading && autoRefresh) {
          console.log('🔄 [Background] Access Token 만료 임박. 자동 갱신을 시도합니다...');
          handleAutoRefresh();
        }
      }, 1000);

      return () => clearInterval(interval); // 컴포넌트가 사라지거나 토큰이 바뀌면 타이머 정리
    } catch (e) {
      console.error(e);
    }
  }, [accessToken, autoRefresh]);


  // ==================================================================================
  // 3. 핵심 동작 함수 (Helper Functions)
  // ==================================================================================

  // 📝 로그 추가 헬퍼: 현재 시간과 함께 메시지를 기록함
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  /**
   * 🚀 로그인 (1단계)
   * - 아이디/비번을 서버로 보냅니다.
   * - 성공하면 Access Token(변수)과 Refresh Token(쿠키)을 받습니다.
   */
  const handleLogin = async () => {
    setLoading(true);
    addLog(`🔵 [1단계] 로그인 시도... (설정: AT=${expiresIn}초, RT=${refreshTokenLife}초)`);
    
    try {
      // 로그인 요청 시 '테스트용'으로 우리가 설정한 수명 시간도 같이 보냅니다.
      const res = await fetch(`/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username: 'admin', 
            password: '1234', 
            expiresInSeconds: expiresIn,
            refreshTokenExpiresInSeconds: refreshTokenLife
        }),
      });
      
      if (!res.ok) throw new Error('로그인 실패');
      
      const data = await res.json();
      
      // ✅ 중요: Access Token은 자바스크립트 변수(State)에만 저장합니다. (XSS 방어 유리)
      setAccessToken(data.access_token);
      setUser(data.user);
      
      // 가상 RT 타이머 시작
      setRtTimeLeft(refreshTokenLife);
      
      addLog(`🟢 [성공] 서버로부터 토큰 발급 완료.`);
      addLog(`   - Access Token: 저장됨 (메모리, 새로고침하면 사라짐)`);
      addLog(`   - Refresh Token: 쿠키에 저장됨 (브라우저가 알아서 관리, HttpOnly)`);
      addLog(`✅ 로그인 완료. 이제 데이터를 조회할 수 있습니다.`);

    } catch (err) {
      addLog(`🔴 [실패] 로그인 오류: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 📡 데이터 조회 요청 (2단계)
   * - Access Token을 헤더에 실어서 보호된 API(/auth/me)를 찌릅니다.
   * - 만약 토큰이 만료되었다면? -> api.ts 내부에서 자동으로 재발급(Refresh)을 시도합니다.
   * - 이를 'Silent Refresh'라고 부르며, 사용자는 로그아웃되지 않고 계속 서비스를 쓸 수 있습니다.
   */
  const handleFetchData = async () => {
    if (!accessToken) return;
    
    // UI 표시용: 이미 만료된 상태인지 체크
    const isClientExpired = atTimeLeft === 0;
    
    if (isClientExpired) {
        addLog(`🟡 [주의] Access Token이 만료된 상태입니다. 요청 시 'Silent Refresh'가 시도됩니다...`);
    }

    addLog(`🔵 [2단계] 보호된 데이터 조회 요청 (GET /auth/me)...`);

    try {
      // 🛠️ api.request 내부 로직: 
      // 1. 요청 보냄 -> 401(만료) 응답 받음
      // 2. /auth/refresh 로 재발급 요청 (쿠키가 자동 전송됨)
      // 3. 재발급 성공하면 원래 요청 다시 보냄
      // 4. 새로운 Access Token을 반환해줌 -> 우리가 여기서 state 업데이트
      const { response: res, newAccessToken } = await api.request('/auth/me', {}, accessToken, expiresIn);
      
      if (newAccessToken) {
        addLog('🎉 [Silent Refresh 성공] Access Token이 만료되어 자동으로 갱신되었습니다!');
        // 갱신된 토큰으로 갈아끼우기 (로그인 연장)
        setAccessToken(newAccessToken);
      }

      if (!res.ok) throw new Error('API 요청 실패');

      const data = await res.json();
      addLog(`🟢 [성공] 데이터 수신 완료: 사용자명 = ${data.username}`);
      
    } catch (err: any) {
      // 리프레시 토큰마저 만료되거나 없으면 여기서 에러가 잡힙니다.
      if (err.message.includes('Refresh Failed')) {
           addLog(`🔴 [완전 만료] ${err.message}. 다시 로그인하세요.`);
           logout();
      } else if (err.message === 'Session expired') {
          addLog('🔴 [완전 만료] 세션이 만료되었습니다.');
          logout();
      } else {
        addLog(`🔴 [오류] ${err.message}`);
      }
    }
  };

  /**
   * 🔄 백그라운드 자동 갱신 (Optional)
   * - API 요청을 보낼 때가 아니라, 가만히 있어도 만료 직전에 알아서 갱신하는 함수입니다.
   * - AT가 죽기 2초 전에 setInterval에 의해 호출됩니다.
   */
  const handleAutoRefresh = async () => {
    if (!accessToken) return;
    addLog(`🔄 [자동] Access Token 만료 2초 전, 백그라운드 자동 갱신 시도...`);
    
    try {
      // /auth/refresh 엔드포인트는 쿠키에 있는 RT를 확인하고 새 AT를 줍니다.
      const refreshRes = await fetch(`/auth/refresh`, { 
          method: 'POST',
          credentials: 'include', // 쿠키 필수!
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresInSeconds: expiresIn }) // 설정값 유지
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setAccessToken(data.access_token);
        addLog(`✨ [자동] 백그라운드 자동 갱신 성공! (수명 연장됨)`);
      } else {
        addLog('🔴 [자동] 자동 갱신 실패. (Refresh Token 만료됨)');
        logout();
      }
    } catch (err) {
      addLog('🔴 [자동] 오류 발생으로 갱신 실패.');
    }
  };

  // 👋 로그아웃: 모든 상태 초기화
  const logout = () => {
    setAccessToken(null);
    setRtTimeLeft(null);
    setUser(null);
    addLog('👋 로그아웃 되었습니다.');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 font-sans selection:bg-purple-500/30">
      <div className="max-w-6xl mx-auto p-6 flex flex-col min-h-screen gap-8">
        
        {/* Header */}
        <header className="border-b border-white/5 pb-6">
            <h1 className="text-3xl font-bold text-white mb-2">JWT 인증 흐름 테스트</h1>
            <p className="text-slate-500">
                1. 시간 설정 → 2. 로그인 → 3. 만료 대기 → 4. 데이터 요청 (자동 갱신 확인)
            </p>
        </header>

        {/* Configuration Section */}
        <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <SettingsIcon /> 1. 토큰 수명 설정
            </h2>
            <SecurityControlPanel 
                accessTokenLife={expiresIn}
                setAccessTokenLife={setExpiresIn}
                refreshTokenLife={refreshTokenLife}
                setRefreshTokenLife={setRefreshTokenLife}
            />
            {/* Auto Refresh Toggle */}
            <div className="flex items-center gap-3 mt-4 bg-[#15161a] p-3 rounded-xl border border-white/10 w-fit">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                    <span className="ms-3 text-sm font-bold text-gray-300 select-none">자동 갱신 (Auto Refresh)</span>
                </label>
            </div>

        </section>

        {/* Action & Status Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Actions and Visual Status */}
            <div className="space-y-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity /> 2. 인증 상태 및 액션
                </h2>

                {/* Status Card */}
                <div className={`p-6 rounded-2xl border transition-all ${accessToken ? 'bg-purple-900/10 border-purple-500/30' : 'bg-[#15161a] border-white/10'}`}>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-xs uppercase font-bold text-slate-500 mb-1">Current Status</p>
                            <div className="text-2xl font-bold text-white flex items-center gap-2">
                                {accessToken ? (
                                    <>
                                        <CheckCircle className="text-emerald-400" />
                                        <span>로그인됨</span>
                                    </>
                                ) : (
                                    <span className="text-slate-500">로그아웃 상태</span>
                                )}
                            </div>
                        </div>
                        {accessToken && (
                            <button onClick={logout} className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/20">
                                로그아웃
                            </button>
                        )}
                    </div>

                    {/* Timer Visuals */}
                    {accessToken && (
                        <div className="space-y-4">
                            {/* Access Token Timer */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className={atTimeLeft === 0 ? "text-red-400 font-bold" : "text-cyan-400"}>Access Token (메모리)</span>
                                    <span className="font-mono">{atTimeLeft === 0 ? "만료됨 (Expired)" : `${atTimeLeft ?? expiresIn}초 남음`}</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${atTimeLeft === 0 ? 'bg-red-500' : 'bg-cyan-500'}`}
                                        style={{ width: `${Math.min(100, (atTimeLeft! / expiresIn) * 100)}%` }}
                                    />
                                </div>
                                {atTimeLeft === 0 && (
                                    <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3"/>
                                        다음 요청 시 Refresh Token을 사용하여 재발급을 시도합니다.
                                    </p>
                                )}
                            </div>

                            {/* Refresh Token Info */}
                             <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className={rtTimeLeft === 0 ? "text-red-400 font-bold" : "text-emerald-400"}>Refresh Token (HttpOnly 쿠키)</span>
                                    <span className="font-mono">
                                        {rtTimeLeft === null ? "대기 중" : 
                                         rtTimeLeft === 0 ? "만료됨 (Expired)" : `${rtTimeLeft}초 남음`}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                     <div 
                                        className={`h-full transition-all duration-1000 ${rtTimeLeft === 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(100, (rtTimeLeft! / refreshTokenLife) * 100)}%` }}
                                     />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleLogin}
                        disabled={!!accessToken || loading}
                        className="h-14 bg-white text-black font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                    >
                         <Key className="w-5 h-5"/>
                         로그인 (1단계)
                    </button>

                    <button
                        onClick={handleFetchData}
                        disabled={!accessToken || loading}
                        className={`h-14 font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                            atTimeLeft === 0 
                            ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400 animate-pulse' 
                            : 'bg-[#15161a] text-white border-white/20 hover:bg-white/5'
                        } disabled:opacity-20 disabled:animate-none`}
                    >
                         <Server className="w-5 h-5"/>
                         데이터 조회 {atTimeLeft === 0 && "(갱신 시도)"}
                    </button>
                </div>
            </div>

            {/* Right: Logs */}
            <div className="flex flex-col">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Terminal /> 3. 시스템 로그
                </h2>
                <div className="h-[500px] bg-[#0f1014] rounded-2xl border border-white/10 p-4 font-mono text-xs overflow-y-auto custom-scrollbar relative shadow-inner">
                    {/* Clear Button */}
                    <button 
                        onClick={() => setLogs([])} 
                        className="absolute top-4 right-4 text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 text-slate-400"
                    >
                        지우기
                    </button>

                    {logs.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                            <Code className="w-8 h-8"/>
                            <p>로그 대기 중...</p>
                        </div>
                    )}
                    
                    <div className="space-y-1.5">
                        {logs.map((log, i) => (
                        <div key={i} className="break-all pl-2 border-l-2 border-transparent hover:border-white/20">
                            {log}
                        </div>
                        ))}
                        <div ref={logsEndRef}/>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

function SettingsIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    )
}
