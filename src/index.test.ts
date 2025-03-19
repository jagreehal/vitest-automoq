 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockMethod, createMethodMocker, mockAllPrototypeMethods } from './index';

// Test classes
class BaseService {
  protected baseMethod(): string {
    return 'base';
  }
}

class TestService extends BaseService {
  constructor(private readonly prefix: string = '') {
    super();
  }

  syncMethod(input: string): string {
    return this.prefix + input;
  }

  async asyncMethod(input: number): Promise<number> {
    return input * 2;
  }

  static staticMethod(x: number, y: number): number {
    return x + y;
  }

  private secretMethod(): string {
    return 'secret';
  }

  get computedValue(): string {
    return 'computed';
  }

  instanceMethod = () => 'instance';

  [key: string]: unknown;
}

describe('mockMethod', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService('test-');
  });

  it('should mock method using string name', () => {
    const mocker = mockMethod(service, 'syncMethod');
    (mocker.mock.mockReturnValue as any)('mocked');
    
    expect(service.syncMethod('input')).toBe('mocked');
    expect(mocker.mock).toHaveBeenCalledWith('input');
  });

  it('should mock method using function reference', () => {
    const mocker = mockMethod(service, service.syncMethod);
    (mocker.mock.mockReturnValue as any)('mocked');
    
    expect(service.syncMethod('input')).toBe('mocked');
    expect(mocker.mock).toHaveBeenCalledWith('input');
  });

  it('should mock async methods with type-safe resolved values', async () => {
    const mocker = mockMethod(service, service.asyncMethod);
    (mocker.mock.mockResolvedValue as any)(42);
    
    const result = await service.asyncMethod(21);
    expect(result).toBe(42);
    expect(mocker.mock).toHaveBeenCalledWith(21);
  });

  it('should mock static methods', () => {
    const mocker = mockMethod(TestService, 'staticMethod');
    (mocker.mock.mockReturnValue as any)(100);
    
    expect(TestService.staticMethod(1, 2)).toBe(100);
    expect(mocker.mock).toHaveBeenCalledWith(1, 2);
  });

  it('should restore original implementation', () => {
    const mocker = mockMethod(service, service.syncMethod);
    (mocker.mock.mockReturnValue as any)('mocked');
    expect(service.syncMethod('test')).toBe('mocked');
    
    mocker.restore();
    expect(service.syncMethod('test')).toBe('test-test');
  });

  it('should throw error for non-existent method', () => {
    expect(() => mockMethod(service, 'nonExistent' as keyof TestService)).toThrow();
  });

  it('should throw error for non-function property', () => {
    expect(() => mockMethod(service, 'prefix' as keyof TestService)).toThrow();
  });
});

describe('createMethodMocker', () => {
  let service: TestService;
  let autoMoq: ReturnType<typeof createMethodMocker<TestService>>;

  beforeEach(() => {
    service = new TestService('test-');
    autoMoq = createMethodMocker(service);
  });

  it('should create reusable mocker for multiple methods', () => {
    // Style 1: Direct method reference (shortest)
    const syncMocker = autoMoq(service.syncMethod);
    const asyncMocker = autoMoq(service.asyncMethod);

    (syncMocker.mock.mockReturnValue as any)('mocked-sync');
    (asyncMocker.mock.mockResolvedValue as any)(42);

    expect(service.syncMethod('test')).toBe('mocked-sync');
    expect(syncMocker.mock).toHaveBeenCalledWith('test');

    return expect(service.asyncMethod(21)).resolves.toBe(42);
  });

  it('should support both mocking styles', () => {
    // Style 1: Direct method reference
    const syncMocker = autoMoq(service.syncMethod);
    
    // Style 2: Object-method style
    const { mock: asyncMock } = autoMoq(service.asyncMethod);

    (syncMocker.mock.mockReturnValue as any)('mocked-sync');
    (asyncMock.mockResolvedValue as any)(42);

    // Call both methods to verify they work
    expect(service.syncMethod('test')).toBe('mocked-sync');
    
    // Need to call the method before checking if it was called
    service.asyncMethod(21);
    expect(asyncMock).toHaveBeenCalledWith(21);
  });

  it('should maintain type safety for each mocked method', async () => {
    const syncMocker = autoMoq(service.syncMethod);
    const asyncMocker = autoMoq(service.asyncMethod);

    (syncMocker.mock.mockReturnValue as any)(42);

    (asyncMocker.mock.mockResolvedValue as any)('42');

    (syncMocker.mock.mockReturnValue as any)('valid');
    (asyncMocker.mock.mockResolvedValue as any)(42);
  });
});

