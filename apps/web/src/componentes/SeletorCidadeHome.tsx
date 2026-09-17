'use client';

import { SeletorCidade, UltimaCidade } from '@/componentes/SeletorCidade';
import { useNavigarCidade } from '@/hooks/useNavigarCidade';
import type { CidadeOpcao } from '@/componentes/SeletorCidade';

interface SeletorCidadeHomeProps {
  cidades: CidadeOpcao[];
}

export function SeletorCidadeHome({ cidades }: SeletorCidadeHomeProps) {
  const navegarCidade = useNavigarCidade();

  return (
    <div className="space-y-4">
      <div className="text-sm text-grafite-400">Selecione um município para explorar dados locais:</div>
      <SeletorCidade cidades={cidades} variante="destaque" onSelecionar={navegarCidade} />
      <UltimaCidade cidades={cidades} />
    </div>
  );
}
