// Define o tipo dinâmico para código de idioma (suporta 'pt', 'en', 'es', etc.)
export type IdiomaCodigo = string;

// Informações visuais e de exibição de cada idioma suportado
export interface IdiomaInfo {
  codigo: IdiomaCodigo;
  rotulo: string;
  bandeira: string;
  nomeCompleto: string;
}

// Configuração centralizada dos idiomas disponíveis no site
// Se o pipeline gerar 'es' no futuro, basta incluir mais uma linha aqui!
export const CONFIG_IDIOMAS: IdiomaInfo[] = [
  { codigo: 'en', rotulo: 'EN', bandeira: '🇺🇸', nomeCompleto: 'English' },
  { codigo: 'pt', rotulo: 'PT', bandeira: '🇧🇷', nomeCompleto: 'Português (BR)' },
];

export const IDIOMA_PADRAO: IdiomaCodigo = 'en';