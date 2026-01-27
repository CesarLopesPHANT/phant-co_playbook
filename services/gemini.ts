
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SolutionItem, AIConfig, StrategicMapItem, ProposalMetadata } from "../types";
import { SupabaseService } from "./api";

const getAIInstance = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const getEffectiveConfig = async (): Promise<AIConfig> => {
  const saved = await SupabaseService.fetchAIConfig();
  return saved || {
    mentorInstruction: "Você é um Sales Manager experiente focado em fechamento de propostas de alto ticket.",
    mappingInstruction: "Você é um analista estratégico que cria mapeamentos de Estado Atual vs Estado Desejado para propostas comerciais.",
    suggesterInstruction: "Você é um especialista em produtos digitais que gera descrições técnicas e promessas de venda.",
    copilotInstruction: "Você é um copiloto de reuniões que analisa transcrições em tempo real para dar insights de fechamento.",
    temperature: 0.7,
    maxOutputTokens: 8000,
    thinkingBudget: 4000
  };
};

export const getSalesMentorStream = async (userMessage: string, onChunk: (text: string) => void) => {
  try {
    const ai = getAIInstance();
    const config = await getEffectiveConfig();
    const effectiveMaxTokens = Math.max(config.maxOutputTokens || 8000, (config.thinkingBudget || 0) + 4000);

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: userMessage }] },
      config: { 
        systemInstruction: config.mentorInstruction, 
        temperature: config.temperature,
        maxOutputTokens: effectiveMaxTokens,
        thinkingConfig: { thinkingBudget: config.thinkingBudget || 0 }
      },
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    onChunk("Desculpe, tive um problema ao processar sua solicitação.");
    return "";
  }
};

export const improveObservationText = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: `Você é um refinador de texto executivo. Reescreva o texto abaixo para uma proposta comercial, tornando-o profissional e persuasivo. Retorne APENAS o texto refinado.\n\nTexto: "${text}"` }]
      },
      config: { temperature: 0.2 }
    });
    return response.text?.trim() || text;
  } catch (error) {
    return text;
  }
};

export const generateStrategicMapping = async (metadata: ProposalMetadata): Promise<StrategicMapItem[]> => {
  try {
    const ai = getAIInstance();
    const config = await getEffectiveConfig();
    const prompt = `
      Analise a empresa ${metadata.clientName} (${metadata.industry}).
      Notas da reunião: Dores: ${metadata.meetingNotesPains}, Desejos: ${metadata.meetingNotesDesires}.
      
      Crie um Mapeamento Estratégico de "Estado Atual" vs "Estado Desejado".
      Retorne exatamente 4 pares de impacto em formato JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: config.mappingInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              current: { type: Type.STRING },
              desired: { type: Type.STRING }
            },
            required: ["current", "desired"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

export const suggestSolutionDetails = async (productName: string): Promise<Partial<SolutionItem>> => {
  try {
    const ai = getAIInstance();
    const config = await getEffectiveConfig();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Gere detalhes técnicos (promessa, descrição, maturidade e uma lista de entregas operacionais/tarefas para o time de operações) para a solução comercial: ${productName}` }] },
      config: {
        systemInstruction: config.suggesterInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            promessa: { type: Type.STRING },
            descricao: { type: Type.STRING },
            maturidade: { type: Type.STRING },
            entregaveis: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de tarefas/entregas técnicas (Ekyte Blueprint)"
            }
          },
          required: ["promessa", "descricao", "maturidade", "entregaveis"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch {
    return {};
  }
};

export const parseBulkSolutions = async (raw: string) => {
  try {
    const ai = getAIInstance();
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Extraia as soluções comerciais deste texto e retorne um array JSON: ${raw}` }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(res.text || "[]");
  } catch {
    return [];
  }
};
