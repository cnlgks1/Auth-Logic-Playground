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
 * 3. 자동 갱신: 사용자가 모르게 백그라운드에서 AT를 새로 받아오는 기술.
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
   * - 이를 '자동 갱신'이라고 부르며, 사용자는 로그아웃되지 않고 계속 서비스를 쓸 수 있습니다.
   */
  const handleFetchData = async () => {
    if (!accessToken) return;
    
    // UI 표시용: 이미 만료된 상태인지 체크
    const isClientExpired = atTimeLeft === 0;
    
    if (isClientExpired) {
        addLog(`🟡 [주의] Access Token이 만료된 상태입니다. 요청 시 '자동 갱신'이 시도됩니다...`);
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
        addLog('🎉 [자동 갱신 성공] Access Token이 만료되어 자동으로 갱신되었습니다!');
        // 갱신된 토큰으로 갈아끼우기 (로그인 연장)
        setAccessToken(newAccessToken);
      }

      if (!res.ok) throw new Error('API 요청 실패');

      const data = await res.json();
      addLog(`🟢 [성공] 데이터 수신 완료: 사용자명 = ${data.username}`);
      
    } catch (err: any) {
      // 리프레시 토큰마저 만료되거나 없으면 여기서 에러가 잡힙니다.
      if (err.message.includes('자동 갱신 실패') || err.message.includes('Refresh Failed')) {
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

  // 🌐 OAuth 관련 상태
  const [googleCode, setGoogleCode] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  
  // ⚙️ OAuth 사용자 지정 설정 (내 키 사용하기)
  const [showCustomSettings, setShowCustomSettings] = useState(false);
  const [customClientId, setCustomClientId] = useState('');
  const [customClientSecret, setCustomClientSecret] = useState('');
  // Redirect URI는 기본적으로 현재 페이지로 고정 (구글 콘솔 설정 편의상)
  const [redirectUri, setRedirectUri] = useState('');

  useEffect(() => {
    setRedirectUri(window.location.origin);
  }, []);

  // 🔗 URL에서 인증 코드(Code) 감지
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
        setGoogleCode(code);
        addLog(`✨ [OAuth] 구글에서 인증 코드(Code)를 받아왔습니다!`);
        addLog(`   - Code: ${code.substring(0, 15)}...`);
        
        // 코드를 URL에서 지워주는 센스 (선택)
        window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // 👋 로그아웃: 모든 상태 초기화
  const logout = () => {
    setAccessToken(null);
    setRtTimeLeft(null);
    setUser(null);
    setGoogleCode(null);
    addLog('👋 로그아웃 되었습니다.');
  };

  // 🚀 [Step A] 구글 로그인 페이지로 이동
  const handleGoogleLogin = () => {
      // 사용자 입력값이 있으면 우선 사용, 없으면 환경변수(.env) 사용 (하이브리드 방식)
      const clientId = customClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = customClientSecret || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
          alert("Client ID와 Client Secret이 필요합니다.\n\n1. 화면에 직접 입력하거나\n2. .env.local 파일에 설정하세요.");
          return;
      }

      const targetUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile`;
      
      // 사용자 설정을 썼다면 로컬 스토리지 등에 저장해두면 좋겠지만, 일단 상태 유지 차원에서 로그만 남김
      if (customClientId) {
          addLog(`🔧 [Custom] 사용자 지정 Client ID로 로그인합니다.`);
      }

      addLog(`👉 [OAuth] 구글 로그인 페이지로 이동합니다...`);
      window.location.href = targetUrl;
  };

  // 🚀 [Step B] 인증 코드를 백엔드로 보내서 토큰 교환
  const handleGoogleExchange = async () => {
      if (!googleCode) return;
      setOauthLoading(true);
      addLog(`🔵 [OAuth] 인증 코드를 백엔드로 전송하여 토큰 교환 요청...`);

      try {
          const res = await fetch(`/auth/exchange`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  code: googleCode,
                  // 하이브리드: 입력값 우선, 없으면 .env 값 전송
                  clientId: customClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,         
                  clientSecret: customClientSecret || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET, 
                  redirectUri: redirectUri,
                  expiresInSeconds: expiresIn,
                  refreshTokenExpiresInSeconds: refreshTokenLife
              })
          });

          if (!res.ok) {
              const errText = await res.text();
              throw new Error(errText);
          }

          const data = await res.json();
          
          setAccessToken(data.backend.access_token);
          setUser(data.user);
          setRtTimeLeft(refreshTokenLife); // 가상 타이머
          
          addLog(`🟢 [OAuth 성공] 구글 인증 완료! JWT 토큰이 발급되었습니다.`);
          addLog(`   - Access Token: ${data.backend.access_token.substring(0, 15)}...`);
          addLog(`   - User: ${data.user.email} (${data.user.username})`);

      } catch (err: any) {
          addLog(`🔴 [OAuth 실패] 토큰 교환 중 오류 발생: ${err.message}`);
      } finally {
          setOauthLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 font-sans selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto p-6 flex flex-col min-h-screen gap-10">
        
        {/* Header */}
        <header className="border-b border-white/5 pb-6 text-center">
            <h1 className="text-3xl font-bold text-white mb-3">🗝️ 인증 로직 플레이그라운드</h1>
            <p className="text-slate-500 max-w-2xl mx-auto">
                      이곳은 <b>로그인(인증)의 원리</b>를 눈으로 확인하는 실험실입니다.
                      {/* <br /> */}
                {/* 어떤 방식으로 들어오든, 결국 <b>'토큰(Token)'</b>이라는 입장권을 받게 된다는 점을 기억하세요. */}
            </p>
        </header>

        {/* 0. 환경 설정 */}
        <section className="bg-slate-900/50 p-5 rounded-2xl border border-white/5">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h2 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                    <SettingsIcon /> 0. 환경 설정 (토큰 수명)
                </h2>
                
                {/* Auto Refresh Toggle (Moved here) */}
                <div className="flex items-center gap-3 bg-[#15161a] px-3 py-1.5 rounded-lg border border-white/10">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                        <span className="ms-2 text-xs font-bold text-gray-300 select-none">자동 연장 켜기</span>
                    </label>
                </div>
             </div>
             
             <SecurityControlPanel 
                accessTokenLife={expiresIn}
                setAccessTokenLife={setExpiresIn}
                refreshTokenLife={refreshTokenLife}
                setRefreshTokenLife={setRefreshTokenLife}
            />
        </section>

        {/* 메인 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* 왼쪽: 인증 절차 (Step 1 -> Step 2 -> Step 3) */}
            <div className="lg:col-span-8 space-y-8">
                
                {/* Step 1. 로그인 방식 선택 */}
                <section className={`transition-opacity duration-300 ${accessToken ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                        로그인 방식 선택
                    </h2>
                    
                    <div className="flex flex-col gap-6">
                        {/* Option A: 일반 로그인 */}
                        <div className="bg-[#15161a] p-5 rounded-2xl border border-white/10 flex flex-col relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-700"></div>
                            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                                <Key className="w-4 h-4 text-slate-400"/> A. 아이디/비번 입장
                            </h3>
                            <p className="text-xs text-slate-500 mb-4 h-8">
                                전통적인 방식입니다. 아이디와 비밀번호를 서버로 보냅니다.
                            </p>
                            <button
                                onClick={handleLogin}
                                disabled={!!accessToken || loading}
                                className="mt-auto h-12 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                로그인 (admin / 1234)
                            </button>
                        </div>

                        {/* Option B: 구글 로그인 */}
                        <div className="bg-[#15161a] p-5 rounded-2xl border border-white/10 flex flex-col relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#4285F4]"></div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-[#4285F4]"/> B. 구글 계정 입장
                                </h3>
                            </div>
                            
                            <p className="text-xs text-slate-500 mb-4">
                                테스트할 구글 Client ID와 Secret을 입력하세요.<br/>
                                <span className="opacity-50">(로컬 환경이면 자동 입력됩니다)</span>
                            </p>

                            {/* Credentials Input Fields (Always Visible) */}
                            <div className="mb-4 bg-black/40 p-3 rounded-lg border border-white/10 space-y-4">
                                <div className="text-xs text-slate-400 flex justify-between">
                                    <span>구글 콘솔에서 발급받은 키 입력</span>
                                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">발급받기 ↗</a>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Client ID</label>
                                    <input 
                                        type="text" 
                                        value={customClientId}
                                        onChange={(e) => setCustomClientId(e.target.value)}
                                        placeholder="76xxx...apps.googleusercontent.com"
                                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:border-blue-500 outline-none placeholder:text-slate-600 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Client Secret (입력 시 우선 사용)</label>
                                    <input 
                                        type="password" 
                                        value={customClientSecret}
                                        onChange={(e) => setCustomClientSecret(e.target.value)}
                                        placeholder="백엔드에 설정돼 있다면 비워두세요"
                                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:border-blue-500 outline-none placeholder:text-slate-600 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Redirect URI (자동)</label>
                                    <div className="w-full bg-[#0a0a0c]/50 border border-white/5 rounded-lg px-3 py-3 text-sm text-slate-500 font-mono truncate">
                                        {redirectUri}
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">* 구글 콘솔에 이 URI를 반드시 추가해야 합니다.</p>
                                </div>
                            </div>
                            
                            {/* OAuth Flow UI */}
                            {!googleCode ? (
                                <button 
                                    onClick={handleGoogleLogin}
                                    disabled={!!accessToken}
                                    className="mt-auto h-12 bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 6.96-6.51 6.96C8.25 20.79 5.09 17.6 5.09 13.9c0-3.7 3.16-6.89 6.89-6.89c1.67 0 3.17.6 4.35 1.57l2.13-2.13C16.89 4.88 14.77 4.1 12 4.1C6.6 4.1 2.21 8.5 2.21 13.9c0 5.4 4.39 9.8 9.79 9.8c5.65 0 9.49-4.1 9.49-9.8c0-.65-.07-1.28-.14-1.8Z"/></svg>
                                    구글 로그인창 열기
                                </button>
                            ) : (
                                <div className="mt-auto flex flex-col gap-2">
                                    <div className="text-[10px] text-emerald-400 font-mono bg-emerald-950/30 px-2 py-1 rounded truncate">
                                        Code: {googleCode}
                                    </div>
                                    <button 
                                        onClick={handleGoogleExchange}
                                        disabled={oauthLoading}
                                        className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 animate-pulse"
                                    >
                                        {oauthLoading ? '토큰 교환 (로그인 완료)' : '코드로 입장권(Token) 받기'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
                
                {/* 화살표 장식 */}
                <div className="flex justify-center -my-2 opacity-30">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19M12 19L19 12M12 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>

                {/* Step 2. 인증 상태 (통합됨) */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                        발급된 신분증 (로그인 상태)
                    </h2>
                    
                    <div className={`p-6 rounded-2xl border transition-all relative overflow-hidden ${accessToken ? 'bg-purple-900/10 border-purple-500/50' : 'bg-[#15161a] border-white/10'}`}>
                        {!accessToken && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-10">
                                <p className="text-slate-500 text-sm font-bold">로그인 전입니다. 위에서 입장 방식을 선택하세요.</p>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-xs uppercase font-bold text-slate-500 mb-1">Current Status</p>
                                <div className="text-2xl font-bold text-white flex items-center gap-2">
                                    {accessToken ? (
                                        <>
                                            <CheckCircle className="text-emerald-400" />
                                            <span>
                                                {user?.provider === 'google' ? '구글 계정으로 로그인됨' : '일반 계정으로 로그인됨'}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-slate-500">로그아웃 상태</span>
                                    )}
                                </div>
                                {accessToken && user && (
                                    <div className="mt-2 text-sm text-slate-400 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden">
                                            {user.avatarUrl ? <img src={user.avatarUrl} alt="profile" /> : <div className="w-full h-full bg-slate-600"/>}
                                        </div>
                                        {user.email} ({user.username})
                                    </div>
                                )}
                            </div>
                            {accessToken && (
                                <button onClick={logout} className="text-xs bg-red-500/10 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors font-bold z-20">
                                    로그아웃
                                </button>
                            )}
                        </div>

                        {/* Timer Visuals */}
                        <div className="space-y-4">
                            {/* Access Token Timer */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className={atTimeLeft === 0 ? "text-red-400 font-bold" : "text-cyan-400"}>🎫 Access Token (출입증/짧은 수명)</span>
                                    <span className="font-mono">{atTimeLeft === 0 ? "만료됨 (Expired)" : `${atTimeLeft ?? expiresIn}초 남음`}</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${atTimeLeft === 0 ? 'bg-red-500' : 'bg-cyan-500'}`}
                                        style={{ width: `${Math.min(100, ((atTimeLeft || 0) / expiresIn) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Refresh Token Info */}
                                <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className={rtTimeLeft === 0 ? "text-red-400 font-bold" : "text-emerald-400"}>🔐 Refresh Token (재발급권/긴 수명)</span>
                                    <span className="font-mono">
                                        {rtTimeLeft === null ? "대기 중" : 
                                            rtTimeLeft === 0 ? "만료됨 (Expired)" : `${rtTimeLeft}초 남음`}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                        className={`h-full transition-all duration-1000 ${rtTimeLeft === 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(100, ((rtTimeLeft || 0) / refreshTokenLife) * 100)}%` }}
                                        />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 화살표 장식 */}
                <div className="flex justify-center -my-2 opacity-30">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19M12 19L19 12M12 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>

                {/* Step 3. API 요청 (Action) */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="bg-pink-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                        서비스 이용 (API 테스트)
                    </h2>
                     <button
                        onClick={handleFetchData}
                        disabled={!accessToken || loading}
                        className={`w-full h-16 text-lg font-bold rounded-xl border flex items-center justify-center gap-3 transition-all ${
                            atTimeLeft === 0 && accessToken
                            ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400 animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.5)]' 
                            : 'bg-[#15161a] text-white border-white/20 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed'
                        }`}
                    >
                            <Server className="w-6 h-6"/>
                            {atTimeLeft === 0 && accessToken 
                                ? "⏳ 토큰이 만료되었습니다! 클릭해서 '자동 연장' 테스트하기" 
                                : "🔒 보호된 데이터 요청하기 (내 정보 보기)"}
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-2">
                        * 토큰이 만료된 상태에서 클릭하면, <b>자동 갱신</b>이 작동하여 <b>자동으로 로그인 상태를 연장</b>합니다.
                    </p>
                </section>

            </div>

            {/* 오른쪽: 로그 패널 (Sticky) */}
            <div className="lg:col-span-4">
                <div className="sticky top-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Terminal /> 실시간 시스템 로그
                    </h2>
                    <div className="h-[calc(100vh-120px)] bg-[#0f1014] rounded-2xl border border-white/10 p-4 font-mono text-xs overflow-y-auto custom-scrollbar relative shadow-inner">
                        <button 
                            onClick={() => setLogs([])} 
                            className="absolute top-4 right-4 text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 text-slate-400 z-10"
                        >
                            지우기
                        </button>

                        {logs.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2 opacity-50">
                                <Code className="w-8 h-8"/>
                                <p>대기 중...</p>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            {logs.map((log, i) => (
                            <div key={i} className={`break-all pl-2 border-l-2 text-[11px] leading-relaxed ${
                                log.includes('[성공]') || log.includes('완료') ? 'border-emerald-500 text-emerald-100' :
                                log.includes('[실패]') || log.includes('오류') || log.includes('만료') ? 'border-red-500 text-red-100' :
                                log.includes('[OAuth]') ? 'border-blue-500 text-blue-100' :
                                'border-slate-700 text-slate-300'
                            }`}>
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
    </div>
  );
}

function SettingsIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    )
}
