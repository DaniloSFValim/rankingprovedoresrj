/**
 * Converte as linhas vindas do BigQuery no mesmo formato produzido pela
 * leitura de CSV, para que carga, controle de qualidade e construcao de
 * artefatos permanecam identicos, venha o dado de onde vier.
 *
 * Toda a validacao do pipeline continua valendo: registro sem municipio
 * valido do RJ e rejeitado, acessos nao numericos sao rejeitados, e nada e
 * preenchido por suposicao.
 */

import {
  asCompetencia,
  classificarTecnologia,
  resolverIdentidadeEmpresa,
} from '@netrank/core';
import { PREFIXO_IBGE_RJ } from '../config.js';
import type { ResultadoExtracao } from './extrair.js';
import type { LinhaBdd } from '../sources/basedosdados.js';

export function converterParaExtracao(
  linhas: readonly LinhaBdd[],
  overrides: ReadonlyMap<string, string> = new Map(),
): ResultadoExtracao {
  const resultado: ResultadoExtracao = {
    registros: [],
    perfis: [],
    empresas: new Map(),
    municipios: new Map(),
    competencias: new Set(),
    tecnologiasNaoMapeadas: new Map(),
    estatisticas: {
      linhasLidas: linhas.length,
      linhasRj: 0,
      linhasRejeitadas: 0,
      motivosRejeicao: {},
    },
  };

  const rejeitar = (motivo: string) => {
    resultado.estatisticas.linhasRejeitadas += 1;
    resultado.estatisticas.motivosRejeicao[motivo] =
      (resultado.estatisticas.motivosRejeicao[motivo] ?? 0) + 1;
  };

  const acumulador = new Map<string, ResultadoExtracao['registros'][number]>();

  for (const linha of linhas) {
    // A consulta ja filtra UF = RJ no servidor; aqui contamos o que chegou.
    resultado.estatisticas.linhasRj += 1;

    if (!Number.isInteger(linha.ano) || !Number.isInteger(linha.mes)
        || linha.mes < 1 || linha.mes > 12) {
      rejeitar('competencia_invalida');
      continue;
    }
    if (!Number.isFinite(linha.acessos) || linha.acessos < 0) {
      rejeitar('acessos_nao_numerico');
      continue;
    }
    if (linha.empresa === '') {
      rejeitar('empresa_sem_nome');
      continue;
    }

    const codigoIbge = (linha.codigoIbge ?? '').replace(/\D/g, '');
    if (codigoIbge.length !== 7 || !codigoIbge.startsWith(PREFIXO_IBGE_RJ)) {
      rejeitar('codigo_ibge_invalido');
      continue;
    }

    const competencia = asCompetencia(linha.ano, linha.mes);
    const identidade = resolverIdentidadeEmpresa(
      { nomeAnatel: linha.empresa, cnpj: linha.cnpj },
      overrides,
    );
    const rotuloTecnologia = linha.tecnologia ?? '';
    const tecnologia = classificarTecnologia(rotuloTecnologia);
    if (tecnologia === 'OUTRAS' && rotuloTecnologia !== '') {
      resultado.tecnologiasNaoMapeadas.set(
        rotuloTecnologia,
        (resultado.tecnologiasNaoMapeadas.get(rotuloTecnologia) ?? 0) + 1,
      );
    }

    resultado.competencias.add(competencia);

    if (!resultado.empresas.has(identidade.empresaId)) {
      resultado.empresas.set(identidade.empresaId, {
        empresaId: identidade.empresaId,
        chaveNome: identidade.empresaId.startsWith('nome:')
          ? identidade.empresaId.slice(5)
          : linha.empresa,
        nomeOriginalAnatel: linha.empresa,
        cnpj: linha.cnpj,
        grupoEconomico: linha.grupo,
        origem: identidade.origem,
      });
    }

    // A Base dos Dados nao traz o nome do municipio; ele vem da malha do IBGE
    // ou permanece como o proprio codigo. Nao inventamos nome.
    if (!resultado.municipios.has(codigoIbge)) {
      resultado.municipios.set(codigoIbge, { codigoIbge, nome: codigoIbge });
    }

    const chave = `${competencia}|${codigoIbge}|${identidade.empresaId}|${tecnologia}`;
    const existente = acumulador.get(chave);
    const acessos = Math.round(linha.acessos);
    if (existente) {
      existente.acessos += acessos;
    } else {
      acumulador.set(chave, {
        competencia,
        codigoIbge,
        empresaId: identidade.empresaId,
        tecnologia,
        acessos,
      });
    }
  }

  resultado.registros = [...acumulador.values()];
  return resultado;
}
