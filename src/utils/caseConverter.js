/**
 * 케이스 변환 유틸리티
 * PostgreSQL (snake_case) ↔ JavaScript (camelCase) 변환
 */

/**
 * snake_case → camelCase 변환
 */
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

/**
 * camelCase → snake_case 변환
 */
const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * 객체 키를 snake_case → camelCase로 변환
 */
const keysToCamel = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamel(v));
  }
  
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = toCamelCase(key);
      result[camelKey] = keysToCamel(obj[key]);
      return result;
    }, {});
  }
  
  return obj;
};

/**
 * 객체 키를 camelCase → snake_case로 변환
 */
const keysToSnake = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToSnake(v));
  }
  
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = keysToSnake(obj[key]);
      return result;
    }, {});
  }
  
  return obj;
};

module.exports = {
  toCamelCase,
  toSnakeCase,
  keysToCamel,
  keysToSnake,
};
