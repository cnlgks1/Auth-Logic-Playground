'use client';

import { Shield, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

interface SecurityControlPanelProps {
  accessTokenLife: number;
  setAccessTokenLife: (val: number) => void;
  refreshTokenLife: number;
  setRefreshTokenLife: (val: number) => void;
}

export default function SecurityControlPanel({
  accessTokenLife,
  setAccessTokenLife,
  refreshTokenLife,
  setRefreshTokenLife
}: SecurityControlPanelProps) {
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className="bg-[#0f1014] rounded-2xl border border-white/10 p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-lg shadow-red-900/20 shrink-0">
          <Shield className="w-7 h-7 text-white" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">보안 정책 설정 (Security Policy)</h2>
          <p className="text-sm text-slate-400">토큰의 유효 기간을 직접 조절하여 테스트해보세요.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Access Token Control */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label htmlFor="at-range" className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" aria-hidden="true" /> 액세스 토큰 수명 (Access Token)
            </label>
            <span className="font-mono text-cyan-400 font-bold bg-cyan-950/30 px-2 py-1 rounded border border-cyan-500/20">
              {formatTime(accessTokenLife)}
            </span>
          </div>
          <div className="w-full flex items-center">
            <input 
                id="at-range"
                type="range" 
                min="1" 
                max="60" 
                step="1" 
                value={accessTokenLife}
                onChange={(e) => setAccessTokenLife(Number(e.target.value))}
                className="w-full appearance-none h-3 rounded-full cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                style={{
                    width: '100%',
                    display: 'block',
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((accessTokenLife - 1) * 100) / (60 - 1)}%, #1e293b ${((accessTokenLife - 1) * 100) / (60 - 1)}%, #1e293b 100%)`
                }}
                aria-valuemin={1}
                aria-valuemax={60}
                aria-valuenow={accessTokenLife}
                aria-label="액세스 토큰 수명 설정"
            />
          </div>
          <div className="flex gap-2 justify-end">
            {[5, 10, 30, 60].map(val => (
                <button 
                    key={val}
                    onClick={() => setAccessTokenLife(val)}
                    className={`text-xs px-2 py-1 rounded border ${accessTokenLife === val ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'} focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                    aria-label={`액세스 토큰 수명을 ${formatTime(val)}로 설정`}
                >
                    {formatTime(val)}
                </button>
            ))}
          </div>
        </div>

        {/* Refresh Token Control */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <div className="flex justify-between items-center">
            <label htmlFor="rt-range" className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-400" aria-hidden="true" /> 리프레시 토큰 수명 (Refresh Token)
            </label>
            <span className="font-mono text-emerald-400 font-bold bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20">
              {formatTime(refreshTokenLife)}
            </span>
          </div>
          <div className="w-full flex items-center">
            <input 
                id="rt-range"
                type="range" 
                min="10" 
                max="3600" 
                step="5" 
                value={refreshTokenLife} 
                onChange={(e) => setRefreshTokenLife(Number(e.target.value))}
                className="w-full appearance-none h-3 rounded-full cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                style={{
                    width: '100%',
                    display: 'block',
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${((Math.min(refreshTokenLife, 3600) - 10) * 100) / (3600 - 10)}%, #1e293b ${((Math.min(refreshTokenLife, 3600) - 10) * 100) / (3600 - 10)}%, #1e293b 100%)`
                }}
                aria-valuemin={10}
                aria-valuemax={3600}
                aria-valuenow={refreshTokenLife}
                aria-label="리프레시 토큰 수명 설정"
            />
          </div>
           <div className="flex gap-2 justify-end flex-wrap">
            {[10, 30, 60, 3600, 86400, 604800].map(val => (
                <button 
                    key={val}
                    onClick={() => setRefreshTokenLife(val)}
                    className={`text-xs px-2 py-1 rounded border ${refreshTokenLife === val ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'} focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors`}
                    aria-label={`리프레시 토큰 수명을 ${formatTime(val)}로 설정`}
                >
                    {formatTime(val)}
                </button>
            ))}
          </div>
        </div>

        {/* Warning */}
        {accessTokenLife < 15 && (
            <div className="flex gap-2 items-start bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-xs text-yellow-200/80">
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0"/>
                <p>Short Access Token lifespan (Less than 15s) allows you to test <strong>Silent Refresh</strong> quickly. Watch the logs!</p>
            </div>
        )}
      </div>
    </div>
  );
}
