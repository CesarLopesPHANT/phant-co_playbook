
import React, { useState, useEffect } from 'react';
import { AppIcon } from './Icons';
import { UserRole } from '../types';
import { StorageService, DEFAULT_DRIVE_FOLDER_ID, SupabaseService, JOB_ID } from '../services/api';

interface FicharioProps {
  currentRole: UserRole;
}

type ViewState = 'loading' | 'gallery' | 'explorer';

const Fichario: React.FC<FicharioProps> = ({ currentRole }) => {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [searchTerm, setSearchTerm] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [folderId, setFolderId] = useState(DEFAULT_DRIVE_FOLDER_ID);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [inputLink, setInputLink] = useState('');
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = async (targetId: string, forceSync = false) => {
    setViewState('loading');
    try {
      const dbFiles = await SupabaseService.fetchFicharioFromDb();
      
      if (dbFiles.length > 0 && !forceSync) {
        setFiles(dbFiles.map(f => ({
          id: f.drive_file_id,
          name: f.nome,
          type: f.formato || 'unknown',
          url: f.link,
          thumbnail: `https://drive.google.com/thumbnail?id=${f.drive_file_id}&sz=w400`,
          size: f.raw?.size ? StorageService.formatBytes(parseInt(f.raw.size)) : '---',
          updatedAt: f.data_atualizacao ? new Date(f.data_atualizacao).toLocaleDateString('pt-BR') : '---',
          previewUrl: `https://drive.google.com/file/d/${f.drive_file_id}/preview`,
          downloadUrl: `https://drive.google.com/uc?export=download&id=${f.drive_file_id}`
        })));
        setViewState('gallery');
      } else {
        setIsSyncing(true);
        const driveFiles = await StorageService.fetchDriveFiles(targetId);
        await SupabaseService.syncFicharioToDb(driveFiles);
        setFiles(driveFiles);
        setViewState('gallery');
      }
    } catch (err: any) {
      console.warn("Falha no carregamento completo, usando modo explorer", err);
      setViewState('explorer');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const savedLink = await StorageService.getSavedDriveConfig();
      const id = StorageService.extractFolderId(savedLink);
      setFolderId(id);
      loadData(id);
    };
    init();
  }, []);

  const handleUpdateFolder = async () => {
    if (!inputLink) return;
    const newId = StorageService.extractFolderId(inputLink);
    await StorageService.saveDriveConfig(inputLink);
    setFolderId(newId);
    setShowDriveModal(false);
    loadData(newId, true);
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getFileIconEmoji = (type: string) => {
    const map: Record<string, string> = { 
      pdf: '📕', 
      gslides: '📙', 
      gdoc: '📘', 
      gsheet: '📗', 
      video: '🎬',
      image: '🖼️',
      ppt: '📙',
      doc: '📘',
      xls: '📗'
    };
    return map[type] || '📄';
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 px-4 h-full flex flex-col pb-20 relative">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 shrink-0">
        <div>
          <div className="flex items-center space-x-3 mb-3">
             <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
               <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-blue-500 animate-pulse'}`}></span>
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                 {isSyncing ? 'Job: Sincronizando Scrape Drive...' : 'Acervo Persistido no Supabase'}
               </span>
             </div>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-tight">Fichário Comercial</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
            <button onClick={() => setViewState('gallery')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewState === 'gallery' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}>Galeria</button>
            <button onClick={() => setViewState('explorer')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewState === 'explorer' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}>Explorador</button>
          </div>

          {/* BOTÃO DE CONFIGURAÇÕES DO DRIVE (APENAS MASTER) */}
          {currentRole === 'MASTER' && (
            <button 
              onClick={() => setShowDriveModal(true)} 
              className="p-4 bg-white border border-gray-100 text-gray-500 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm group"
              title="Configurar Pasta do Drive"
            >
              <AppIcon name="settings" size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>
          )}
          
          <button onClick={() => loadData(folderId, true)} className="p-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-sm group" title="Sincronizar Agora">
            <svg className={`w-4 h-4 ${viewState === 'loading' || isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-[500px] overflow-hidden flex flex-col">
        {viewState === 'loading' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center animate-pulse border border-gray-100 shadow-sm">
              <span className="text-5xl">📂</span>
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Acessando Banco de Dados...</p>
          </div>
        ) : viewState === 'explorer' ? (
          <div className="flex-1 bg-white rounded-[40px] border border-gray-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col relative">
             <iframe src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`} className="flex-1 w-full border-none" title="Drive Explorer"></iframe>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-10 overflow-y-auto custom-scrollbar pr-2">
            <div className="relative w-full max-w-2xl shrink-0">
              <input type="text" placeholder="Pesquisar nos ativos catalogados..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="app-card w-full px-10 py-6 rounded-[32px] focus:outline-none focus:ring-8 focus:ring-black/5 font-bold text-gray-700 transition-all border-none shadow-xl" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
              {filteredFiles.map((file) => (
                <div key={file.id} className="group bg-white rounded-[24px] overflow-hidden border border-gray-100 hover:border-black/10 hover:shadow-2xl transition-all duration-500 flex flex-col">
                  <div className="relative aspect-[4/3] bg-gray-50">
                    <img 
                      src={file.thumbnail} 
                      alt={file.name} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/200?text=${file.type.toUpperCase()}`; }}
                    />
                    <div className="absolute top-3 left-3 flex items-center justify-center w-8 h-8 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-gray-100 text-lg">
                      {getFileIconEmoji(file.type)}
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2">
                        <button onClick={() => setPreviewFile(file)} className="px-5 py-2.5 bg-white text-black rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">Visualizar</button>
                        <a href={file.downloadUrl} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all">Baixar</a>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight text-[11px] line-clamp-2 min-h-[1.5rem] group-hover:text-blue-600 transition-colors">
                        {file.name}
                      </h3>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50 mt-3">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{file.size}</span>
                      <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{file.updatedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredFiles.length === 0 && (
              <div className="py-20 text-center text-gray-400 font-black text-[10px] uppercase tracking-widest border-2 border-dashed rounded-[40px] border-gray-100 bg-gray-50/30">Nenhum ativo catalogado.</div>
            )}
          </div>
        )}
      </div>

      {previewFile && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex flex-col animate-in fade-in duration-300">
          <div className="flex justify-between items-center p-8 bg-white/5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-4 text-white">
              <span className="text-4xl">{getFileIconEmoji(previewFile.type)}</span>
              <div>
                <h3 className="font-black text-xl tracking-tighter">{previewFile.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Ativo Sync: {JOB_ID.split('-')[0]}</p>
              </div>
            </div>
            <button onClick={() => setPreviewFile(null)} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-red-500 transition-all group">
              <svg className="w-6 h-6 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 p-8">
            <div className="w-full h-full bg-white rounded-[40px] shadow-2xl overflow-hidden">
               <iframe src={previewFile.previewUrl} className="w-full h-full border-none" title="Ativo Preview"></iframe>
            </div>
          </div>
        </div>
      )}

      {showDriveModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xl rounded-[60px] p-16 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="flex items-center space-x-4 mb-10">
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">🔗</div>
               <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Sincronizar Drive</h3>
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6 px-2">Insira o link da pasta do Google Drive que contém os materiais comerciais.</p>
            <input 
              type="text" 
              value={inputLink} 
              onChange={(e) => setInputLink(e.target.value)} 
              placeholder="https://drive.google.com/drive/folders/..." 
              className="w-full bg-gray-50 border-2 border-transparent focus:border-black/5 focus:bg-white px-10 py-8 rounded-[36px] text-base font-bold text-gray-900 outline-none mb-10 shadow-inner transition-all" 
            />
            <button onClick={handleUpdateFolder} className="w-full py-8 bg-black text-white rounded-[36px] font-black text-sm uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-xl">Salvar e Atualizar</button>
            <button onClick={() => setShowDriveModal(false)} className="w-full mt-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fichario;
