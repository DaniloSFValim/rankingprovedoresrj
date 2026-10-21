// Atualiza o arquivo com autoria (ORCID) e registro citável (Zenodo) do rodapé.
// Uso: node scripts/atualiza-citacao.mjs
// Sem rede, mantém o arquivo que já existe e avisa. O build nunca quebra por isso.
import { readFile, writeFile } from 'node:fs/promises';

const ORCID = '0009-0009-7250-6151';
// Número do DOI de conceito: aponta para a versão mais recente do registro.
const CONCEITO_ZENODO = '22839933';
const SAIDA = new URL('../apps/web/src/lib/citacao.json', import.meta.url);

async function buscaJson(url) {
  const resposta = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resposta.ok) throw new Error(`${url} respondeu ${resposta.status}`);
  return resposta.json();
}

async function main() {
  const [registro, pessoa] = await Promise.all([
    buscaJson(`https://zenodo.org/api/records/${CONCEITO_ZENODO}`),
    buscaJson(`https://pub.orcid.org/v3.0/${ORCID}/person`),
  ]);

  const nome = pessoa.name['credit-name']?.value
    ?? `${pessoa.name['given-names'].value} ${pessoa.name['family-name'].value}`;

  const dados = {
    autor: nome,
    orcid: ORCID,
    doiConceito: registro.conceptdoi,
    versao: registro.metadata.version,
    dataPublicacao: registro.metadata.publication_date,
    atualizadoEm: new Date().toISOString().slice(0, 10),
  };

  await writeFile(SAIDA, `${JSON.stringify(dados, null, 2)}\n`);
  console.log(`citacao.json atualizado: ${dados.autor}, ${dados.doiConceito}, versão ${dados.versao}`);
}

try {
  await main();
} catch (erro) {
  console.warn(`Não foi possível atualizar a citação (${erro.message}). Mantido o arquivo atual.`);
  try {
    await readFile(SAIDA);
  } catch {
    process.exitCode = 1;
  }
}
