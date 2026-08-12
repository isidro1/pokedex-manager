export interface TypeBreakdownItem {
  type: string;
  count: number;
}

export interface ObjectiveCollectionAnalytics {
  totalPokemon: number;
  totalUnits: number;
  duplicateEntries: number;
  diversityScore: number;
  topTypes: TypeBreakdownItem[];
  leastTypes: TypeBreakdownItem[];
  missingTypes: string[];
  deterministicRecommendations: string[];
}

export interface AICollectionInsights {
  summary: string;
  recommendations: string[];
  curiosities: string[];
  comparisonIdea: string;
}
