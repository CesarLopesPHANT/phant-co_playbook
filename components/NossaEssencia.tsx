
import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../services/api';
import { UserRole } from '../types';

interface NossaEssenciaProps {
  currentRole?: UserRole;
}

const DEFAULT_DATA = {
  tese_titulo: "Movimento Estratégico.",
  tese_descricao: "A PhantLab adota a tese de que empresas só crescem quando alinham dono + direção + execução em um fluxo contínuo.",
  sentencas: [
    { t: "Quem não se move,", s: "perde.", i: "📉" },
    { t: "Quem se move errado,", s: "quebra.", i: "⚠️" },
    { t: "Quem se move com clareza,", s: "domina.", i: "👑" },
    { t: "O Crescimento", s: "é Movimento.", i: "🚀" }
  ],
  lema_titulo: "Não somos agência. Somos uma Plataforma.",
  lema_descricao: "Estruturada por método, produtos e inteligência aplicada à realidade do empresário. Nosso ecossistema existe para diagnosticar a estagnação e provocar movimento.",
  lema_passos: [
    { n: '01', t: 'Ler o cenário', d: 'Diagnóstico frio' },
    { n: '02', t: 'Provocar movimento', d: 'Saída da inércia' },
    { n: '03', t: 'Ajustar direção', d: 'Correção de rota' },
    { n: '04', t: 'Escalar o que funciona', d: 'Multiplicação' }
  ],
  movimentos: [
    { 
      id: 'direcao', 
      label: 'Direção', 
      subtitle: 'Área de Formação PHANT (Saber)',
      color: '#00B884', 
      desc: 'Onde o conhecimento se torna estratégia. Focada na formação intelectual do empresário, alinhamento de tese e clareza absoluta de rumo.',
      items: ['Mentalidade Estratégica', 'Tese de Crescimento', 'Formação de Liderança', 'Cultura de Performance']
    },
    { 
      id: 'propagacao', 
      label: 'Propagação', 
      subtitle: 'Área de Soluções PHANT (Ter)',
      color: '#0095FF', 
      desc: 'A materialização da tese em ativos reais. Onde o cliente adquire as ferramentas, canais e infraestrutura digital para sua mensagem.',
      items: ['Canais de Aquisição', 'Ativos Digitais (Ads/LP)', 'Branding & Posicionamento', 'Ecossistema de Conversão']
    },
    { 
      id: 'aceleracao', 
      label: 'Aceleração', 
      subtitle: 'Área de Escala e Monetização (Executar)',
      color: '#7C3AED', 
      desc: 'A execução agressiva do fluxo comercial. Onde a tecnologia, IA e processos são aplicados para converter movimento em lucro real.',
      items: ['Processo Comercial IA', 'Automação de Escala', 'Métricas de Growth', 'Recorrência & LTV']
    }
  ],
  ecossistema_areas: [
    { t: 'Marca & Cultura', d: 'Identidade e alinhamento do time.', i: '🎭' },
    { t: 'Crescimento (Growth)', d: 'Aquisição e canais de escala.', i: '📈' },
    { t: 'Tecnologia', d: 'IA, Automação e Sistemas.', i: '⚡' },
    { t: 'Cursos & Mentorias', d: 'Transferência de inteligência.', i: '🎓' }
  ],
  posicionamento_titulo: "Acima do Marketing, do Growth ou do Branding.",
  posicionamento_frase: "Uma nova categoria: Movimento Estratégico Empresarial."
};

