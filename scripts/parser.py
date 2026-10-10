import json
from pathlib import Path
import re
import shutil
from collections import Counter

# ==============================================================================
# 1. CONFIGURAÇÕES E DIRETÓRIOS
# ==============================================================================
# Ajuste o diretório raiz da pasta 'media' da sua instalação do jogo:
DIRETORIO_PZ_MEDIA = Path(r"D:\SteamLibrary\steamapps\common\ProjectZomboid\media")

# Pasta onde você extraiu os PNGs com o PackViewer do TileZed:
DIRETORIO_RAW_TEXTURES = Path(r"raw_textures")

# diretorio_Destinos dentro do seu projeto de checklist:
PASTA_DATA = Path("data")
PASTA_STATIC_ICONS = Path("app/static/icons")
ARQUIVO_ITEMS_JSON = PASTA_DATA / "items.json"

XP_POR_PONTO = 12.5

# Para adicionar novos idiomas, basta incluir aqui:
IDIOMAS_SUPORTADOS = {
    "EN": "en",
    "PTBR": "pt",
}

# Mapeamento oficial dos códigos do PZ para as Perícias (Perks)
MAPA_SKILLS_VHS = {
    "BUA": "Long Blunt",
    "SBA": "Short Blade",
    "AIM": "Aiming",
    "REL": "Reloading",
    "CRP": "Carpentry",
    "COO": "Cooking",
    "FRM": "Agriculture",
    "LFT": "Lightfooted",
    "FIS": "Fishing",
    "TRA": "Trapping",
    "FOR": "Foraging",
    "DOC": "First Aid",
    "ELC": "Electrical",
    "MEC": "Mechanics",
    "HUS": "Animal Care",
    "FKN": "Knapping",
    "POT": "Pottery",
    "BLA": "Blacksmithing",
    "MTL": "Welding",
    "TAI": "Tailoring"
}

# ==============================================================================
# 2. TRADUÇÃO (PTBR/EN)
# ==============================================================================
def carregar_dict_traducao(diretorio_media: Path, arquivo_json: str) -> dict:
    '''
    Carrega qualquer arquivo de tradução nos idiomas suportados.

    Input: Diretório da pasta media do jogo e nome do arquivo.json

    Ouput: Dicionário com as traduções do arquivo nos idiomas suportados
    '''
    # Diretório padrão para a pasta com as traduções
    pasta_translate = diretorio_media / "lua" / "shared" / "Translate"
    
    traducoes = {}

    for pasta_idioma, chave_json in IDIOMAS_SUPORTADOS.items():
        caminho_arquivo = pasta_translate / pasta_idioma / arquivo_json

        if caminho_arquivo.exists():
            with open(caminho_arquivo, "r", encoding="utf-8") as f:
                traducoes[chave_json] = json.load(f)
        else:
            print(f"[AVISO] Arquivo {arquivo_json} não encontrado para o idioma {pasta_idioma}.")
            traducoes[chave_json] = {}

    return traducoes

def traduzir_texto(
    chave_traducao: str, 
    dicionario_categoria: dict, 
    fallback_padrao: str = ""
) -> dict:
    '''
    Traduz um objeto para todos os idiomas suportados a partir de uma chave.
    
    Aplica fallback encadeado:
    1. Tenta pegar no inglês ("en").
    2. Se não existir no inglês, usa o fallback_padrao (ex: ID bruto do item/skill).
    3. Para os demais idiomas, se faltar a tradução, recorre à base em inglês.

    Input: Objeto a ser traduzido, dicionário para buscar as traduções e fallback padrão

    Output: Dicionário contendo todas as traduções aos idiomas suportados do objeto solicitado
    '''
    # Fallback base em inglês ou valor padrão fornecido
    base_en = dicionario_categoria.get("en", {}).get(chave_traducao, fallback_padrao)

    # Resolução dinâmica para todos os idiomas configurados
    return {
        codigo_lang: dicionario_categoria
        .get(codigo_lang, {})
        .get(chave_traducao, base_en)
        for codigo_lang in IDIOMAS_SUPORTADOS.values()
    }


