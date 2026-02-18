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
          <h2 className="text-xl font-bold text-white">Authentication Logic Guide</h2>
          <p className="text-sm text-slate-400">How the security flows actually work under the hood.</p>
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
              <span className="font-bold text-slate-200">Local Login (JWT)</span>
            </div>
            {openSection === 'jwt' ? <ChevronUp className="w-4 h-4 text-slate-500"/> : <ChevronDown className="w-4 h-4 text-slate-500"/>}
          </button>
          
          {openSection === 'jwt' && (
            <div className="p-4 pt-0 text-sm text-slate-400 space-y-3 border-t border-white/5 mt-2">
              <p>Standard ID/Password authentication flow.</p>
              <ul className="space-y-2 list-disc list-inside marker:text-purple-500">
                <li>
                  <strong className="text-white">1. Login:</strong> User sends credentials. Server validates against DB (bcrypt).
                </li>
                <li>
                  <strong className="text-white">2. Issue Tokens:</strong> Server creates two tokens:
                  <ul className="pl-6 mt-1 space-y-1 text-xs text-slate-500 list-square">
                    <li><span className="text-purple-300">Access Token (Short-lived)</span>: Sent in JSON body. Used for API Authorization.</li>
                    <li><span className="text-purple-300">Refresh Token (Long-lived)</span>: Sent in <code>HttpOnly Cookie</code>. Used to get new Access Tokens.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-white">3. Secure Storage:</strong>
                  <div className="mt-1 bg-black/40 p-2 rounded border border-white/5 text-xs font-mono">
                    Access Token -&gt; In-Memory (React State)<br/>
                    Refresh Token -&gt; HttpOnly Cookie (Browser handles it)
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
              <span className="font-bold text-slate-200">OAuth 2.0 (Google)</span>
            </div>
            {openSection === 'oauth' ? <ChevronUp className="w-4 h-4 text-slate-500"/> : <ChevronDown className="w-4 h-4 text-slate-500"/>}
          </button>
          
          {openSection === 'oauth' && (
            <div className="p-4 pt-0 text-sm text-slate-400 space-y-3 border-t border-white/5 mt-2">
              <p>Granting access via third-party provider.</p>
              <ol className="space-y-2 list-decimal list-inside marker:text-cyan-500">
                <li>
                  <strong className="text-white">Authorization Request:</strong> Redirect user to Google Consent Screen.
                </li>
                <li>
                  <strong className="text-white">Callback:</strong> Google redirects back with a temporary <code>code</code>.
                </li>
                <li>
                  <strong className="text-white">Token Exchange (Backend):</strong> 
                  <div className="mt-1 bg-black/40 p-2 rounded border border-white/5 text-xs font-mono">
                    Backend sends `code` + `client_secret` to Google -&gt; Gets Google Tokens.
                  </div>
                </li>
                <li>
                  <strong className="text-white">Final Issue:</strong> Backend creates <em>internal</em> JWTs for the user (same as Local Login) so the frontend treats them identically.
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
              <span className="font-bold text-slate-200">Silent Refresh</span>
            </div>
            {openSection === 'refresh' ? <ChevronUp className="w-4 h-4 text-slate-500"/> : <ChevronDown className="w-4 h-4 text-slate-500"/>}
          </button>
          
          {openSection === 'refresh' && (
            <div className="p-4 pt-0 text-sm text-slate-400 space-y-3 border-t border-white/5 mt-2">
              <p>Maintaining session without forcing re-login.</p>
              <ul className="space-y-2 list-disc list-inside marker:text-emerald-500">
                <li>
                  <strong className="text-white">What happens when Access Token expires?</strong>
                  <div className="pl-4 mt-1 text-xs text-slate-500">
                    API returns <code>401 Unauthorized</code>.
                  </div>
                </li>
                <li>
                  <strong className="text-white">Interceptor Logic:</strong>
                  <div className="mt-1 bg-black/40 p-2 rounded border border-white/5 text-xs font-mono">
                    1. Catch 401 Error<br/>
                    2. Call /auth/refresh (Cookie sent automatically)<br/>
                    3. Get new Access Token<br/>
                    4. Retry original request
                  </div>
                </li>
                <li>
                  <strong className="text-white">Security:</strong> 
                  Refresh Token is never exposed to JavaScript (HttpOnly), preventing XSS theft.
                </li>
              </ul>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
