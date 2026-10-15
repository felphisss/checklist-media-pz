// 1. Dicionário de idiomas (suporta "en", "pt" e outros futuros)
export interface LocalizedText {
  en: string;
  pt: string;
  [key: string]: string;
}

// 2. Detalhes de SkillBoost (presente apenas nos SkillBooks)
export interface SkillBoost {
  skill: string;               
  skill_names: LocalizedText;
  min_level: number;           
  max_level: number;           
  label: string;               
}

// 3. Recompensas diretas de XP (presente apenas nos VHS)
export interface XpReward {
  skill: string;               
  skill_names: LocalizedText;  
  amount: number;              
}

// 4. A estrutura ÚNICA e PADRONIZADA de qualquer item do catálogo
export interface ChecklistItem {
  id: string;                  // Ex: "Base.BookElectrician1" ou "RM.89d33c..."
  category: string;            // Padronizado: "SkillBook", "RecipeResource", "Retail-VHS", etc.
  icon: string;                // Nome do ícone (ex: "Book6", "Cassette3")
  names: LocalizedText;        // Títulos traduzidos
  recipes: string[];           // Array com IDs das receitas (vazio [] se não tiver)
  skill_boost: SkillBoost | null; // Objeto de boost se for livro, ou null
  xp_rewards: XpReward[];      // Array de recompensas de XP (vazio [] se não tiver)
}

// 5. O catálogo completo indexado por ID
export type ItemsCatalog = Record<string, ChecklistItem>;