# ==============================================================================
# 3. EXTRAÇÃO DE LIVROS E REVISTAS
# ==============================================================================
def extrair_literatura(diretorio_media: Path, traducoes: dict) -> dict:
    '''
    Lê o literature.txt, filtra por itens relevantes e formata para a estrutura de dados final.

    Input: Diretório da pasta media do jogo e dicionário de traduções
    
    Ouput: Dicionário com os itens de literatura relevantes. 
    '''
    # Diretório padrão para o arquivo literature.txt
    arquivo_literatura = diretorio_media / "scripts" / "generated" / "items" / "literature.txt"

    if not arquivo_literatura.exists():
        raise FileNotFoundError(f"literature.txt não existe")

    print(f"Lendo dados de: {arquivo_literatura}")
    with open(arquivo_literatura, "r", encoding="utf-8", errors="ignore") as f:
        conteudo = f.read()

    # Expressões regulares:
    # 1. padrao_item: localiza blocos "item NomeDoItem { corpo }"
    padrao_item = re.compile(r"item\s+([A-Za-z0-9_\-]+)\s*\{([^}]+)\}", re.DOTALL)
    # 2. padrao_propriedade: extrai pares "Chave = Valor" ignorando quebras de linha e vírgulas finais
    padrao_propriedade = re.compile(r"(\w+)\s*=\s*([^,\r\n]+)")

    # Dicionário com os itens de literatura relevantes (Output)
    itens_catalogados = {}

    # Categorias ignoradas para usar no filtro
    categorias_ignoradas = {"Memento", "Junk", "Gardening"}

    for match in padrao_item.finditer(conteudo):
        nome_bruto = match.group(1).strip()
        corpo = match.group(2)

        # Parseia todas as propriedades do bloco do item
        props = {}
        for prop in padrao_propriedade.finditer(corpo):
            chave = prop.group(1).strip()
            valor = prop.group(2).strip()
            props[chave] = valor

        categoria_jogo = props.get("DisplayCategory", "Literature")

        # Filtro 1: Ignorados imediatos
        if categoria_jogo in categorias_ignoradas or "BagSeed" in nome_bruto:
            continue

        # Filtro 2: Seleção estrita do que é relevante
        eh_skillbook = "SkillTrained" in props
        tem_receita = "LearnedRecipes" in props

        if eh_skillbook:
            tipo_item = "SkillBook"
        elif tem_receita:
            tipo_item = "RecipeMagazine"
        else:
            # Cai aqui tudo que não ensina perícia nem receita:
            # jornais comuns, HQs, cadernos, livros genéricos, etc.
            continue

        # ======================================================================
        # CÁLCULO HÍBRIDO DO BOOST DE SKILL COM TRADUÇÃO DINÂMICA
        # ======================================================================
        skill_boost = None

        if eh_skillbook:
            skill_bruta = props["SkillTrained"].strip()

            # LvlSkillTrained: nível inicial do efeito do livro
            lvl_min = int(props.get("LvlSkillTrained", 1))
            # NumLevelsTrained: quantidade de níveis abrangidos (padrão do PZ: 2)
            delta = int(props.get("NumLevelsTrained", 2))
            lvl_max = lvl_min + delta - 1

            # Chave exata para busca no IG_UI.json
            chave_perk = f"IGUI_perks_{skill_bruta}"

            skill_names = traduzir_texto(
                chave_traducao=chave_perk,
                dicionario_categoria=traducoes["perks"],
                fallback_padrao=skill_bruta
            )

            skill_boost = {
                "skill": skill_bruta,
                "skill_names": skill_names,
                "min_level": lvl_min,
                "max_level": lvl_max,
                "label": f"{lvl_min}–{lvl_max}"
            }

        # ======================================================================
        # TRATAMENTO DAS RECEITAS APRENDIDAS
        # ======================================================================
        lista_receitas = []

        if tem_receita:
            # Quebra por ponto e vírgula e remove espaços em branco
            receitas_brutas = props["LearnedRecipes"].split(";")

            lista_receitas = [
                receita.strip(" ,") 
                for receita in receitas_brutas 
                if receita.strip(" ,")
            ]

        # ======================================================================
        # RESOLUÇÃO DO ÍCONE E NOMES BILÍNGUES
        # ======================================================================
        item_id = f"Base.{nome_bruto}"

        # Montagem dinâmica para todos os idiomas suportados
        item_names = traduzir_texto(
            chave_traducao=item_id,
            dicionario_categoria=traducoes["itens"],
            fallback_padrao=nome_bruto
        )

        icone = props.get("Icon", nome_bruto)

        # ======================================================================
        # MONTAGEM DO OBJETO ESTRUTURADO
        # ======================================================================
        itens_catalogados[nome_bruto] = {
            "id": item_id,
            "type": tipo_item,
            "icon": icone,
            "names": item_names,
            "skill_boost": skill_boost,
            "recipes": lista_receitas
        }

    return itens_catalogados


