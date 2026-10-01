import Link from 'next/link';
import { lerMeta } from '@/lib/dados';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Sobre — ${MARCA.nome}`,
  description: 'Informações sobre o projeto, autoria, registro, dados e indicadores.',
};

/** Gerar citação em formato BibTeX */
function gerarBibtex(a: any, p: any): string {
  const ano = new Date(p.processadoEm).getFullYear();
  const autores = a.autores.map((au: any) => au.nome).join(' and ');
  const doi = a.doi || '10.zenodo.XXXXXXX';
  return `@dataset{${MARCA.nome.toLowerCase().replace(/\s+/g, '_')}_${ano},
  author = {${autores}},
  title = {${MARCA.nome}: ${MARCA.subtitulo}},
  year = {${ano}},
  version = {${a.versaoDataset}},
  publisher = {Zenodo},
  doi = {${doi}},
  url = {https://doi.org/${doi}}
}`;
}

export default function PaginaSobre() {
  const meta = lerMeta();
  const p = meta.procedencia;
  const a = p.academicos;
  const bibtex = a ? gerarBibtex(a, p) : '';

  return (
    <main className="space-y-12 mx-auto max-w-3xl">
      {/* Sobre o Projeto */}
      <section>
        <h1 className="text-3xl font-bold text-tinta mb-4">{MARCA.nome}</h1>
        <p className="text-grafite-300 mb-4">
          {MARCA.subtitulo}
        </p>
        <div className="space-y-3 text-sm text-grafite-400">
          <p>
            Painel feito para acompanhar a banda larga fixa nos municípios fluminenses, como apoio ao
            Setor de Fiscalização de Serviços Concedidos da <strong>Secretaria Municipal de Conservação e
            Serviços Públicos (Seconser)</strong> da Prefeitura de Niterói.
          </p>
          <p>
            <strong>Não é um site oficial</strong> da Prefeitura de Niterói nem da Seconser. É um trabalho
            independente do autor, e os números, indicadores e alertas publicados aqui não expressam posição
            da Prefeitura ou da Secretaria sobre o mercado ou sobre qualquer prestadora.
          </p>
          <p>
            Os números vêm dos dados abertos da Anatel e são processados de forma independente. O {MARCA.nome}
            também não tem vínculo com a Agência, e seus indicadores não são conclusão jurídica, concorrencial
            ou regulatória.
          </p>
        </div>
      </section>

      {/* Como Citar */}
      {a && (
        <section>
          <h2 className="text-xl font-bold text-tinta mb-4">Como citar este projeto</h2>
          <div className="text-sm leading-relaxed text-grafite-200 bg-white p-4 rounded-md border border-grafite-700 overflow-x-auto mb-4">
            {a.autores.map((au) => au.nome).join(', ')} ({new Date(p.processadoEm).getFullYear()}).
            {' '}
            <span className="text-grafite-200">{MARCA.nome}</span>. Versão {a.versaoDataset}.
            {a.doi && (
              <>
                {' '}
                DOI:{' '}
                <a href={`https://doi.org/${a.doi}`} className="text-marca-400 hover:underline">
                  {a.doi}
                </a>
              </>
            )}
          </div>

          <details className="border border-grafite-800 rounded p-4">
            <summary className="cursor-pointer font-medium text-marca-300 hover:text-marca-200">
              BibTeX
            </summary>
            <pre className="mt-3 text-xs bg-grafite-900 p-3 rounded border border-grafite-800 overflow-x-auto text-grafite-300">
{bibtex}
            </pre>
          </details>
        </section>
      )}

      {/* Autores */}
      {a && (
        <section>
          <h2 className="text-xl font-bold text-tinta mb-4">Autoria</h2>
          <div className="space-y-4">
            {a.autores.map((au) => (
              <div key={au.email || au.nome} className="border-l-2 border-marca-600 pl-4">
                <p className="font-medium text-tinta">{au.nome}</p>
                {au.orcid && (
                  <p className="text-sm text-marca-400">
                    <a
                      href={`https://orcid.org/${au.orcid}`}
                      className="hover:underline"
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      ORCID: {au.orcid}
                    </a>
                  </p>
                )}
              </div>
            ))}
            {a.afiliacao && (
              <div className="mt-4 pt-4 border-t border-grafite-800">
                <p className="text-sm text-grafite-400">
                  <strong>Afiliação:</strong> {a.afiliacao}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Dados e Procedência */}
      <section>
        <h2 className="text-xl font-bold text-tinta mb-4">Dados e Procedência</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-marca-400">Fonte</dt>
            <dd className="text-grafite-300">
              {p.fonte}
            </dd>
            <dd className="text-marca-400 mt-1">
              <a
                href={p.url}
                className="hover:underline break-all"
                rel="noreferrer noopener"
                target="_blank"
              >
                {p.url}
              </a>
            </dd>
          </div>
          <div className="pt-3 border-t border-grafite-800">
            <dt className="font-medium text-marca-400">Período de Cobertura</dt>
            <dd className="text-grafite-300">
              {new Date(p.coletadoEm).toLocaleString('pt-BR')} a{' '}
              {new Date(p.processadoEm).toLocaleString('pt-BR')}
            </dd>
          </div>
          <div className="pt-3 border-t border-grafite-800">
            <dt className="font-medium text-marca-400">Versão</dt>
            <dd className="text-grafite-300">{a?.versaoDataset || p.processadoEm}</dd>
          </div>
          <div className="pt-3 border-t border-grafite-800">
            <dt className="font-medium text-marca-400">Licença</dt>
            <dd className="text-grafite-300">
              {a?.licenca && (
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  className="text-marca-400 hover:underline"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {a.licenca}
                </a>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* Indicadores */}
      <section id="indicadores" className="scroll-mt-24">
        <h2 className="text-xl font-bold text-tinta mb-4">Como os indicadores são calculados</h2>
        <dl className="space-y-3 text-sm text-grafite-400">
          <div>
            <dt className="font-semibold text-grafite-200">Participação de mercado</dt>
            <dd>Acessos da prestadora ÷ total de acessos do recorte (estado ou município), na competência mais recente.</dd>
          </div>
          <div>
            <dt className="font-semibold text-grafite-200">Concentração (CR-n)</dt>
            <dd>
              Soma das participações das <em>n</em> maiores prestadoras do recorte. CR3 = participação somada
              das três maiores; o painel mostra CR1, CR3, CR5 e CR10.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-grafite-200">Concentração (HHI)</dt>
            <dd>
              Soma dos quadrados das participações, em pontos percentuais, de todas as prestadoras do recorte:
              HHI = s₁² + s₂² + … + sₙ². Vai de perto de 0 (mercado pulverizado) a 10.000 (uma só prestadora).
              Exemplo: quatro prestadoras com 25% cada dão 4 × 625 = 2.500. É um indicador estatístico de estrutura de mercado, não uma conclusão jurídica,
              concorrencial ou regulatória.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-grafite-200">Movimentações do mês</dt>
            <dd>
              Ganho e perda de acessos são comparados em números absolutos. As listas de variação percentual
              e de avanço no ranking só incluem provedores com ao menos 1.000 acessos no mês anterior (100 na
              visão de um município): abaixo disso, poucas centenas de acessos movem um provedor centenas de
              posições ou produzem variações de milhares por cento.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-grafite-200">Densidade</dt>
            <dd>
              Acessos de pessoa física por 100 domicílios particulares ocupados (Censo 2022, IBGE). Casas de
              veraneio e acessos registrados em outro município distorcem o valor; leia como ponto de verificação.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-grafite-200">Velocidade</dt>
            <dd>
              Velocidade <em>contratada</em> declarada pelas prestadoras à Anatel, não a velocidade entregue ou medida.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-grafite-200">Limite geral</dt>
            <dd>
              Os números refletem o que as prestadoras informam à Anatel; erros ou atrasos nessas declarações
              aparecem aqui.
            </dd>
          </div>
        </dl>
      </section>

      {/* Dados para reutilização */}
      <section id="dados" className="scroll-mt-24">
        <h2 className="text-xl font-bold text-tinta mb-4">Dados para download</h2>
        <p className="mb-3 text-sm text-grafite-400">
          Os mesmos arquivos que alimentam o painel, em JSON, sob a licença CC BY 4.0. Cite o
          projeto e a Anatel como fonte.
        </p>
        <ul className="space-y-1.5 text-sm">
          {[
            ['/data/estado/ranking.json', 'Ranking estadual de provedores'],
            ['/data/estado/serie.json', 'Série mensal do Estado'],
            ['/data/municipios/index.json', 'Indicadores por município, incluindo alertas de qualidade'],
            ['/data/provedores/index.json', 'Lista de provedores com acessos e participação'],
            ['/data/malhas/rj-municipios.json', 'Malha municipal (GeoJSON, IBGE)'],
            ['/data/meta.json', 'Procedência: fonte, competências e data de processamento'],
          ].map(([href, rotulo]) => (
            <li key={href} className="flex flex-wrap items-baseline gap-x-2">
              <a href={href} className="text-marca-400 hover:underline" download>
                {href.split('/').slice(-2).join('/')}
              </a>
              <span className="text-grafite-400">{rotulo}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-grafite-500">
          Cada município e cada provedor também têm arquivo próprio em /data/municipios/ e
          /data/provedores/, pelo mesmo nome usado no endereço da página.
        </p>
      </section>

      {/* Código e Rastreabilidade */}
      {a && (
        <section>
          <h2 className="text-xl font-bold text-tinta mb-4">Rastreabilidade Técnica</h2>
          <div className="space-y-2 text-sm text-grafite-400">
            <p>
              Repositório:{' '}
              <a
                href={a.urlRepositorio}
                className="text-marca-400 hover:underline"
                rel="noreferrer noopener"
                target="_blank"
              >
                {a.urlRepositorio}
              </a>
            </p>
            <p>
              Commit:{' '}
              <code className="numerico text-grafite-300">
                <a
                  href={`${a.urlRepositorio}/commit/${a.commitHash}`}
                  className="text-marca-400 hover:underline"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {a.commitHash}
                </a>
              </code>
            </p>
          </div>
        </section>
      )}

      {/* Links Úteis */}
      <section className="pt-8 border-t border-grafite-800">
        <h2 className="text-xl font-bold text-tinta mb-4">Referências</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a
              href="https://www.anatel.gov.br/dados"
              className="text-marca-400 hover:underline"
              rel="noreferrer noopener"
              target="_blank"
            >
              Dados abertos da Anatel
            </a>
          </li>
          <li>
            <a
              href={a?.urlRepositorio}
              className="text-marca-400 hover:underline"
              rel="noreferrer noopener"
              target="_blank"
            >
              Código-fonte
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
