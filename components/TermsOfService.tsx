
import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-40 animate-in fade-in duration-1000 px-4">
      <header className="pt-10 space-y-6 text-center">
        <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Termos de Serviço</h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Acordo de Utilização do Sistema PhantLab</p>
      </header>

      <section className="bg-white p-12 rounded-[50px] border border-gray-100 shadow-xl space-y-12">
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 border-l-4 border-black pl-6 uppercase tracking-tighter">1. Aceitação dos Termos</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Ao acessar a Interface de Playbook Comercial da PhantLab, você concorda em cumprir estes termos de serviço. Este sistema é uma ferramenta de produtividade e inteligência comercial destinada ao uso profissional.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 border-l-4 border-black pl-6 uppercase tracking-tighter">2. Propriedade Intelectual</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Todo o conteúdo metodológico (Nossa Essência, SLA, Scripts e Lógica do Catálogo) é de propriedade intelectual exclusiva da PhantLab. O uso desta plataforma concede a você uma licença de uso comercial, sendo proibida a cópia, redistribuição ou venda de qualquer parte deste sistema para terceiros sem autorização expressa.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 border-l-4 border-black pl-6 uppercase tracking-tighter">3. Mentor de IA e Responsabilidade</h2>
          <div className="p-8 bg-amber-50 rounded-[40px] border border-amber-100 italic">
            <p className="text-amber-800 text-sm font-bold">
              As sugestões e táticas geradas pelo Mentor de IA são baseadas em modelos de linguagem avançados. A PhantLab não se responsabiliza por perdas financeiras ou decisões de negócio tomadas exclusivamente com base em respostas de IA. O discernimento humano do vendedor é soberano.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 border-l-4 border-black pl-6 uppercase tracking-tighter">4. Conduta do Usuário</h2>
          <ul className="space-y-4 text-sm font-medium text-gray-500">
            <li className="flex items-start gap-3">
              <span className="text-black font-black">•</span>
              Não utilizar o sistema para fins ilícitos ou abusivos.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-black font-black">•</span>
              Não tentar realizar engenharia reversa na arquitetura da interface.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-black font-black">•</span>
              Manter a confidencialidade das estratégias comerciais da empresa dentro do ambiente seguro.
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 border-l-4 border-black pl-6 uppercase tracking-tighter">5. Modificações</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            A PhantLab reserva-se o direito de atualizar e modificar a interface, os módulos e estes termos a qualquer momento para refletir melhorias no sistema ou mudanças na legislação vigente.
          </p>
        </div>
      </section>

      <footer className="text-center">
        <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">© 2023 PhantLab • Crescimento é Movimento Estratégico</p>
      </footer>
    </div>
  );
};

export default TermsOfService;
