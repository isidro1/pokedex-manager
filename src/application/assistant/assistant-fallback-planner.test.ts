import { describe, expect, it } from "vitest";
import { buildFallbackAssistantPlan } from "@/application/assistant/assistant-fallback-planner";

describe("buildFallbackAssistantPlan", () => {
  it("responde de forma natural a saludos", () => {
    const plan = buildFallbackAssistantPlan("hola");

    expect(plan.toolCalls).toEqual([]);
    expect(plan.assistantMessage.toLowerCase()).toContain("hola");
    expect(plan.assistantMessage.toLowerCase()).toContain("coleccion");
  });

  it("devuelve llamada de herramienta para estadisticas", () => {
    const plan = buildFallbackAssistantPlan("dame estadisticas");

    expect(plan.toolCalls).toEqual([{ toolName: "get_collection_stats", args: {} }]);
  });

  it("extrae pokemon para agregar en comandos directos", () => {
    const plan = buildFallbackAssistantPlan("agrega pikachu");

    expect(plan.toolCalls).toEqual([
      { toolName: "add_to_collection", args: { pokemon: "pikachu", quantity: 1 } },
    ]);
    expect(plan.assistantMessage.toLowerCase()).not.toContain("gemini no esta disponible");
  });

  it("interpreta preguntas naturales de detalle", () => {
    const plan = buildFallbackAssistantPlan("quien es pikachu?");

    expect(plan.toolCalls).toEqual([
      { toolName: "get_pokemon", args: { pokemon: "pikachu" } },
    ]);
    expect(plan.assistantMessage.toLowerCase()).not.toContain("gemini no esta disponible");
  });

  it("interpreta consultas tipo 'que sabes de'", () => {
    const plan = buildFallbackAssistantPlan("que sabes de pikachu?");

    expect(plan.toolCalls).toEqual([
      { toolName: "get_pokemon", args: { pokemon: "pikachu" } },
    ]);
  });

  it("interpreta consultas por tipo", () => {
    const plan = buildFallbackAssistantPlan("conoces algun pokemon de fuego?");

    expect(plan.toolCalls).toEqual([
      { toolName: "search_pokemon_by_type", args: { type: "fire", limit: 10 } },
    ]);
  });

  it("interpreta recomendaciones por tipo", () => {
    const plan = buildFallbackAssistantPlan(
      "de los de agua, cual me recomiendas para mi coleccion?",
    );

    expect(plan.toolCalls).toEqual([
      { toolName: "recommend_pokemon_by_type", args: { type: "water", count: 3 } },
    ]);
  });

  it("interpreta 'muestrame a <pokemon>' como detalle de pokemon", () => {
    const plan = buildFallbackAssistantPlan("muestrame a pikachu");

    expect(plan.toolCalls).toEqual([
      { toolName: "get_pokemon", args: { pokemon: "pikachu" } },
    ]);
  });

  it("mantiene consulta de coleccion cuando el usuario lo pide explicitamente", () => {
    const plan = buildFallbackAssistantPlan("muestrame mi coleccion");

    expect(plan.toolCalls).toEqual([
      { toolName: "get_collection", args: { limit: 20 } },
    ]);
  });
});
