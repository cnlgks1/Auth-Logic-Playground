'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, RefreshCw, Key, ShieldCheck, Globe } from 'lucide-react';

export default function AuthExplanation() {
  const [openSection, setOpenSection] = useState<string | null>('jwt');

  const toggle = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="bg-[#0f1014] rounded-2xl border border-white/10 p-6 shadow-xl h-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">인증 로직 가이드</h2>
          <p className="text-sm text-slate-400">실제 내부에서 인증이 어떻게 처리되는지 알아봅니다.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Isolatd: JWT / Local Login */}
        <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${openSection === 'jwt' ? 'bg-white/5 border-purple-500/30 ring-1 ring-purple-500/20' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
          <button 
            onClick={() => toggle('jwt')}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-slate-200">일반 로그인 (JWT)</span>
            </div>
            {openSection === 'jwt' ? <ChevronUp className="w-4 h-4 text-slate-500"/> : <ChevronDown className="w-4 h-4 text-slate-500"/>}
          </button>
          
          {openSection === 'jwt' && (
            <div className="p-4 pt-0 text-sm text-slate-400 space-y-3 border-t border-white/5 mt-2">
              <p>아이디와 비밀번호를 사용하는 가장 기본적인 절차입니다.</p>
              <ul className="space-y-2 list-disc list-inside marker:text-purple-500">
                <li>
                  <strong className="text-white">1. 로그인 요청:</strong> 사용자 정보를 검증합니다.
                </li>
                <li>
                  <strong className="text-white">2. 토큰 발급:</strong> 서버가 두 가지 토큰을 줍니다.
                  <ul className="pl-6 mt-1 space-y-1 text-xs text-slate-500 list-square">
                    <li><span className="text-purple-300">Access Token (짧은 수명)</span>: 실제 출입증입니다.</li>
                    <li><span className="text-purple-300">Refresh Token (긴 수명)</span>: 재발급용 쿠폰입니다.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-white">3. 안전한 저장:</strong>
                  <div className="mt-1 bg-black/40 p-2 rounded border border-white/5 text-xs font-mono">
                    Access Token -&gt; 변수에 저장 (Memory)<br/>
                    Refresh Token -&gt; 쿠키에 저장 (HttpOnly)
                  </div>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* OAuth 2.0 */}
        <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${openSection === 'oauth' ? 'bg-white/5 border-cyan-500/30 ring-1 ring-cyan-500/20' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
          <button 
            onClick={() => toggle('oauth')}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-slate-200">구글 로그인 (OAuth 2.0)</span>
            </div>
            {openSection === 'oauth' ? <ChevronUp className="w-4 h-4 text-slate-500"/> : <ChevronDown className="w-4 h-4 text-slate-500"/>}
          </button>
          
          {openSection === 'oauth' && (
            <div className="p-4 pt-0 text-sm text-slate-400 space-y-3 border-t border-white/5 mt-2">
              <p>외부 계정(구글)을 통해 인증을 대신하는 방식입니다.</p>
              <ol className="space-y-2 list-decimal list-inside marker:text-cyan-500">
                <li>
                  <strong className="text-white">인증 요청:</strong> 구글 로그인 화면으로 이동합니다.
                </li>
                <li>
                  <strong className="text-white">복귀 (Callback):</strong> 구글이 &apos;임시 코드(Code)&apos;를 줍니다.
                </li>
                <li>
                  <strong className="text-white">토큰 교환:</strong> 
                  <div className="mt-1 bg-black/40 p-2 rounded border border-white/5 text-xs font-mono">
                    백엔드가 이 &apos;임시 코드&apos;를 구글에 주고, 진짜 회원 정보를 받아옵니다.
                  </div>
                </li>
                <li>
                  <strong className="text-white">최종 발급:</strong> 백엔드는 일반 로그인과 똑같은 JWT 토큰을 만들어 줍니다.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Refresh Token Rotation */}
        <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${openSection === 'refresh' ? 'bg-white/5 border-emerald-500/30 ring-1 ring-emerald-500/20' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
          <button 
            onClick={() => toggle('refresh')}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-slate-200">자동 갱신</span>
            </div>
            {openSection === 'refresh' ? <ChevronUp className="w-4 h-4 text-slate-500"/> : <ChevronDown className="w-4 h-4 text-slate-500"/>}
          </button>
          
          {openSection === 'refresh' && (
            <div className="p-4 pt-0 text-sm text-slate-400 space-y-3 border-t border-white/5 mt-2">
              <p>로그인이 풀리지 않게 뒤에서 몰래 연장하는 기술입니다.</p>
              <ul className="space-y-2 list-disc list-inside marker:text-emerald-500">
                <li>
                  <strong className="text-white">만약 토큰이 만료되었다면?</strong>
                  <div className="pl-4 mt-1 text-xs text-slate-500">
                    서버가 <code>401 Unauthorized</code> 에러를 냅니다.
                  </div>
                </li>
                <li>
                  <strong className="text-white">자동 갱신 로직:</strong>
                  <div className="mt-1 bg-black/40 p-2 rounded border border-white/5 text-xs font-mono">
                    1. 401 에러 감지<br/>
                    2. 재발급 요청 (쿠키 자동 전송)<br/>
                    3. 새 Access Token 받음<br/>
                    4. 원래 하려던 요청 재시도
                  </div>
                </li>
                <li>
                  <strong className="text-white">보안:</strong> 
                  Refresh Token은 자바스크립트가 접근 불가(HttpOnly)하여 해킹(XSS)에 안전합니다.
                </li>
              </ul>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
