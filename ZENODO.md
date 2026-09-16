# Publicação em Zenodo

Este documento descreve como publicar o NETRANK RJ em Zenodo para obter um DOI permanente.

## O que é Zenodo?

Zenodo é um repositório de dados científicos mantido pelo CERN, que fornece:
- **DOI permanente** para citação acadêmica
- **Versionamento** de datasets
- **Indexação** em Google Scholar e bases acadêmicas
- **Acesso aberto** em perpetuidade
- **Visibilidade** global

## Pré-requisitos

1. **Conta no Zenodo** (gratuita)
   - Acesse: https://zenodo.org/signup/
   - Use sua conta institucional ou email

2. **Token de acesso** (para automação futura)
   - Settings → Applications → Personal access tokens

## Passo-a-Passo de Publicação

### 1. Preparar os Arquivos para Zenodo

```bash
# Criar arquivo compactado com dados completos
cd apps/web/public/data
zip -r netrank-rj-dataset-2026.09.16.zip .

# Ou: incluir também o código fonte
cd /home/user/rankingprovedoresrj
git archive --format=zip --output=netrank-rj-source-2026.09.16.zip HEAD
```

### 2. Fazer Upload Manual

**Opção A: Upload web (mais simples)**

1. Acesse: https://zenodo.org/deposit/new
2. Preencha os metadados:

   **Título:**
   ```
   NETRANK RJ: Inteligência de Mercado de Banda Larga Fixa no Rio de Janeiro
   ```

   **Descrição:**
   ```
   Plataforma de análise do mercado de banda larga fixa do Estado do Rio de Janeiro,
   construída sobre os dados abertos da Anatel. Fornece indicadores de concentração de
   mercado (CR1, CR3, CR5, CR10, HHI), ranking de provedores e análise histórica mensal
   de acessos (jan/2022 - jul/2026) para 1.539 provedores em 92 municípios.
   
   Dataset versão: 2026.09.16
   Período coberto: janeiro/2022 a julho/2026
   Última atualização: 16 de setembro de 2026
   
   Dados originários da Anatel — Agência Nacional de Telecomunicações
   (https://www.anatel.gov.br/dadosabertos/)
   ```

   **Criadores:**
   ```
   Nome: Danilo S. F. Valim
   ORCID: 0009-0009-7250-6151
   Afiliação: Universidade Federal Rural do Rio de Janeiro (UFRRJ)
   Email: danilosfvalim@gmail.com
   ```

   **Palavras-chave:**
   ```
   banda larga, telecomunicações, Rio de Janeiro, Anatel, análise de dados,
   políticas públicas, concentração de mercado, dados abertos
   ```

   **Licença:** `Creative Commons Attribution 4.0 International`

   **Tipo de recurso:** `Dataset`

   **Disciplinas:** 
   - `Computer and Information Sciences`
   - `Social Sciences`
   - `Engineering`

   **Formato dos arquivos:**
   - Selecione os arquivos JSON (dados)
   - Ou upload ZIP preparado acima

3. Clique em "Publish"

4. **Anote o DOI** fornecido (formato: `10.5281/zenodo/XXXXXXX`)

### 3. Atualizar NETRANK RJ com o DOI

Após obter o DOI, atualize os arquivos:

**1. `apps/web/public/data/meta.json`:**
```json
"academicos": {
  "doi": "10.5281/zenodo/XXXXXXX",
  ...
}
```

**2. `apps/web/public/dataset-schema.json`:**
```json
"identifier": "10.5281/zenodo/XXXXXXX",
"distribution": [
  {
    "url": "https://zenodo.org/record/XXXXXXX"
  }
]
```

**3. `CITATION.cff`:**
```yaml
doi: "10.5281/zenodo/XXXXXXX"
```

**4. Fazer commit:**
```bash
git add meta.json dataset-schema.json CITATION.cff
git commit -m "chore: Adicionar DOI Zenodo"
git push
```

## Próximas Publicações

Para versões futuras do dataset:

1. Vá para o registro no Zenodo
2. Clique em "New version"
3. Atualize os arquivos
4. O DOI anterior será marcado como versão anterior
5. Um novo DOI será gerado para a versão atual

## Verificação

Após publicação, aguarde 15-30 minutos e verifique:

- [ ] DOI ativo em `doi.org/10.5281/zenodo/XXXXXXX`
- [ ] Indexado em Google Scholar (até 7 dias)
- [ ] Citação em formato BibTeX disponível
- [ ] Metadados visíveis em Zenodo

## Automação Futura (Opcional)

```bash
# Publicar automaticamente via CLI
zenodo-cli publish \
  --title "NETRANK RJ" \
  --creator "Danilo S. F. Valim" \
  --creator-orcid "0009-0009-7250-6151" \
  --license cc-by \
  --keywords "banda larga,telecomunicações,Anatel" \
  netrank-rj-dataset-2026.09.16.zip
```

## Referências

- Zenodo Help: https://zenodo.org/help/
- DOI Datacite: https://datacite.org/
- Schema.org Dataset: https://schema.org/Dataset
