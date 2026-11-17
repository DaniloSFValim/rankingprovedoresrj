# Padrões dos projetos de Danilo Valim

Vale para NETRANK RJ, OpenLux e CADEX. Cada repositório tem uma cópia deste
arquivo em `docs/PADROES.md` e referencia a cópia no `CLAUDE.md` (ou em
`docs/`, quando não há `CLAUDE.md`).

Se a cópia local divergir desta, a versão mais recente vence. Mudanças saem
por PR nos três repositórios.

## 1. Identidade e linguagem visual

- **Cor de marca:** petróleo `#0e7482`, a mesma nos três projetos.
- **Fonte:** Public Sans em todo o site, para texto, títulos e números. Sem
  outra família, sem monoespaçada.
- **Números com largura fixa** (CNPJ, contagens, datas, códigos): classe
  `tabular` (`font-variant-numeric: tabular-nums`).
- **Estados:** verde `#1e7b4c` para situação positiva, vermelho `#b3372c` para
  negativa, âmbar `#8f5b00` para atenção. Só para situação, nunca decoração.
- **Tema:** claro. O papel é `#f3f5f4` e o texto é escuro.
- **Sem:** sombras, gradientes decorativos, cartões idênticos repetidos,
  rótulos em caixa-alta espaçada, setas "→" em links, texto emendado com "·".
- **Superfícies:** cartão com fundo branco, linha fina e sem sombra.

## 2. Texto

- Português, frases simples, verbo no botão ("Exportar planilha",
  "Imprimir ficha").
- Sem emojis, em interface, rodapé e documentação do site.
- Caixa-alta só em siglas e em termos oficiais citados como estão na norma.
- Estado vazio diz o que fazer.
- Números citados em texto ou commit vêm dos artefatos, nunca de memória.

## 3. Rodapé

Mesmo modelo nos três sites. Só a linha de licença varia por projeto.

```
Desenvolvido por Danilo Valim (UFRRJ), ORCID 0009-0009-7250-6151.
Código sob <licença do código>; <licença da documentação e dos dados>.
Registro citável no Zenodo, DOI 10.5281/zenodo.<concept>.
© <ano da publicação> Danilo Valim.
```

- Autor: nome de crédito do ORCID.
- Afiliação: UFRRJ, em todos os projetos.
- DOI: sempre o de conceito, nunca o de versão.
- Sem link para o GitHub no site. O repositório continua público.
- Os dados vêm do Zenodo e do ORCID, pelo script `atualiza-citacao.mjs` de
  cada repositório.

## 4. Licenças

| Projeto | Código | Documentação e dados |
|---|---|---|
| NETRANK RJ | AGPL-3.0-only | CC BY 4.0 |
| OpenLux | MIT | Dados de cada município pertencem ao município |

Quando um projeto tem duas licenças, o código fica em `LICENSE-CODIGO` e o
resto em `LICENSE`. O README explica a divisão.

## 5. Independência e marca

- Sem brasão, logotipo ou nome de órgão público no site, salvo autorização
  escrita.
- Cada projeto se apresenta como software independente do autor, sem
  associação a órgão público, e cita as fontes públicas de dados sem sugerir
  vínculo com elas.
- Nome de crédito e afiliação iguais no ORCID, no Zenodo e no rodapé.

## 6. Metadados e citação

- `.zenodo.json` é a fonte de verdade. `CITATION.cff` precisa bater com ele
  em título, versão e licença, e com o DOI de conceito.
- A versão aparece igual em `package.json`, no topo do CHANGELOG (quando
  houver), em `CITATION.cff` e em `.zenodo.json`.
- O script `check-metadata` confere esses campos e falha o CI se divergirem.
- Um release do GitHub gera a versão no Zenodo. O arquivo de uma versão não
  muda depois de publicado, então os metadados devem estar corretos antes.
- O DOI de conceito é o único citado em texto de site e de citação.
- Projetos sem registro no Zenodo não têm `.zenodo.json` nem `CITATION.cff`.

## 7. Estado atual do NETRANK RJ

- O registro no Zenodo (versão 1.1.0) tem licença CC BY 4.0 e descrição antiga.
  A AGPL-3.0 do código e a descrição nova passam a valer no próximo release.
- A integração GitHub–Zenodo só pode ser confirmada pelo autor, na conta do
  Zenodo (aba GitHub).

As pendências dos outros projetos ficam nos repositórios deles.
