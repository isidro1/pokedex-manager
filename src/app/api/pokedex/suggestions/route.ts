import { NextResponse } from "next/server";
import { searchPokemonNameSuggestionsInPokedex } from "@/application/collection/collection-service";
import { searchPokemonSchema } from "@/schemas/collection-schemas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const validation = searchPokemonSchema.safeParse({ q });
  if (!validation.success) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  try {
    const suggestions = await searchPokemonNameSuggestionsInPokedex(validation.data.q, 8);
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