# ==============================================================================
# 4. EXTRAÇÃO DE FITAS VHS
# ==============================================================================
def extrair_vhs(diretorio_media: Path, traducoes: dict) -> dict:
    '''
    Lê o recorded_media.lua, procura por VHS e formata para a estrutura de dados final.

    Input: Diretório da pasta media do jogo e dicionário de dicionários de traduções
    
    Ouput: Dicionário com os VHS. 
    '''
    # Diretório padrão para o arquivo recorded_media.lua
    diretorio_recorded_media_lua = diretorio_media / "lua" / "shared" / "RecordedMedia" / "recorded_media.lua"

    with open(diretorio_recorded_media_lua, "r", encoding="utf-8", errors="ignore") as f:
        conteudo_lua = f.read()
    
    # padrao_bloco: localiza blocos "RecMedia NomeDoVHS = { corpo }"
    padrao_bloco = re.compile(r'RecMedia\["([a-f0-9\-]+)"\]\s*=\s*\{([^;]+)\};', re.DOTALL)

    # Dicionário com os VHS (Output)
    itens_vhs = {}

    for match in padrao_bloco.finditer(conteudo_lua):
        media_id = match.group(1)
        corpo = match.group(2)

        # Localiza a categoria da RecMedia
        match_cat = re.search(r'category\s*=\s*"([^"]+)"', corpo)
        categoria = match_cat.group(1) if match_cat else ""

        # Filtra pela categoria que contém "vhs"
        if "vhs" in categoria.lower():
            match_nome = re.search(r'itemDisplayName\s*=\s*"([^"]+)"', corpo)
            chave_vhs_nome = match_nome.group(1) if match_nome else None

            # Montagem dinâmica para todos os idiomas suportados
            vhs_names = traduzir_texto(
                chave_traducao=chave_vhs_nome,
                dicionario_categoria=traducoes["vhs"],
                fallback_padrao=f"VHS {media_id}"
            )

            # Cálculo de XP
            skills = re.findall(r'([A-Z]{3})\+\d+', corpo)
            xp_rewards = []

            for sigla, contagem in Counter(skills).items():
                # Converte a sigla da fita (ex: "CRP") no identificador canônico (ex: "Carpentry")
                skill_id = MAPA_SKILLS_VHS.get(sigla, sigla)
                
                # Monta a chave oficial de busca no IG_UI.json
                chave_perk = f"IGUI_perks_{skill_id}"

                # Gera dinamicamente o dicionário para todos os idiomas suportados
                skill_names = traduzir_texto(
                    chave_traducao=chave_perk,
                    dicionario_categoria=traducoes["perks"],
                    fallback_padrao=skill_id
                )

                xp_rewards.append({
                    "skill": skill_id,
                    "skill_names": skill_names,
                    "amount": contagem * XP_POR_PONTO
                })

            # Captura de Receitas
            receitas = list(dict.fromkeys(re.findall(r'RCP=([A-Za-z0-9_]+)', corpo)))

            registro_id = f"RM.{media_id}"
            itens_vhs[registro_id] = {
                "id": registro_id,
                "category": categoria,
                "icon": "Cassette3", # Ícone padrão para os VHS
                "names": vhs_names,
                "xp_rewards": xp_rewards,
                "recipes": receitas
            }

    return itens_vhs

