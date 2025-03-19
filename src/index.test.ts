import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { moqFn, moqFns, moqAllPrototypeFns } from './index';

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

describe('moqFn', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService('test-');
  });

  it('should mock method using string name', () => {
    const mock = moqFn(service, 'syncMethod');
    mock.mockReturnValue('mocked');
    
    expect(service.syncMethod('input')).toBe('mocked');
    expect(mock).toHaveBeenCalledWith('input');
  });

  it('should mock method using function reference', () => {
    const mock = moqFn(service, service.syncMethod);
    mock.mockReturnValue('mocked');
    
    expect(service.syncMethod('input')).toBe('mocked');
    expect(mock).toHaveBeenCalledWith('input');
  });

  it('should mock async methods with type-safe resolved values', async () => {
    const mock = moqFn(service, service.asyncMethod);
    mock.mockResolvedValue(42);
    
    const result = await service.asyncMethod(21);
    expect(result).toBe(42);
    expect(mock).toHaveBeenCalledWith(21);
  });

  it('should mock static methods', () => {
    const mock = moqFn(TestService, 'staticMethod');
    mock.mockReturnValue(100);
    
    expect(TestService.staticMethod(1, 2)).toBe(100);
    expect(mock).toHaveBeenCalledWith(1, 2);
  });

  it('should restore original implementation', () => {
    const mock = moqFn(service, service.syncMethod);
    mock.mockReturnValue('mocked');
    expect(service.syncMethod('test')).toBe('mocked');
    
    vi.restoreAllMocks();
    expect(service.syncMethod('test')).toBe('test-test');
  });

  it('should throw error for non-existent method', () => {
    expect(() => moqFn(service, 'nonExistent' as keyof TestService)).toThrow();
  });

  it('should throw error for non-function property', () => {
    expect(() => moqFn(service, 'prefix' as keyof TestService)).toThrow();
  });
});

describe('moqFns', () => {
  let service: TestService;
  let mocker: ReturnType<typeof moqFns<TestService>>;

  beforeEach(() => {
    service = new TestService('test-');
    mocker = moqFns(service);
  });

  it('should create reusable mocker for multiple methods', () => {
    const syncMock = mocker(service.syncMethod);
    const asyncMock = mocker(service.asyncMethod);

    syncMock.mockReturnValue('mocked-sync');
    asyncMock.mockResolvedValue(42);

    expect(service.syncMethod('test')).toBe('mocked-sync');
    expect(syncMock).toHaveBeenCalledWith('test');

    return expect(service.asyncMethod(21)).resolves.toBe(42);
  });

  it('should maintain type safety for each mocked method', async () => {
    const syncMock = mocker(service.syncMethod);
    const asyncMock = mocker(service.asyncMethod);

    syncMock.mockReturnValue(42); // Type error in IDE
    asyncMock.mockResolvedValue('42'); // Type error in IDE

    syncMock.mockReturnValue('valid');
    asyncMock.mockResolvedValue(42);
  });
});

describe('moqAllPrototypeFns', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService('test-');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should mock all prototype methods', async () => {
    const mocks = moqAllPrototypeFns(service, 
      // Exclude getter/setter properties
      (key) => key !== 'computedValue'
    );
    
    mocks.syncMethod.mockReturnValue('mocked');
    mocks.asyncMethod.mockResolvedValue(42);

    expect(service.syncMethod('test')).toBe('mocked');
    await expect(service.asyncMethod(21)).resolves.toBe(42);
  });

  it('should respect filter function', () => {
    const mocks = moqAllPrototypeFns(
      service,
      (key) => key === 'syncMethod'
    );

    expect(mocks.syncMethod).toBeDefined();
    expect('asyncMethod' in mocks).toBe(false);
  });

  it('should include inherited methods when specified', () => {
    const mocks = moqAllPrototypeFns(
      service,
      // Make sure to exclude the getter property
      (key) => key !== 'computedValue',
      true // include inherited
    );

    mocks.baseMethod.mockReturnValue('mocked base');
    // @ts-expect-error - protected method exists at runtime
    expect(service.baseMethod()).toBe('mocked base');
    expect('baseMethod' in mocks).toBe(true);
  });

  it('should include instance methods when specified', () => {
    const mocks = moqAllPrototypeFns(
      service,
      // Make sure to exclude the getter property
      (key) => key !== 'computedValue',
      false,
      true // include instance properties
    );

    mocks.instanceMethod.mockReturnValue('mocked instance');
    expect(service.instanceMethod()).toBe('mocked instance');
  });

  it('should throw error for getter/setter properties', () => {
    expect(() => 
      moqAllPrototypeFns(service, (key) => key === 'computedValue')
    ).toThrow();
  });

  it('should restore all mocks', () => {
    const mocks = moqAllPrototypeFns(
      service,
      (key) => key !== 'computedValue'
    );
    
    mocks.syncMethod.mockReturnValue('mocked');
    expect(service.syncMethod('test')).toBe('mocked');
    
    vi.restoreAllMocks();
    expect(service.syncMethod('test')).toBe('test-test');
  });

  it('should maintain type safety for mocked methods', () => {
    const mocks = moqAllPrototypeFns(
      service,
      (key) => key !== 'computedValue'
    );

    // @ts-expect-error - Type 'number' is not assignable to type 'string'
    mocks.syncMethod.mockReturnValue(42);

    // @ts-expect-error - Type 'string' is not assignable to type 'number'
    mocks.asyncMethod.mockResolvedValue('42');

    mocks.syncMethod.mockReturnValue('valid');
    mocks.asyncMethod.mockResolvedValue(42);
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
    const mock = moqFn(service, service.methodWithoutReturn);
    mock.mockImplementation(() => {});
    service.methodWithoutReturn();
    expect(mock).toHaveBeenCalled();
  });

  it('should handle async void methods', async () => {
    const mock = moqFn(service, service.promiseVoid);
    mock.mockResolvedValue();
    await service.promiseVoid();
    expect(mock).toHaveBeenCalled();
  });

  it('should handle complex types', () => {
    const mock = moqFn(service, service.methodWithComplexTypes);
    const input = { nested: { value: [1, 2, 3] } };
    const expected = [2, 4, 6];
    
    mock.mockReturnValue(expected);
    const result = service.methodWithComplexTypes(input);
    
    expect(result).toEqual(expected);
    expect(mock).toHaveBeenCalledWith(input);
  });
}); 