export interface CollectionStats {
  totalPokemon: number;
  totalUnits: number;
  duplicateEntries: number;
  typeDistribution: Record<string, number>;
}