import { vi, Mock } from 'vitest';

/**
 * Note: We intentionally use `any` types and type assertions in some places to work around
 * limitations in Vitest's type system and to provide better type inference for mocked methods.
 * 
 * ESLint exceptions are configured for:
 * - @typescript-eslint/no-explicit-any: Required for Vitest's mock type compatibility
 * - @typescript-eslint/consistent-type-assertions: Required for type-safe mocking
 * - unicorn/prefer-spread: Array#concat used for better readability
 * - @typescript-eslint/no-unsafe-*: Required for Vitest's mock implementation
 * 
 * These exceptions are contained within the implementation and don't affect
 * the public API's type safety.
 */

// Utility type to extract only method names from a type T.
type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

// Utility type to extract the type of the method at key K.
type MethodType<T, K extends keyof T> = T[K] extends (...args: any[]) => any
  ? T[K]
  : never;

// ExtendedMock interface extends Vitest's Mock, adding a type-safe mockResolvedValue.
// If the original method returns a Promise, then mockResolvedValue only accepts the resolved type.
interface ExtendedMock<F extends (...args: any[]) => any> extends Mock<F> {
  mockResolvedValue(
    value: F extends (...args: any[]) => Promise<infer U> ? U : never
  ): void;
}

/**
 * Type-safe utility to auto-moq a method on an instance.
 * - Accepts either a method name (as string) or a function reference.
 * - Returns an object containing:
 *    - `mock`: A type-safe mock function that exactly matches the original method's type.
 *    - `restore`: A function that restores the original implementation using spy.mockRestore().
 * - Throws if the property is not found or is not a function.
 */
export function mockMethod<T extends object, K extends keyof T>(
  instance: T,
  method: K | T[K]
): { mock: ExtendedMock<MethodType<T, K>>; restore: () => void } {
  // Determine the method name whether a string or a function reference is provided.
  const methodName = (
    typeof method === 'string'
      ? method
      : Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
          .concat(Object.keys(instance))
          .find((key) => instance[key as K] === method)
  ) as K | undefined;

  if (!methodName || !(methodName in instance)) {
    throw new Error(
      `Method '${String(method)}' not found on instance of ${
        instance.constructor.name
      }.`
    );
  }

  // Ensure the property is actually a function.
  if (typeof instance[methodName] !== 'function') {
    throw new TypeError(`Property '${String(method)}' is not a function.`);
  }

  // Create a type-safe mock function.
  const methodMock = vi.fn() as ExtendedMock<MethodType<T, K>>;

  // Spy on the method so that it is replaced with our mock.
  const spy = vi
    .spyOn(instance as any, methodName as string)
    .mockImplementation(methodMock as any);

  return {
    mock: methodMock,
    restore: () => spy.mockRestore(),
  };
}

/**
 * Returns a helper that binds the instance so you only need to pass the method reference.
 *
 * Example:
 *   const autoMoq = createMethodMocker(dbService);
 *   const getMoq = autoMoq(dbService.get);
 */
export function createMethodMocker<T extends object>(instance: T) {
  return <K extends keyof T>(method: K | T[K]) => mockMethod(instance, method);
}

/**
 * Auto-moqs all function properties found on an instance's prototype.
 * - Iterates over all own property names on the instance's prototype.
 * - If includeInherited is true, traverses up the prototype chain (excluding Object.prototype).
 * - An optional filter function can restrict which properties are moqed.
 * - Optionally, if includeInstanceProperties is true, own instance properties that are functions are also moqed.
 * - For prototype properties, if a property descriptor indicates a getter or setter, an error is thrown.
 *
 * Returns an object with:
 *  - `mocks`: A mapping from method names to their corresponding ExtendedMock.
 *  - `restoreAll`: A function that, when called, restores all moqed properties.
 */
export function mockAllPrototypeMethods<T extends object>(
  instance: T,
  filter?: (key: keyof T) => boolean,
  includeInherited: boolean = false,
  includeInstanceProperties: boolean = false
): {
  mocks: { [K in MethodNames<T>]: ExtendedMock<MethodType<T, K>> };
  restoreAll: () => void;
} {
  const mocks = {} as { [K in MethodNames<T>]: ExtendedMock<MethodType<T, K>> };
  const spies: Array<{ mockRestore: () => void }> = [];

  // Auto-moq prototype methods.
  let proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto) as (keyof T)[]) {
      if (key === 'constructor' || (filter && !filter(key))) continue;

      // Check for getters/setters in the prototype.
      const descriptor = Object.getOwnPropertyDescriptor(proto, key);
      if (descriptor?.get || descriptor?.set) {
        throw new Error(
          `Property '${String(key)}' is a getter/setter and cannot be moqed.`
        );
      }

      const property = instance[key];
      if (typeof property === 'function') {
        const spy = vi
          .spyOn(instance as any, key as string)
          .mockImplementation(vi.fn());
        mocks[key as MethodNames<T>] = spy as ExtendedMock<MethodType<T, typeof key>>;
        spies.push(spy);
      }
    }
    if (!includeInherited) break;
    proto = Object.getPrototypeOf(proto);
  }

  // Optionally, auto-moq instance properties.
  if (includeInstanceProperties) {
    for (const key of Object.keys(instance) as (keyof T)[]) {
      if (filter && !filter(key)) continue;
      const property = instance[key];
      if (typeof property === 'function') {
        const spy = vi
          .spyOn(instance as any, key as string)
          .mockImplementation(vi.fn());
        mocks[key as MethodNames<T>] = spy as ExtendedMock<MethodType<T, typeof key>>;
        spies.push(spy);
      }
    }
  }

  return {
    mocks,
    restoreAll: () => { for (const spy of spies) spy.mockRestore() },
  };
}
