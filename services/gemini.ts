
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SolutionItem, AIConfig, StrategicMapItem, ProposalMetadata } from "../types";
import { SupabaseService } from "./api";

// Safely access process.env
const getEnvVar = (key: string) => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    // ignore error
  }
  return undefined;
};

// Helper assíncrono para obter a instância com a chave correta
const getAIClient = async () => {
  const config = await SupabaseService.fetchAIConfig();
  // Prioriza a chave salva no banco, depois a variável de ambiente
  const apiKey = config?.apiKey || getEnvVar('API_KEY');
  
  if (!apiKey) {
    throw new Error("API_KEY não configurada. Por favor, adicione sua chave nas Configurações > Inteligência.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getSalesMentorStream = async (userMessage: string, onChunk: (text: string) => void) => {
  try {
    const ai = await getAIClient();
    const savedConfig = await SupabaseService.fetchAIConfig();
    
    const config = savedConfig || {
      systemInstruction: "Você é um Sales Manager experiente focado em fechamento de propostas de alto ticket.",
      temperature: 0.7,
      maxOutputTokens: 8000,
      thinkingBudget: 4000
    };

    // Ensure maxOutputTokens allows room for thinking + response
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
    if (error.message?.includes('API_KEY')) {
        onChunk("ERRO: Chave API não configurada. Vá em Administração > Inteligência e adicione sua chave do Google AI Studio.");
    } else if (error.name === 'AbortError' || error.message?.includes('aborted')) {
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
    const ai = await getAIClient();
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
    const ai = await getAIClient();
    const prompt = `
      Analise a empresa ${metadata.clientName} (${metadata.industry}).
      Website: ${metadata.website || 'Não informado'}
      Instagram: ${metadata.instagram || 'Não informado'}
      
      Notas da reunião (Dores): ${metadata.meetingNotesPains}
      Notas da reunião (Desejos): ${metadata.meetingNotesDesires}.
      
      Com base nessas informações e no seu conhecimento de mercado (Google Search), crie um Mapeamento Estratégico de "Estado Atual" (Dor/Problema) vs "Estado Desejado" (Solução/Benefício).
      Foque em problemas reais que essa empresa provavelmente enfrenta.
      
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
              current: { type: Type.STRING, description: "Descrição curta do problema atual" },
              desired: { type: Type.STRING, description: "Descrição curta do estado futuro resolvido" }
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
    const ai = await getAIClient();
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
    const ai = await getAIClient();
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
