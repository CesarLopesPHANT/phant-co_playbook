
import React, { useState, useEffect } from 'react';
import { PlaybookModule, UserRole, AppCustomization } from '../types';
import { AppIcon } from './Icons';
import { StorageService, AuthService } from '../services/api';

interface SidebarProps {
  modules: PlaybookModule[];
  selectedModuleId: string | null;
  onSelectModule: (id: string | null) => void;
  currentRole: UserRole;
  user?: any;
  appConfig?: AppCustomization;
}

const Sidebar: React.FC<SidebarProps> = ({ modules, selectedModuleId, onSelectModule, currentRole, user, appConfig }) => {
  const [isWorkspaceConnected, setIsWorkspaceConnected] = useState(false);
  const categories = ['SISTEMA', 'BASE', 'PRODUTIZACAO'];
  
  const filteredModules = modules.filter(m => m.permissions.includes(currentRole));
  const adminModule = filteredModules.find(m => m.id === 'admin');
  const otherModules = filteredModules.filter(m => m.id !== 'admin');

  useEffect(() => {
    const checkConnection = async () => {
      const link = await StorageService.getSavedDriveConfig();
      setIsWorkspaceConnected(!!link);
    };
    checkConnection();
    window.addEventListener('storage', checkConnection);
    return () => window.removeEventListener('storage', checkConnection);
  }, []);

  const profileImage = user?.user_metadata?.avatar_url || 
                       user?.user_metadata?.picture || 
                       `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`;
                       
  const profileName = user?.user_metadata?.full_name || 
                      user?.user_metadata?.name || 
                      'Vendedor';

  return (
    <div className="w-24 md:w-64 h-full bg-white border-r border-gray-100 flex flex-col transition-all">
      {/* USUÁRIO E LOGO */}
      <div className="p-8 space-y-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg shrink-0 overflow-hidden">
             {appConfig?.logoUrl ? (
               <img src={appConfig.logoUrl} alt="Logo" className="w-full h-full object-contain p-1 bg-white" />
             ) : (
               appConfig?.companyName.charAt(0) || 'P'
             )}
          </div>
          <div className="hidden md:block overflow-hidden">
            <span className="font-extrabold text-lg tracking-tight text-gray-900 block leading-none truncate">
              {appConfig?.companyName || 'PhantLab'}
            </span>
            <span className="text-[10px] font-bold text-gray-400 mt-1 block uppercase tracking-widest">Interface</span>
          </div>
        </div>

        {user && (
          <div className="hidden md:flex items-center space-x-3 p-3 bg-gray-50 rounded-[20px] border border-gray-100 group relative">
             <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                <img src={profileImage} alt="User" className="w-full h-full object-cover" />
             </div>
             <div className="overflow-hidden">
                <p className="text-[11px] font-black text-gray-900 truncate leading-none">{profileName}</p>
                <button 
                  onClick={() => AuthService.signOut()}
                  className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors mt-1"
                >
                  Sair do Sistema
                </button>
             </div>
          </div>
        )}
      </div>

      {/* MODULOS DINAMICOS */}
      <div className="flex-1 px-4 overflow-y-auto space-y-8 mt-4 custom-scrollbar">
        {categories.map(cat => {
          const catModules = otherModules.filter(m => m.category === cat);
          if (catModules.length === 0) return null;
          
          return (
            <div key={cat} className="space-y-1">
              <span className="hidden md:block text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] ml-4 mb-3">
                {cat === 'BASE' ? 'Fundamentos' : cat === 'PRODUTIZACAO' ? 'Ferramentas' : 'Geral'}
              </span>
              {catModules.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelectModule(m.id)}
                  className={`w-full flex items-center justify-center md:justify-start space-x-3.5 px-4 py-3 rounded-2xl transition-all group ${
                    selectedModuleId === m.id 
                      ? 'bg-black text-white shadow-lg'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900 hover:text-brand'
                  }`}
                >
                  <AppIcon name={m.icon || 'home'} size={18} className={selectedModuleId === m.id ? '' : 'group-hover:scale-110 transition-transform'} />
                  <span className="hidden md:block font-bold text-[13px]">{m.title}</span>
                </button>
              ))}
            </div>
          );
        })}

        {adminModule && (
          <div className="space-y-1 pt-4 border-t border-gray-50">
            <span className="hidden md:block text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] ml-4 mb-3">
              Administração
            </span>
            <button
              onClick={() => onSelectModule(adminModule.id)}
              className={`w-full flex items-center justify-center md:justify-start space-x-3.5 px-4 py-3 rounded-2xl transition-all group ${
                selectedModuleId === adminModule.id 
                  ? 'bg-brand text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900 hover:text-brand'
              }`}
            >
              <AppIcon name={adminModule.icon || 'settings'} size={18} className={selectedModuleId === adminModule.id ? '' : 'group-hover:scale-110 transition-transform'} />
              <span className="hidden md:block font-bold text-[13px]">{adminModule.title}</span>
            </button>
          </div>
        )}
      </div>

      {/* FOOTER - STATUS DA CONEXÃO */}
      <div className="p-4 border-t border-gray-50 mt-auto">
        <div className={`flex items-center justify-between p-3 rounded-2xl border ${isWorkspaceConnected ? 'bg-green-50/30 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
           <div className="flex items-center space-x-2">
              <div className="flex -space-x-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#4285F4]"></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-[#EA4335]"></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]"></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-[#34A853]"></div>
              </div>
              <span className="hidden md:block text-[9px] font-black text-gray-500 uppercase tracking-widest">Workspace</span>
           </div>
           <span className={`w-2 h-2 rounded-full ${isWorkspaceConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
