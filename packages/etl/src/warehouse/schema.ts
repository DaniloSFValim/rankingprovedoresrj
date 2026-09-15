/**
 * Esquema relacional do NETRANK RJ (§7).
 *
 * Motor: SQLite (arquivo unico, portavel, versionavel). O SQL e mantido
 * deliberadamente proximo de ANSI para que a migracao para PostgreSQL/Supabase
 * seja uma troca de driver, e nao uma reescrita (§42).
 *
 * Principio de historico (§38): `fato_acessos` e append-only por competencia.
 * Reprocessar uma competencia apaga e regrava APENAS aquela competencia;
 * nenhuma importacao jamais trunca a serie historica inteira.
 */
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- procedencia
CREATE TABLE IF NOT EXISTS fontes_dados (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  nome               TEXT NOT NULL,
  url                TEXT NOT NULL,
  arquivo            TEXT NOT NULL,
  hash_sha256        TEXT,
  bytes              INTEGER,
  coletado_em        TEXT NOT NULL,
  dados_demonstrativos INTEGER NOT NULL DEFAULT 0,
  UNIQUE (arquivo, hash_sha256)
);

CREATE TABLE IF NOT EXISTS execucoes_importacao (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  fonte_id           INTEGER REFERENCES fontes_dados(id),
  iniciado_em        TEXT NOT NULL,
  concluido_em       TEXT,
  status             TEXT NOT NULL CHECK (status IN ('EM_ANDAMENTO','SUCESSO','FALHA')),
  linhas_lidas       INTEGER NOT NULL DEFAULT 0,
  linhas_rj          INTEGER NOT NULL DEFAULT 0,
  linhas_rejeitadas  INTEGER NOT NULL DEFAULT 0,
  mensagem           TEXT
);

-- ------------------------------------------------------------------ dimensoes
CREATE TABLE IF NOT EXISTS grupos_economicos (
  id                 TEXT PRIMARY KEY,
  nome               TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS empresas (
  id                   TEXT PRIMARY KEY,
  nome_normalizado     TEXT NOT NULL,
  cnpj                 TEXT,
  grupo_economico_id   TEXT REFERENCES grupos_economicos(id),
  categoria            TEXT NOT NULL DEFAULT 'INDEFINIDA',
  status               TEXT NOT NULL DEFAULT 'ATIVA',
  origem_identidade    TEXT NOT NULL
);

-- Todas as grafias da Anatel ja vistas, apontando para a empresa normalizada.
-- E a tabela que torna o agrupamento auditavel e corrigivel (§8, §39).
CREATE TABLE IF NOT EXISTS empresas_aliases (
  chave_nome           TEXT PRIMARY KEY,
  nome_original_anatel TEXT NOT NULL,
  empresa_id           TEXT NOT NULL REFERENCES empresas(id),
  origem               TEXT NOT NULL,
  primeira_vez_em      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS municipios (
  codigo_ibge        TEXT PRIMARY KEY,
  nome               TEXT NOT NULL,
  uf                 TEXT NOT NULL DEFAULT 'RJ',
  regiao             TEXT
);

-- ----------------------------------------------------------------- fato unico
-- Menor granularidade persistida. Tudo o mais e derivado desta tabela.
CREATE TABLE IF NOT EXISTS fato_acessos (
  competencia        TEXT NOT NULL,
  codigo_ibge        TEXT NOT NULL,
  empresa_id         TEXT NOT NULL REFERENCES empresas(id),
  tecnologia         TEXT NOT NULL,
  acessos            INTEGER NOT NULL CHECK (acessos >= 0),
  execucao_id        INTEGER REFERENCES execucoes_importacao(id),
  PRIMARY KEY (competencia, codigo_ibge, empresa_id, tecnologia)
);

-- Indices alinhados aos quatro eixos de consulta do produto (§41).
CREATE INDEX IF NOT EXISTS ix_fato_competencia   ON fato_acessos (competencia);
CREATE INDEX IF NOT EXISTS ix_fato_municipio     ON fato_acessos (codigo_ibge, competencia);
CREATE INDEX IF NOT EXISTS ix_fato_empresa       ON fato_acessos (empresa_id, competencia);
CREATE INDEX IF NOT EXISTS ix_fato_tecnologia    ON fato_acessos (tecnologia, competencia);

-- ------------------------------------------------------------ alertas de QA
CREATE TABLE IF NOT EXISTS alertas_qualidade (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  execucao_id        INTEGER REFERENCES execucoes_importacao(id),
  competencia        TEXT,
  severidade         TEXT NOT NULL CHECK (severidade IN ('INFO','ATENCAO','CRITICO')),
  tipo               TEXT NOT NULL,
  entidade           TEXT,
  mensagem           TEXT NOT NULL,
  criado_em          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_alertas_execucao ON alertas_qualidade (execucao_id);
`;
