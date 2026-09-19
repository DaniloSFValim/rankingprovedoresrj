'use client';

import { Comparador } from '@/componentes/Comparador';
import { configuradorMunicipios } from '@/lib/comparadores';

export default function ComparadorMunicipios() {
  return <Comparador config={configuradorMunicipios} />;
}