const NossaEssencia: React.FC<NossaEssenciaProps> = ({ currentRole }) => {
  const [data, setData] = useState<any>(DEFAULT_DATA);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const cloudData = await SupabaseService.fetchEssencia();
      if (cloudData) {
        // Deep merge simples para garantir que novas chaves existam
        setData({
          ...DEFAULT_DATA,
          ...cloudData,
          sentencas: cloudData.sentencas || DEFAULT_DATA.sentencas,
          lema_passos: cloudData.lema_passos || DEFAULT_DATA.lema_passos,
          movimentos: cloudData.movimentos || DEFAULT_DATA.movimentos,
          ecossistema_areas: cloudData.ecossistema_areas || DEFAULT_DATA.ecossistema_areas
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await SupabaseService.syncEssencia(data);
    if (result.success) {
      setIsEditing(false);
    } else {
      alert("Erro ao salvar: " + result.message);
    }
    setIsSaving(false);
  };

  const updateField = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateNestedArray = (arrayField: string, index: number, field: string, value: any) => {
    const newArray = [...data[arrayField]];
    newArray[index] = { ...newArray[index], [field]: value };
    updateField(arrayField, newArray);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-40 text-center animate-pulse">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Carregando Essência...</p>
      </div>
    );
  }

  const EditableText = ({ 
    value, 
    onChange, 
    className = "", 
    multiline = false,
    tag: Tag = 'div' as any,
    style = {}
  }: any) => {
    if (!isEditing) return <Tag className={className} style={style}>{value}</Tag>;
    
    const inputClasses = `bg-blue-50/50 border-b-2 border-blue-200 focus:border-blue-500 focus:bg-white outline-none w-full transition-all text-inherit font-inherit ${className}`;
    
    return multiline ? (
      <textarea 
        value={value || ""} 
        onChange={e => onChange(e.target.value)} 
        className={inputClasses}
        rows={2}
        style={style}
      />
    ) : (
      <input 
        type="text" 
        value={value || ""} 
        onChange={e => onChange(e.target.value)} 
        className={inputClasses}
        style={style}
      />
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-32 pb-40 animate-in fade-in duration-1000 px-4 relative">
      
      {/* BOTÃO DE EDIÇÃO MASTER */}
      {currentRole === 'MASTER' && (
        <div className="fixed top-8 right-32 z-[80] flex items-center gap-3">
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 bg-gray-100 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-4 bg-black text-white rounded-2xl hover:scale-110 transition-all shadow-2xl flex items-center gap-3 group"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="hidden md:block text-[10px] font-black uppercase tracking-widest pr-2">Editar Fundamentos</span>
            </button>
          )}
        </div>
      )}

      {/* HERO SECTION - TESE FUNDADORA */}
      <section className="relative overflow-hidden pt-10">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#00B884]/5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] animate-pulse [animation-delay:2s]"></div>
        
        <div className="relative space-y-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-black text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            Princípio Inegociável
          </div>
          
          <div className="text-7xl md:text-9xl font-black text-gray-900 tracking-tighter leading-none">
            <EditableText 
              value={data.tese_titulo} 
              onChange={(v: string) => updateField('tese_titulo', v)} 
              tag="h1"
              multiline
            />
          </div>

          <div className="max-w-2xl mx-auto text-gray-500 text-lg md:text-xl font-medium leading-relaxed italic">
            <EditableText 
              value={data.tese_descricao} 
              onChange={(v: string) => updateField('tese_descricao', v)} 
              multiline
              tag="p"
            />
          </div>
        </div>

        {/* INFOGRÁFICO: AS 4 SENTENÇAS DO MOVIMENTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-24">
          {data.sentencas.map((item: any, i: number) => (
            <div key={i} className="p-8 rounded-[32px] border-2 border-gray-100 bg-white transition-all hover:scale-105 hover:border-black flex flex-col justify-center h-48 shadow-sm">
              <EditableText 
                value={item.t} 
                onChange={(v: string) => updateNestedArray('sentencas', i, 't', v)} 
                className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2"
                tag="span"
              />
              <EditableText 
                value={item.s} 
                onChange={(v: string) => updateNestedArray('sentencas', i, 's', v)} 
                className="text-3xl font-black tracking-tighter"
                tag="span"
              />
              <EditableText 
                value={item.i} 
                onChange={(v: string) => updateNestedArray('sentencas', i, 'i', v)} 
                className="mt-2 text-2xl"
                tag="span"
              />
            </div>
          ))}
        </div>
      </section>

      {/* LEMA DA PLATAFORMA */}
      <section className="bg-gray-900 rounded-[60px] p-12 md:p-24 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
           <svg viewBox="0 0 100 100" className="w-full h-full"><circle cx="100" cy="50" r="40" fill="white" fillOpacity="0.5" /></svg>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <span className="text-blue-400 font-black text-[12px] uppercase tracking-[0.4em]">O LEMA PhantLab</span>
            <EditableText 
              value={data.lema_titulo} 
              onChange={(v: string) => updateField('lema_titulo', v)} 
              className="text-5xl md:text-6xl font-black tracking-tighter leading-tight text-white"
              tag="h2"
              multiline
            />
            <EditableText 
              value={data.lema_descricao} 
              onChange={(v: string) => updateField('lema_descricao', v)} 
              multiline
              className="text-gray-400 text-lg leading-relaxed font-medium"
              tag="p"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             {data.lema_passos.map((f: any, i: number) => (
               <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[40px] hover:bg-white/10 transition-all">
                  <EditableText 
                    value={f.n} 
                    onChange={(v: string) => updateNestedArray('lema_passos', i, 'n', v)} 
                    className="text-blue-500 font-black text-[10px] uppercase mb-4 block"
                    tag="span"
                  />
                  <EditableText 
                    value={f.t} 
                    onChange={(v: string) => updateNestedArray('lema_passos', i, 't', v)} 
                    className="font-bold text-base mb-1 text-white"
                    tag="h4"
                  />
                  <EditableText 
                    value={f.d} 
                    onChange={(v: string) => updateNestedArray('lema_passos', i, 'd', v)} 
                    className="text-gray-500 text-[11px] font-medium uppercase tracking-widest"
                    tag="p"
                  />
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* MÉTODO PhantLab - OS 3 MOVIMENTOS */}
      <section className="space-y-20">
        <div className="text-center space-y-4">
          <h3 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">O Método PhantLab</h3>
          <p className="text-[12px] font-black text-blue-500 uppercase tracking-[0.3em]">3 Movimentos Contínuos e Integrados</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {data.movimentos.map((m: any, i: number) => (
            <div key={m.id} className="group flex flex-col">
              <div className="bg-white p-10 md:p-12 rounded-[50px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-700 h-full flex flex-col space-y-8 group-hover:-translate-y-4">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center text-white text-2xl font-black shadow-2xl transition-transform group-hover:scale-110`} style={{ backgroundColor: m.color }}>
                    {i + 1}
                  </div>
                  <div className="space-y-2 w-full">
                    <EditableText 
                      value={m.label} 
                      onChange={(v: string) => updateNestedArray('movimentos', i, 'label', v)} 
                      className="text-4xl font-black tracking-tighter w-full text-center"
                      style={{ color: m.color }}
                      tag="h4"
                    />
                    <EditableText 
                      value={m.subtitle} 
                      onChange={(v: string) => updateNestedArray('movimentos', i, 'subtitle', v)} 
                      className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-full text-center"
                      tag="span"
                    />
                  </div>
                  <EditableText 
                    value={m.desc} 
                    onChange={(v: string) => updateNestedArray('movimentos', i, 'desc', v)} 
                    multiline
                    className="text-gray-500 text-[15px] leading-relaxed font-medium text-center w-full"
                    tag="p"
                  />
                </div>

                <div className="pt-8 border-t border-gray-50 flex-1">
                  <ul className="space-y-4">
                    {m.items.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-3 group/li">
                        <div className="w-1.5 h-1.5 rounded-full transition-all group-hover/li:scale-150 shrink-0" style={{ backgroundColor: m.color }}></div>
                        <EditableText 
                          value={item} 
                          onChange={(v: string) => {
                            const newMovs = [...data.movimentos];
                            const newItems = [...newMovs[i].items];
                            newItems[idx] = v;
                            newMovs[i].items = newItems;
                            updateField('movimentos', newMovs);
                          }} 
                          className="text-[13px] font-bold text-gray-700 w-full"
                          tag="span"
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <div className={`w-full h-1.5 rounded-full bg-gray-50 overflow-hidden`}>
                    <div className="h-full transition-all duration-1000 group-hover:w-full w-1/3" style={{ backgroundColor: m.color }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ECOSSISTEMA E ÁREAS SATÉLITES */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
        <div className="lg:col-span-2 space-y-10">
          <div className="space-y-6">
            <h3 className="text-5xl font-black text-gray-900 tracking-tighter">O Ecossistema</h3>
            <p className="text-gray-500 font-medium text-lg leading-relaxed">
              Materializamos o método através de 4 áreas satélites que orbitam o núcleo do crescimento.
            </p>
          </div>
          
          <div className="p-8 bg-blue-50 border border-blue-100 rounded-[40px]">
            <span className="text-blue-600 font-black text-[10px] uppercase tracking-widest block mb-4">Núcleo Central: A LEI</span>
            <p className="text-blue-900 font-black text-2xl tracking-tighter leading-tight italic">
              "Crescimento é Movimento Estratégico."
            </p>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.ecossistema_areas.map((area: any, idx: number) => (
            <div key={idx} className="bg-white p-10 rounded-[40px] border border-gray-100 hover:border-black/5 hover:shadow-xl transition-all group">
              <EditableText 
                value={area.i} 
                onChange={(v: string) => updateNestedArray('ecossistema_areas', idx, 'i', v)} 
                className="text-4xl mb-6 group-hover:scale-125 transition-transform duration-500 inline-block"
                tag="div"
              />
              <EditableText 
                value={area.t} 
                onChange={(v: string) => updateNestedArray('ecossistema_areas', idx, 't', v)} 
                className="font-black text-xl mb-2 text-gray-900 tracking-tight"
                tag="h4"
              />
              <EditableText 
                value={area.d} 
                onChange={(v: string) => updateNestedArray('ecossistema_areas', idx, 'd', v)} 
                className="text-gray-400 text-sm font-medium"
                tag="p"
                multiline
              />
            </div>
          ))}
        </div>
      </section>

      {/* POSICIONAMENTO FINAL */}
      <section className="text-center py-20 bg-gray-50 rounded-[80px] border border-gray-100 space-y-12">
        <div className="space-y-4 px-8">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Novo Posicionamento PhantLab</span>
          <EditableText 
            value={data.posicionamento_titulo} 
            onChange={(v: string) => updateField('posicionamento_titulo', v)} 
            className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter max-w-4xl mx-auto leading-tight"
            tag="h3"
            multiline
          />
          <EditableText 
            value={data.posicionamento_frase} 
            onChange={(v: string) => updateField('posicionamento_frase', v)} 
            multiline
            className="text-gray-500 text-xl font-medium max-w-2xl mx-auto italic"
            tag="p"
          />
        </div>
        
        <div className="flex flex-col items-center gap-6">
           <div className="flex -space-x-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-14 h-14 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
                </div>
              ))}
           </div>
           <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Apoiando centenas de empresários em movimento.</p>
        </div>
      </section>
    </div>
  );
};

export default NossaEssencia;
