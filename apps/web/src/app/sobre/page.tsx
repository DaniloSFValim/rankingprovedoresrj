import { lerMeta } from '@/lib/dados';
import { MARCA } from '@/lib/marca';
import citacao from '@/lib/citacao.json';

export const metadata = {
  title: `Sobre — ${MARCA.nome}`,
  description: 'Informações sobre o projeto, autoria, registro, dados e indicadores.',
};

/** Citação em BibTeX a partir do registro do Zenodo (DOI de conceito). */
function gerarBibtex(): string {
  const ano = citacao.dataPublicacao.slice(0, 4);
  return `@software{valim_netrank_rj_${ano},
  author    = {Valim, Danilo},
  title     = {{${MARCA.nome}}: ${MARCA.subtitulo}},
  year      = {${ano}},
  version   = {${citacao.versao}},
  publisher = {Zenodo},
  doi       = {${citacao.doiConceito}},
  url       = {https://doi.org/${citacao.doiConceito}}
}`;
}

export default function PaginaSobre() {
  const meta = lerMeta();
  const p = meta.procedencia;
  const a = p.academicos;
  const bibtex = gerarBibtex();

  return (
    <div className="space-y-12 mx-auto max-w-3xl">
      {/* Sobre o Projeto */}
      <section>
        <h1 className="text-3xl font-bold text-tinta mb-4">{MARCA.nome}</h1>
        <p className="text-grafite-300 mb-4">
          {MARCA.subtitulo}
        </p>
        <div className="space-y-3 text-sm text-grafite-400">
          <p>
            Software independente, de autoria própria, com finalidade acadêmica e de pesquisa. Organiza os
            dados públicos de acessos de banda larga fixa dos municípios fluminenses em indicadores comparáveis
            de participação, concentração, densidade e velocidade contratada.
          </p>
          <p>
            Usa apenas dados públicos: a Anatel publica os acessos, o IBGE os domicílios e a malha municipal, e
            a Receita Federal o cadastro de CNPJ. O {MARCA.nome} não tem vínculo com essas instituições nem com
            qualquer órgão público ou empresa, e seus indicadores não são conclusão jurídica, concorrencial ou
            regulatória.
          </p>
        </div>
      </section>

      {/* Como Citar */}
      {a && (
        <section>
          <h2 className="text-xl font-bold text-tinta mb-4">Como citar este projeto</h2>
          <div className="text-sm leading-relaxed text-grafite-200 bg-white p-4 rounded-md border border-grafite-700 overflow-x-auto mb-4">
            Valim, D. ({citacao.dataPublicacao.slice(0, 4)}). <em>{MARCA.nome}: {MARCA.subtitulo}</em>{' '}
            (versão {citacao.versao}) [Software]. Zenodo.{' '}
            <a href={`https://doi.org/${citacao.doiConceito}`} className="text-marca-400 underline underline-offset-4">
              https://doi.org/{citacao.doiConceito}
            </a>
          </div>
          <p className="mb-4 text-sm text-grafite-400">
            O DOI acima é o de conceito: identifica o projeto e sempre resolve para a versão mais recente.
            Para citar exatamente a versão {citacao.versao}, use o DOI de versão listado no registro do Zenodo.
          </p>

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
              <a
                href="https://www.gnu.org/licenses/agpl-3.0.html"
                className="text-marca-400 hover:underline"
                rel="noreferrer noopener"
                target="_blank"
              >
                AGPL-3.0 (código)
              </a>
              {' '}e{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/deed.pt-br"
                className="text-marca-400 hover:underline"
                rel="noreferrer noopener"
                target="_blank"
              >
                CC BY 4.0 (documentação e dados)
              </a>
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
            <dt className="font-semibold text-grafite-200">Último mês preliminar</dt>
            <dd>
              O mês mais recente chega incompleto, porque parte das prestadoras declara com atraso, e
              costuma ser revisado para cima na publicação seguinte. As listas de movimentação comparam
              os dois meses anteriores, já consolidados.
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
              Commit:{' '}
              <code className="numerico text-grafite-300">{a.commitHash}</code>
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
        </ul>
      </section>
    </div>
  );
}
