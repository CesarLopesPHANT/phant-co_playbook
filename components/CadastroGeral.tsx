
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CadastroRecord, CadastroWithStats, CadastroStatus, ProposalRecord, formatCurrency, formatCurrencyShort } from '../types';
import { SupabaseService } from '../services/api';

const STATUS_OPTIONS: CadastroStatus[] = ['LEAD', 'ATIVO', 'CLIENTE', 'INATIVO'];
const STATUS_COLORS: Record<string, string> = {
  LEAD: 'bg-amber-100 text-amber-700',
  ATIVO: 'bg-emerald-100 text-emerald-700',
  CLIENTE: 'bg-blue-100 text-blue-700',
  INATIVO: 'bg-gray-100 text-gray-400',
};

const FIELD_MAP: Record<string, keyof CadastroRecord> = {
  nome: 'nome', name: 'nome',
  email: 'email', 'e-mail': 'email',
  telefone: 'telefone', phone: 'telefone', tel: 'telefone', celular: 'telefone',
  empresa: 'empresa', company: 'empresa',
  cargo: 'cargo', role: 'cargo', position: 'cargo',
  segmento: 'segmento', segment: 'segmento', setor: 'segmento', industry: 'segmento',
  origem: 'origem', source: 'origem', origin: 'origem',
  status: 'status',
  observacoes: 'observacoes', obs: 'observacoes', notes: 'observacoes', observacao: 'observacoes',
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',' || ch === ';' || ch === '\t') { row.push(current.trim()); current = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(current.trim());
        if (row.some(c => c !== '')) rows.push(row);
        row = []; current = '';
      } else { current += ch; }
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

function mapHeaders(headers: string[]): (keyof CadastroRecord | null)[] {
  return headers.map(h => {
    const key = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    for (const [pattern, field] of Object.entries(FIELD_MAP)) {
      const norm = pattern.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (key === norm || key.includes(norm)) return field;
    }
    return null;
  });
}

const PAGE_SIZES = [25, 50, 100, 0]; // 0 = Todos

