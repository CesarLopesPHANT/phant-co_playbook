
import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-40 animate-in fade-in duration-1000 px-4">
      <header className="pt-10 space-y-6 text-center">
        <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Política de Privacidade</h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Última atualização: Outubro 2023</p>
      </header>

      <section className="bg-white p-12 rounded-[50px] border border-gray-100 shadow-xl space-y-12">
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 border-l-4 border-blue-600 pl-6 uppercase tracking-tighter">1. Coleta de Dados</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Coletamos informações básicas para o funcionamento do seu acesso ao Playbook Comercial, incluindo seu nome, e-mail e foto de perfil através da integração com o Google Auth e Supabase. Estes dados são utilizados estritamente para identificação do usuário e personalização da interface.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 border-l-4 border-blue-600 pl-6 uppercase tracking-tighter">2. Integrações com Terceiros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="font-black text-sm mb-3">Google Workspace</h3>
              <p className="text-[13px] text-gray-400 leading-relaxed">
                Utilizamos permissões para acessar sua Agenda e Drive apenas para exibir seus compromissos comerciais e gerenciar arquivos do Fichário. Não alteramos ou deletamos dados sem sua ação direta.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="font-black text-sm mb-3">Google Gemini AI</h3>
              <p className="text-[13px] text-gray-400 leading-relaxed">
                Interações com o Mentor de Vendas são processadas via API do Google Gemini. Dados enviados à IA são transitórios e usados apenas para gerar a resposta tática solicitada.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 border-l-4 border-blue-600 pl-6 uppercase tracking-tighter">3. Armazenamento e Segurança</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Seus dados e configurações do Playbook (Catálogo, Propostas Salvas, SLA) são armazenados de forma criptografada no Supabase. Utilizamos protocolos de segurança modernos (TLS/SSL) para garantir que sua estratégia comercial permaneça privada e protegida.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 border-l-4 border-blue-600 pl-6 uppercase tracking-tighter">4. Seus Direitos</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Como usuário, você tem total direito de solicitar a exclusão de sua conta e de todos os dados associados a qualquer momento através do e-mail de suporte da PhantLab ou via painel administrativo se for um perfil MASTER.
          </p>
        </div>
      </section>

      <footer className="text-center">
        <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">PhantLab Interface • Governança e Transparência</p>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
