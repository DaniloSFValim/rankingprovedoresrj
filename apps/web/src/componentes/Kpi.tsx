import type { ReactNode } from 'react';
import { corVariacao, setaVariacao } from '@/lib/formato';

interface Props {
  rotulo: string;
  valor: ReactNode;
  unidade?: string;
  /** Linha secundária livre (ex.: nome do líder). */
  detalhe?: ReactNode;
  /** Quando informado, renderiza seta e cor semântica. */
  variacao?: number | null;
  variacaoTexto?: string;
  /** Explica o indicador — visível no title, para não poluir o card. */
  ajuda?: string;
}

export function Kpi({ rotulo, valor, unidade, detalhe, variacao, variacaoTexto, ajuda }: Props) {
  return (
    <div className="cartao p-4" title={ajuda}>
      <div className="rotulo">{rotulo}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="numerico text-2xl font-semibold text-white md:text-3xl">{valor}</span>
        {unidade && <span className="text-sm text-grafite-400">{unidade}</span>}
      </div>
      {detalhe && <div className="mt-1 truncate text-sm text-grafite-300">{detalhe}</div>}
      {variacaoTexto !== undefined && (
        <div className={`numerico mt-1.5 text-xs ${corVariacao(variacao)}`}>
          {setaVariacao(variacao)} {variacaoTexto}
        </div>
      )}
    </div>
  );
}
