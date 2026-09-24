import type { PerfilAcessos } from '@/lib/dados';
import { inteiro, percentual } from '@/lib/formato';

const LENTAS = new Set(['ate10', 'de10a50']);

/** Distribuição dos acessos por velocidade contratada; faixas abaixo de 50 Mbps em destaque. */
export function BarrasVelocidade({ perfil }: { perfil: PerfilAcessos }) {
  const base = perfil.acessosComVelocidade;
  if (base === 0) return <p className="text-sm text-grafite-400">Velocidade contratada não informada.</p>;
  const maior = Math.max(...perfil.faixasVelocidade.map((f) => f.acessos));

  return (
    <div className="space-y-2">
      {perfil.faixasVelocidade.map((f) => {
        const lenta = LENTAS.has(f.faixa);
        return (
          <div key={f.faixa} className="grid grid-cols-[8.5rem_1fr_4rem] items-center gap-3 text-sm">
            <span className={lenta ? 'text-baixa' : 'text-grafite-300'}>{f.rotulo}</span>
            <div className="h-3 rounded bg-grafite-800" aria-hidden="true">
              <div
                className={`h-3 rounded ${lenta ? 'bg-baixa/70' : 'bg-marca-500/70'}`}
                style={{ width: `${maior > 0 ? (f.acessos / maior) * 100 : 0}%` }}
              />
            </div>
            <span className="numerico text-right text-grafite-200" title={`${inteiro(f.acessos)} acessos`}>
              {percentual((f.acessos / base) * 100, 1)}
            </span>
          </div>
        );
      })}
      <p className="pt-1 text-xs text-grafite-500">
        Velocidade contratada, não medida. Base: {inteiro(base)} acessos com velocidade informada à Anatel.
      </p>
    </div>
  );
}
