
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import PlaybookEditor from './components/PlaybookEditor';
import AIAssistant from './components/AIAssistant';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { PLAYBOOK_STRUCTURE } from './constants';
import { UserRole, AppCustomization } from './types';
import { AuthService, supabase, getAppOrigin, SupabaseService } from './services/api';
import { recordVisit } from './components/MyDay';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('USER');
  const [loading, setLoading] = useState(true);
  const [appConfig, setAppConfig] = useState<AppCustomization>({
    companyName: 'PhantLab',
    systemLogoUrl: 'http://phant.com.br/uploads/simbolo_roxo.png',
    proposalLogoUrl: 'http://phant.com.br/uploads/logo_light.png',
    primaryColor: '#2563eb'
  });
  
  const [authView, setAuthView] = useState<'options' | 'email-login' | 'email-signup'>('options');
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCriticalError, setIsCriticalError] = useState(false);

  const retryCountRef = useRef(0);
  const profileTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleRouting = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page');
      if (page === 'privacy') setLegalView('privacy');
      else if (page === 'terms') setLegalView('terms');
      else setLegalView(null);
    };
    handleRouting();
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, []);

  useEffect(() => {
    SupabaseService.fetchAppConfig().then(config => {
      if (config) setAppConfig(config);
    });
  }, []);

  // Detector de Erros na URL (Google Auth Failure)
  useEffect(() => {
    const checkUrlErrors = () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const errorDesc = (params.get('error_description') || hashParams.get('error_description') || "").toLowerCase();
      
      if (errorDesc.includes('database error') || errorDesc.includes('unexpected_failure')) {
        setIsCriticalError(true);
        setAuthError("ERRO CRÍTICO NO BANCO DE DADOS: O Supabase não conseguiu criar seu perfil. O Trigger de cadastro requer permissão 'SECURITY DEFINER'.");
        setLoading(false);
        setIsProcessing(false);
        // Limpa a URL para evitar reprocessamento
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
      }
    };
    checkUrlErrors();
  }, []);

  const loadUserProfile = useCallback(async (userId: string, user: any) => {
    try {
      let profile = await AuthService.getProfile(userId);
      
      if (!profile && retryCountRef.current < 3) {
        retryCountRef.current++;
        await new Promise(r => setTimeout(r, 1500));
        return loadUserProfile(userId, user);
      }

      if (!profile) {
        // Fallback para não travar o usuário
        profile = {
          id: userId,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Vendedor',
          role: user.email === 'master@phantlab.com.br' ? 'MASTER' : 'USER'
        };
      }

      setUserProfile(profile);
      setCurrentRole(profile.role as UserRole);
      setLoading(false);
      setIsProcessing(false);
      return true;
    } catch (err) {
      setLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        loadUserProfile(session.user.id, session.user);
        
        // Timeout de segurança: se em 7 segundos não carregar o perfil, mata o loading
        profileTimeoutRef.current = setTimeout(() => {
          if (loading) {
            setLoading(false);
            setAuthError("Tempo limite esgotado ao carregar perfil. Verifique sua conexão ou banco de dados.");
          }
        }, 7000);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setSession(newSession);
        if (!userProfile) {
          setIsProcessing(true);
          loadUserProfile(newSession.user.id, newSession.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    };
  }, [loadUserProfile, userProfile]);

  const handleCopySQL = () => {
    const sql = `
-- FIX SECURITY DEFINER PERMISSION
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'), COALESCE(new.raw_user_meta_data->>'avatar_url', ''), 'USER')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `.trim();
    navigator.clipboard.writeText(sql);
    alert("SQL copiado! Cole e execute no 'SQL Editor' do Supabase.");
  };

  if (loading && session && !userProfile) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-8">
        <div className="w-16 h-16 bg-black rounded-[24px] animate-bounce mb-8 flex items-center justify-center shadow-2xl">
           <div className="w-4 h-4 bg-white rounded-full"></div>
        </div>
        <div className="text-center space-y-4 max-w-xs">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-900">Validando Perfil</h3>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
            Se esta tela persistir por mais de 10 segundos, pode haver um erro na criação do seu perfil no banco de dados.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] font-black text-brand border-b border-brand/20 uppercase tracking-widest pt-4"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  if (loading) return null;

  if (!session) {
    if (legalView === 'privacy') {
        return (
            <div className="min-h-screen bg-gray-50 p-8 md:p-16 overflow-y-auto font-sans">
                <button onClick={() => { window.history.pushState({}, '', window.location.pathname); setLegalView(null); }} className="mb-8 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm flex items-center gap-2">
                    <span>←</span> Voltar para Login
                </button>
                <PrivacyPolicy />
            </div>
        )
    }
    if (legalView === 'terms') {
        return (
            <div className="min-h-screen bg-gray-50 p-8 md:p-16 overflow-y-auto font-sans">
                <button onClick={() => { window.history.pushState({}, '', window.location.pathname); setLegalView(null); }} className="mb-8 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm flex items-center gap-2">
                    <span>←</span> Voltar para Login
                </button>
                <TermsOfService />
            </div>
        )
    }

    return (
      <div className="min-h-screen w-full flex flex-col bg-gray-50 overflow-y-auto font-sans">
        <style>{`
          :root { --brand-primary: ${appConfig.primaryColor}; }
          .text-brand { color: var(--brand-primary) !important; }
          .bg-brand { background-color: var(--brand-primary) !important; }
        `}</style>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 py-12">
          <div className="max-w-md w-full bg-white p-12 rounded-[60px] shadow-2xl space-y-10 border border-gray-100 text-center animate-in zoom-in-95 duration-500">
            <div className="w-40 h-40 flex items-center justify-center mx-auto">
               {appConfig.systemLogoUrl ? (
                 <img src={appConfig.systemLogoUrl} alt="Logo" className="w-full h-full object-contain" />
               ) : (
                 <div className="w-full h-full bg-black rounded-[40px] flex items-center justify-center text-white text-5xl font-black">P</div>
               )}
            </div>
            
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight">{appConfig.companyName} Playbook</h1>

            {authError && (
              <div className="p-8 bg-red-50 text-red-600 text-[10px] font-black rounded-[32px] border border-red-100 uppercase tracking-widest leading-relaxed text-center space-y-4">
                <p>⚠️ {authError}</p>
                {isCriticalError && (
                   <button 
                     onClick={handleCopySQL}
                     className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                     Copiar SQL de Correção
                   </button>
                )}
                {isCriticalError && (
                  <p className="text-[8px] text-red-400">Envie este SQL para o administrador rodar no painel do Supabase.</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              {authView === 'options' ? (
                <div className="space-y-4">
                  <button 
                    onClick={() => { setAuthError(null); setIsCriticalError(false); AuthService.signInWithGoogle(); }}
                    className="w-full py-6 bg-white border border-gray-200 text-gray-900 rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                  >
                    Conectar via Google
                  </button>
                  <button 
                    onClick={() => setAuthView('email-login')}
                    className="w-full py-6 bg-black text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-gray-800 transition-all"
                  >
                    E-mail e Senha
                  </button>
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsProcessing(true);
                  try {
                    if (authView === 'email-login') await AuthService.signInWithEmail(email, password);
                    else {
                      await AuthService.signUpWithEmail(email, password, fullName);
                      alert('Cadastro concluído! Faça login.');
                      setAuthView('email-login');
                    }
                  } catch (err: any) { setAuthError(err.message); }
                  setIsProcessing(false);
                }} className="space-y-4 text-left">
                  <input type="email" placeholder="E-mail" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-brand" />
                  <input type="password" placeholder="Senha" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-brand" />
                  <button type="submit" disabled={isProcessing} className="w-full py-6 bg-brand text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-xl">
                    {isProcessing ? 'Carregando...' : 'Entrar'}
                  </button>
                  <button type="button" onClick={() => setAuthView('options')} className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Voltar</button>
                </form>
              )}
            </div>
          </div>
        </div>

        <footer className="p-8 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-10">
            <div className="flex items-center justify-center gap-6">
                <button onClick={() => { window.history.pushState({}, '', '?page=terms'); setLegalView('terms'); }} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-brand transition-colors">Termos de Uso</button>
                <span className="text-gray-300">•</span>
                <button onClick={() => { window.history.pushState({}, '', '?page=privacy'); setLegalView('privacy'); }} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-brand transition-colors">Política de Privacidade</button>
            </div>
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">© {new Date().getFullYear()} {appConfig.companyName} • Todos os direitos reservados.</p>
        </footer>
      </div>
    );
  }

  const selectedModule = PLAYBOOK_STRUCTURE.find(m => m.id === selectedModuleId)
    || PLAYBOOK_STRUCTURE.flatMap(m => m.subModules || []).find(sub => sub.id === selectedModuleId);

  const handleSelectModule = (id: string | null) => {
    setSelectedModuleId(id);
    if (id && id !== 'dashboard') {
      const m = PLAYBOOK_STRUCTURE.find(x => x.id === id)
        || PLAYBOOK_STRUCTURE.flatMap(x => x.subModules || []).find(s => s.id === id);
      if (m) recordVisit(m.id, m.title);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar 
        modules={PLAYBOOK_STRUCTURE} 
        selectedModuleId={selectedModuleId} 
        onSelectModule={handleSelectModule}
        currentRole={currentRole}
        user={{ ...session.user, profile: userProfile }}
        appConfig={appConfig}
      />
      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="p-8 md:p-16 max-w-[1600px] mx-auto">
          {selectedModule && <PlaybookEditor module={selectedModule} currentRole={currentRole} appConfig={appConfig} userProfile={userProfile} onNavigateToModule={handleSelectModule} />}
        </div>
      </main>
      <AIAssistant currentRole={currentRole} />
    </div>
  );
};

export default App;
