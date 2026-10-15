import { useState, useEffect } from 'react';
// Importamos o contrato que criamos para o TypeScript nos orientar
import type { ItemsCatalog } from './types/item';

function App() {
  // 1. Estado para armazenar o catálogo de itens
  const [items, setItems] = useState<ItemsCatalog>({});

  // 2. Estado para indicar se o arquivo ainda está sendo baixado
  const [carregando, setCarregando] = useState<boolean>(true);

  // 3. Efeito executado apenas na montagem inicial do site
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

  // Se os dados ainda não foram baixados, exibe uma mensagem de espera
  if (carregando) {
    return (
      <main>
        <p>Carregando inventário do Project Zomboid...</p>
      </main>
    );
  }

  // 1. Transformamos o dicionário em um array para podermos usar o .map()
  const listaItens = Object.values(items);

  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Project Zomboid — Checklist de Mídias</h1>
        <p>Total de itens carregados: <strong>{listaItens.length}</strong></p>
      </header>

      {/* 2. Tabela simples para visualização dos registros */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ padding: '0.5rem' }}>Ícone</th>
            <th style={{ padding: '0.5rem' }}>Nome (PT)</th>
            <th style={{ padding: '0.5rem' }}>Categoria</th>
          </tr>
        </thead>
        <tbody>
          {/* 3. A esteira do .map() renderizando uma linha <tr> para cada item */}
          {listaItens.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '0.5rem', width: '50px' }}>
                <img
                  src={`/icons/Item_${item.icon}.png`}
                  alt={item.names.pt}
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
              <td style={{ padding: '0.5rem' }}>
                <strong>{item.names.pt}</strong>
              </td>
              <td style={{ padding: '0.5rem', color: '#888' }}>
                {item.category}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export default App;