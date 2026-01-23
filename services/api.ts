
import { createClient } from '@supabase/supabase-js';
import { SolutionItem, AIConfig, UserRole, ProposalRecord, ProposalItem, ProposalMetadata, AppCustomization, MonthlyGoal, AssistSession, FicharioFolder } from '../types';

const SUPABASE_URL = 'https://wdatcopytwgykhpqshxa.supabase.co';

// Acesso seguro a variáveis de ambiente definido no vite.config.ts
const getEnvVar = (key: string): string | undefined => {
  try {
    // No Vite, as variáveis definidas em 'define' são substituídas como literais
    if (key === 'API_KEY') return process.env.API_KEY;
    if (key === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    
    // Fallback para process.env se disponível
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[key];
    }
  } catch (e) {
    // ignore error
  }
  return undefined;
};

const SUPABASE_ANON_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') || 'sb_publishable_22AXd9MJL5S10dZR7lMLvw_fAHFPHxZ';

export const DEFAULT_DRIVE_FOLDER_ID = "1-01ahpyVthGXZJNUH5rZCjFKxqCm8sOI";
const PROXY_URL = "https://script.google.com/macros/s/AKfycbzHHKsB6EKatnMLQ-V28XZ66CjQCbQQCa3fjfC4EjEKdGgc5K80oDA3aR0jSZR5Mz5UUg/exec";
export const JOB_ID = "d11a1e38-414b-4c69-bb58-9e655f0e2d29";

const ADMIN_EMAIL = 'master@phantlab.com.br';

export const getAppOrigin = () => {
  const origin = window.location.origin;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' 
  }
});