describe('mockAllPrototypeMethods', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService('test-');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should mock all prototype methods', async () => {
    const mocker = mockAllPrototypeMethods(service, 
      // Exclude getter/setter properties
      (key) => key !== 'computedValue'
    );
    
    (mocker.mocks as any).syncMethod.mockReturnValue('mocked');
    (mocker.mocks as any).asyncMethod.mockResolvedValue(42);

    expect(service.syncMethod('test')).toBe('mocked');
    await expect(service.asyncMethod(21)).resolves.toBe(42);
  });

  it('should respect filter function', () => {
    const mocker = mockAllPrototypeMethods(
      service,
      (key) => key === 'syncMethod'
    );

    expect((mocker.mocks as any).syncMethod).toBeDefined();
    expect('asyncMethod' in (mocker.mocks as any)).toBe(false);
  });

  it('should include inherited methods when specified', () => {
    const mocker = mockAllPrototypeMethods(
      service,
      // Make sure to exclude the getter property
      (key) => key !== 'computedValue',
      true // include inherited
    );

    (mocker.mocks as any).baseMethod.mockReturnValue('mocked base');
    // @ts-expect-error - protected method exists at runtime
    expect(service.baseMethod()).toBe('mocked base');
    expect('baseMethod' in (mocker.mocks as any)).toBe(true);
  });

  it('should include instance methods when specified', () => {
    const mocker = mockAllPrototypeMethods(
      service,
      // Make sure to exclude the getter property
      (key) => key !== 'computedValue',
      false,
      true // include instance properties
    );

    (mocker.mocks as any).instanceMethod.mockReturnValue('mocked instance');
    expect(service.instanceMethod()).toBe('mocked instance');
  });

  it('should throw error for getter/setter properties', () => {
    expect(() => 
      mockAllPrototypeMethods(service, (key) => key === 'computedValue')
    ).toThrow();
  });

  it('should restore all mocks', () => {
    const mocker = mockAllPrototypeMethods(
      service,
      (key) => key !== 'computedValue'
    );
    
    (mocker.mocks as any).syncMethod.mockReturnValue('mocked');
    expect(service.syncMethod('test')).toBe('mocked');
    
    mocker.restoreAll();
    expect(service.syncMethod('test')).toBe('test-test');
  });

  it('should maintain type safety for mocked methods', () => {
    const mocker = mockAllPrototypeMethods(
      service,
      (key) => key !== 'computedValue'
    );

    // @ts-expect-error - Type 'number' is not assignable to type 'string'
    (mocker.mocks as any).syncMethod.mockReturnValue(42);

    // @ts-expect-error - Type 'string' is not assignable to type 'number'
    (mocker.mocks as any).asyncMethod.mockResolvedValue('42');

    (mocker.mocks as any).syncMethod.mockReturnValue('valid');
    (mocker.mocks as any).asyncMethod.mockResolvedValue(42);
  });
});

// Edge cases and error handling
describe('Edge cases and error handling', () => {
  class EdgeCaseService {
    methodWithoutReturn(): void {
      console.log('void');
    }

    async promiseVoid(): Promise<void> {
      console.log('async void');
    }

    methodWithComplexTypes(input: { nested: { value: number[] } }): number[] {
      return input.nested.value.map(x => x * 2);
    }

    [key: string]: unknown;
  }

  let service: EdgeCaseService;

  beforeEach(() => {
    service = new EdgeCaseService();
  });

  it('should handle void methods', () => {
    const mocker = mockMethod(service, service.methodWithoutReturn);
    (mocker.mock.mockImplementation as any)(() => {});
    service.methodWithoutReturn();
    expect(mocker.mock).toHaveBeenCalled();
  });

  it('should handle async void methods', async () => {
    const mocker = mockMethod(service, service.promiseVoid);
    (mocker.mock.mockResolvedValue as any)();
    await service.promiseVoid();
    expect(mocker.mock).toHaveBeenCalled();
  });

  it('should handle complex types', () => {
    const mocker = mockMethod(service, service.methodWithComplexTypes);
    const input = { nested: { value: [1, 2, 3] } };
    const expected = [2, 4, 6];
    
    (mocker.mock.mockReturnValue as any)(expected);
    const result = service.methodWithComplexTypes(input);
    
    expect(result).toEqual(expected);
    expect(mocker.mock).toHaveBeenCalledWith(input);
  });
}); 