# ==============================================================================
# 5. SINCRONIZAÇÃO DE ASSETS COM PRUNING E FALLBACK
# ==============================================================================
def sincronizar_icones(
    itens_catalogados: dict,
    pasta_texturas_brutas: Path,
    pasta_estatica_app: Path
):
    pasta_estatica_app.mkdir(parents=True, exist_ok=True)

    # Configuração do Fallback (Spiffo)
    nome_placeholder = "placeholder.png"
    diretorio_destino_placeholder = pasta_estatica_app / nome_placeholder
    icone_placeholder = "Item_SpiffoXL.png"
    origem_placeholder = None

    teste_diretorio = pasta_texturas_brutas / icone_placeholder
    if teste_diretorio.exists():
        origem_placeholder = teste_diretorio

    if origem_placeholder:
        shutil.copy2(origem_placeholder, diretorio_destino_placeholder)
    elif not diretorio_destino_placeholder.exists():
        print(f"[ALERTA CRÍTICO] Ícone não encontrado em {pasta_texturas_brutas}! (procurado: {icone_placeholder})")
        print("-> A aplicação ficará sem imagem padrão de fallback até que essa textura seja extraída.")

    arquivos_esperados_no_app = {nome_placeholder}
    # Setar para não haver icones repetidos
    icones_unicos = {dados["icon"] for dados in itens_catalogados.values()}

    icones_faltantes = []
    icones_copiados = 0

    print(f"\n--- Sincronizando {len(icones_unicos)} ícones ---")

    for icone in icones_unicos:
        candidatos = [f"Item_{icone}.png", f"{icone}.png"]
        arquivo_encontrado = None

        for nome_arquivo in candidatos:
            diretorio_origem = pasta_texturas_brutas / nome_arquivo
            if diretorio_origem.exists():
                arquivo_encontrado = diretorio_origem
                break

        if arquivo_encontrado:
            diretorio_destino = pasta_estatica_app / arquivo_encontrado.name
            shutil.copy2(arquivo_encontrado, diretorio_destino)
            icones_copiados += 1
            arquivos_esperados_no_app.add(arquivo_encontrado.name)
        else:
            print(f"[AVISO] Ícone ausente: '{icone}' (tentativas: {candidatos})")
            icones_faltantes.append(icone)

    # Remoção de Obsoletos (Pruning)
    arquivos_atuais = set(f.name for f in pasta_estatica_app.glob("*.png"))
    arquivos_obsoletos = arquivos_atuais - arquivos_esperados_no_app

    removidos = 0
    for nome_obsoleto in arquivos_obsoletos:
        (pasta_estatica_app / nome_obsoleto).unlink()
        print(f"[REMOVIDO] Ícone obsoleto deletado: {nome_obsoleto}")
        removidos += 1

    # 3. Relatório
    print("\n--- Relatório de Sincronização ---")
    print(f" Ícones sincronizados/atualizados: {icones_copiados}")
    print(f" Ícones obsoletos removidos: {removidos}")
    if icones_faltantes:
        print(f"⚠️ Ícones não localizados ({len(icones_faltantes)}): {icones_faltantes}")
    else:
        print(" Todos os ícones foram localizados perfeitamente!")