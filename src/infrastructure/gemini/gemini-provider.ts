import { AIProviderError } from "@/lib/errors/application-errors";
import { getServerEnv } from "@/lib/env/server-env";
import {
  aiCollectionInsightsSchema,
  assistantPlanSchema,
  geminiImageIdentificationSchema,
} from "@/schemas/ai-schemas";
import type { AICollectionInsights } from "@/domain/ai/collection-insights";
import type { Pokemon } from "@/domain/pokemon/pokemon";

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

function extractJsonObject(text: string): unknown {
  const fencedBlockMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const normalizedText = fencedBlockMatch ? fencedBlockMatch[1] : text;

  const firstBrace = normalizedText.indexOf("{");
  const lastBrace = normalizedText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new AIProviderError("No se pudo interpretar JSON del proveedor IA");
  }

  return JSON.parse(normalizedText.slice(firstBrace, lastBrace + 1));
}

async function callGemini(parts: Array<Record<string, unknown>>, model = DEFAULT_MODEL): Promise<string> {
  const env = getServerEnv();

  if (!env.GEMINI_API_KEY) {
    throw new AIProviderError("GEMINI_API_KEY no configurada");
  }

  const response = await fetch(
    `${GEMINI_BASE_URL}/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let providerMessage = `Fallo al consultar Gemini (${response.status})`;

    try {
      const errorPayload = (await response.json()) as {
        error?: { message?: string };
      };

      if (errorPayload.error?.message) {
        providerMessage = `${providerMessage}: ${errorPayload.error.message}`;
      }
    } catch {
      // Keep a concise fallback message when provider payload is not JSON.
    }

    throw new AIProviderError(providerMessage);
  }

  const payload = (await response.json()) as GeminiResponse;
  const generatedText = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new AIProviderError("Gemini no devolvio contenido");
  }

  return generatedText;
}

export async function identifyPokemonWithGemini(input: {
  mimeType: string;
  base64Image: string;
}): Promise<{ pokemonName: string; confidence: number; reasoning: string }> {
  const prompt = [
    "Analiza la imagen y responde solo JSON valido con esta estructura:",
    '{"pokemonName":"string","confidence":0.0,"reasoning":"string"}',
    "- pokemonName: nombre canonico del pokemon en minusculas.",
    "- confidence: valor entre 0 y 1.",
    "- reasoning: maximo 30 palabras.",
    "Si no puedes identificar con certeza, devuelve el mejor candidato y confidence bajo.",
  ].join("\n");

  const generatedText = await callGemini([
    { text: prompt },
    {
      inlineData: {
        mimeType: input.mimeType,
        data: input.base64Image,
      },
    },
  ]);

  const parsed = extractJsonObject(generatedText);
  return geminiImageIdentificationSchema.parse(parsed);
}

export async function generateCollectionInsightsWithGemini(context: {
  totalPokemon: number;
  totalUnits: number;
  duplicateEntries: number;
  diversityScore: number;
  topTypes: Array<{ type: string; count: number }>;
  missingTypes: string[];
}): Promise<AICollectionInsights> {
  const prompt = [
    "Eres un asistente experto en Pokemon.",
    "Usa exclusivamente el contexto entregado.",
    "No inventes cantidades ni estadisticas.",
    "Responde SOLO JSON con estructura:",
    '{"summary":"string","recommendations":["string"],"curiosities":["string"],"comparisonIdea":"string"}',
    "Limites:",
    "- summary: 1-2 frases.",
    "- recommendations: 2 a 4 elementos accionables.",
    "- curiosities: 2 a 4 elementos.",
    "- comparisonIdea: una sugerencia de comparacion.",
    `Contexto: ${JSON.stringify(context)}`,
  ].join("\n");

  const generatedText = await callGemini([{ text: prompt }]);
  const parsed = extractJsonObject(generatedText);

  return aiCollectionInsightsSchema.parse(parsed);
}

export async function generatePokemonInsightsWithGemini(context: {
  pokemon: Pokemon;
  collectionSummary: {
    totalPokemon: number;
    totalUnits: number;
    diversityScore: number;
    missingTypes: string[];
  };
}): Promise<AICollectionInsights> {
  const prompt = [
    "Eres un asistente experto en Pokemon.",
    "Analiza solo el Pokemon seleccionado usando el contexto de coleccion entregado.",
    "No inventes estadisticas ni habilidades que no esten en el contexto.",
    "Responde SOLO JSON con estructura:",
    '{"summary":"string","recommendations":["string"],"curiosities":["string"],"comparisonIdea":"string"}',
    "Limites:",
    "- summary: 1-2 frases sobre el Pokemon en la coleccion.",
    "- recommendations: 2 a 4 acciones aplicables al Pokemon seleccionado.",
    "- curiosities: 2 a 4 curiosidades utiles del Pokemon.",
    "- comparisonIdea: una comparacion puntual con otro perfil de Pokemon.",
    `Contexto: ${JSON.stringify(context)}`,
  ].join("\n");

  const generatedText = await callGemini([{ text: prompt }]);
  const parsed = extractJsonObject(generatedText);

  return aiCollectionInsightsSchema.parse(parsed);
}

export async function decideAssistantPlanWithGemini(input: {
  userMessage: string;
  conversationContext: string;
  availableTools: Array<{ name: string; description: string }>;
}): Promise<{
  assistantMessage: string;
  toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>;
}> {
  const prompt = [
    "Eres un assistant de coleccion Pokemon.",
    "Debes responder SOLO con JSON valido.",
    "Cuando necesites datos o acciones, usa toolCalls con herramientas disponibles.",
    "Nunca inventes resultados de herramientas.",
    "Si el usuario pide Pokemon por tipo (ej: fuego, agua, electric), prioriza la herramienta de busqueda por tipo.",
    "Si el usuario pide recomendacion por tipo, prioriza la herramienta de recomendacion por tipo.",
    "Si la pregunta se resuelve sin herramientas, deja toolCalls vacio.",
    "Formato:",
    '{"assistantMessage":"string","toolCalls":[{"toolName":"string","args":{}}]}',
    `Herramientas disponibles: ${JSON.stringify(input.availableTools)}`,
    `Contexto reciente: ${input.conversationContext}`,
    `Mensaje de usuario: ${input.userMessage}`,
  ].join("\n");

  const generatedText = await callGemini([{ text: prompt }]);
  const parsed = extractJsonObject(generatedText);
  return assistantPlanSchema.parse(parsed);
}