const CadastroGeral: React.FC = () => {
  const [records, setRecords] = useState<CadastroWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterSegmento, setFilterSegmento] = useState<string>('Todos');
  const [filterOrigem, setFilterOrigem] = useState<string>('Todos');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('Todos');
  const [sortField, setSortField] = useState<'nome' | 'created_at' | 'empresa' | 'valor_total'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<CadastroRecord> | null>(null);
  const [importPreview, setImportPreview] = useState<Partial<CadastroRecord>[] | null>(null);
  const [importStats, setImportStats] = useState<{ total: number; valid: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<CadastroWithStats | null>(null);
  const [detailProposals, setDetailProposals] = useState<ProposalRecord[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const data = await SupabaseService.fetchCadastroWithStats();
    setRecords(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // =================== KPI CALCULATIONS ===================

  const kpis = useMemo(() => {
    const total = records.length;
    const leads = records.filter(r => r.status === 'LEAD').length;
    const ativos = records.filter(r => r.status === 'ATIVO').length;
    const clientes = records.filter(r => r.status === 'CLIENTE').length;
    const valorTotal = records.reduce((acc, r) => acc + r.valor_total, 0);
    const valorAprovado = records.reduce((acc, r) => acc + r.valor_aprovado, 0);
    const taxaConversao = total > 0 ? Math.round((clientes / total) * 100) : 0;
    const ticketMedio = clientes > 0 ? valorAprovado / clientes : 0;
    return { total, leads, ativos, clientes, valorTotal, valorAprovado, taxaConversao, ticketMedio };
  }, [records]);

  // =================== FILTERS ===================

  const segmentos = useMemo(() => {
    const set = new Set(records.map(r => r.segmento).filter(Boolean));
    return ['Todos', ...Array.from(set).sort()];
  }, [records]);

  const origens = useMemo(() => {
    const set = new Set(records.map(r => r.origem).filter(Boolean));
    return ['Todos', ...Array.from(set).sort()];
  }, [records]);

  const empresas = useMemo(() => {
    const set = new Set(records.map(r => r.empresa).filter(Boolean));
    return ['Todos', ...Array.from(set).sort()];
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (filterStatus !== 'Todos') result = result.filter(r => r.status === filterStatus);
    if (filterSegmento !== 'Todos') result = result.filter(r => r.segmento === filterSegmento);
    if (filterOrigem !== 'Todos') result = result.filter(r => r.origem === filterOrigem);
    if (filterEmpresa !== 'Todos') result = result.filter(r => r.empresa === filterEmpresa);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => r.nome?.toLowerCase().includes(term) || r.email?.toLowerCase().includes(term) || r.empresa?.toLowerCase().includes(term) || r.telefone?.includes(term));
    }
    result.sort((a, b) => {
      if (sortField === 'valor_total') return sortAsc ? a.valor_total - b.valor_total : b.valor_total - a.valor_total;
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return result;
  }, [records, filterStatus, filterSegmento, filterOrigem, filterEmpresa, searchTerm, sortField, sortAsc]);

  // Pagination
  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = useMemo(() => {
    if (pageSize === 0) return filteredRecords;
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterSegmento, filterOrigem, filterEmpresa, searchTerm, pageSize]);

  // =================== HANDLERS ===================

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) { showToast('Arquivo vazio ou sem dados suficientes.'); return; }
      const mapped = mapHeaders(rows[0]);
      const parsed: Partial<CadastroRecord>[] = rows.slice(1).map(row => {
        const record: Partial<CadastroRecord> = { status: 'LEAD' };
        row.forEach((cell, idx) => {
          const field = mapped[idx];
          if (field && cell) {
            if (field === 'status') {
              const upper = cell.toUpperCase() as CadastroStatus;
              if (STATUS_OPTIONS.includes(upper)) record.status = upper;
            } else { (record as any)[field] = cell; }
          }
        });
        return record;
      }).filter(r => r.nome);
      setImportPreview(parsed);
      setImportStats({ total: rows.length - 1, valid: parsed.length });
    };
    reader.readAsText(file, 'UTF-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setIsSaving(true);
    const result = await SupabaseService.bulkInsertCadastro(importPreview);
    setIsSaving(false);
    if (result.success) { showToast(`${result.count} registros importados!`); setImportPreview(null); setImportStats(null); loadData(); }
    else { showToast(`Erro: ${result.message}`); }
  };

  const handleSaveRecord = async () => {
    if (!editingRecord?.nome) return;
    setIsSaving(true);
    const result = await SupabaseService.upsertCadastro(editingRecord);
    setIsSaving(false);
    if (result.success) { showToast(editingRecord.id ? 'Registro atualizado!' : 'Registro criado!'); setEditingRecord(null); loadData(); }
    else { showToast(`Erro: ${result.message}`); }
  };

  const handleDelete = async (id: string) => {
    const result = await SupabaseService.deleteCadastro(id);
    if (result.success) { showToast('Registro removido.'); loadData(); }
  };

  const openDetail = async (record: CadastroWithStats) => {
    setDetailRecord(record);
    const isFromClients = record.id?.startsWith('client_');
    if (record.id && record.total_propostas > 0 && !isFromClients) {
      setIsLoadingDetail(true);
      const proposals = await SupabaseService.fetchProposalsByCadastro(record.id);
      setDetailProposals(proposals);
      setIsLoadingDetail(false);
    } else { setDetailProposals([]); }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const activeFilters = [filterStatus, filterSegmento, filterOrigem, filterEmpresa].filter(f => f !== 'Todos').length;

  const getProposalStatusBadge = (status?: string) => {
    if (status === 'APPROVED') return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black uppercase rounded">Aprovada</span>;
    if (status === 'REJECTED') return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black uppercase rounded">Reprovada</span>;
    return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[8px] font-black uppercase rounded">Pendente</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-24 px-4 animate-in fade-in duration-700">
      {toast && <div className="fixed top-6 right-6 z-[200] bg-black text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-in slide-in-from-top duration-300">{toast}</div>}

      {/* HEADER */}
      <header className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter leading-none">Gestão de Clientes</h1>
            <p className="text-gray-400 text-lg font-medium tracking-tight mt-2">
              Base de contatos, leads e clientes
              <span className="ml-3 text-[10px] font-black bg-gray-100 text-gray-400 px-3 py-1 rounded-full uppercase tracking-widest">{records.length} registros</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} accept=".csv,.txt,.tsv" onChange={handleFileImport} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2.5 px-6 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-black hover:text-black transition-all shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Importar CSV
            </button>
            <button onClick={() => setEditingRecord({ status: 'LEAD' })} className="flex items-center gap-2.5 px-6 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg shadow-black/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Novo Registro
            </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Leads', value: kpis.leads, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
            { label: 'Ativos', value: kpis.ativos, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
            { label: 'Clientes', value: kpis.clientes, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
            { label: 'Conversão', value: `${kpis.taxaConversao}%`, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
            { label: 'Ticket Médio', value: formatCurrencyShort(kpis.ticketMedio), color: 'text-gray-900', bg: 'bg-gray-50 border-gray-100' },
          ].map((kpi, i) => (
            <div key={i} className={`p-5 rounded-[24px] border ${kpi.bg} space-y-1`}>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{kpi.label}</span>
              <p className={`text-2xl font-black tracking-tighter ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* SEARCH */}
        <div className="relative w-full md:w-96 group">
          <input type="text" placeholder="Buscar por nome, e-mail, empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm text-sm font-bold focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap gap-6">
          <div className="space-y-2">
            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Status</span>
            <div className="flex flex-wrap gap-2">
              {['Todos', ...STATUS_OPTIONS].map(opt => (
                <button key={opt} onClick={() => setFilterStatus(opt)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === opt ? 'bg-black text-white shadow-lg' : 'bg-white border border-gray-100 text-gray-400 hover:text-black hover:border-black/10'}`}>{opt}</button>
              ))}
            </div>
          </div>
          {segmentos.length > 1 && (
            <div className="space-y-2">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Segmento</span>
              <select value={filterSegmento} onChange={(e) => setFilterSegmento(e.target.value)} className="px-5 py-2.5 rounded-xl text-[11px] font-bold bg-white border border-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer">
                {segmentos.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {origens.length > 1 && (
            <div className="space-y-2">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Origem</span>
              <select value={filterOrigem} onChange={(e) => setFilterOrigem(e.target.value)} className="px-5 py-2.5 rounded-xl text-[11px] font-bold bg-white border border-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer">
                {origens.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          {empresas.length > 1 && (
            <div className="space-y-2">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Empresa</span>
              <select value={filterEmpresa} onChange={(e) => setFilterEmpresa(e.target.value)} className="px-5 py-2.5 rounded-xl text-[11px] font-bold bg-white border border-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer">
                {empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          )}
          {activeFilters > 0 && (
            <div className="flex items-end">
              <button onClick={() => { setFilterStatus('Todos'); setFilterSegmento('Todos'); setFilterOrigem('Todos'); setFilterEmpresa('Todos'); }} className="px-4 py-2.5 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors">Limpar filtros ({activeFilters})</button>
            </div>
          )}
        </div>
      </header>

      {/* TABLE */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Carregando cadastros...</span>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-black text-gray-400 tracking-tight">Nenhum registro encontrado</p>
            <p className="text-sm text-gray-300 font-medium">Importe um CSV ou adicione manualmente.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {[
                    { key: 'nome' as const, label: 'Nome' },
                    { key: null, label: 'Contato' },
                    { key: 'empresa' as const, label: 'Empresa' },
                    { key: null, label: 'Segmento' },
                    { key: null, label: 'Status' },
                    { key: null, label: 'Propostas' },
                    { key: 'valor_total' as const, label: 'Valor Total' },
                    { key: 'created_at' as const, label: 'Data' },
                    { key: null, label: '' },
                  ].map((col, i) => (
                    <th key={i} onClick={() => col.key && toggleSort(col.key)} className={`px-5 py-5 text-left text-[9px] font-black text-gray-300 uppercase tracking-widest ${col.key ? 'cursor-pointer hover:text-black transition-colors select-none' : ''}`}>
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.key && sortField === col.key && <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={sortAsc ? '' : 'rotate-180'}><path d="M12 5l-7 7h14l-7-7z" /></svg>}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map(record => (
                  <tr key={record.id} onClick={() => openDetail(record)} className="border-b border-gray-50/50 hover:bg-gray-50/50 transition-colors group cursor-pointer">
                    <td className="px-5 py-4">
                      <span className="text-sm font-black text-gray-900">{record.nome}</span>
                      {record.cargo && <span className="block text-[10px] text-gray-400 font-medium mt-0.5">{record.cargo}</span>}
                    </td>
                    <td className="px-5 py-4">
                      {record.email && <span className="block text-[11px] font-bold text-gray-500">{record.email}</span>}
                      {record.telefone && <span className="block text-[11px] font-bold text-gray-400">{record.telefone}</span>}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-bold text-gray-600">{record.empresa || '---'}</td>
                    <td className="px-5 py-4 text-[11px] font-bold text-gray-400">{record.segmento || '---'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[record.status] || STATUS_COLORS.LEAD}`}>{record.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      {record.total_propostas > 0 ? <span className="text-[11px] font-black text-blue-600">{record.total_propostas}</span> : <span className="text-[11px] font-bold text-gray-300">---</span>}
                    </td>
                    <td className="px-5 py-4">
                      {record.valor_total > 0 ? <span className="text-[11px] font-black text-gray-900">{formatCurrencyShort(record.valor_total)}</span> : <span className="text-[11px] font-bold text-gray-300">---</span>}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-bold text-gray-300">{record.created_at ? new Date(record.created_at).toLocaleDateString('pt-BR') : '---'}</td>
                    <td className="px-5 py-4">
                      {record.id?.startsWith('client_') ? (
                        <span className="text-[8px] font-black text-purple-500 bg-purple-50 px-2 py-1 rounded-lg uppercase tracking-widest">Gestão</span>
                      ) : (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setEditingRecord({ ...record }); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-black" title="Editar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); record.id && handleDelete(record.id); }} className="p-2 rounded-xl hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500" title="Excluir">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{filteredRecords.length} de {records.length} registros</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Exibir:</span>
                {PAGE_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${pageSize === size ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100'}`}
                  >
                    {size === 0 ? 'Todos' : size}
                  </button>
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Anterior
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = i + 1;
                  } else if (currentPage <= 4) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    page = totalPages - 6 + i;
                  } else {
                    page = currentPage - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === page ? 'bg-black text-white shadow-lg' : 'bg-white border border-gray-100 text-gray-400 hover:text-black hover:border-gray-300'}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Próxima →
                </button>
              </div>
            )}

            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Pipeline: {formatCurrencyShort(kpis.valorTotal)} | Aprovado: {formatCurrencyShort(kpis.valorAprovado)}</span>
          </div>
        </div>
      )}

      {/* =================== DETAIL DRAWER =================== */}
      {detailRecord && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-500 my-auto">
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white text-2xl font-black">{detailRecord.nome.charAt(0)}</div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{detailRecord.nome}</h2>
                    {detailRecord.empresa && <p className="text-sm font-bold text-gray-400 mt-1">{detailRecord.empresa}{detailRecord.cargo ? ` - ${detailRecord.cargo}` : ''}</p>}
                  </div>
                </div>
                <span className={`inline-block px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[detailRecord.status]}`}>{detailRecord.status}</span>
              </div>
              <button onClick={() => setDetailRecord(null)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {detailRecord.email && <div className="space-y-1"><span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">E-mail</span><p className="text-[11px] font-bold text-gray-600 break-all">{detailRecord.email}</p></div>}
              {detailRecord.telefone && <div className="space-y-1"><span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Telefone</span><p className="text-[11px] font-bold text-gray-600">{detailRecord.telefone}</p></div>}
              {detailRecord.segmento && <div className="space-y-1"><span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Segmento</span><p className="text-[11px] font-bold text-gray-600">{detailRecord.segmento}</p></div>}
              {detailRecord.origem && <div className="space-y-1"><span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Origem</span><p className="text-[11px] font-bold text-gray-600">{detailRecord.origem}</p></div>}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Propostas</span>
                <p className="text-2xl font-black text-gray-900">{detailRecord.total_propostas}</p>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Valor Pipeline</span>
                <p className="text-2xl font-black text-gray-900">{formatCurrencyShort(detailRecord.valor_total)}</p>
              </div>
              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Aprovado</span>
                <p className="text-2xl font-black text-emerald-700">{formatCurrencyShort(detailRecord.valor_aprovado)}</p>
              </div>
            </div>

            {detailRecord.observacoes && (
              <div className="mb-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block mb-2">Observações</span>
                <p className="text-[11px] font-medium text-amber-900/70 leading-relaxed">{detailRecord.observacoes}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Histórico de Propostas</h3>
              {isLoadingDetail ? (
                <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div></div>
              ) : detailProposals.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic py-6 text-center">Nenhuma proposta vinculada a este contato.</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {detailProposals.map(p => (
                    <div key={p.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-gray-900">{p.client_name}</span>
                          {getProposalStatusBadge(p.status)}
                        </div>
                        <span className="text-[9px] font-bold text-gray-400">{new Date(p.created_at).toLocaleDateString('pt-BR')} - {(p.items || []).length} itens</span>
                      </div>
                      <span className="text-sm font-black text-gray-900">{formatCurrency(p.total_value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              {detailRecord.id?.startsWith('client_') ? (
                <span className="px-6 py-3 text-[9px] font-black text-purple-500 uppercase tracking-widest">Origem: Gestão de Clientes</span>
              ) : (
                <button onClick={() => { setDetailRecord(null); setEditingRecord({ ...detailRecord }); }} className="px-6 py-3 rounded-2xl bg-gray-50 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">Editar</button>
              )}
              <button onClick={() => setDetailRecord(null)} className="px-6 py-3 rounded-2xl bg-black text-white font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg shadow-black/20">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* =================== IMPORT PREVIEW MODAL =================== */}
      {importPreview && importStats && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-500 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Pré-visualização da Importação</h2>
                <p className="text-sm text-gray-400 font-medium mt-2">
                  {importStats.valid} registros válidos de {importStats.total} linhas
                  {importStats.total - importStats.valid > 0 && <span className="text-amber-500 ml-2">({importStats.total - importStats.valid} ignorados - sem nome)</span>}
                </p>
              </div>
              <button onClick={() => { setImportPreview(null); setImportStats(null); }} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[9px] font-black text-gray-300 uppercase tracking-widest">Nome</th>
                  <th className="px-4 py-3 text-left text-[9px] font-black text-gray-300 uppercase tracking-widest">Email</th>
                  <th className="px-4 py-3 text-left text-[9px] font-black text-gray-300 uppercase tracking-widest">Empresa</th>
                  <th className="px-4 py-3 text-left text-[9px] font-black text-gray-300 uppercase tracking-widest">Status</th>
                </tr></thead>
                <tbody>
                  {importPreview.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-4 py-2 font-bold text-gray-900 text-[11px]">{r.nome}</td>
                      <td className="px-4 py-2 text-gray-500 text-[11px]">{r.email || '---'}</td>
                      <td className="px-4 py-2 text-gray-500 text-[11px]">{r.empresa || '---'}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${STATUS_COLORS[r.status || 'LEAD']}`}>{r.status || 'LEAD'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 50 && <p className="text-center text-[10px] font-bold text-gray-300 py-4">...e mais {importPreview.length - 50} registros</p>}
            </div>
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <button onClick={() => { setImportPreview(null); setImportStats(null); }} className="px-8 py-4 rounded-2xl bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">Cancelar</button>
              <button onClick={confirmImport} disabled={isSaving} className="px-8 py-4 rounded-2xl bg-black text-white font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg shadow-black/20 disabled:opacity-50">{isSaving ? 'Importando...' : `Importar ${importPreview.length} Registros`}</button>
            </div>
          </div>
        </div>
      )}

      {/* =================== EDIT / CREATE MODAL =================== */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{editingRecord.id ? 'Editar Registro' : 'Novo Registro'}</h2>
              <button onClick={() => setEditingRecord(null)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { key: 'nome', label: 'Nome *', placeholder: 'Nome completo' },
                { key: 'email', label: 'E-mail', placeholder: 'email@empresa.com' },
                { key: 'telefone', label: 'Telefone', placeholder: '(11) 99999-9999' },
                { key: 'empresa', label: 'Empresa', placeholder: 'Nome da empresa' },
                { key: 'cargo', label: 'Cargo', placeholder: 'Cargo / função' },
                { key: 'segmento', label: 'Segmento', placeholder: 'Ex: Tecnologia, Varejo...' },
                { key: 'origem', label: 'Origem', placeholder: 'Ex: Indicação, Site, LinkedIn...' },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{field.label}</label>
                  <input type="text" placeholder={field.placeholder} value={(editingRecord as any)[field.key] || ''} onChange={(e) => setEditingRecord({ ...editingRecord, [field.key]: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                <select value={editingRecord.status || 'LEAD'} onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as CadastroStatus })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Observações</label>
                <textarea placeholder="Notas sobre o contato..." value={editingRecord.observacoes || ''} onChange={(e) => setEditingRecord({ ...editingRecord, observacoes: e.target.value })} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <button onClick={() => setEditingRecord(null)} className="px-8 py-4 rounded-2xl bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">Cancelar</button>
              <button onClick={handleSaveRecord} disabled={isSaving || !editingRecord.nome} className="px-8 py-4 rounded-2xl bg-black text-white font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg shadow-black/20 disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastroGeral;
