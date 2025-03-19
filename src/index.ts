import { vi, MockInstance } from 'vitest';

// Utility type to extract only method names from a type T.
type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

// Utility type to extract the type of the method at key K.
type MethodType<T, K extends keyof T> = T[K] extends (...args: any[]) => any
  ? T[K]
  : never;

// Use Vitest's built-in MockInstance type which already includes mockResolvedValue
type ExtendedMock<T extends (...args: any[]) => any> = MockInstance<T>;

/**
 * Type-safe utility to auto-moq a method on an instance.
 * - Accepts either a method name (as string) or a function reference.
 * - Returns a type-safe mock function that exactly matches the original method's type.
 * - Throws if the property is not found or is not a function.
 */
export function moqFn<T extends object, K extends keyof T>(
  instance: T,
  method: K | T[K]
): ExtendedMock<MethodType<T, K>> {
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
  const methodMock = vi.fn() as unknown as ExtendedMock<MethodType<T, K>>;

  // Spy on the method so that it is replaced with our mock.
  vi.spyOn(instance as any, methodName as string)
    .mockImplementation((...args: any[]) => (methodMock as any)(...args));

  return methodMock;
}

/**
 * Returns a helper that binds the instance so you only need to pass the method reference.
 *
 * Example:
 *   const mocker = moqFns(dbService);
 *   const getMock = mocker(dbService.get);
 */
export function moqFns<T extends object>(instance: T) {
  return <K extends keyof T>(method: K | T[K]) => moqFn(instance, method);
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
export function moqAllPrototypeFns<T extends object>(
  instance: T,
  filter?: (key: keyof T) => boolean,
  includeInherited: boolean = false,
  includeInstanceProperties: boolean = false
): { [K in MethodNames<T>]: ExtendedMock<MethodType<T, K>> } {
  const mocks = {} as { [K in MethodNames<T>]: ExtendedMock<MethodType<T, K>> };

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
        const mock = vi.fn() as unknown as ExtendedMock<MethodType<T, typeof key>>;
        vi.spyOn(instance as any, key as string)
          .mockImplementation((...args: any[]) => (mock as any)(...args));
        mocks[key as MethodNames<T>] = mock;
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
        const mock = vi.fn() as unknown as ExtendedMock<MethodType<T, typeof key>>;
        vi.spyOn(instance as any, key as string)
          .mockImplementation((...args: any[]) => (mock as any)(...args));
        mocks[key as MethodNames<T>] = mock;
      }
    }
  }

  return mocks;
}
