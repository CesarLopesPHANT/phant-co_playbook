
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SolutionItem, AIConfig, StrategicMapItem, ProposalMetadata } from "../types";
import { SupabaseService } from "./api";

// Acesso seguro a variáveis de ambiente definido no vite.config.ts
const getEnvVar = (key: string): string | undefined => {
  try {
    if (key === 'API_KEY') return process.env.API_KEY;
    
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[key];
    }
  } catch (e) {
    // ignore error
  }
  return undefined;
};

const getAIInstance = () => {
  const apiKey = getEnvVar('API_KEY');
  if (!apiKey) {
    throw new Error("API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getSalesMentorStream = async (userMessage: string, onChunk: (text: string) => void) => {
  try {
    const ai = getAIInstance();
    const savedConfig = await SupabaseService.fetchAIConfig();
    
    const config = savedConfig || {
      systemInstruction: "Você é um Sales Manager experiente focado em fechamento de propostas de alto ticket.",
      temperature: 0.7,
      maxOutputTokens: 8000,
      thinkingBudget: 4000
    };

    const effectiveMaxTokens = Math.max(config.maxOutputTokens || 8000, (config.thinkingBudget || 0) + 4000);

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: { 
        parts: [{ text: userMessage }] 
      },
      config: { 
        systemInstruction: config.systemInstruction, 
        temperature: config.temperature,
        maxOutputTokens: effectiveMaxTokens,
        thinkingConfig: { 
          thinkingBudget: config.thinkingBudget || 0 
        }
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
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      onChunk("A conexão foi interrompida pelo servidor. Por favor, tente novamente.");
    } else {
      onChunk("Desculpe, tive um problema ao processar sua solicitação. Verifique sua conexão ou a chave API.");
    }
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
        parts: [{ text: `Você é um refinador de texto executivo de alto nível. Reescreva o texto abaixo para uma proposta comercial, tornando-o profissional e persuasivo. Retorne APENAS o texto refinado, sem comentários extras.\n\nTexto: "${text}"` }]
      },
      config: {
        temperature: 0.2,
      }
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Improve Text Error:", error);
    return text;
  }
};

export const generateStrategicMapping = async (metadata: ProposalMetadata): Promise<StrategicMapItem[]> => {
  try {
    const ai = getAIInstance();
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
        tools: [{ googleSearch: {} }],
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
    console.error("Strategic Mapping Error:", error);
    return [];
  }
};

export const suggestSolutionDetails = async (productName: string): Promise<Partial<SolutionItem>> => {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Gere detalhes técnicos (promessa, descrição, maturidade) para a solução comercial: ${productName}` }] },
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
