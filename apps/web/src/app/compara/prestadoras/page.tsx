'use client';

import { Comparador } from '@/componentes/Comparador';
import { configuradorProvedores } from '@/lib/comparadores';

export default function ComparadorPrestadoras() {
  return <Comparador config={configuradorProvedores} />;
}
