
import React, { useState, useEffect, useRef } from 'react';
import { ProposalItem, StrategicMapItem, ProposalMetadata, SolutionItem, ProposalRecord, AppCustomization, ProposalSections } from '../types';
import { generateStrategicMapping, improveObservationText } from '../services/gemini';
import { SupabaseService } from '../services/api';
import ProposalPresentation from './ProposalPresentation';

interface ProposalBuilderProps {
  appConfig: AppCustomization;
}

const PhantPattern = () => (
  <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none opacity-[0.03]">
    <pattern id="phant-text" x="0" y="0" width="200" height="100" patternUnits="userSpaceOnUse">
      <text x="10" y="60" fontFamily="Inter" fontWeight="900" fontSize="40" fill="currentColor">PHANT</text>
    </pattern>
    <rect width="100%" height="100%" fill="url(#phant-text)" />
  </svg>
);

const ProposalBuilder: React.FC<ProposalBuilderProps> = ({ appConfig }) => {
  // --- STATE MANAGEMENT ---
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [strategicMap, setStrategicMap] = useState<StrategicMapItem[]>([]);
  const [catalog, setCatalog] = useState<SolutionItem[]>([]);
  const [proposalHistory, setProposalHistory] = useState<ProposalRecord[]>([]);
  
  // Controle de Seções Ativas
  const [selectedSections, setSelectedSections] = useState<ProposalSections>({
    cover: true,
    strategicMap: true,
    tacticalScope: true,
    finalInvestment: true,
    backCover: true
  });
  
  const [metadata, setMetadata] = useState<ProposalMetadata>({
    clientName: '',
    industry: '',
    website: '',
    instagram: '',
    meetingNotesPains: '',
    meetingNotesDesires: '',
    observations: '',
    date: new Date().toLocaleDateString('pt-BR'),
    consultant: 'Estrategista PhantLab',
    headline: 'PROPOSTA DE MOVIMENTO ESTRATÉGICO',
    discountValue: 0,
    discountType: 'fixed'
  });
  
  // UI States
  const [isPreviewReady, setIsPreviewReady] = useState(false); // LAZY RENDERING STATE
  const [activeTab, setActiveTab] = useState<'info' | 'solutions' | 'mapping' | 'history'>('info');
  const [zoom, setZoom] = useState(0.5); // Default ajustado para caber melhor
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Removed showPresentation state as we now use new tab
  
  // Async Process States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isImprovingText, setIsImprovingText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Data Loading
    const saved = localStorage.getItem('phant_current_proposal');
    if (saved) setProposalItems(JSON.parse(saved));
    SupabaseService.fetchSolutions().then(data => setCatalog(data || []));
    loadHistory();

    // 2. LAZY RENDERING TRIGGER
    // Wait for the parent layout (flexbox) to settle before rendering the heavy PDF DOM
    // This prevents "width(-1)" errors in console from libraries trying to measure 0-size elements
    const timer = setTimeout(() => {
      setIsPreviewReady(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const loadHistory = async () => {
    const history = await SupabaseService.fetchProposalsHistory();
    setProposalHistory(history || []);
  };

  // --- CALCULATIONS ---
  const subtotal = proposalItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
  
  const discountAmount = (() => {
    if (!metadata.discountValue || metadata.discountValue <= 0) return 0;
    if (metadata.discountType === 'percentage') {
        return subtotal * (metadata.discountValue / 100);
    }
    return metadata.discountValue;
  })();

  const finalTotal = Math.max(subtotal - discountAmount, 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- AI & LOGIC HANDLERS ---
  const handleGenerateAI = async () => {
    if (!metadata.clientName) {
      showError("O nome do cliente é obrigatório para análise.");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const mapping = await generateStrategicMapping(metadata);
      setStrategicMap(mapping || []);
      setActiveTab('mapping');
      // Força ativação da seção se gerar mapa
      setSelectedSections(prev => ({...prev, strategicMap: true}));
    } catch (err) {
      console.error(err);
      showError("A pesquisa da IA falhou.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleImproveText = async () => {
    if (!metadata.observations?.trim() || isImprovingText) return;
    setIsImprovingText(true);
    try {
      const