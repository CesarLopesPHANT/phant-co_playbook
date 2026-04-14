
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlaybookModule, UserRole, SolutionItem, SolutionCategory, SolutionMaturity, ProposalItem, AppCustomization, formatCurrency } from '../types';
import { SupabaseService } from '../services/api';
import AdminSettings from './AdminSettings';
import SalesDashboard from './SalesDashboard';
import Fichario from './Fichario';
import ProposalSimulator from './ProposalSimulator';
import ProposalBuilder from './ProposalBuilder';
import NossaEssencia from './NossaEssencia';
import PlaybookGuide from './PlaybookGuide';
import SLAPage from './SLAPage';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import CopilotModule from './Assist/CopilotModule';
import ClientManagement from './ClientManagement';
import CadastroGeral from './CadastroGeral';
import MembersArea from './MembersArea';
import MyDay from './MyDay';

interface PlaybookEditorProps {
  module: PlaybookModule;
  currentRole: UserRole;
  onNavigateToModule?: (id: string) => void;
  appConfig: AppCustomization;
  userProfile?: any;
}

const PlaybookEditor: React.FC<PlaybookEditorProps> = ({ module, currentRole, onNavigateToModule, appConfig, userProfile }) => {
  const [selectedSolution, setSelectedSolution] = useState<SolutionItem | null>(null);
  const [catalogData, setCatalogData] = useState<SolutionItem[]>([]);
  const [addingToProposal, setAddingToProposal] = useState<string | number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubcategory, setActiveSubcategory] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [proposalCount, setProposalCount] = useState(0);

  useEffect(() => {
    const currentProposal = JSON.parse(localStorage.getItem('phant_current_proposal') || '[]');
    setProposalCount(currentProposal.length);
  }, []);

  const loadData = useCallback(async () => {
    if (module.id !== 'catalogo') return;
    setIsLoading(true);
    try {
      const cloudData = await SupabaseService.fetchSolutions();
      if (cloudData) setCatalogData(cloudData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [module.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const processedData = useMemo(() => {
    let filtered = [...catalogData];
    
    if (activeSubcategory !== 'Todos') {
      filtered = filtered.filter(item => item.subcategoria === activeSubcategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.solucao.toLowerCase().includes(term) || 
        item.promessa.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [catalogData, activeSubcategory, searchTerm]);

  const addToProposal = (item: SolutionItem) => {
    setAddingToProposal(item.id);
    const proposalItem: ProposalItem = {
      instanceId: `${item.id}-${Date.now()}`,
      solutionId: item.id,
      name: item.solucao,
      basePrice: item.valor_base_num || 0,
      selectedOptions: [],
      totalPrice: item.valor_base_num || 0,
      duration: item.duracao,
      description: item.descricao,
      deliverables: item.entregaveis || [],
      promessa: item.promessa,
      category: item.categoria,
      subCategory: item.subcategoria,
      maturity: item.maturidade,
      targetAudience: item.publico_alvo,
      expectedResult: item.resultado_esperado
    };
    const currentProposal = JSON.parse(localStorage.getItem('phant_current_proposal') || '[]');
    const nextProposal = [...currentProposal, proposalItem];
    localStorage.setItem('phant_current_proposal', JSON.stringify(nextProposal));
    setProposalCount(nextProposal.length);
    setTimeout(() => setAddingToProposal(null), 1000);
  };

  const getCategoryColor = (cat: SolutionCategory) => {
    if (cat === 'Direção') return 'bg-emerald-500';
    if (cat === 'Propagação') return 'bg-blue-500';
    if (cat === 'Aceleração') return 'bg-purple-600';
    return 'bg-gray-500';
  };

  // formatCurrency imported from types

  // RENDERIZAÇÃO ESPECIAL PARA O BUILDER (LAYOUT INTEGRADO)
  if (module.type === 'pdf_builder') {
    return (
      <div className="max-w-[1400px] mx-auto pb-20">
        <ProposalBuilder appConfig={appConfig} />
      </div>
    );
  }

  // MÓDULOS ESPECIAIS
  if (module.type === 'copilot') return <CopilotModule currentRole={currentRole} />;
  if (module.type === 'client_management') {
    const viewMap: Record<string, string> = {
      clientes_dashboard: 'dashboard',
      clientes_cadastro: 'cadastro',
      clientes_risco: 'risco',
      clientes_planning: 'planning',
      clientes_backlog: 'backlog'
    };
    return <ClientManagement currentRole={currentRole} initialView={(viewMap[module.id] || 'dashboard') as any} appConfig={appConfig} />;
  }
  if (module.type === 'admin') return <AdminSettings />;
  if (module.type === 'dashboard') return <MyDay currentRole={currentRole} userProfile={userProfile} onNavigate={onNavigateToModule} />;
  if (module.type === 'fichario') return <Fichario currentRole={currentRole} />;
  if (module.type === 'calculator') return <ProposalSimulator onNavigateToBuilder={() => onNavigateToModule?.('pdf_builder')} />;
  if (module.type === 'cadastro_geral') return <CadastroGeral />;
  if (module.type === 'learning_path') return <MembersArea currentRole={currentRole} userProfile={userProfile} />;
  
  // PÁGINAS ESTÁTICAS
  if (module.id === 'cultura') return <NossaEssencia currentRole={currentRole} />;
  if (module.id === 'playbook_guia') return <PlaybookGuide />;
  if (module.id === 'sla_metas') return <SLAPage />;
  if (module.id === 'privacy_policy') return <PrivacyPolicy />;
  if (module.id === 'terms_of_service') return <TermsOfService />;

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24 px-4 animate-in fade-in duration-700">
      <header className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-6xl font-black text-gray-900 tracking-tighter leading-none">{appConfig.companyName} Soluções</h1>
            <p className="text-gray-400 text-xl font-medium tracking-tight mt-2">Catálogo de Ativos {appConfig.companyName}</p>
          </div>
          
          <div className="relative w-full md:w-96 group">
            <input 
              type="text" 
              placeholder="Pesquisar soluções..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm text-sm font-bold focus:outline-none focus:ring-4 focus:ring-black/5 transition-all"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        {/* EXPLICAÇÃO DO MÉTODO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="p-8 bg-emerald-50/50 rounded-[32px] border border-emerald-100">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-3">Movimento 01</span>
              <h4 className="text-xl font-black text-emerald-900 tracking-tighter mb-2">Direção (Saber)</h4>
              <p className="text-[12px] font-medium text-emerald-700/70 leading-relaxed">Formação intelectual e alinhamento de tese. Onde definimos o rumo do empresário.</p>
           </div>
           <div className="p-8 bg-blue-50/50 rounded-[32px] border border-blue-100">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-3">Movimento 02</span>
              <h4 className="text-xl font-black text-blue-900 tracking-tighter mb-2">Propagação (Ter)</h4>
              <p className="text-[12px] font-medium text-blue-700/70 leading-relaxed">Ativos, canais e infraestrutura digital. A materialização da tese em ferramentas.</p>
           </div>
           <div className="p-8 bg-purple-50/50 rounded-[32px] border border-purple-100">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-3">Movimento 03</span>
              <h4 className="text-xl font-black text-purple-900 tracking-tighter mb-2">Aceleração (Executar)</h4>
              <p className="text-[12px] font-medium text-purple-700/70 leading-relaxed">Escala agressiva e monetização. Aplicação de IA e processos de conversão.</p>
           </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {['Todos', 'Marca & Cultura', 'Crescimento (Growth)', 'Tecnologia', 'Cursos & Mentorias'].map(sub => (
            <button
              key={sub}
              onClick={() => setActiveSubcategory(sub)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubcategory === sub ? 'bg-black text-white shadow-lg' : 'bg-white border border-gray-100 text-gray-400 hover:text-black hover:border-black/10'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
           <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
           <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sincronizando Catálogo...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {processedData.map((item) => (
            <div key={item.id} className="bg-white rounded-[40px] border border-gray-100 p-10 flex flex-col space-y-8 hover:shadow-2xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 -mr-8 -mt-8 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <span className={`px-4 py-1.5 ${getCategoryColor(item.categoria)} text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-black/5`}>
                  {item.categoria}
                </span>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{item.duracao}</span>
              </div>

              <div className="space-y-3 flex-1 relative z-10">
                <div className="flex items-center gap-2">
                   <span className="text-[8px] font-black text-brand bg-blue-50 px-2 py-0.5 rounded uppercase">{item.maturidade}</span>
                   <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">{item.subcategoria}</span>
                </div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tighter group-hover:text-brand transition-colors leading-tight">{item.solucao}</h3>
                <p className="text-gray-400 text-sm font-medium leading-relaxed line-clamp-3 italic">"{item.promessa}"</p>
              </div>

              <div className="pt-8 mt-auto border-t border-gray-50 flex flex-col space-y-6 relative z-10">
                 <div className="flex justify-between items-end">
                    <div>
                       <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Fee Mensal Estimado</span>
                       <span className="text-3xl font-black text-gray-900">{formatCurrency(item.valor_base_num)}</span>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setSelectedSolution(item)}
                      className="px-6 py-4 rounded-2xl bg-gray-50 text-gray-400 font-black text-[9px] uppercase tracking-widest hover:bg-black hover:text-white transition-all text-center"
                    >
                      FICHA TÉCNICA
                    </button>
                    <button 
                      onClick={() => addToProposal(item)} 
                      className={`px-6 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 shadow-xl ${
                        addingToProposal === item.id 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-105' 
                          : 'bg-black text-white shadow-black/20 hover:bg-gray-900 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {addingToProposal === item.id ? '✓ ADICIONADO' : '+ ADICIONAR'}
                    </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE FICHA TÉCNICA REFINADA */}
      {selectedSolution && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 overflow-y-auto">
           <div className="bg-white w-full max-w-4xl rounded-[60px] p-8 md:p-16 shadow-2xl relative animate-in zoom-in-95 duration-500 my-auto">
              <button 
                onClick={() => setSelectedSolution(null)}
                className="absolute top-10 right-10 w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                <div className="md:col-span-7 space-y-10">
                  <header className="space-y-4">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest ${getCategoryColor(selectedSolution.categoria)}`}>{selectedSolution.categoria}</span>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{selectedSolution.solucao}</h2>
                    <p className="text-xl font-bold text-gray-400 italic">"{selectedSolution.promessa}"</p>
                  </header>

                  <div className="space-y-8">
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Descrição da Entrega</h4>
                       <p className="text-sm text-gray-600 font-medium leading-relaxed">{selectedSolution.descricao || 'Detalhes técnicos em processamento...'}</p>
                    </div>

                    {selectedSolution.entregaveis && selectedSolution.entregaveis.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Cronograma / Fases</h4>
                        <div className="space-y-2">
                          {selectedSolution.entregaveis.map((task, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <span className="w-6 h-6 bg-black text-white rounded-lg flex items-center justify-center text-[9px] font-black">{i+1}</span>
                              <span className="text-xs font-bold text-gray-700">{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-5 space-y-10 bg-gray-50/50 p-8 rounded-[40px] border border-gray-100">
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Investimento Base</span>
                      <p className="text-3xl font-black text-gray-900">{formatCurrency(selectedSolution.valor_base_num)}</p>
                    </div>

                    {selectedSolution.variaveis_opcionais && selectedSolution.variaveis_opcionais.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Opcionais e Variáveis</h4>
                        <div className="space-y-2">
                          {selectedSolution.variaveis_opcionais.map((v, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                              <span className="text-[11px] font-bold text-gray-600">{v.label}</span>
                              <span className="text-[11px] font-black text-brand">{formatCurrency(v.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-8 bg-amber-50 rounded-[32px] border border-amber-100 italic">
                      <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">Dica de Venda</h4>
                      <p className="text-[11px] font-bold text-amber-900/70 leading-relaxed">"{selectedSolution.dica_venda || 'Foque no ROI imediato e na liberação de tempo do empresário.'}"</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => { addToProposal(selectedSolution); setSelectedSolution(null); }}
                    className="w-full py-6 bg-black text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-brand transition-all"
                  >
                    Adicionar à Proposta
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlaybookEditor;
