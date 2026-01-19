
import React, { useState, useEffect } from 'react';
import { ScriptDefinition, UserRole } from '../../types';
import AssistSetup from './AssistSetup';
import AssistLive from './AssistLive';
import { CopilotService } from '../../services/copilot';

interface CopilotModuleProps {
  currentRole: UserRole;
}

type ViewMode = 'setup' | 'live' | 'summary';

const CopilotModule: React.FC<CopilotModuleProps> = ({ currentRole }) => {
  const [mode, setMode] = useState<ViewMode>('setup');
  const [clientName, setClientName] = useState('');
  const [selectedScript, setSelectedScript] = useState<ScriptDefinition | null>(null);
  const [service, setService] = useState<CopilotService | null>(null);

  const startSession = async (client: string, scriptDef: ScriptDefinition) => {
    setClientName(client);
    setSelectedScript(scriptDef);
    setMode('live');
  };

  const endSession = () => {
    service?.stopSession();
    setMode('summary');
  };

  if (mode === 'setup') {
    return <AssistSetup onStart={startSession} />;
  }

  if (mode === 'live') {
    return (
      <AssistLive 
        clientName={clientName} 
        scriptDefinition={selectedScript}
        onEnd={endSession} 
        onMountService={setService} 
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] space-y-8 animate-in fade-in duration-500">
       <div className="w-24 h-24 bg-green-500 text-white rounded-[40px] flex items-center justify-center text-4xl shadow-2xl">
         ✓
       </div>
       <div className="text-center space-y-2">
         <h2 className="text-4xl font-black tracking-tighter">Sessão Finalizada</h2>
         <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Os dados foram salvos e a IA está calculando o score.</p>
       </div>
       <button onClick={() => setMode('setup')} className="px-10 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest">Nova Sessão</button>
    </div>
  );
};

export default CopilotModule;
