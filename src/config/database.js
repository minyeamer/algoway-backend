const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const logger = require('../utils/logger');
const { keysToCamel, keysToSnake } = require('../utils/caseConverter');

// Supabase 클라이언트 (Realtime, Auth, Storage 등)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// PostgreSQL 직접 연결 (복잡한 쿼리, 트랜잭션 등)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 연결 테스트
pool.on('connect', () => {
  logger.info('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  logger.error('❌ PostgreSQL connection error:', err);
  process.exit(-1);
});

// 쿼리 헬퍼 함수 (자동 camelCase 변환)
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { text, duration, rows: res.rowCount });
    
    // snake_case를 camelCase로 변환
    return {
      ...res,
      rows: keysToCamel(res.rows)
    };
  } catch (error) {
    logger.error('Query error', { text, error: error.message });
    throw error;
  }
};

// 트랜잭션 헬퍼 함수
const transaction = async (callback) => {
  const client = await pool.connect();
  
  // client.query를 래핑하여 자동 변환
  const wrappedClient = {
    ...client,
    query: async (text, params) => {
      const res = await client.query(text, params);
      return {
        ...res,
        rows: keysToCamel(res.rows)
      };
    }
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

module.exports = {
  supabase,
  pool,
  query,
  transaction,
  // 케이스 변환 유틸리티 export (필요 시 직접 사용)
  keysToCamel,
  keysToSnake,
};
