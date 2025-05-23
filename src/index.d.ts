import { MockInstance } from 'vitest';

/**
 * Type-safe utility to auto-moq a method on an instance.
 * Accepts either a method name (as string) or a function reference.
 */
export function mockMethod<T extends object, K extends keyof T>(
  instance: T,
  method: K | T[K]
): T[K] extends (...args: any[]) => any ? MockInstance<T[K]> : never;

/**
 * Returns a helper that binds the instance so you only need to pass the method reference.
 *
 * Example:
 *   const autoMoq = createMethodMocker(dbService);
 *   const getMoq = autoMoq(dbService.get);
 */
export function createMethodMocker<T extends object>(
  instance: T
): <K extends keyof T>(
  method: K | T[K]
) => T[K] extends (...args: any[]) => any ? MockInstance<T[K]> : never;

/**
 * Auto-moqs all function properties found on an instance's prototype.
 * An optional filter function can restrict which properties are moqed.
 */
export function mockAllPrototypeMethods<T extends object>(
  instance: T,
  filter?: (key: keyof T) => boolean,
  includeInherited?: boolean,
  includeInstanceProperties?: boolean
): {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? MockInstance<T[K]> : never;
}; 