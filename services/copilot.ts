
import { SupabaseService } from './api';
import { ScriptDefinition } from '../types';
import { SPIN_SCRIPT_V1 } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { TranscriptChunk, ScriptStateEvent, SuggestionEvent } from '../modules/assist/contracts/events';

// MOTOR LOCAL DE TRANSCRIÇÃO (Web Speech API)
class SpeechEngine {
  private recognition: any;
  private isListening: boolean = false;
  private onResult: (text: string, isFinal: boolean) => void;
  private onEnd: () => void;

  constructor(onResult: (text: string, isFinal: boolean) => void, onEnd: () => void) {
    this.onResult = onResult;
    this.onEnd = onEnd;

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'pt-BR';

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          this.onResult(transcript, isFinal);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try { this.recognition.start(); } catch {}
        } else {
          this.onEnd();
        }
      };
    } else {
      console.error("Web Speech API não suportada neste navegador.");
    }
  }

  start() {
    if (!this.recognition) return;
    this.isListening = true;
    try { this.recognition.start(); } catch (e) { console.error(e); }
  }

  stop() {
    if (!this.recognition) return;
    this.isListening = false;
    this.recognition.stop();
  }
}

// MOTOR DO COPILOTO
export class CopilotService {
  private script: ScriptDefinition;
  private speechEngine: SpeechEngine | null = null;
  private sessionId: string | null = null;
  private ai: GoogleGenAI;
  
  // State Callbacks (Updated to use Contracts)
  private onTranscriptUpdate: (segments: TranscriptChunk[]) => void;
  private onStateUpdate: (event: ScriptStateEvent) => void;
  private onSuggestion: (event: SuggestionEvent) => void;

  // State Data
  private currentTranscript: TranscriptChunk[] = [];
  private checklist: Record<string, boolean> = {};
  private currentPhaseIndex: number = 0;
  private fullTextBuffer: string = "";

