import Link from 'next/link';
import type { AlertaMunicipio } from '@/lib/dados';
import { inteiro } from '@/lib/formato';

const um = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

const lista = (vs: Array<{ nome: string; densidade: number }>) =>
  vs.map((v) => `${v.nome} (${um(v.densidade)})`).join(', ');

function Texto({ alerta }: { alerta: AlertaMunicipio }) {
  switch (alerta.tipo) {
    case 'saida-abrupta':
      return (
        <>
          <strong>{alerta.nome}</strong> tinha {inteiro(alerta.acessosAnteriores)} acessos (
          {um(alerta.percentualDaBase)}% da base) no mês anterior e não aparece nesta competência.{' '}
          {alerta.municipiosAtuais === 0
            ? 'Também não aparece em nenhum outro município do Estado: indício de falha de envio à Anatel, não de perda de clientes.'
            : `Ainda aparece em ${alerta.municipiosAtuais} município(s) do Estado.`}{' '}
          O total e a densidade do município estão subestimados até a correção.
        </>
      );
    case 'densidade-acima-100':
      return (
        <>
          Densidade de {um(alerta.densidade)}: mais acessos residenciais que domicílios ocupados.
          {alerta.vizinhosBaixos.length > 0
            ? ` Vizinhos com densidade muito baixa: ${lista(alerta.vizinhosBaixos)}. O padrão sugere prestadora que declara aqui clientes dessas cidades.`
            : ' Pode refletir casas de veraneio, que não entram na contagem de domicílios ocupados, ou acessos de municípios vizinhos declarados aqui.'}
        </>
      );
    case 'densidade-muito-baixa':
      return (
        <>
          Densidade de {um(alerta.densidade)}, ao lado de vizinho(s) acima de 100: {lista(alerta.vizinhosAltos)}.
          Parte dos acessos deste município pode estar declarada lá.
        </>
      );
  }
}

/** Alertas de qualidade dos dados: sinais para verificação, não conclusões. */
export function AlertasMunicipio({ alertas }: { alertas: AlertaMunicipio[] }) {
  if (alertas.length === 0) return null;
  return (
    <div className="space-y-2 rounded-lg border border-atencao/40 bg-atencao/10 p-4 text-sm text-atencao">
      <p className="font-semibold">Atenção: dados deste município exigem verificação</p>
      <ul className="list-disc space-y-1 pl-5">
        {alertas.map((a, i) => (
          <li key={i}>
            <Texto alerta={a} />
          </li>
        ))}
      </ul>
      <p className="text-xs opacity-80">
        Os números refletem o que as prestadoras declaram à Anatel e não foram corrigidos.{' '}
        <Link href="/sobre/#indicadores" className="underline underline-offset-2">Como calculamos</Link>
      </p>
    </div>
  );
}
