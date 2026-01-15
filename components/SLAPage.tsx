
import React from 'react';

const SLAPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-32 pb-40 animate-in fade-in duration-1000 px-4">
      
      {/* HEADER */}
      <section className="pt-10 space-y-6">
        <div className="flex items-center space-x-3 mb-4">
          <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest">Acordo de Nível de Serviço</span>
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Marketing + Vendas</span>
        </div>
        <h1 className="text-7xl md:text-8xl font-black text-gray-900 tracking-tighter leading-none">
          SLA e<br/><span className="text-gray-200">Metas.</span>
        </h1>
        <p className="max-w-2xl text-gray-500 text-xl font-medium leading-relaxed">
          Onde o marketing entrega e o comercial converte. Aqui definimos quem é nosso cliente, como qualificamos e qual o ritmo de crescimento esperado.
        </p>
      </section>

      {/* PERSONA SECTION */}
      <section className="space-y-12">
        <div className="border-l-4 border-black pl-8">
           <h2 className="text-4xl font-black text-gray-900 tracking-tighter">O Cliente Ideal (Persona)</h2>
           <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Dono e Decisor Final</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="app-card p-10 bg-white space-y-6">
            <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Perfil Demográfico</h4>
            <ul className="space-y-4">
              {[
                { l: "Idade", v: "27~60 anos" },
                { l: "Gênero", v: "Homens em grande maioria" },
                { l: "Faturamento", v: "R$ 50k a R$ 1M+ / mês" },
                { l: "Cargo", v: "Diretor, Dono, Gerente Comercial" }
              ].map((item, i) => (
                <li key={i} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400 font-bold text-[11px] uppercase">{item.l}</span>
                  <span className="text-gray-900 font-black text-[13px]">{item.v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="app-card p-10 bg-gray-900 text-white space-y-6">
            <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Foco em Necessidade</h4>
            <p className="text-lg font-bold leading-relaxed italic">
              "Não tem tempo de aprofundar em entender marketing, e no fundo nem quer entender - ele só quer alguém que possa confiar de verdade."
            </p>
            <div className="pt-4 space-y-3">
              <div className="flex items-center space-x-3 text-[11px] font-bold text-gray-400 italic">
                <span>✓ Busca segurança no retorno</span>
              </div>
              <div className="flex items-center space-x-3 text-[11px] font-bold text-gray-400 italic">
                <span>✓ Quer relatórios de qualidade</span>
              </div>
            </div>
          </div>
        </div>

        {/* DORES E OBJEÇÕES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-red-50 rounded-[40px] border border-red-100">
             <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-6">Dores Principais</h4>
             <ul className="space-y-4 text-[13px] font-bold text-red-900/70">
                <li>• Cansado da montanha russa de vendas</li>
                <li>• Sem previsibilidade de aumento</li>
                <li>• Instabilidade e custo fixo alto</li>
                <li>• Depende apenas de indicações</li>
             </ul>
          </div>
          <div className="p-8 bg-green-50 rounded-[40px] border border-green-100">
             <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-6">Desejos</h4>
             <ul className="space-y-4 text-[13px] font-bold text-green-900/70">
                <li>• Liberdade financeira para investir</li>
                <li>• Tranquilidade ao deitar a cabeça</li>
                <li>• Faturamento garantido no próximo mês</li>
                <li>• Alta volume de leads qualificados</li>
             </ul>
          </div>
          <div className="p-8 bg-amber-50 rounded-[40px] border border-amber-100">
             <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-6">Objeções Comuns</h4>
             <ul className="space-y-4 text-[13px] font-bold text-amber-900/70">
                <li>• "Meu produto não é comum"</li>
                <li>• "Não acredito que funcione para mim"</li>
                <li>• "Não tenho dinheiro agora"</li>
                <li className="text-amber-600 font-black">• OBJEÇÃO OCULTA: O QUE DIFERENCIA VOCÊS DE UMA AGÊNCIA?</li>
             </ul>
          </div>
        </div>
      </section>

      {/* ANÁLISE DE OPORTUNIDADE (QUALIFICAÇÃO) */}
      <section className="space-y-12">
        <div className="border-l-4 border-black pl-8">
           <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Qualificação de Leads</h2>
           <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Critérios de Análise de Oportunidade</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 rounded-[50px] overflow-hidden border border-gray-100 shadow-2xl">
          {/* DESQUALIFICADO */}
          <div className="bg-white p-12 space-y-8 border-r border-gray-50">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 text-xl font-black">!</div>
            <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter">Desqualificado</h3>
            <ul className="space-y-4 text-xs font-bold text-gray-400">
              <li>• Faturamento abaixo de 50k/mês</li>
              <li>• Não é o dono ou decisor final</li>
              <li>• Perfil sem influência na empresa</li>
            </ul>
          </div>
          {/* ZONA CINZA */}
          <div className="bg-gray-50 p-12 space-y-8 border-r border-gray-50">
            <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-black">?</div>
            <h3 className="text-xl font-black text-gray-500 uppercase tracking-tighter">Zona Cinza</h3>
            <ul className="space-y-4 text-xs font-bold text-gray-500">
              <li>• Faturamento entre 50k e 90k</li>
              <li>• Diz que não tem lucro ou pró-labore</li>
              <li>• Sócio decisor não participará da call</li>
              <li>• Verba marketing abaixo de R$ 2.500</li>
            </ul>
          </div>
          {/* ALTO POTENCIAL */}
          <div className="bg-green-600 p-12 space-y-8 text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-black">★</div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Alto Potencial</h3>
            <ul className="space-y-4 text-xs font-bold text-white/80">
              <li>• Faturamento acima de 100k/mês</li>
              <li>• Todos os sócios na reunião</li>
              <li>• Possui lucro e pró-labore claro</li>
              <li>• Investimento marketing {'>'} R$ 2.500</li>
              <li>• Buyer journey selection ativa</li>
            </ul>
          </div>
        </div>
      </section>

      {/* REGRAS DE CONTRATAÇÃO */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
           <h2 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">Regras de<br/><span className="text-gray-300">Contratação.</span></h2>
           <div className="space-y-4">
              {[
                "Setup obrigatório para planejamento e contas.",
                "Não há exclusividade de segmento.",
                "Valor de tráfego pago NÃO incluso na mensalidade.",
                "Fidelidade mínima de 4 meses (Multa 10%).",
                "Aviso prévio de 30 dias após 5º mês."
              ].map((text, i) => (
                <div key={i} className="flex items-start space-x-3">
                   <span className="text-blue-600 font-black">→</span>
                   <p className="text-sm font-bold text-gray-600">{text}</p>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-white p-12 rounded-[50px] border border-gray-100 shadow-xl space-y-8">
           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Política de Pagamento</h4>
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl text-center">
                 <span className="block text-2xl mb-2">💳</span>
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Cartão</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl text-center">
                 <span className="block text-2xl mb-2">📄</span>
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Boleto</span>
              </div>
           </div>
           <p className="text-[11px] font-bold text-gray-400 leading-relaxed italic text-center">
              "Adimplência de parcelas é fator condicionante para entrega dos serviços."
           </p>
        </div>
      </section>

      {/* METAS E FUNIL */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">O Funil de Vendas</h2>
          <p className="text-[12px] font-black text-blue-500 uppercase tracking-[0.3em]">Conversão Base: 50% de Leads Qualificados</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              t: "Cenário 1: Meta", 
              leads: 50, qual: 25, calls: 12, deals: 5, 
              color: "bg-gray-100", text: "text-gray-900" 
            },
            { 
              t: "Cenário 2: Super Meta", 
              leads: 100, qual: 50, calls: 25, deals: 10, 
              color: "bg-blue-600", text: "text-white" 
            },
            { 
              t: "Cenário 3: Superação", 
              leads: 150, qual: 75, calls: 36, deals: 15, 
              color: "bg-black", text: "text-white" 
            }
          ].map((cen, i) => (
            <div key={i} className={`p-10 rounded-[50px] ${cen.color} ${cen.text} space-y-10 shadow-2xl flex flex-col`}>
               <h4 className="text-center text-[10px] font-black uppercase tracking-widest opacity-60">{cen.t}</h4>
               
               <div className="space-y-6 flex-1 flex flex-col justify-center">
                  <div className="text-center">
                     <span className="text-4xl font-black tracking-tighter">{cen.leads}</span>
                     <span className="block text-[9px] font-black uppercase tracking-widest opacity-40">Leads Gerados</span>
                  </div>
                  <div className="w-full h-px bg-current opacity-10"></div>
                  <div className="text-center">
                     <span className="text-4xl font-black tracking-tighter">{cen.qual}</span>
                     <span className="block text-[9px] font-black uppercase tracking-widest opacity-40">Leads Qualificados (50%)</span>
                  </div>
                  <div className="w-full h-px bg-current opacity-10"></div>
                  <div className="text-center">
                     <span className="text-4xl font-black tracking-tighter">{cen.calls}</span>
                     <span className="block text-[9px] font-black uppercase tracking-widest opacity-40">Reuniões Realizadas</span>
                  </div>
                  <div className="w-full h-px bg-current opacity-10"></div>
                  <div className="text-center scale-125">
                     <span className="text-5xl font-black tracking-tighter">{cen.deals}</span>
                     <span className="block text-[9px] font-black uppercase tracking-widest opacity-40">Clientes Fechados</span>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </section>

      {/* METAS POR ESTRATÉGIA */}
      <section className="bg-gray-50 rounded-[60px] p-12 md:p-24 space-y-12">
        <div className="flex justify-between items-end">
           <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Metas por Estratégia</h3>
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Distribuição de Volume</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
           {[
             { l: 'Inbound', v: '30 Leads', q: '15 Qualificados' },
             { l: 'Outbound', v: '30 Leads', q: '15 Qualificados' },
             { l: 'Indicação', v: '20 Leads', q: '10 Qualificados' },
             { l: 'Eventos', v: '20 Leads', q: '10 Qualificados' }
           ].map((st, i) => (
             <div key={i} className="space-y-2">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{st.l}</span>
                <div className="text-2xl font-black text-gray-900">{st.v}</div>
                <div className="text-[11px] font-bold text-gray-400 italic">{st.q}</div>
             </div>
           ))}
        </div>
      </section>

    </div>
  );
};

export default SLAPage;
