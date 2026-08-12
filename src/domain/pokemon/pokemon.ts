export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  spriteUrl: string | null;
  artworkUrl?: string | null;
  abilities?: string[];
  heightM?: number;
  weightKg?: number;
  baseExperience?: number | null;
}