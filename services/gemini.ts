
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SolutionItem, AIConfig, StrategicMapItem, ProposalMetadata } from "../types";
import { SupabaseService } from "./api";

const getEnvVar = (key: string): string | undefined => {
  try {
    // Prioritize GEMINI_API_KEY as per guidelines
    if (key === 'GEMINI_API_KEY') return process.env.GEMINI_API_KEY;
    if (key === 'API_KEY') return process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[key];
    }
  } catch (e) {}
  return undefined;
};

const getAIInstance = async () => {
  // 1. Try to get from Database Config first (User-defined in UI)
  try {
    const appConfig = await SupabaseService.fetchAppConfig();
    if (appConfig?.config?.geminiApiKey) {
      return new GoogleGenAI({ apiKey: appConfig.config.geminiApiKey });
    }
  } catch (e) {
    console.warn("Could not fetch API key from database, falling back to env vars.");
  }

  // 2. Fallback to Environment Variables
  const apiKey = getEnvVar('GEMINI_API_KEY') || getEnvVar('API_KEY');
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please configure it in System Settings or Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getSalesMentorStream = async (userMessage: string, onChunk: (text: string) => void) => {
  try {
    const ai = await getAIInstance();
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
    onChunk("Desculpe, tive um problema ao processar sua solicitação.");
    return "";
  }
};

export const improveObservationText = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  try {
    const ai = await getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: `Você é o Redator-Chefe da PhantLab. Sua missão é transformar observações brutas em um texto executivo, persuasivo e elegante para uma proposta comercial de alto ticket.
        
        TEXTO BRUTO: "${text}"
        
        REQUISITOS:
        - Mantenha o tom profissional e autoritário.
        - Use verbos de ação e foque em resultados/valor.
        - Remova gírias ou termos informais.
        - Retorne APENAS o texto refinado, sem comentários adicionais.` }]
      },
      config: { 
        temperature: 0.3,
        systemInstruction: "Você é um especialista em copywriter para propostas comerciais de consultoria estratégica de elite."
      }
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Erro ao refinar texto:", error);
    return text;
  }
};

export const generateStrategicMapping = async (metadata: ProposalMetadata): Promise<StrategicMapItem[]> => {
  try {
    const ai = await getAIInstance();
    const prompt = `
      Você é um Consultor de Estratégia de Elite da PhantLab.
      Sua missão é analisar o cliente "${metadata.clientName}" do setor "${metadata.industry || 'não especificado'}".
      
      CONTEXTO DA REUNIÃO:
      - Dores Identificadas: ${metadata.meetingNotesPains || 'Não informadas'}
      - Desejos/Objetivos: ${metadata.meetingNotesDesires || 'Não informados'}
      - Website/Presença: ${metadata.website || 'N/A'}, ${metadata.instagram || 'N/A'}

      TAREFA:
      Crie um Mapeamento Estratégico de "Estado Atual" vs "Estado Desejado".
      O "Estado Atual" deve refletir os gargalos, ineficiências e dores reais.
      O "Estado Desejado" deve refletir a transformação estratégica, o novo patamar de autoridade e eficiência que a PhantLab entregará.
      
      REQUISITOS:
      - Seja extremamente profissional, executivo e persuasivo.
      - Use terminologia de alto nível (branding, posicionamento, escala, autoridade, ecossistema).
      - Retorne exatamente 4 pares estratégicos.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: "Você é o estrategista-chefe da PhantLab, especializado em transformar negócios comuns em marcas de elite e alta performance.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              current: { 
                type: Type.STRING,
                description: "Descrição detalhada e profissional do problema ou estado atual ineficiente."
              },
              desired: { 
                type: Type.STRING,
                description: "Descrição inspiradora e estratégica do estado futuro após a intervenção."
              }
            },
            required: ["current", "desired"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    // Limpeza básica caso o modelo retorne markdown
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro na geração estratégica:", error);
    return [];
  }
};

export const suggestSolutionDetails = async (productName: string): Promise<Partial<SolutionItem>> => {
  try {
    const ai = await getAIInstance();
    const savedConfig = await SupabaseService.fetchAIConfig();
    
    const instruction = savedConfig?.architectInstruction || "Você é o Arquiteto de Soluções Sênior da PhantLab. Sua missão é projetar os detalhes estratégicos de uma solução comercial de alto impacto.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Solução: ${productName}` }] },
      config: {
        systemInstruction: instruction + " Gere detalhes estratégicos e operacionais completos. Inclua promessa de valor, descrição executiva, público-alvo ideal, resultados esperados e entre 4 a 6 fases de cronograma técnico.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            promessa: { 
              type: Type.STRING,
              description: "Uma promessa de valor forte e impactante (Headline)."
            },
            descricao: { 
              type: Type.STRING,
              description: "Descrição executiva da solução focada em benefícios."
            },
            maturidade: { type: Type.STRING },
            publico_alvo: { type: Type.STRING },
            resultado_esperado: { type: Type.STRING },
            entregaveis: { 
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 4 a 6 fases sequenciais do cronograma de entrega técnica da PhantLab."
            }
          },
          required: ["promessa", "descricao", "maturidade", "publico_alvo", "resultado_esperado", "entregaveis"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro ao sugerir detalhes da solução:", error);
    return {};
  }
};

export const generateSolutionDeliverables = async (productName: string, description: string = ""): Promise<string[]> => {
  try {
    const ai = await getAIInstance();
    const savedConfig = await SupabaseService.fetchAIConfig();
    
    const instruction = savedConfig?.architectInstruction || "Você é o Gerente de Operações da PhantLab. Com base na solução comercial e descrição, gere uma lista de 4 a 8 FASES SEQUENCIAIS de implementação (cronograma de entrega de alto nível).";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Gere o cronograma estratégico para: ${productName}. Descrição: ${description}` }] },
      config: {
        systemInstruction: instruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.STRING,
            description: "Nome da fase ou entregável principal."
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Erro ao gerar entregáveis:", error);
    return [];
  }
};

export const parseBulkSolutions = async (raw: string) => {
  try {
    const ai = await getAIInstance();
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Extraia as soluções comerciais deste texto e retorne um array JSON com campos: solucao, promessa, descricao, categoria, subcategoria, duracao, maturidade, valor_base_num, publico_alvo, resultado_esperado. Texto: ${raw}` }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(res.text || "[]");
  } catch {
    return [];
  }
};
