
import React from 'react';

const PlaybookGuide: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-24 pb-40 animate-in fade-in duration-1000 px-4">
      
      {/* HEADER EDITORIAL */}
      <section className="pt-10 space-y-6">
        <div className="flex items-center space-x-3 mb-4">
          <span className="px-3 py-1 bg-black text-white text-[9px] font-black rounded-full uppercase tracking-widest">Manual de Operação</span>
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">v1.0 • PhantLab</span>
        </div>
        <h1 className="text-7xl md:text-8xl font-black text-gray-900 tracking-tighter leading-none">
          O<br/><span className="text-gray-200">Playbook.</span>
        </h1>
        <p className="max-w-2xl text-gray-500 text-xl font-medium leading-relaxed">
          Este não é um arquivo estático. É o sistema vivo que garante que cada interação com o cliente seja estratégica, previsível e de alto impacto.
        </p>
      </section>

      {/* OS 3 PILARES DO USO */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {[
          { 
            t: "Consistência", 
            d: "Não inventamos a roda a cada venda. Usamos o método validado para garantir que a promessa da marca seja cumprida desde o primeiro contato.",
            i: "🎯"
          },
          { 
            t: "Agilidade", 
            d: "O tempo é o maior inimigo do fechamento. O Playbook automatiza o pensamento tático para que você foque na conexão humana.",
            i: "⚡"
          },
          { 
            t: "Inteligência", 
            d: "Cada script e cada produto aqui dentro foi desenhado por especialistas. Siga o fluxo, confie no processo.",
            i: "🧠"
          }
        ].map((item, i) => (
          <div key={i} className="app-card p-10 space-y-6 border-none bg-white shadow-xl hover:-translate-y-2 transition-all">
            <div className="text-4xl">{item.i}</div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{item.t}</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">{item.d}</p>
          </div>
        ))}
      </section>

      {/* FLUXO DE TRABALHO (STEPS) */}
      <section className="space-y-12">
        <div className="border-l-4 border-black pl-8">
           <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Fluxo de Trabalho</h2>
           <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Como utilizar este sistema no seu dia a dia</p>
        </div>

        <div className="space-y-4">
          {[
            { s: "01", t: "O Meu Dia", d: "Comece sempre pelo dashboard. Veja suas metas e recomendações da IA para o ritmo de hoje." },
            { s: "02", t: "Estudo de Caso", d: "Antes de uma reunião, acesse o Fichário. Encontre provas sociais e materiais que sustentam sua tese." },
            { s: "03", t: "Configuração de Oferta", d: "Use o Catálogo de Soluções para entender os diferenciais técnicos e o que oferecer para cada dor." },
            { s: "04", t: "Simulação Real-Time", d: "Durante ou após a call, use a Calculadora para gerar uma proposta visual e clara em segundos." },
            { s: "05", t: "Mentor de Vendas", d: "Surgiu uma dúvida ou objeção difícil? Chame a IA no canto da tela. Ela conhece nossa metodologia." }
          ].map((step, i) => (
            <div key={i} className="group flex items-center p-8 bg-white rounded-[32px] border border-gray-100 hover:border-black/10 hover:shadow-lg transition-all">
              <span className="text-5xl font-black text-gray-100 group-hover:text-black transition-colors mr-10">{step.s}</span>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-gray-900 tracking-tight">{step.t}</h4>
                <p className="text-gray-500 text-sm font-medium">{step.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DO'S AND DONT'S */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#00B884]/5 p-12 rounded-[50px] border border-[#00B884]/10 space-y-8">
          <h4 className="text-[11px] font-black text-[#00B884] uppercase tracking-[0.3em]">Cultura de Vitória (Do's)</h4>
          <ul className="space-y-6">
            {[
              "Atualizar o status de cada lead no CRM imediatamente.",
              "Utilizar a terminologia oficial da PhantLab (Direção, Propagação, Aceleração).",
              "Consultar o Mentor de IA para refinar e-mails e propostas.",
              "Colaborar com o time de CS enviando o diagnóstico completo."
            ].map((text, i) => (
              <li key={i} className="flex items-start space-x-4">
                <span className="text-[#00B884] font-black">✓</span>
                <span className="text-sm font-bold text-gray-700">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-red-50 p-12 rounded-[50px] border border-red-100 space-y-8">
          <h4 className="text-[11px] font-black text-red-500 uppercase tracking-[0.3em]">Zonas de Risco (Don'ts)</h4>
          <ul className="space-y-6">
            {[
              "Vender soluções que não estão no catálogo oficial sem aprovação.",
              "Ignorar o tempo de resposta (SLA) de novos leads.",
              "Prometer prazos de entrega que não condizem com a metodologia.",
              "Deixar de registrar objeções recorrentes para melhoria do Playbook."
            ].map((text, i) => (
              <li key={i} className="flex items-start space-x-4">
                <span className="text-red-500 font-black">×</span>
                <span className="text-sm font-bold text-gray-700">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="text-center py-24 bg-black rounded-[60px] text-white space-y-8">
        <h3 className="text-4xl font-black tracking-tighter">Pronto para o Próximo Nível?</h3>
        <p className="text-white/50 max-w-lg mx-auto font-medium">
          O domínio deste Playbook é o que separa um tirador de pedidos de um estrategista comercial PhantLab.
        </p>
        <div className="pt-4">
           <button className="px-12 py-5 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
             Marcar como Lido & Entendido
           </button>
        </div>
      </section>

    </div>
  );
};

export default PlaybookGuide;
