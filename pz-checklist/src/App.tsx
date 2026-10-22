import { useState, useEffect } from 'react';
import type { ItemsCatalog } from './types/item';
import type { RecipesCatalog } from './types/recipe';
import {
  type TipoAba,
  type FiltroStatus,
  type FiltroConteudo,
  FILTRO_CONTEUDO_PADRAO 
} from './types/filter';
import {
  type IdiomaCodigo,
  CONFIG_IDIOMAS,
  IDIOMA_PADRAO,
} from './types/language';

function App() {
  // Estado para armazenar o catálogo de itens
  const [items, setItems] = useState<ItemsCatalog>({});
  // Estado para criar dicionário com todas as receitas traduzidas
  const [recipes, setRecipes] = useState<RecipesCatalog>({});
  // Estado para indicar se o arquivo ainda está sendo baixado
  const [carregando, setCarregando] = useState<boolean>(true);

  // Menus e painéis
  // Estado para controlar se a caixinha de seleção está aberta ou fechada
  const [menuIdiomaAberto, setMenuIdiomaAberto] = useState<boolean>(false);
  const [menuFiltrosAberto, setMenuFiltrosAberto] = useState<boolean>(false);
  // Estado ID do item que está com a gaveta de receitas aberta (ou null)
  const [itemExpandidoId, setItemExpandidoId] = useState<string | null>(null);

  // Termo de Busca (inicia sempre vazio)
  const [termoBusca, setTermoBusca] = useState<string>('');

  // Estado do idioma
  const [idioma, setIdioma] = useState<IdiomaCodigo>(() => {
    try {
      return localStorage.getItem('pz_checklist_idioma') || IDIOMA_PADRAO;
    } catch {
      return IDIOMA_PADRAO;
    }
  });

  const [abaAtiva, setAbaAtiva] = useState<TipoAba>(() => {
    try {
      const salvo = localStorage.getItem('pz_checklist_aba');
      return (salvo as TipoAba) || 'TODOS';
    } catch {
      return 'TODOS';
    }
  });

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>(() => {
    try {
      const salvo = localStorage.getItem('pz_checklist_filtro_status');
      return (salvo as FiltroStatus) || 'TODOS';
    } catch {
      return 'TODOS';
    }
  });

  const [filtroConteudo, setFiltroConteudo] = useState<FiltroConteudo>(() => {
    try {
      const salvo = localStorage.getItem('pz_checklist_filtro_conteudo');
      return salvo ? JSON.parse(salvo) : FILTRO_CONTEUDO_PADRAO;
    } catch {
      return FILTRO_CONTEUDO_PADRAO;
    }
  });
  

  // Novo Estado: armazena os IDs dos itens que o jogador marcou como lidos/coletados
  const [marcados, setMarcados] = useState<Record<string, boolean>>(() => {
    try {
      const salvo = localStorage.getItem('pz_checklist_marcados');
      return salvo ? JSON.parse(salvo) : {};
    } catch (erro) {
      console.error('Erro ao recuperar o progresso:', erro);
      return {};
    }
  });

  

  // Efeito executado apenas na montagem inicial do site
  // Carregamento paralelo com Promise.all
  useEffect(() => {
    Promise.all([
      // Faz a requisição para o arquivo que o Python gerou na pasta public/data/
      fetch('/data/items.json').then((res) => {
          if (!res.ok) throw new Error('Falha ao baixar items.json');
          return res.json();
        }),
        fetch('/data/recipes.json').then((res) => {
          if (!res.ok) throw new Error('Falha ao baixar recipes.json');
          return res.json();
        }),
    ])
      .then(([dadosItens, dadosReceitas]: [ItemsCatalog, RecipesCatalog]) => {
        // Guarda os dados na memória do React
        setItems(dadosItens);
        setRecipes(dadosReceitas);
        setCarregando(false);
      })
      .catch((erro) => {
        console.error('Erro ao carregar dados do jogo:', erro);
        setCarregando(false);
      });
  }, []); // <-- Esse array vazio [] garante que a busca só ocorra UMA única vez

  // Persistência automática
  useEffect(() => {
    try {
      localStorage.setItem('pz_checklist_marcados', JSON.stringify(marcados));
    } catch (erro) {
      console.error('Falha ao salvar itens marcados:', erro);
    }
  }, [marcados]);

  useEffect(() => {
    try {
      localStorage.setItem('pz_checklist_idioma', idioma);
      localStorage.setItem('pz_checklist_aba', abaAtiva);
      localStorage.setItem('pz_checklist_filtro_status', filtroStatus);
      localStorage.setItem('pz_checklist_filtro_conteudo', JSON.stringify(filtroConteudo));
    } catch (erro) {
      console.error('Falha ao salvar preferências:', erro);
    }
  }, [idioma, abaAtiva, filtroStatus, filtroConteudo]);

  // Função para alternar o status de marcado/desmarcado
  // Alterna o status: adiciona true ou remove a chave completamente
  const alternarItem = (id: string) => {
    setMarcados((anterior) => {
      // Se já estava marcado, cria cópia sem essa chave
      if (anterior[id]) {
        const novo = { ...anterior };
        delete novo[id];
        return novo;
      }
      // Se não estava marcado, adiciona como true
      return { ...anterior, [id]: true };
    });
  };

  // Alterna abrir/fechar a gaveta de receitas
  const alternarExpansao = (id: string) => {
    setItemExpandidoId((atual) => (atual === id ? null : id));
  };

  // Se os dados ainda não foram baixados, exibe uma mensagem de espera
  if (carregando) {
    return (
      <main>
        <p>Carregando inventário e receitas do Project Zomboid...</p>
      </main>
    );
  }

  // Transformamos o dicionário em um array para podermos usar o .map()
  const listaItens = Object.values(items);
  const totalItens = listaItens.length;

  // Pega os dados do idioma ativo no momento para exibir no botão quadrado
  const idiomaAtivoInfo = CONFIG_IDIOMAS.find((item) => item.codigo === idioma) || CONFIG_IDIOMAS[0];

  // Cálculos dinâmicos de progresso
  const totalColetados = Object.keys(marcados).length;
  const porcentagem = totalItens > 0 ? ((totalColetados / totalItens) * 100).toFixed(1) : '0.0';

  // Contadores rápidos para exibir nos rótulos das abas
  const qtdTodos = totalItens;
  const qtdLivros = listaItens.filter((i) => i.category === 'SkillBook').length;
  const qtdRevistas = listaItens.filter((i) => i.category === 'RecipeMagazine').length;
  const qtdVhs = listaItens.filter((i) => i.category.includes('VHS')).length;

  const filtroConteudoAtivo =
    filtroConteudo.apenasComReceitas ||
    filtroConteudo.apenasComBoost ||
    filtroConteudo.apenasComXp;

  const temFiltroAtivo = filtroStatus !== 'TODOS' || filtroConteudoAtivo;

  // PIPELINE DE FILTRAGEM
  const itensFiltrados = listaItens.filter((item) => {
    const estaMarcado = !!marcados[item.id];
    const temSkillBoost = item.skill_boost !== null;
    const temXpRewards = item.xp_rewards && item.xp_rewards.length > 0;
    const temReceitas = item.recipes && item.recipes.length > 0;

    // Filtro Aba
    if (abaAtiva === 'SkillBook' && item.category !== 'SkillBook') return false;
    if (abaAtiva === 'RecipeMagazine' && item.category !== 'RecipeMagazine') return false;
    if (abaAtiva === 'VHS' && !item.category.includes('VHS')) return false;

    // Filtro Status
    if (filtroStatus === 'MARCADOS' && !estaMarcado) return false;
    if (filtroStatus === 'NAO_MARCADOS' && estaMarcado) return false;

    // Filtro Conteúdo
    if (filtroConteudoAtivo) {
      const achouReceitas = filtroConteudo.apenasComReceitas && temReceitas;
      const achouBoost = filtroConteudo.apenasComBoost && temSkillBoost;
      const achouXp = filtroConteudo.apenasComXp && temXpRewards;

      // Se nenhum dos critérios assinalados for atendido, descarta o item
      if (!achouReceitas && !achouBoost && !achouXp) {
        return false;
      }
    }

    // Busca Textual: Restrita ao Idioma Ativo e Inglês (Padrão)
    const busca = termoBusca.toLowerCase().trim();
    if (!busca) return true; // Se o campo estiver vazio, mantém o item

    // Dados do item para teste
    const nomeAtivo = (item.names[idioma] || '').toLowerCase();
    const nomePadrao = (item.names[IDIOMA_PADRAO] || '').toLowerCase();
    const idItem = item.id.toLowerCase();
    // Perícia de treino (se for livro)
    const skillAtiva = (item.skill_boost?.skill_names?.[idioma] || item.skill_boost?.skill || '').toLowerCase();
    const skillPadrao = (item.skill_boost?.skill_names?.[IDIOMA_PADRAO] || '').toLowerCase();
    // Perícias de XP (se for VHS)
    const skillsVhsAtiva = (item.xp_rewards || [])
      .map((r) => (r.skill_names?.[idioma] || r.skill || '').toLowerCase())
      .join(' ');
    const skillsVhsPadrao = (item.xp_rewards || [])
      .map((r) => (r.skill_names?.[IDIOMA_PADRAO] || '').toLowerCase())
      .join(' ');

    if (
      nomeAtivo.includes(busca) ||
      nomePadrao.includes(busca) ||
      idItem.includes(busca) ||
      skillAtiva.includes(busca) ||
      skillPadrao.includes(busca) ||
      skillsVhsAtiva.includes(busca) ||
      skillsVhsPadrao.includes(busca)
    ) {
      return true;
    }

    // Busca em receitas: Apenas no Idioma Ativo e Inglês
    if (temReceitas) {
      return item.recipes.some((recipeId) => {
        if (recipeId.toLowerCase().includes(busca)) return true;
        const dadosReceita = recipes[recipeId];
        if (!dadosReceita) return false;

        const receitaAtiva = (dadosReceita.names?.[idioma] || '').toLowerCase();
        const receitaPadrao = (dadosReceita.names?.[IDIOMA_PADRAO] || '').toLowerCase();
        return receitaAtiva.includes(busca) || receitaPadrao.includes(busca);
      });
    }

    return false;
  });

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
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
                    setIdioma(lang.codigo);
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

      {/* Ações: Campo de Busca + Botão Filtros */}
      <div style={{ marginBottom: '1.2rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <input
          type="text"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          placeholder="🔍 Buscar por título, perícia, ID ou receita aprendida..."
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            backgroundColor: '#1e1e1e',
            color: '#fff',
            border: '1px solid #3a3a3a',
            borderRadius: '6px',
            fontSize: '0.95rem',
            outline: 'none',
          }}
        />

        {/* Menu Popover de Filtros */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setMenuFiltrosAberto(!menuFiltrosAberto);
              setMenuIdiomaAberto(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.75rem 1rem',
              backgroundColor: temFiltroAtivo ? '#1b5e20' : '#242424',
              color: '#fff',
              border: temFiltroAtivo ? '1px solid #43a047' : '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}
          >
            <span>⚙️ Filtros</span>
            {temFiltroAtivo && (
              <span
                style={{
                  backgroundColor: '#43a047',
                  borderRadius: '50%',
                  width: '8px',
                  height: '8px',
                  display: 'inline-block',
                }}
              />
            )}
          </button>

          {menuFiltrosAberto && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.4rem',
                backgroundColor: '#1f1f1f',
                border: '1px solid #333',
                borderRadius: '8px',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.6)',
                padding: '1rem',
                zIndex: 10,
                minWidth: '260px',
              }}
            >
              <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Status da Checklist
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                {[
                  { valor: 'TODOS', rotulo: 'Todos os itens' },
                  { valor: 'MARCADOS', rotulo: 'Apenas Marcados (Coletados)' },
                  { valor: 'NAO_MARCADOS', rotulo: 'Apenas Não Marcados (Pendentes)' },
                ].map((opcao) => (
                  <label
                    key={opcao.valor}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer', color: '#ddd' }}
                  >
                    <input
                      type="radio"
                      name="filtroStatus"
                      checked={filtroStatus === opcao.valor}
                      onChange={() => setFiltroStatus(opcao.valor as FiltroStatus)}
                      style={{ accentColor: '#2e7d32', cursor: 'pointer' }}
                    />
                    {opcao.rotulo}
                  </label>
                ))}
              </div>

              <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Conteúdo Útil
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer', color: '#ddd' }}>
                  <input
                    type="checkbox"
                    checked={filtroConteudo.apenasComReceitas}
                    onChange={(e) =>
                      setFiltroConteudo((ant) => ({ ...ant, apenasComReceitas: e.target.checked }))
                    }
                    style={{ accentColor: '#2e7d32', cursor: 'pointer' }}
                  />
                  Contém receitas
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer', color: '#ddd' }}>
                  <input
                    type="checkbox"
                    checked={filtroConteudo.apenasComBoost}
                    onChange={(e) =>
                      setFiltroConteudo((ant) => ({ ...ant, apenasComBoost: e.target.checked }))
                    }
                    style={{ accentColor: '#2e7d32', cursor: 'pointer' }}
                  />
                  Concede boost de habilidade
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer', color: '#ddd' }}>
                  <input
                    type="checkbox"
                    checked={filtroConteudo.apenasComXp}
                    onChange={(e) =>
                      setFiltroConteudo((ant) => ({ ...ant, apenasComXp: e.target.checked }))
                    }
                    style={{ accentColor: '#2e7d32', cursor: 'pointer' }}
                  />
                  Concede XP
                </label>
              </div>

              {temFiltroAtivo && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroStatus('TODOS');
                    setFiltroConteudo(FILTRO_CONTEUDO_PADRAO);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    backgroundColor: '#333',
                    color: '#aaa',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Restaurar filtros padrão
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Abas Horizontais */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #333',
          marginBottom: '1rem',
          gap: '0.5rem',
        }}
      >
        {[
          { chave: 'TODOS', rotulo: `Todas (${qtdTodos})` },
          { chave: 'SkillBook', rotulo: `Livros de Habilidade (${qtdLivros})` },
          { chave: 'RecipeMagazine', rotulo: `Revistas (${qtdRevistas})` },
          { chave: 'VHS', rotulo: `Fitas VHS (${qtdVhs})` },
        ].map((aba) => {
          const selecionada = abaAtiva === aba.chave;
          return (
            <button
              key={aba.chave}
              type="button"
              onClick={() => setAbaAtiva(aba.chave as TipoAba)}
              style={{
                padding: '0.6rem 1.2rem',
                background: 'transparent',
                color: selecionada ? '#81c784' : '#888',
                border: 'none',
                borderBottom: selecionada ? '2px solid #2e7d32' : '2px solid transparent',
                marginBottom: '-2px', // Conecta visualmente à borda inferior do container
                cursor: 'pointer',
                fontWeight: selecionada ? 'bold' : 'normal',
                fontSize: '0.95rem',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {aba.rotulo}
            </button>
          );
        })}
      </div>

      {/* Informação contextual de resultados */}
      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.8rem' }}>
        Exibindo <strong>{itensFiltrados.length}</strong> de {totalItens} itens
      </p>

      {/* Tabela de Itens (agora renderiza itensFiltrados) */}
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
          {itensFiltrados.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>
                Nenhum item localizado com o filtro aplicado.
              </td>
            </tr>
          ) : (
            // A esteira do .map() renderizando uma linha <tr> para cada item
            itensFiltrados.map((item) => {
              const estaMarcado = !!marcados[item.id];
              const estaExpandido = itemExpandidoId === item.id;
              const temSkillBoost = item.skill_boost !== null;
              const temXpRewards = item.xp_rewards && item.xp_rewards.length > 0;
              const temReceitas = item.recipes && item.recipes.length > 0;

              return (
                // Usamos um fragmento React (<> </>) para poder retornar a linha principal e a gaveta juntas!
                <tr key={item.id} style={{ display: 'contents' }}>
                  {/* LINHA PRINCIPAL DO ITEM */}
                  <tr
                    style={{
                      borderBottom: estaExpandido ? 'none' : '1px solid #222',
                      backgroundColor: estaMarcado ? 'rgba(46, 125, 50, 0.08)' : estaExpandido ? '#181818' : 'transparent',
                      opacity: estaMarcado ? 0.6 : 1,
                      transition: 'background-color 0.2s',
                  }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={estaMarcado}
                        onChange={() => alternarItem(item.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2e7d32' }}
                      />
                    </td>

                    {/* Ícone */}
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

                    {/* Nome */}
                    <td style={{ padding: '0.6rem' }}>
                      {/* Acesso dinâmico com fallback caso a tradução falte */}
                      <strong style={{ textDecoration: estaMarcado ? 'line-through' : 'none' }}>
                        {item.names[idioma] || item.names.en}
                      </strong>
                    </td>

                    {/* Categoria */}
                    <td style={{ padding: '0.6rem', color: '#888' }}>
                      {item.category}
                    </td>

                    {/* Efeito / XP */}
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

                    {/* Receitas */}
                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                        {temReceitas ? (
                          <button
                            type="button"
                            onClick={() => alternarExpansao(item.id)}
                            onMouseEnter={(e) => {
                              // Se estiver fechado, aplica o fundo azul ao passar o mouse
                              if (!estaExpandido) {
                                e.currentTarget.style.backgroundColor = '#1565c0';
                                e.currentTarget.style.color = '#fff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              // Ao tirar o mouse, se continuar fechado, volta ao estado transparente original
                              if (!estaExpandido) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#64b5f6';
                              }
                            }}
                            style={{
                              width: '115px',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: estaExpandido ? '#1565c0' : 'transparent',
                              color: estaExpandido ? '#fff' : '#64b5f6',                            
                              border: '1px solid #1976d2',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              whiteSpace: 'nowrap',
                              textAlign: 'center',                            
                              transition: 'background-color 0.15s ease, color 0.15s ease',
                            }}
                          >
                            {estaExpandido ? '▲ Fechar' : `▼ ${item.recipes.length} receitas`}
                          </button>
                        ) : (
                          <span style={{ color: '#555' }}>-</span>
                        )}
                    </td>
                  </tr>

                  {/* 4. GAVETA EXPANSÍVEL (Renderizada somente se estaExpandido for true) */}
                  {estaExpandido && (
                    <tr style={{ backgroundColor: '#181818', borderBottom: '1px solid #333' }}>
                      <td colSpan={6} style={{ padding: '0.8rem 1.5rem' }}>
                        <div style={{ borderLeft: '3px solid #1976d2', paddingLeft: '1rem' }}>
                          <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Receitas aprendidas ({item.recipes.length}):
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {item.recipes.map((recipeId) => {
                              // Busca a tradução no dicionário recipes.json
                              const receitaInfo = recipes[recipeId];
                              const nomeReceita = receitaInfo?.names?.[idioma] || receitaInfo?.names?.en || recipeId;

                              return (
                                <span
                                  key={recipeId}
                                  style={{
                                    backgroundColor: '#262626',
                                    color: '#e0e0e0',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '4px',
                                    fontSize: '0.85rem',
                                    border: '1px solid #3a3a3a',
                                  }}
                                >
                                  {nomeReceita}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </main>
  );
}

export default App;