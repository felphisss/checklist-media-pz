import { useState, useEffect } from 'react';
// Importamos o contrato que criamos para o TypeScript nos orientar
import type { ItemsCatalog } from './types/item';

// Dicionário visual de idiomas suportados
// (Se adicionar um novo idioma no futuro, basta incluir mais uma linha aqui!)
const CONFIG_IDIOMAS = [
  { codigo: 'pt', rotulo: 'PT', bandeira: '🇧🇷', nomeCompleto: 'Português (BR)' },
  { codigo: 'en', rotulo: 'EN', bandeira: '🇺🇸', nomeCompleto: 'English' },
];

function App() {
  // Estado para armazenar o catálogo de itens
  const [items, setItems] = useState<ItemsCatalog>({});

  // Estado para indicar se o arquivo ainda está sendo baixado
  const [carregando, setCarregando] = useState<boolean>(true);

  // Estado do idioma ativo
  const [idioma, setIdioma] = useState<'pt' | 'en'>('pt');

  // Novo estado: controla se a caixinha de seleção está aberta ou fechada
  const [menuIdiomaAberto, setMenuIdiomaAberto] = useState<boolean>(false);

  // Novo Estado: armazena os IDs dos itens que o jogador marcou como lidos/coletados
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});

  // Efeito executado apenas na montagem inicial do site
  useEffect(() => {
    // Faz a requisição para o arquivo que o Python gerou na pasta public/data/
    fetch('/data/items.json')
      .then((resposta) => {
        if (!resposta.ok) {
          throw new Error(`Falha na requisição: status ${resposta.status}`);
        }
        return resposta.json();
      })
      .then((dados: ItemsCatalog) => {
        // Guarda os dados na memória do React
        setItems(dados);
        setCarregando(false);
      })
      .catch((erro) => {
        console.error('Erro ao carregar items.json:', erro);
        setCarregando(false);
      });
  }, []); // <-- Esse array vazio [] garante que a busca só ocorra UMA única vez

  // Função para alternar o status de marcado/desmarcado
  const alternarItem = (id: string) => {
    setMarcados((anterior) => ({
      ...anterior,
      [id]: !anterior[id],
    }));
  };

  // Se os dados ainda não foram baixados, exibe uma mensagem de espera
  if (carregando) {
    return (
      <main>
        <p>Carregando inventário do Project Zomboid...</p>
      </main>
    );
  }

  // Transformamos o dicionário em um array para podermos usar o .map()
  const listaItens = Object.values(items);
  const totalItens = listaItens.length;

  // Pega os dados do idioma ativo no momento para exibir no botão quadrado
  const idiomaAtivoInfo = CONFIG_IDIOMAS.find((item) => item.codigo === idioma) || CONFIG_IDIOMAS[0];

  // Cálculos dinâmicos de progresso
  const totalColetados = Object.values(marcados).filter(Boolean).length;
  const porcentagem = totalItens > 0 ? ((totalColetados / totalItens) * 100).toFixed(1) : '0.0';

  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Project Zomboid — Checklist de Mídias</h1>
          <p style={{ marginTop: '0.4rem', color: '#aaa' }}>
            Progresso da Coleção: <strong style={{ color: '#81c784' }}>{totalColetados}</strong> de <strong>{totalItens}</strong> ({porcentagem}%)
          </p>
          {/* Barra visual de progresso */}
          <div style={{ width: '280px', height: '8px', backgroundColor: '#333', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div
              style={{
                width: `${porcentagem}%`,
                height: '100%',
                backgroundColor: '#2e7d32',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>

        {/* Dropdown de Idiomas (com position: relative para ancorar o menu) */}
        <div style={{ position: 'relative' }}>
          {/* O Quadradinho compacto com a bandeira e sigla */}
          <button
            type="button"
            onClick={() => setMenuIdiomaAberto(!menuIdiomaAberto)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#242424',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 'bold',
            }}
          >
            <span>{idiomaAtivoInfo.bandeira}</span>
            <span>{idiomaAtivoInfo.rotulo}</span>
            <span style={{ fontSize: '0.7rem', color: '#888' }}>▼</span>
          </button>

          {/* A caixinha suspensa com os idiomas (aparece apenas quando menuIdiomaAberto for true) */}
          {menuIdiomaAberto && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.4rem',
                backgroundColor: '#1f1f1f',
                border: '1px solid #333',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                zIndex: 10,
                minWidth: '160px',
              }}
            >
              {CONFIG_IDIOMAS.map((lang) => (
                <button
                  key={lang.codigo}
                  type="button"
                  onClick={() => {
                    setIdioma(lang.codigo as 'pt' | 'en');
                    setMenuIdiomaAberto(false); // Fecha o menu ao selecionar
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    backgroundColor: idioma === lang.codigo ? '#2e7d32' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  <span>{lang.bandeira}</span>
                  <span>{lang.nomeCompleto}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Tabela de itens */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ padding: '0.6rem', width: '40px', textAlign: 'center' }}>✓</th>
            <th style={{ padding: '0.6rem', width: '50px' }}>Ícone</th>
            <th style={{ padding: '0.6rem' }}>Nome ({idioma.toUpperCase()})</th>
            <th style={{ padding: '0.6rem', width: '150px' }}>Categoria</th>
            <th style={{ padding: '0.6rem', minWidth: '180px' }}>Efeito / XP</th>
            <th style={{ padding: '0.6rem', minWidth: '140px'}}>Receitas</th>
          </tr>
        </thead>
        <tbody>
          {/* A esteira do .map() renderizando uma linha <tr> para cada item */}
          {listaItens.map((item) => {
            const estaMarcado = !!marcados[item.id];
            const temSkillBoost = item.skill_boost !== null && item.skill_boost !== undefined;
            const temXpRewards = item.xp_rewards && item.xp_rewards.length > 0;
            const temReceitas = item.recipes && item.recipes.length > 0;

            return (
              <tr
                key={item.id}
                style={{
                  borderBottom: '1px solid #222',
                  backgroundColor: estaMarcado ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                  opacity: estaMarcado ? 0.6 : 1,
                  transition: 'background-color 0.2s, opacity 0.2s',
                }}
              >
                {/* Célula do Checkbox */}
                <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={estaMarcado}
                    onChange={() => alternarItem(item.id)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2e7d32' }}
                  />
                </td>

                {/* 1. Coluna de Ícone */}
                <td style={{ padding: '0.6rem', width: '50px' }}>
                  <img
                    src={`/icons/Item_${item.icon}.png`}
                    alt={item.names[idioma] || item.names.en}
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                    onError={(e) => {
                      // Fallback para caso o arquivo direto não tenha o prefixo "Item_"
                      const alvo = e.currentTarget;
                      if (!alvo.dataset.tentativaFallback) {
                        alvo.dataset.tentativaFallback = 'true';
                        alvo.src = `/icons/${item.icon}.png`;
                      } else {
                        alvo.src = '/icons/placeholder.png';
                      }
                    }}
                  />
                </td>

                {/* 2. Coluna de Nome */}
                <td style={{ padding: '0.6rem' }}>
                  {/* Acesso dinâmico com fallback caso a tradução falte */}
                  <strong style={{ textDecoration: estaMarcado ? 'line-through' : 'none' }}>
                    {item.names[idioma] || item.names.en}
                  </strong>
                </td>

                {/* 3. Coluna de Categoria */}
                <td style={{ padding: '0.6rem', color: '#888' }}>
                  {item.category}
                </td>

                {/* 4. Coluna de Efeito / XP */}
                <td style={{ padding: '0.6rem' }}>
                  {/* Se for livro de habilidade: */}
                  {temSkillBoost && (
                    <span style={{ color: '#81c784' }}>
                      {item.skill_boost?.skill_names?.[idioma] || item.skill_boost?.skill} ({item.skill_boost?.label})
                    </span>
                  )}

                  {/* Se for fita VHS com recompensas de XP: */}
                  {temXpRewards && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {item.xp_rewards.map((recompensa, idx) => (
                        <span key={idx} style={{ color: '#ffb74d', fontSize: '0.9rem' }}>
                          +{recompensa.amount} XP {recompensa.skill_names?.[idioma] || recompensa.skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Se não conceder nem boost nem XP: */}
                  {!temSkillBoost && !temXpRewards && (
                    <span style={{ display: 'block', textAlign: 'center', color: '#555' }}>-</span>
                  )}
                </td>

                {/* 5. Coluna de Receitas */}
                <td style={{ padding: '0.6rem'}}>
                  {temReceitas ? (
                    // nowrap impede a quebra de linha de "17 receitas"
                    <span style={{ color: '#64b5f6', whiteSpace: 'nowrap' }}>
                      {item.recipes.length} receitas
                    </span>
                  ) : (
                    // Traço centralizado
                    <span style={{ display: 'block', textAlign: 'center', color: '#555' }}>-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}

export default App;