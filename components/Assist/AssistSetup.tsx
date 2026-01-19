
import React, { useState, useEffect } from 'react';
import { SPIN_SCRIPT_V1 } from '../../constants';
import { SupabaseService } from '../../services/api';
import { ScriptDefinition } from '../../types';

interface AssistSetupProps {
  onStart: (clientName: string, scriptDef: ScriptDefinition) => void;
}

const AssistSetup: React.FC<AssistSetupProps> = ({ onStart }) => {
  const [client, setClient] = useState('');
  const [isPermGranted, setIsPermGranted] = useState(false);
  const [availableScripts, setAvailableScripts] = useState<ScriptDefinition[]>([SPIN_SCRIPT_V1]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>(SPIN_SCRIPT_V1.id);

  useEffect(() => {
    // Carregar scripts do Fichário (arquivos que contenham 'Script' ou 'Roteiro')
    const loadFicharioScripts = async () => {
      try {
        const files = await SupabaseService.fetchFicharioFromDb();
        const scriptFiles = files.filter(f => {
            const n = f.nome.toLowerCase();
            return n.includes('script') || n.includes('roteiro') || n.includes('copiloto');
        });

        // Converte arquivos para definições de script (preservando estrutura base SPIN mas mudando nome)
        // Isso é necessário pois não lemos o conteúdo real do arquivo PDF/Doc
        const mappedScripts: ScriptDefinition[] = scriptFiles.map(f => ({
            ...SPIN_SCRIPT_V1,
            id: f.drive_file_id || String(f.id),
            name: f.nome,
            version: 'Fichário Link',
            description: `Arquivo vinculado do Fichário: ${f.formato}`
        }));

        setAvailableScripts([SPIN_SCRIPT_V1, ...mappedScripts]);
      } catch (err) {
        console.error("Erro ao carregar scripts do fichário", err);
      }
    };
    loadFicharioScripts();
  }, []);

  const requestMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsPermGranted(true);
    } catch (e) {
      alert("Precisamos do microfone para o Copiloto funcionar.");
    }
  };

  const currentScript = availableScripts.find(s => s.id === selectedScriptId) || SPIN_SCRIPT_V1;

  return (
    <div className="max-w-2xl mx-auto space-y-12 pt-20 animate-in zoom-in-95 duration-500">
      <div className="text-center space-y-4">
         <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl">
           🎙️
         </div>
         <h1 className="text-5xl font-black tracking-tighter">Copiloto Comercial</h1>
         <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Assistência em Tempo Real com IA</p>
      </div>

      <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl space-y-8">
         <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest pl-2">Nome do Cliente / Empresa</label>
            <input 
              value={client}
              onChange={e => setClient(e.target.value)}
              placeholder="Ex: ACME Corp"
              className="w-full bg-gray-50 p-5 rounded-2xl font-black text-xl outline-none focus:ring-2 focus:ring-black/5"
              autoFocus
            />
         </div>

         <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest pl-2">Selecione o Script</label>
            <div className="relative">
                <select 
                  value={selectedScriptId}
                  onChange={(e) => setSelectedScriptId(e.target.value)}
                  className="w-full bg-blue-50 border border-blue-100 p-5 rounded-2xl appearance-none font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-200"
                >
                    {availableScripts.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.version})</option>
                    ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
            
            <div className="pl-2">
                 <p className="text-[10px] font-bold text-blue-500/70">{currentScript.description}</p>
                 <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">Dica: Adicione arquivos com 'Script' no nome na pasta 'Scripts' do Fichário.</p>
            </div>
         </div>

         {!isPermGranted ? (
            <button 
              onClick={requestMic}
              className="w-full py-5 border-2 border-black border-dashed rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all"
            >
              Liberar Microfone
            </button>
         ) : (
            <button 
              onClick={() => { if(client) onStart(client, currentScript); }}
              disabled={!client}
              className="w-full py-5 bg-black text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              Iniciar Sessão
            </button>
         )}
      </div>
      
      <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-widest">
        O áudio é processado localmente e enviado para transcrição segura.
      </p>
    </div>
  );
};

export default AssistSetup;
