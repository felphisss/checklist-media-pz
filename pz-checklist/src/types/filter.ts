// Define as abas de categoria suportadas na interface
export type TipoAba = 'TODOS' | 'SkillBook' | 'RecipeMagazine' | 'VHS';

// Define o filtro exclusivo de estado da checklist
export type FiltroStatus = 'TODOS' | 'MARCADOS' | 'NAO_MARCADOS';

// Define as opções booleanas de conteúdo útil
export interface FiltroConteudo {
  apenasComReceitas: boolean;
  apenasComBoost: boolean;
  apenasComXp: boolean;
}

// Configuração padrão de conteúdo limpo
export const FILTRO_CONTEUDO_PADRAO: FiltroConteudo = {
  apenasComReceitas: false,
  apenasComBoost: false,
  apenasComXp: false,
};