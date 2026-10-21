import type { LocalizedText } from "./item";

// Estrutura de uma única receita do catálogo
export interface RecipeItem {
    names: LocalizedText;
}

// O dicionário recipes.json indexado pela chave externa
export type RecipesCatalog = Record<string, RecipeItem>;