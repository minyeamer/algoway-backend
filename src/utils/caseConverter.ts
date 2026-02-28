/**
 * 케이스 변환 유틸리티
 * PostgreSQL (snake_case) ↔ JavaScript (camelCase) 변환
 */

type AnyObject = Record<string, unknown>;

export const toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

export const toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const keysToCamel = <T>(obj: T): T => {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamel(v)) as unknown as T;
  }

  if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj as AnyObject).reduce((result: AnyObject, key) => {
      const camelKey = toCamelCase(key);
      result[camelKey] = keysToCamel((obj as AnyObject)[key]);
      return result;
    }, {}) as unknown as T;
  }

  return obj;
};

export const keysToSnake = <T>(obj: T): T => {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToSnake(v)) as unknown as T;
  }

  if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj as AnyObject).reduce((result: AnyObject, key) => {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = keysToSnake((obj as AnyObject)[key]);
      return result;
    }, {}) as unknown as T;
  }

  return obj;
};
