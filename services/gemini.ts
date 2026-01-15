
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
// Removed unused and non-existent ComparisonPair import from types
import { SolutionItem, AIConfig, StrategicMapItem, ProposalMetadata } from "../types";
import { SupabaseService } from "./api";

const getAIInstance = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSalesMentorStream = async (userMessage: string, onChunk: (text: string) => void) => {
  const ai = getAIInstance();
  const savedConfig = await SupabaseService.fetchAIConfig();
  const config = savedConfig || {
    systemInstruction: "Você é um Sales Manager experiente.",
    temperature: 0.8,
    maxOutputTokens: 6000,
    thinkingBudget: 4000
  };

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: userMessage,
      config: { 
        systemInstruction: config.systemInstruction, 
        temperature: config.temperature,
        maxOutputTokens: Math.max(config.maxOutputTokens, config.thinkingBudget + 2000),
        thinkingConfig: { thinkingBudget: config.thinkingBudget }
      },
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (error) {
    onChunk("Erro na conexão com IA.");
    return "";
  }
};

export const improveObservationText = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  const ai = getAIInstance();
  
  // Prompt estrito para evitar comentários da IA
  const prompt = `Você é um refinador de texto executivo de alto nível. 
  Sua tarefa é reescrever o texto de observações abaixo para uma proposta comercial, tornando-o mais profissional, persuasivo e conciso.
  
  REGRAS CRÍTICAS:
  1. Retorne APENAS o texto refinado.
  2. Não inclua introduções como "Aqui está o texto" ou "Sugestão:".
  3. Não forneça múltiplas opções.
  4. Não use aspas no início ou fim.
  5. Mantenha o sentido original e os dados técnicos se houver.

  Texto para refinar: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.1, // Menor temperatura para ser mais direto
      }
    });
    return response.text?.trim() || text;
  } catch {
    return text;
  }
};

export const generateStrategicMapping = async (metadata: ProposalMetadata): Promise<StrategicMapItem[]> => {
  const ai = getAIInstance();
  
  const prompt = `
    PESQUISE E ANALISE:
    Empresa: ${metadata.clientName}
    Setor: ${metadata.industry}
    Website: ${metadata.website || 'Não fornecido'}
    Instagram: ${metadata.instagram || 'Não fornecido'}
    
    CONTEXTO DA REUNIÃO (INPUT DO VENDEDOR):
    Dores Percebidas: ${metadata.meetingNotesPains || 'Não detalhado'}
    Desejos Percebidos: ${metadata.meetingNotesDesires || 'Não detalhado'}

    OBJETIVO:
    1. Utilize o Google Search para verificar a presença digital atual desta empresa.
    2. Tente identificar anúncios ativos (Meta Ad Library) ou lacunas no posicionamento do site.
    3. Crie um Mapeamento Estratégico de "Estado Atual (Dissonância)" vs "Estado Desejado (Clareza PhantLab)".
    4. Os pontos devem ser específicos para este cliente, unindo a pesquisa da IA com as notas do vendedor.
    
    RETORNE EXATAMENTE 4 PARES DE IMPACTO.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            current: { type: Type.STRING, description: "Cenário de dor/limitação encontrado na pesquisa ou notas" },
            desired: { type: Type.STRING, description: "Cenário de ganho e escala com a PhantLab" }
          },
          required: ["current", "desired"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch {
    return [];
  }
};

export const suggestSolutionDetails = async (productName: string): Promise<Partial<SolutionItem>> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Gere detalhes para: ${productName}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          promessa: { type: Type.STRING },
          descricao: { type: Type.STRING },
          maturidade: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const parseBulkSolutions = async (raw: string) => {
  const ai = getAIInstance();
  const res = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extraia soluções de: ${raw}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(res.text || "[]");
};
