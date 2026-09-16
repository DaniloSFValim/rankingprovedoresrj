import { rotularCompetencia } from '@netrank/core';
import { lerMeta } from '@/lib/dados';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: 'Metodologia',
  description:
    `Como o ${MARCA.nome} coleta, trata e calcula os indicadores do mercado de ` +
    `banda larga fixa do ${MARCA.uf} a partir dos dados abertos da Anatel.`,
};

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-6">
      <h2 className="text-lg font-semibold text-white">{titulo}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-grafite-300">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-grafite-800 bg-grafite-950 p-4 text-xs text-marca-300">
      {children}
    </pre>
  );
}

export default function PaginaMetodologia() {
  const meta = lerMeta();
  const p = meta.procedencia;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Metodologia</h1>
        <p className="mt-1 text-sm text-grafite-400">
          Como os números desta plataforma são produzidos — e o que eles não dizem.
        </p>
      </div>

      <Bloco titulo="Fonte">
        <p>
          Todos os dados derivam dos conjuntos de <strong>dados abertos da Anatel</strong>{' '}
          referentes aos acessos do Serviço de Comunicação Multimídia (SCM), o
          serviço sob o qual a banda larga fixa é prestada no Brasil.
        </p>
        <p>
          O painel público da Anatel é uma camada de visualização sobre um backend
          proprietário. O {MARCA.nome} <strong>não raspa esse painel</strong>: consome
          microdados abertos, cuja estrutura é estável e cujo uso para reprocessamento
          é previsto.
        </p>
        <p className="rounded-lg border border-grafite-700 bg-grafite-950 p-3">
          <strong className="text-grafite-200">Caminho de acesso.</strong> Os microdados
          podem chegar por dois caminhos, e o campo &ldquo;Conjunto&rdquo; abaixo indica
          qual foi usado. Quando a origem é a{' '}
          <a
            href="https://basedosdados.org"
            className="text-marca-400 underline-offset-2 hover:underline"
            rel="noreferrer noopener"
            target="_blank"
          >
            Base dos Dados
          </a>
          , os números continuam sendo da Anatel, mas passam por uma camada de
          tratamento de terceiro — que não é de responsabilidade da Anatel nem desta
          plataforma. Declaramos isso explicitamente em vez de atribuir tudo
          diretamente à Agência.
        </p>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="rotulo">Conjunto</dt>
            <dd>{p.fonte}</dd>
          </div>
          <div>
            <dt className="rotulo">Arquivo processado</dt>
            <dd className="break-all">{p.arquivo}</dd>
          </div>
          <div>
            <dt className="rotulo">Período coberto</dt>
            <dd>
              {rotularCompetencia(p.competenciaInicial)} a {rotularCompetencia(p.competenciaFinal)}
            </dd>
          </div>
          <div>
            <dt className="rotulo">Última atualização</dt>
            <dd>{new Date(p.processadoEm).toLocaleString('pt-BR')}</dd>
          </div>
        </dl>
      </Bloco>

      <Bloco titulo="Periodicidade e janela de análise">
        <p>
          A Anatel publica os acessos em base <strong>mensal</strong>. Cada mês é uma
          &ldquo;competência&rdquo;, identificada no formato AAAA-MM. Reimportar um mês
          substitui apenas aquele mês, nunca apaga os anteriores.
        </p>
        <p>
          A plataforma analisa uma <strong>janela móvel dos últimos 5 anos</strong>.
          Competências anteriores são descartadas da base local — não por limitação
          técnica, mas porque o mercado de banda larga fixa mudou de estrutura o
          bastante para que comparações com uma década atrás informem pouco sobre a
          concorrência atual.
        </p>
        <p>
          O histórico completo não se perde: ele permanece integralmente na fonte da
          Anatel, que publica desde 2007, e pode ser reincorporado a qualquer momento
          ampliando a janela de importação.
        </p>
      </Bloco>

      <Bloco titulo="Recorte geográfico">
        <p>
          O escopo é exclusivamente o <strong>Estado do {MARCA.uf}</strong>. O filtro por UF
          é aplicado linha a linha durante a leitura do arquivo, antes de qualquer
          agregação — registros de outras unidades da federação nunca entram no banco.
        </p>
        <p>
          A unidade mínima de análise territorial é o <strong>município</strong>,
          identificado pelo código IBGE de 7 dígitos. Registros sem código IBGE válido do
          {' '}{MARCA.ufSigla} são rejeitados e contabilizados no relatório de qualidade,
          em vez de terem o município adivinhado.
        </p>
      </Bloco>

      <Bloco titulo="Normalização e agrupamento de empresas">
        <p>
          A mesma prestadora aparece na fonte sob grafias diferentes ao longo dos anos
          (&ldquo;FULANO TELECOM LTDA&rdquo;, &ldquo;Fulano Telecom&rdquo;, &ldquo;FULANO
          TELECOM ME&rdquo;). Um ranking construído sobre a grafia bruta fatia uma única
          empresa em várias linhas — e fica simplesmente errado.
        </p>
        <p>A identidade de cada provedor é resolvida nesta ordem de confiança:</p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>
            <strong>Correção manual</strong> registrada por um operador — sempre prevalece.
          </li>
          <li>
            <strong>Raiz do CNPJ</strong> (8 primeiros dígitos), que é o critério jurídico
            de identidade e agrupa matriz e filiais.
          </li>
          <li>
            <strong>Nome canônico</strong>: texto sem acentos, pontuação ou sufixos
            societários. Heurística de último recurso, usada apenas quando a fonte não
            traz CNPJ.
          </li>
        </ol>
        <p>
          Não há fusão por similaridade textual aproximada. O risco de unir duas empresas
          distintas é maior que o benefício, e uma fusão errada contamina silenciosamente
          todo o ranking. Cada decisão registra sua origem e pode ser auditada.
        </p>
      </Bloco>

      <Bloco titulo="Market share">
        <p>Participação de um provedor no mercado de referência:</p>
        <Formula>{`market share (%) = acessos do provedor
                 ────────────────────────  × 100
                 acessos totais do mercado`}</Formula>
        <p>
          O mercado de referência é o Estado, nas páginas estaduais, e o município, nas
          páginas municipais. Provedores com zero acessos na competência não integram o
          mercado e são excluídos do cálculo.
        </p>
      </Bloco>

      <Bloco titulo="Crescimento">
        <p>
          Crescimento <strong>absoluto</strong> e <strong>percentual</strong> são grandezas
          diferentes e nunca aparecem na mesma ordenação:
        </p>
        <Formula>{`crescimento absoluto   = acessos(atual) − acessos(anterior)

crescimento percentual = acessos(atual) − acessos(anterior)
                         ─────────────────────────────────  × 100
                              acessos(anterior)`}</Formula>
        <p>
          Quando a base anterior é zero, o crescimento percentual é{' '}
          <strong>indefinido</strong> e exibido como &ldquo;n/d&rdquo;, não como um número
          enorme: um provedor que saiu de 0 para 500 acessos não cresceu infinito por
          cento — ele entrou no mercado, e é rotulado como entrante.
        </p>
      </Bloco>

      <Bloco titulo="Concentração: CR1, CR3, CR5 e CR10">
        <p>
          A razão de concentração CR-n é a soma das participações dos n maiores provedores
          do mercado. Quando o mercado tem menos de n provedores, o resultado tende a 100%
          — matematicamente correto, mas deve ser lido junto com o número de provedores.
          Um CR5 de 100% num município com 3 provedores não significa o mesmo que num
          município com 40.
        </p>
      </Bloco>

      <Bloco titulo="Concentração: HHI">
        <p>
          O Índice Herfindahl-Hirschman é a soma dos quadrados das participações
          percentuais de <strong>todos</strong> os participantes do mercado — não apenas
          dos maiores:
        </p>
        <Formula>{`HHI = Σ (market share de cada provedor)²

escala: 0 (pulverizado) a 10.000 (monopólio)`}</Formula>
        <p>
          O cálculo usa participações em precisão plena: arredondar antes de elevar ao
          quadrado introduz erro material.
        </p>
        <p className="rounded-lg border border-atencao/30 bg-atencao/10 p-3 text-atencao">
          O HHI é apresentado aqui como <strong>indicador estatístico</strong> de estrutura
          de mercado. O {MARCA.nome} não converte o valor em conclusão jurídica,
          concorrencial ou regulatória, nem classifica mercados como
          &ldquo;adequados&rdquo; ou &ldquo;inadequados&rdquo;.
        </p>
      </Bloco>

      <Bloco titulo="Ranking e empates">
        <p>
          Provedores são ordenados por número de acessos em ordem decrescente. Empates
          recebem a mesma posição e a posição seguinte é pulada (1º, 2º, 2º, 4º),
          preservando a cardinalidade real do mercado. O desempate de exibição é
          determinístico, de modo que duas execuções sobre os mesmos dados produzem
          exatamente o mesmo ranking.
        </p>
        <p>
          Na variação de posição, o sinal positivo significa <em>subir</em> no ranking:
          passar de 5º para 2º é registrado como +3.
        </p>
      </Bloco>

      <Bloco titulo="Controle de qualidade">
        <p>A cada importação, o pipeline verifica e registra alertas para:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>variações mensais iguais ou superiores a 30% em provedores relevantes;</li>
          <li>provedores que aparecem pela primeira vez;</li>
          <li>provedores que deixam de constar na base;</li>
          <li>taxa elevada de registros rejeitados;</li>
          <li>rótulos de tecnologia ainda não mapeados;</li>
          <li>empresas cuja identidade dependeu da heurística de nome.</li>
        </ul>
        <p>
          Um alerta <strong>nunca</strong> altera ou remove o registro. A correção é
          decisão humana. Um pipeline que &ldquo;conserta&rdquo; sozinho uma variação
          anormal destrói justamente o sinal que esta plataforma existe para mostrar.
        </p>
      </Bloco>

      <Bloco titulo="Limitações">
        <ul className="ml-5 list-disc space-y-2">
          <li>
            Os dados refletem o que as prestadoras declaram à Anatel. Erros, atrasos ou
            revisões na declaração se propagam para cá.
          </li>
          <li>
            A Anatel pode revisar competências já publicadas. Números podem mudar entre
            atualizações desta plataforma.
          </li>
          <li>
            Acessos não equivalem a domicílios nem a pessoas atendidas: um mesmo endereço
            pode ter mais de um acesso, e um acesso pode servir várias pessoas.
          </li>
          <li>
            O agrupamento por grupo econômico depende do que a fonte informa. Aquisições e
            fusões podem aparecer com defasagem.
          </li>
          <li>
            Quando a fonte não traz CNPJ, a identidade do provedor depende de heurística
            de nome e está sujeita a revisão.
          </li>
          <li>
            Quando os dados chegam pela Base dos Dados, há uma camada adicional de
            tratamento entre a Anatel e esta plataforma, e a competência mais recente
            pode demorar mais a aparecer do que na fonte original.
          </li>
          <li>
            Os nomes dos municípios vêm da malha territorial do IBGE, não da base de
            acessos. A junção entre as duas é feita pelo código IBGE.
          </li>
          <li>
            Provedores com atuação muito pequena podem entrar e sair da base entre
            competências sem que isso represente movimento real de mercado.
          </li>
        </ul>
      </Bloco>

      <Bloco titulo="Independência">
        <p>
          O {MARCA.nome} é uma camada independente de análise sobre dados públicos.{' '}
          <strong>Não possui vínculo com a Anatel</strong> e não fala em nome da Agência.
          Os dados são oficiais; o tratamento, os recortes e as visualizações são de
          responsabilidade desta plataforma.
        </p>
      </Bloco>
    </main>
  );
}