export const AuthService = {
  async signInWithGoogle() {
    const redirectTo = `${getAppOrigin()}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }
    });
    if (error) throw error;
  },
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signUpWithEmail(email: string, password: string, fullName: string) {
    const isMaster = email.toLowerCase() === ADMIN_EMAIL;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: (isMaster ? 'MASTER' : 'USER') as UserRole } }
    });
    if (error) throw error;
    return data;
  },
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) return null;
      return data;
    } catch (err) { return null; }
  },
  async signOut() {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      window.location.href = '/';
    }
  }
};

export const GoogleApiService = {
  async getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return (session as any)?.provider_token;
  },
  async fetchCalendarEvents() {
    const token = await this.getAccessToken();
    if (!token) return [];
    try {
      const now = new Date().toISOString();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      return data.items || [];
    } catch (error) { return []; }
  },
  async uploadToDrive(fileName: string, content: string) {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Não autenticado com Google");
    const metadata = { name: fileName, mimeType: 'text/plain' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'text/plain' }));
    const response = await fetch('https://upload.google.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    if (!response.ok) throw new Error("Falha no upload");
    return await response.json();
  }
};

export const SupabaseService = {
  async fetchSolutions(): Promise<SolutionItem[]> {
    try {
      const { data, error } = await supabase.from('solutions').select('*').order('id', { ascending: true });
      if (error) {
         console.warn("Aviso fetchSolutions:", error.message);
         return [];
      }
      return (data || []).map(item => ({ ...item, id: String(item.id), variaveis_opcionais: Array.isArray(item.variaveis_opcionais) ? item.variaveis_opcionais : [] }));
    } catch (err) { 
      console.error("Erro fatal fetchSolutions:", err);
      return []; 
    }
  },
  async syncSolutions(solutions: SolutionItem[]) {
    try {
      const payload = solutions.map(s => ({ 
        id: String(s.id), 
        solucao: s.solucao, 
        promessa: s.promessa, 
        descricao: s.descricao, 
        categoria: s.categoria, 
        subcategoria: s.subcategoria, 
        duracao: s.duracao, 
        maturidade: s.maturidade, 
        valor_base_num: s.valor_base_num, 
        variaveis_opcionais: s.variaveis_opcionais,
        is_favorite: s.is_favorite 
      }));
      const { error } = await supabase.from('solutions').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (err: any) { return { success: false, message: err.message }; }
  },
  async fetchEssencia() {
    try {
      const { data, error } = await supabase.from('essencia_config').select('content').eq('id', 'main').single();
      if (error) {
        const local = localStorage.getItem('phant_essencia_backup');
        return local ? JSON.parse(local) : null;
      }
      return data.content;
    } catch { return null; }
  },
  async syncEssencia(content: any) {
    try {
      localStorage.setItem('phant_essencia_backup', JSON.stringify(content));
      const { error } = await supabase.from('essencia_config').upsert({ id: 'main', content }, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (err: any) { 
      if (err.code === 'PGRST205' || err.message?.includes('fetch')) return { success: true, warning: 'offline_mode' };
      return { success: false, message: err.message }; 
    }
  },
  async fetchAIConfig(): Promise<AIConfig | null> {
    try {
      const { data, error } = await supabase.from('ai_config').select('content').eq('id', 'mentor').single();
      if (error) {
        const local = localStorage.getItem('phant_ai_config_backup');
        return local ? JSON.parse(local) : null;
      }
      return data.content;
    } catch { return null; }
  },
  async syncAIConfig(content: AIConfig) {
    try {
      localStorage.setItem('phant_ai_config_backup', JSON.stringify(content));
      const { error } = await supabase.from('ai_config').upsert({ id: 'mentor', content }, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (err: any) { 
      if (err.code === 'PGRST205' || err.message?.includes('fetch')) return { success: true, warning: 'offline_mode' };
      return { success: false }; 
    }
  },
  async fetchAppConfig(): Promise<AppCustomization | null> {
    try {
      const { data, error } = await supabase.from('app_config').select('content').eq('id', 'branding').single();
      if (error) {
        const local = localStorage.getItem('phant_app_config_backup');
        return local ? JSON.parse(local) : null;
      }
      return data.content;
    } catch { return null; }
  },
  async syncAppConfig(content: AppCustomization) {
    try {
      localStorage.setItem('phant_app_config_backup', JSON.stringify(content));
      const { error } = await supabase
        .from('app_config')
        .upsert({ id: 'branding', content: content }, { onConflict: 'id' });
      
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('fetch')) {
            return { success: true, warning: 'Table public.app_config not found or fetch error. Using local storage.' };
        }
        return { success: false, message: error.message };
      }
      return { success: true };
    } catch (err: any) { 
      return { success: false, message: String(err) }; 
    }
  },
  async fetchGoals(): Promise<MonthlyGoal[]> {
    try {
      const { data, error } = await supabase.from('app_config').select('content').eq('id', 'sales_goals').single();
      if (error || !data) return [];
      return Array.isArray(data.content) ? data.content : [];
    } catch { return []; }
  },
  async syncGoals(goals: MonthlyGoal[]) {
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ id: 'sales_goals', content: goals }, { onConflict: 'id' });
      return { success: !error, message: error?.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },
  
  async fetchFicharioFolders(): Promise<FicharioFolder[]> {
    try {
      const { data } = await supabase.from('fichario_folders').select('*').order('name');
      return data || [];
    } catch { return []; }
  },

  async updateFicharioFolder(id: string, name: string) {
    try {
      const { error } = await supabase.from('fichario_folders').update({ name }).eq('id', id);
      return { success: !error };
    } catch { return { success: false }; }
  },

  async fetchFicharioFromDb() {
    try {
      const { data, error } = await supabase.from('fichario').select('*').order('nome', { ascending: true });
      if (error) return [];
      return data || [];
    } catch { return []; }
  },

  async syncFicharioToDb(files: any[]) {
    if (files.length === 0) return;
    try {
      const folders = await this.fetchFicharioFolders();
      
      const payload = files.map(file => {
        let categoryId = 'others';
        const type = file.type || 'unknown';
        const nameLower = file.name.toLowerCase();

        if (nameLower.includes('script') || nameLower.includes('roteiro') || nameLower.includes('copiloto')) {
            categoryId = 'scripts';
        } else {
            const match = folders.find(f => f.file_types?.includes(type));
            if (match) categoryId = match.id;
        }

        return { 
            drive_file_id: file.id, 
            nome: file.name, 
            formato: file.type, 
            link: file.url, 
            data_atualizacao: file.rawUpdatedAt || null, 
            folder_id: file.folderId || DEFAULT_DRIVE_FOLDER_ID, 
            virtual_folder_id: categoryId,
            job_id: JOB_ID, 
            raw: file.raw || {} 
        };
      });

      await supabase.from('fichario').upsert(payload, { onConflict: 'drive_file_id' });
    } catch (err: any) { console.error('Erro na sincronia do fichário:', err.message); }
  },

  async saveProposal(clientName: string, industry: string, totalValue: number, consultant: string, items: ProposalItem[], metadata: ProposalMetadata) {
    try {
      const { error } = await supabase.from('proposals_history').insert([{
        client_name: clientName,
        industry,
        total_value: totalValue,
        consultant,
        items,
        metadata,
        status: 'PENDING'
      }]);
      if (error) throw error;
      return { success: true };
    } catch (err: any) { 
      return { success: false, message: err.message }; 
    }
  },
  async updateProposalStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    try {
      const { error } = await supabase.from('proposals_history').update({ status }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },
  async fetchProposalsHistory(): Promise<ProposalRecord[]> {
    try {
      const { data, error } = await supabase.from('proposals_history').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) { return []; }
  },
  
  async createAssistSession(clientName: string, scriptId: string, version: string): Promise<AssistSession | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado no sistema.");
      
      const { data, error } = await supabase.from('assist_sessions').insert([{
        user_id: user.id,
        client_name: clientName,
        script_id: scriptId,
        script_version: version,
        status: 'active'
      }]).select().single();
      
      if (error) {
        console.error("Erro ao criar sessão no Supabase:", error);
        throw new Error(`Erro DB: ${error.message} (${error.code})`);
      }
      return data;
    } catch (err: any) { 
      console.error("createAssistSession falhou:", err);
      throw new Error(err.message || "Erro desconhecido ao criar sessão"); 
    }
  },
  
  async endAssistSession(sessionId: string) {
    await supabase.from('assist_sessions').update({ 
      status: 'completed',
      ended_at: new Date().toISOString()
    }).eq('id', sessionId);
  },

  async saveTranscript(sessionId: string, text: string, speaker: string) {
    await supabase.from('assist_transcripts').insert({
      session_id: sessionId,
      text,
      speaker,
      ts_ms: Date.now(),
      is_final: true
    });
  },

  async saveAssistScore(sessionId: string, scoreData: any) {
    await supabase.from('assist_scores').insert({
      session_id: sessionId,
      score_final: scoreData.score_final,
      close_probability: scoreData.close_probability,
      summary: scoreData.summary,
      highlights: scoreData.highlights,
      next_steps: scoreData.next_steps
    });
  },

  async fetchAssistSessions(): Promise<AssistSession[]> {
    try {
      const { data, error } = await supabase.from('assist_sessions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch { return []; }
  }
};

export const StorageService = {
  async saveDriveConfig(link: string) {
    localStorage.setItem('phant_drive_folder_link', link);
    window.dispatchEvent(new Event('storage'));
    return { success: true };
  },
  async getSavedDriveConfig() {
    return localStorage.getItem('phant_drive_folder_link') || `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}`;
  },
  async fetchDriveFiles(inputLink: string) {
    const folderId = this.extractFolderId(inputLink);
    let files: any[] = [];
    let success = false;
    
    try {
      const token = await GoogleApiService.getAccessToken();
      if (token) {
        const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
        const fields = encodeURIComponent("files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, iconLink)");
        const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=200&orderBy=folder,name`;
        
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          files = data.files || [];
          success = true;
        } else {
          console.warn(`Drive API Error ${res.status}:`, res.statusText);
        }
      }
    } catch (e) {
      console.warn("Google API Direct Fetch failed, trying fallback...", e);
    }

    if (!success) {
      const finalUrl = `${PROXY_URL}?id=${folderId}&_t=${Date.now()}`;
      try {
        const response = await fetch(finalUrl, { method: 'GET', mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP_ERROR_${response.status}`);
        const data = await response.json();
        files = data.files || data.items || [];
        success = true;
      } catch (err: any) { 
        console.warn("Proxy Drive indisponível ou bloqueado.", err.message);
      }
    }

    if (!success) {
       throw new Error("Não foi possível carregar os arquivos. Verifique a conexão ou faça login novamente.");
    }

    return this.processFiles(files, folderId);
  },
  processFiles(files: any[], folderId: string) {
    return files.map((file: any) => {
      const fileId = file.id || file.fileId;
      const modTime = file.modifiedTime || null;
      const thumb = file.thumbnailLink || `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
      
      return { 
        id: fileId, 
        name: file.name || file.title || "Arquivo sem nome", 
        type: this.mapMimeToType(file.mimeType || ""), 
        size: file.size ? this.formatBytes(parseInt(file.size)) : '---', 
        updatedAt: modTime ? new Date(modTime).toLocaleDateString('pt-BR') : '---', 
        rawUpdatedAt: modTime, 
        url: file.webViewLink || `https://drive.google.com/file/d/${fileId}/view`, 
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`, 
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`, 
        thumbnail: thumb, 
        folderId: folderId, 
        raw: file 
      };
    });
  },
  extractFolderId(url: string) {
    const match = url.match(/(?:folders\/|id=)([-\w]{25,})/);
    return match ? match[1] : DEFAULT_DRIVE_FOLDER_ID;
  },
  mapMimeToType(mimeType: string) {
    const mime = (mimeType || '').toLowerCase();
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'application/vnd.google-apps.document') return 'gdoc';
    if (mime === 'application/vnd.google-apps.spreadsheet') return 'gsheet';
    if (mime === 'application/vnd.google-apps.presentation') return 'gslides';
    if (mime.includes('video/')) return 'video';
    if (mime.includes('image/')) return 'image';
    return 'unknown';
  },
  formatBytes(bytes: number) {
    if (!bytes || isNaN(bytes)) return '---';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const sizes = ['B', 'KB', 'MB', 'GB'];
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
  }
};
