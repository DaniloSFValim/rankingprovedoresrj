import { montarIndiceBusca } from '@/lib/busca';

// Gerado no build como arquivo estático /busca.json.
export const dynamic = 'force-static';

export function GET() {
  return Response.json(montarIndiceBusca());
}
