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

# Destinos dentro do seu projeto de checklist:
PASTA_DATA = Path("data")
PASTA_STATIC_ICONS = Path("app/static/icons")
ARQUIVO_ITEMS_JSON = PASTA_DATA / "items.json"

XP_POR_PONTO = 12.5

# ==============================================================================
# 2. TRADUÇÃO (PTBR/EN)
# ==============================================================================
def traduzir(diretorio_media: Path) -> dict:
    '''
    Input: Diretório da pasta media do jogo

    Ouput: Dicionário com a tradução do nome do item em PTBR e EN
    '''
    # Defina os diretórios dos dois arquivos
    item_name_pt = diretorio_media / "lua" / "shared" / "Translate" / "PTBR" / "ItemName.json"
    item_name_en = diretorio_media / "lua" / "shared" / "Translate" / "EN" / "ItemName.json"

    # Carregar ambos os arquivos na memória
    with open(item_name_pt, "r", encoding="utf-8") as f:
        nomes_pt = json.load(f)
    with open(item_name_en, "r", encoding="utf-8") as f:
        nomes_en = json.load(f)

    return {"pt": nomes_pt, "en": nomes_en}


# ==============================================================================
# 3. EXTRAÇÃO DE LIVROS E REVISTAS
# ==============================================================================
def extrair_literatura(diretorio_media: Path, traducao: dict) -> dict:
    '''
    Input: Diretório da pasta media do jogo; Dicionário com a tradução do nome do item em PTBR e EN

    Output:
    '''
    diretorio_literature = diretorio_media / "scripts" / "generated" / "items" / "literature.txt"
    padrao_item = re.compile(r"item\s+([A-Za-z0-9_\-]+)\s*\{([^}]+)\}", re.DOTALL)
    padrao_propriedade = re.compile(r"(\w+)\s*=\s*([^,\r\n]+)")

    itens_literatura = {}
    nomes_en = traducao["en"]
    nomes_pt = traducao["pt"]

    with open(diretorio_literature, "r", encoding="utf-8", errors="ignore") as f:
        conteudo = f.read()

    for match in padrao_item.finditer(conteudo):
        nome_item = match.group(1)
        corpo = match.group(2)

        propriedades = {}
        for prop in padrao_propriedade.finditer(corpo):
            propriedades[prop.group(1).strip()] = prop.group(2).strip()

        if propriedades.get("Type", "").lower() == "literature":
            item_id = f"Base.{nome_item}"
            icone = propriedades.get("Icon", nome_item)

            itens_literatura[item_id] = {
                "id": item_id,
                "category": "Literature",
                "icon": icone,
                "names": {
                    "en": nomes_en.get(item_id, nomes_pt.get(item_id, nome_item)),
                    "pt": nomes_pt.get(item_id, nomes_en.get(item_id, nome_item))
                },
                "skill": propriedades.get("SkillTrained", None),
                "pages": propriedades.get("NumberOfPages", None)
            }

    return itens_literatura


# ==============================================================================
# 4. EXTRAÇÃO DE FITAS VHS
# ==============================================================================
def extrair_vhs(caminho_media: Path) -> dict:
    caminho_lua = caminho_media / "lua" / "shared" / "recorded_media.lua"
    caminho_media_json = caminho_media / "lua" / "shared" / "Translate" / "EN" / "Recorded_Media.json"

    with open(caminho_media_json, "r", encoding="utf-8") as f:
        textos_media = json.load(f)

    with open(caminho_lua, "r", encoding="utf-8", errors="ignore") as f:
        conteudo_lua = f.read()

    padrao_bloco = re.compile(r'RecMedia\["([a-f0-9\-]+)"\]\s*=\s*\{([^;]+)\};', re.DOTALL)
    itens_vhs = {}

    for match in padrao_bloco.finditer(conteudo_lua):
        media_id = match.group(1)
        corpo = match.group(2)

        match_cat = re.search(r'category\s*=\s*"([^"]+)"', corpo)
        categoria = match_cat.group(1) if match_cat else ""

        if "vhs" in categoria.lower():
            match_nome = re.search(r'itemDisplayName\s*=\s*"([^"]+)"', corpo)
            chave_nome = match_nome.group(1) if match_nome else None
            titulo_en = textos_media.get(chave_nome, f"VHS ({media_id})")

            # Cálculo de XP
            skills = re.findall(r'([A-Z]{3})\+\d+', corpo)
            xp_rewards = {skill: qtd * XP_POR_PONTO for skill, qtd in Counter(skills).items()}

            # Captura de Receitas
            receitas = list(dict.fromkeys(re.findall(r'RCP=([A-Za-z0-9_]+)', corpo)))

            registro_id = f"RM.{media_id}"
            itens_vhs[registro_id] = {
                "id": registro_id,
                "category": categoria,
                "icon": "Cassette3",
                "names": {
                    "en": titulo_en,
                    "pt": titulo_en  # Fallback padrão
                },
                "gives_xp": len(xp_rewards) > 0,
                "xp_rewards": xp_rewards,
                "teaches_recipes": len(receitas) > 0,
                "recipes": receitas
            }

    return itens_vhs