  constructor(
    callbacks: {
      onTranscript: (t: TranscriptChunk[]) => void,
      onState: (e: ScriptStateEvent) => void,
      onSuggestion: (e: SuggestionEvent) => void
    }
  ) {
    this.script = SPIN_SCRIPT_V1; // Default
    this.onTranscriptUpdate = callbacks.onTranscript;
    this.onStateUpdate = callbacks.onState;
    this.onSuggestion = callbacks.onSuggestion;
    
    // Config Gemini using process.env.API_KEY directly
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public setScript(script: ScriptDefinition) {
    this.script = script;
  }

  async startSession(clientName: string): Promise<string> {
    try {
      const session = await SupabaseService.createAssistSession(clientName, this.script.id, this.script.version);
      
      if (!session) {
         throw new Error("Sessão retornou nula sem erro explícito.");
      }
      
      this.sessionId = session.id;
      this.currentTranscript = [];
      this.checklist = {};
      this.currentPhaseIndex = 0;
      this.fullTextBuffer = "";

      this.speechEngine = new SpeechEngine(
        (text, isFinal) => this.handleAudioInput(text, isFinal),
        () => console.log("Mic stopped")
      );
      
      this.speechEngine.start();
      
      // Emit initial state
      this.emitStateUpdate();

      return this.sessionId;
    } catch (e: any) {
      console.error("Erro Crítico no Copiloto:", e);
      const msg = e.message || String(e);
      if (msg.includes("relation") && msg.includes("does not exist")) {
        alert("Erro de Configuração: As tabelas do Copiloto não existem no Supabase. Por favor, rode o script SQL 'setup.sql' no painel do banco de dados.");
      } else {
        alert(`Não foi possível iniciar a sessão: ${msg}`);
      }
      throw e;
    }
  }

  async stopSession() {
    this.speechEngine?.stop();
    if (this.sessionId) {
      await SupabaseService.endAssistSession(this.sessionId);
      await this.generateFinalScore();
    }
  }

  private handleAudioInput(text: string, isFinal: boolean) {
    const now = Date.now();
    
    const lastSeg = this.currentTranscript[this.currentTranscript.length - 1];
    if (lastSeg && !lastSeg.isFinal) {
      lastSeg.text = text;
      lastSeg.isFinal = isFinal;
    } else {
      this.currentTranscript.push({
        id: `seg-${now}`,
        speaker: 'unknown',
        text: text,
        timestamp: now,
        isFinal: isFinal
      });
    }
    
    this.onTranscriptUpdate([...this.currentTranscript]);

    if (isFinal) {
      this.fullTextBuffer += " " + text;
      this.saveTranscriptChunk(text);
      this.analyzeLogic(text);
    }
  }

  private async saveTranscriptChunk(text: string) {
    if (this.sessionId) {
      await SupabaseService.saveTranscript(this.sessionId, text, 'unknown');
    }
  }

  // --- MOTOR DE REGRAS ---
  private analyzeLogic(text: string) {
    const phase = this.script.phases[this.currentPhaseIndex];
    if (!phase) return;

    const lowerText = text.toLowerCase();

    // 1. Verifica Keywords da Fase Atual
    let keywordsFound = 0;
    phase.required_keywords.forEach(kw => {
      if (lowerText.includes(kw.toLowerCase())) keywordsFound++;
    });

    // 2. Heurística de Checklist (Simulada)
    if (phase.id === 'abertura' && (lowerText.includes('tempo') || lowerText.includes('45'))) {
       this.checkItem('1'); 
    }
    if (phase.id === 'situacao' && (lowerText.includes('faturamento') || lowerText.includes('hoje'))) {
       this.checkItem('0');
    }

    // 3. Sugestões baseadas em Objeções
    if (lowerText.includes('caro') || lowerText.includes('preço')) {
       this.emitSuggestion("🚨 Objeção de Preço! Ancore o valor no ROI: 'Quanto custa NÃO resolver isso?'", 'objection');
    }
    if (lowerText.includes('falar com sócio') || lowerText.includes('decidir sozinho')) {
       this.emitSuggestion("⚠️ Decisor ausente? Tente reagendar com todos ou grave a call.", 'alert');
    }
  }

  private emitSuggestion(text: string, type: 'objection' | 'hint' | 'alert' | 'insight') {
    this.onSuggestion({
      id: `sug-${Date.now()}`,
      text,
      type,
      timestamp: Date.now()
    });
  }

  private emitStateUpdate() {
    const phase = this.script.phases[this.currentPhaseIndex];
    this.onStateUpdate({
      phaseIndex: this.currentPhaseIndex,
      phaseId: phase ? phase.id : 'unknown',
      checklist: { ...this.checklist }
    });
  }

  public checkItem(checkIdx: string) {
    const key = `${this.script.phases[this.currentPhaseIndex].id}_${checkIdx}`;
    this.checklist[key] = !this.checklist[key];
    this.emitStateUpdate();
  }

  public nextPhase() {
    if (this.currentPhaseIndex < this.script.phases.length - 1) {
      this.currentPhaseIndex++;
      this.emitStateUpdate();
    }
  }

  public prevPhase() {
    if (this.currentPhaseIndex > 0) {
      this.currentPhaseIndex--;
      this.emitStateUpdate();
    }
  }

  // --- INTELIGÊNCIA FINAL (GEMINI) ---
  private async generateFinalScore() {
    if (!this.ai || !this.sessionId) return;

    try {
      const prompt = `
        Analise esta transcrição de venda SPIN Selling e gere um JSON.
        Script: ${this.script.name}
        Transcrição: "${this.fullTextBuffer.substring(0, 8000)}" ... (truncado)

        JSON schema:
        {
          "score_final": number (0-10),
          "close_probability": number (0-100),
          "summary": string,
          "highlights": string[],
          "next_steps": string[]
        }
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: "application/json" }
      });

      // Access .text property directly
      const result = JSON.parse(response.text || "{}");
      
      await SupabaseService.saveAssistScore(this.sessionId, result);

    } catch (e) {
      console.error("Erro ao gerar score IA:", e);
    }
  }
}
