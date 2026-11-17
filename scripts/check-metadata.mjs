// Confere se versão, título, licença e DOI batem entre package.json,
// CITATION.cff, .zenodo.json e o citacao.json usado no rodapé, e valida o
// CITATION.cff contra o schema oficial do Citation File Format 1.2.0.
// Uso: npm run check-metadata. Sai com código 1 se algo divergir.
import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

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

const schemaCff = JSON.parse(await ler('scripts/cff-schema-1.2.0.json'));
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
if (!ajv.validate(schemaCff, YAML.parse(cff))) {
  for (const e of ajv.errors ?? []) erros.push(`CITATION.cff ${e.instancePath || '/'}: ${e.message}`);
}
const orcidValido = (id) => {
  // Dígito verificador ISO 7064 MOD 11-2, como o ORCID especifica.
  const d = id.replace(/-/g, '');
  let t = 0;
  for (const c of d.slice(0, -1)) t = (t + Number(c)) * 2;
  const r = (12 - (t % 11)) % 11;
  return (r === 10 ? 'X' : String(r)) === d.at(-1);
};
for (const c of zenodo.creators) {
  if (c.orcid && !orcidValido(c.orcid)) erros.push(`ORCID inválido em .zenodo.json: ${c.orcid}`);
}
if (!orcidValido(citacao.orcid)) erros.push(`ORCID inválido em citacao.json: ${citacao.orcid}`);

if (erros.length) {
  console.error('Metadados divergentes:');
  for (const e of erros) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Metadados consistentes na versão ${pacote.version} (licença ${pacote.license}); CITATION.cff válido; ORCID com dígito verificador correto.`);
