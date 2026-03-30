import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import logger from '../utils/logger';
import { keysToCamel, keysToSnake } from '../utils/caseConverter';

// Supabase 클라이언트 (Realtime, Auth, Storage 등)
export const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// PostgreSQL 직접 연결 (복잡한 쿼리, 트랜잭션 등)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  logger.info('✅ PostgreSQL connected');
});

pool.on('error', (err: Error) => {
  logger.error('❌ PostgreSQL connection error:', err);
  process.exit(-1);
});

// 쿼리 결과 타입 (camelCase 변환 포함)
export interface CamelQueryResult<T extends QueryResultRow = Record<string, unknown>>
  extends QueryResult<T> {
  rows: T[];
}

// 쿼리 헬퍼 함수 (자동 camelCase 변환)
export const query = async <T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<CamelQueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { text, duration, rows: res.rowCount });

    return {
      ...res,
      rows: keysToCamel(res.rows) as T[],
    };
  } catch (error) {
    logger.error('Query error', { text, error: (error as Error).message });
    throw error;
  }
};

// 트랜잭션 클라이언트 타입
export interface TransactionClient {
  query: <T extends QueryResultRow = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<CamelQueryResult<T>>;
}

// 트랜잭션 헬퍼 함수
export const transaction = async <T>(
  callback: (client: TransactionClient) => Promise<T>
): Promise<T> => {
  const client: PoolClient = await pool.connect();

  const wrappedClient: TransactionClient = {
    query: async <R extends QueryResultRow = Record<string, unknown>>(
      text: string,
      params?: unknown[]
    ) => {
      const res = await client.query(text, params);
      return {
        ...res,
        rows: keysToCamel(res.rows) as R[],
      };
    },
  };

  try {
    await client.query('BEGIN');
    const result = await callback(wrappedClient);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export { keysToCamel, keysToSnake };
