
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import PlaybookEditor from './components/PlaybookEditor';
import AIAssistant from './components/AIAssistant';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { PLAYBOOK_STRUCTURE } from './constants';
import { UserRole, AppCustomization } from './types';
import { AuthService, supabase, getAppOrigin, SupabaseService } from './services/api';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('USER');
  const [loading, setLoading] = useState(true);
  const [appConfig, setAppConfig] = useState<AppCustomization>({
    companyName: 'PhantLab',
    logoUrl: '',
    primaryColor: '#2563eb'
  });
  
  // Auth & View States
  const [authView, setAuthView] = useState<'options' | 'email-login' | 'email-signup'>('options');
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const retryCountRef = useRef(0);

  useEffect(() => {
    // Carregar configurações de marca
    SupabaseService.fetchAppConfig().then(config => {
      if (config) setAppConfig(config);
    });
  }, []);

  useEffect(() => {
    const handleUrlParams = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const errorCode = searchParams.get('error') || hashParams.get('error');
      const errorDesc = (searchParams.get('error_description') || hashParams.get('error_description') || "").toLowerCase();

      if (errorCode || errorDesc) {
        let msg = errorDesc || errorCode || "Erro na autenticação.";
        if (errorDesc.includes('access_denied') || errorCode === '403') {
          msg = "ERRO 403: AMBIENTE DE PREVIEW NÃO AUTORIZADO. Como você está em um ambiente de testes, o Google exige que esta URL exata esteja cadastrada nos URIs de Redirecionamento.";
        }
        setAuthError(msg);
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
      }
    };

    handleUrlParams();
    window.addEventListener('hashchange', handleUrlParams);
    return () => window.removeEventListener('hashchange', handleUrlParams);
  }, []);

  const loadUserProfile = useCallback(async (userId: string, user: any) => {
    const userEmail = user.email;
    try {
      let profile = await AuthService.getProfile(userId);
      
      if (!profile && retryCountRef.current < 2) {
        retryCountRef.current++;
        await new Promise(r => setTimeout(r, 1000));
        return loadUserProfile(userId, user);
      }

      if (!profile) {
        profile = {
          id: userId,
          full_name: user.user_metadata?.full_name || user.user_metadata?.picture_name || user.user_metadata?.name || 'Vendedor',
          role: user.user_metadata?.role || 'USER',
          is_fallback: true
        };
      }
      
      if (userEmail?.toLowerCase() === 'master@phantlab.com.br') {
        profile.role = 'MASTER';
      }

      setUserProfile(profile);
      setCurrentRole(profile.role as UserRole);
      retryCountRef.current = 0;
      return true;
    } catch (err) {
      setUserProfile({ id: userId, role: 'USER', full_name: 'Usuário' });
      return false;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        loadUserProfile(session.user.id, session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setSession(newSession);
        if (!userProfile) {
          setIsProcessing(true);
          await loadUserProfile(newSession.user.id, newSession.user);
          setIsProcessing(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserProfile(null);
        setCurrentRole('USER');
        setAuthView('options');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile, userProfile]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsProcessing(true);
    try {
      await AuthService.signInWithEmail(email, password);
    } catch (err: any) {
      setAuthError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
      setIsProcessing(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsProcessing(true);
    try {
      await AuthService.signUpWithEmail(email, password, fullName);
      alert('Cadastro realizado! Agora você pode fazer login.');
      setAuthView('email-login');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyRedirectUri = () => {
    const uri = `${getAppOrigin()}/`;
    navigator.clipboard.writeText(uri);
    alert("URL Copiada: " + uri);
  };

  if (loading || (session && !userProfile)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 bg-black rounded-[24px] animate-bounce shadow-2xl flex items-center justify-center">
             <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-black text-gray-900 uppercase tracking-[0.4em]">Sincronizando Acesso</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 animate-pulse">
              Validando credenciais seguras...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Visualização de Página Independente para Termos/Privacidade (Fora do Login)
  if (legalView) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-y-auto custom-scrollbar animate-in fade-in duration-300">
        <div className="max-w-4xl mx-auto py-20 px-6 relative">
          <button 
            onClick={() => setLegalView(null)}
            className="sticky top-0 z-10 mb-12 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors bg-gray-50/80 backdrop-blur-sm py-4 w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
            Voltar para o Início
          </button>
          {legalView === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
        </div>
      </div>
    );
  }

  const AppFooter = () => (
    <footer className="mt-auto pt-12 pb-8 flex flex-col md:flex-row items-center justify-between gap-6 no-print w-full max-w-[1600px] mx-auto px-8 border-t border-gray-100">
      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
        © 2024 {appConfig.companyName} Strategic Platform. Todos os direitos reservados.
      </p>
      <div className="flex items-center gap-6">
        <button 
          onClick={() => session ? setSelectedModuleId('privacy_policy') : setLegalView('privacy')}
          className="text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-brand transition-colors"
        >
          Privacidade
        </button>
        <div className="w-1 h-1 rounded-full bg-gray-200"></div>
        <button 
          onClick={() => session ? setSelectedModuleId('terms_of_service') : setLegalView('terms')}
          className="text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-brand transition-colors"
        >
          Termos de Uso
        </button>
      </div>
    </footer>
  );

  const ThemeStyles = () => (
    <style>{`
      :root {
        --brand-primary: ${appConfig.primaryColor};
      }
      .text-brand { color: var(--brand-primary) !important; }
      .bg-brand { background-color: var(--brand-primary) !important; }
      .border-brand { border-color: var(--brand-primary) !important; }
      
      .hover\\:bg-brand:hover { background-color: var(--brand-primary) !important; opacity: 0.9; }
      .hover\\:text-brand:hover { color: var(--brand-primary) !important; }
      .focus\\:border-brand:focus { border-color: var(--brand-primary) !important; }
      
      .text-blue-600, .text-blue-500 { color: var(--brand-primary) !important; }
      .bg-blue-600, .bg-blue-500 { background-color: var(--brand-primary) !important; }
      .bg-blue-50 { background-color: color-mix(in srgb, var(--brand-primary), white 92%) !important; }
      .border-blue-600, .border-blue-500, .border-blue-100 { border-color: color-mix(in srgb, var(--brand-primary), white 80%) !important; }
      
      .hover\\:bg-blue-700:hover, .hover\\:bg-blue-600:hover { background-color: var(--brand-primary) !important; filter: brightness(0.9); }
      
      .shadow-brand\\/20 { 
        box-shadow: 0 10px 15px -3px color-mix(in srgb, var(--brand-primary), transparent 80%), 0 4px 6px -4px color-mix(in srgb, var(--brand-primary), transparent 80%) !important; 
      }
    `}</style>
  );

  if (!session) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-gray-50 overflow-y-auto">
        <ThemeStyles />
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 py-12">
          <div className="max-w-md w-full bg-white p-12 rounded-[60px] shadow-2xl space-y-10 border border-gray-100 text-center animate-in zoom-in-95 duration-500 my-8">
            <div className="w-20 h-20 bg-black rounded-[30px] flex items-center justify-center text-white text-3xl font-black mx-auto shadow-xl overflow-hidden">
               {appConfig.logoUrl ? (
                 <img src={appConfig.logoUrl} alt="Logo" className="w-full h-full object-contain p-2 bg-white" />
               ) : (
                 appConfig.companyName.charAt(0)
               )}
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight">{appConfig.companyName} Playbook</h1>
              <p className="text-gray-400 font-medium text-sm leading-relaxed px-4">
                Acesse sua central de inteligência comercial.
              </p>
            </div>

            {authError && (
              <div className="p-8 bg-red-50 text-red-600 text-[11px] font-bold rounded-[32px] border border-red-100 uppercase tracking-widest leading-relaxed animate-in fade-in slide-in-from-top-2 flex flex-col items-center gap-4 text-center">
                <span className="text-2xl">⚠️</span>
                <span className="max-w-[280px]">{authError}</span>
                <button 
                  onClick={copyRedirectUri}
                  className="bg-white text-red-600 border border-red-200 px-5 py-3 rounded-full text-[9px] hover:bg-red-600 hover:text-white transition-all shadow-sm font-black"
                >
                  COPIAR URL DE REDIRECIONAMENTO
                </button>
              </div>
            )}

            <div className="space-y-4">
              {authView === 'options' ? (
                <div className="space-y-6">
                  <button 
                    onClick={() => { setAuthError(null); AuthService.signInWithGoogle(); }}
                    className="w-full py-6 bg-white border border-gray-200 text-gray-900 rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-gray-50 hover:shadow-lg transition-all flex items-center justify-center gap-3 group"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Conectar via Google
                  </button>

                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-gray-100"></div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Ou</span>
                    <div className="flex-1 h-px bg-gray-100"></div>
                  </div>

                  <button 
                    onClick={() => setAuthView('email-login')}
                    className="w-full py-6 bg-black text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-3"
                  >
                    Acesso via E-mail e Senha
                  </button>
                </div>
              ) : (
                <form onSubmit={authView === 'email-login' ? handleEmailLogin : handleEmailSignup} className="space-y-4 text-left">
                  {authView === 'email-signup' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nome Completo</label>
                      <input 
                        type="text" 
                        required 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm focus:bg-white focus:border-brand outline-none transition-all"
                        placeholder="Seu nome"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">E-mail</label>
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm focus:bg-white focus:border-brand outline-none transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Senha</label>
                    <input 
                      type="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm focus:bg-white focus:border-brand outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-6 bg-brand text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black disabled:opacity-50 transition-all mt-6"
                  >
                    {isProcessing ? 'Carregando...' : authView === 'email-login' ? 'Acessar Playbook' : 'Criar minha Conta'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setAuthView('options'); setAuthError(null); }}
                    className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
                  >
                    Voltar às opções
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <AppFooter />
      </div>
    );
  }

  const selectedModule = PLAYBOOK_STRUCTURE.find(m => m.id === selectedModuleId);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      <ThemeStyles />
      <Sidebar 
        modules={PLAYBOOK_STRUCTURE} 
        selectedModuleId={selectedModuleId} 
        onSelectModule={setSelectedModuleId}
        currentRole={currentRole}
        user={{ ...session.user, profile: userProfile }}
        appConfig={appConfig}
      />
      <main className="flex-1 overflow-y-auto relative custom-scrollbar flex flex-col">
        <div className="p-8 md:p-16 max-w-[1600px] mx-auto flex-1 w-full">
          {selectedModule ? (
            <PlaybookEditor 
              module={selectedModule} 
              currentRole={currentRole} 
              onNavigateToModule={setSelectedModuleId}
              appConfig={appConfig}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-300 font-black uppercase tracking-[0.3em]">
              Módulo não encontrado
            </div>
          )}
        </div>
        <AppFooter />
      </main>
      <AIAssistant currentRole={currentRole} />

      {userProfile?.role === 'MASTER' && (
        <div className="fixed bottom-6 left-6 flex items-center space-x-1 bg-white/90 backdrop-blur-xl p-1.5 rounded-2xl border border-gray-100 shadow-2xl z-[70]">
          {(['MASTER', 'USER'] as UserRole[]).map(role => (
            <button 
              key={role}
              onClick={() => setCurrentRole(role)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentRole === role ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}
            >
              {role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
