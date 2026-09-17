'use client';

import { useRouter } from 'next/navigation';
import { useCidadeSelecionada } from '@/contextos/CidadeSelecionada';
import type { CidadeOpcao } from '@/componentes/SeletorCidade';

export function useNavigarCidade() {
  const router = useRouter();
  const { selecionarCidade } = useCidadeSelecionada();

  return (cidade: CidadeOpcao) => {
    selecionarCidade(cidade.slug);
    router.push(`/municipios/${cidade.slug}/`);
  };
}
