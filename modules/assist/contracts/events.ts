
export type SpeakerType = 'seller' | 'client' | 'unknown';
export type SuggestionType = 'objection' | 'hint' | 'alert' | 'insight';

export interface TranscriptChunk {
  id: string;
  text: string;
  speaker: SpeakerType;
  isFinal: boolean;
  timestamp: number;
}

export interface ScriptStateEvent {
  phaseIndex: number;
  phaseId: string;
  checklist: Record<string, boolean>;
}

export interface SuggestionEvent {
  id: string;
  text: string;
  type: SuggestionType;
  timestamp: number;
}

export interface FinalScoreEvent {
  score_final: number;
  close_probability: number;
  summary: string;
  highlights: string[];
  next_steps: string[];
}

export interface AssistSessionState {
  sessionId: string | null;
  status: 'idle' | 'connecting' | 'active' | 'paused' | 'completed';
  transcript: TranscriptChunk[];
  currentPhaseIndex: number;
  checklist: Record<string, boolean>;
  suggestions: SuggestionEvent[];
}
