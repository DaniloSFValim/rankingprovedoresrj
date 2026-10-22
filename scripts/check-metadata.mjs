// Confere se versão, título, licença e DOI batem entre package.json,
// CITATION.cff, .zenodo.json e o citacao.json usado no rodapé.
// Uso: npm run check-metadata. Sai com código 1 se algo divergir.
import { readFile } from 'node:fs/promises';

const ler = (arquivo) => readFile(new URL(`../${arquivo}`, import.meta.url), 'utf8');
const campoYaml = (texto, chave) => {
  const m = texto.match(new RegExp(`^${chave}:\\s*"?([^"\\n]+?)"?\\s*$`, 'm'));
  return m ? m[1] : undefined;
};

// O Zenodo grava a licença em minúsculas e em outro formato (SPDX curto).
const LICENCA_ZENODO = { 'AGPL-3.0-only': 'agpl-3.0' };

const pacote = JSON.parse(await ler('package.json'));
const zenodo = JSON.parse(await ler('.zenodo.json'));
const cff = await ler('CITATION.cff');
const citacao = JSON.parse(await ler('apps/web/src/lib/citacao.json'));

const erros = [];
const confere = (nome, a, b) => { if (a !== b) erros.push(`${nome}: "${a}" diferente de "${b}"`); };

confere('versão package.json x CITATION.cff', pacote.version, campoYaml(cff, 'version'));
confere('versão package.json x .zenodo.json', pacote.version, zenodo.version);
confere('versão package.json x citacao.json', pacote.version, citacao.versao);
confere('título CITATION.cff x .zenodo.json', campoYaml(cff, 'title'), zenodo.title);
confere('licença package.json x CITATION.cff', pacote.license, campoYaml(cff, 'license'));
confere('licença package.json x .zenodo.json', LICENCA_ZENODO[pacote.license], zenodo.license);
confere('DOI CITATION.cff x DOI de conceito do rodapé', campoYaml(cff, 'doi'), citacao.doiConceito.replace('https://doi.org/', ''));

if (erros.length) {
  console.error('Metadados divergentes:');
  for (const e of erros) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Metadados consistentes na versão ${pacote.version} (licença ${pacote.license}).`);
