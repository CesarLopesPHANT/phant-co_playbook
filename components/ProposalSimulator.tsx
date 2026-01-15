
import React, { useState, useEffect } from 'react';
import { ProposalItem } from '../types';
import { GoogleApiService } from '../services/api';

interface ProposalSimulatorProps {
  onNavigateToBuilder?: () => void;
}

const ProposalSimulator: React.FC<ProposalSimulatorProps> = ({ onNavigateToBuilder }) => {
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('phant_current_proposal');
    if (saved) {
      setProposalItems(JSON.parse(saved));
    }
  }, []);

  const removeItem = (instanceId: string) => {
    const next = proposalItems.filter(item => item.instanceId !== instanceId);
    setProposalItems(next);
    localStorage.setItem('phant_current_proposal', JSON.stringify(next));
  };

  const clearProposal = () => {
    setProposalItems([]);
    localStorage.removeItem('phant_current_proposal');
  };

  const totalProposal = proposalItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSaveToDrive = async () => {
    if (proposalItems.length === 0) return;
    setIsSavingToDrive(true);
    
    try {
      const fileName = `Proposta_PhantLab_${new Date().toISOString().split('T')[0]}.txt`;
      let content = `PHANTLAB SALES PLAYBOOK - RESUMO DE PROPOSTA\n`;
      content += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
      content += `-------------------------------------------\n\n`;
      
      proposalItems.forEach((item, idx) => {
        content += `${idx + 1}. ${item.name} (${item.duration})\n`;
        content += `   Valor Base: ${formatCurrency(item.basePrice)}\n`;
        if (item.selectedOptions.length > 0) {
          content += `   Adicionais:\n`;
          item.selectedOptions.forEach(opt => {
            content += `     - ${opt.label}: ${formatCurrency(opt.valor)}\n`;
          });
        }
        content += `   Subtotal: ${formatCurrency(item.totalPrice)}\n\n`;
      });
      
      content += `-------------------------------------------\n`;
      content += `TOTAL DA PROPOSTA: ${formatCurrency(totalProposal)}\n`;
      content += `-------------------------------------------\n`;
      content += `Este documento é uma simulação gerada via PhantLab Interface.`;

      await GoogleApiService.uploadToDrive(fileName, content);
      alert("Sucesso! A proposta foi salva na raiz do seu Google Drive.");
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao salvar no Drive. Verifique suas permissões.");
    } finally {
      setIsSavingToDrive(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 px-4 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Simular Proposta</h1>
          <p className="text-gray-400 text-lg font-medium mt-2">Revise os itens e gere o orçamento comercial.</p>
        </div>
        {proposalItems.length > 0 && (
          <button onClick={clearProposal} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">Limpar Tudo</button>
        )}
      </header>

      {proposalItems.length === 0 ? (
        <div className="app-card p-20 flex flex-col items-center justify-center text-center space-y-6 border-dashed border-2">
          <div className="text-6xl">🛒</div>
          <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest">Sua proposta está vazia</h2>
          <p className="text-gray-400 max-w-xs">Adicione soluções do catálogo para começar a simular os valores.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {proposalItems.map((item) => (
              <div key={item.instanceId} className="app-card p-8 bg-white border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{item.name}</h3>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase">{item.duration}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.selectedOptions.map((opt, i) => (
                      <span key={i} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 italic">
                        + {opt.label} ({formatCurrency(opt.valor)})
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-[10px] font-black text-gray-300 uppercase block mb-1">Subtotal Item</span>
                    <span className="text-2xl font-black text-gray-900">{formatCurrency(item.totalPrice)}</span>
                  </div>
                  <button onClick={() => removeItem(item.instanceId)} className="p-3 text-gray-300 hover:text-red-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="app-card p-10 bg-black text-white flex flex-col md:flex-row justify-between items-center gap-10 shadow-2xl">
            <div className="text-center md:text-left">
              <span className="text-xs font-black text-white/40 uppercase tracking-[0.2em] block mb-2">Total da Proposta</span>
              <span className="text-6xl font-black tracking-tighter">{formatCurrency(totalProposal)}</span>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button 
                onClick={onNavigateToBuilder}
                className="w-full px-12 py-5 bg-blue-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
              >
                🚀 Gerar Proposta Executiva
              </button>
              <button 
                onClick={handleSaveToDrive}
                disabled={isSavingToDrive}
                className="w-full px-12 py-4 bg-white/10 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSavingToDrive ? 'Salvando...' : 'Backup no Drive (TXT)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalSimulator;
