import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { CAMINHOS } from '../config.js';
import { SCHEMA_SQL } from './schema.js';

export type Banco = Database.Database;

export function abrirBanco(caminho: string = CAMINHOS.banco): Banco {
  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  const db = new Database(caminho);
  db.exec(SCHEMA_SQL);
  return db;
}

/** Banco em memoria — usado pelos testes do pipeline. */
export function abrirBancoMemoria(): Banco {
  const db = new Database(':memory:');
  db.exec(SCHEMA_SQL);
  return db;
}
