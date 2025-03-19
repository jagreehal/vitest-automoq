# vitest-automoq

Type-safe utility functions for mocking methods in Vitest. 

This library provides enhanced type safety and convenience when working with Vitest mocks, handling all type complexities internally so you can focus on writing tests.

## Installation

```bash
npm install vitest-automoq
# or
pnpm add vitest-automoq
# or
yarn add vitest-automoq
```

## Features

- 🎯 **Type-safe method mocking** with full TypeScript support
- 🔍 Automatic method name detection from function references
- 🧬 Support for mocking both instance and prototype methods
- ⚡️ Type-safe mock resolved values for Promise-returning methods
- 🏭 Convenient method mocker factory
- 🔄 Bulk mocking of prototype methods with filtering options
- 🛡️ Zero type configuration needed - just write your tests

## API

### `mockMethod`

Easy-to-use utility to mock any method. Just pass your instance and a method:

```typescript
import { mockMethod } from 'vitest-automoq';

class UserService {
  async getUser(id: number) {
    return { id, name: 'John' };
  }
}

const service = new UserService();

// Easy API - returns a mocker with mock and restore functions
const mocker = mockMethod(service, service.getUser);

// Set up your mock implementation
mocker.mock.mockResolvedValue({ id: 1, name: 'Mock User' });

// Use your mocked service
const user = await service.getUser(1);
console.log(user); // { id: 1, name: 'Mock User' }

// Verify your mock was called
expect(mocker.mock).toHaveBeenCalledWith(1);

// Restore original implementation when done
mocker.restore();
```

### `createMethodMocker`

Creates a reusable mocker for cleaner test setup. Perfect for mocking multiple methods on the same instance:

```typescript
import { createMethodMocker } from 'vitest-automoq';

class DatabaseService {
  async get(id: number) {
    return { id, data: 'real data' };
  }
  
  async save(data: { id: number; value: string }) {
    return true;
  }
}

// Create once, use many times
const service = new DatabaseService();
const autoMoq = createMethodMocker(service);

// Two styles to choose from:

// Style 1: Quick and compact
const getMoq = autoMoq(service.get);
getMoq.mock.mockResolvedValue({ id: 1, data: 'mocked' });

// Style 2: Destructured (familiar to vi.spyOn users)
const { mock: saveMock } = autoMoq(service.save);
saveMock.mockResolvedValue(true);

// Both styles provide the same functionality
const result = await service.get(1);
expect(result.data).toBe('mocked');
```

### `mockAllPrototypeMethods`

Bulk mock all methods with smart filtering options:

```typescript
import { mockAllPrototypeMethods } from 'vitest-automoq';

class PaymentService {
  async processPayment(amount: number) {
    return { success: true };
  }
  
  async refund(transactionId: string) {
    return { success: true };
  }
  
  private async logTransaction() {
    // internal logging
  }
}

const paymentService = new PaymentService();

// Mock all methods at once
const mocker = mockAllPrototypeMethods(paymentService);

// All methods are mocked and accessible
mocker.mocks.processPayment.mockResolvedValue({ success: false });
mocker.mocks.refund.mockResolvedValue({ success: true });

// Use your mocked service
const result = await paymentService.processPayment(100);
expect(result.success).toBe(false);

// Clean up when done
mocker.restoreAll();
```

## Advanced Usage

### Mocking Static Methods

Easily mock static methods:

```typescript
class Calculator {
  static add(a: number, b: number) {
    return a + b;
  }
}

// Mock static method
const mocker = mockMethod(Calculator, 'add');
mocker.mock.mockReturnValue(100);

// Use mocked static method
const result = Calculator.add(5, 10);
expect(result).toBe(100);
```

### Filtering Methods to Mock

Selectively mock only the methods you need:

```typescript
const mocker = mockAllPrototypeMethods(
  service,
  (key) => !key.startsWith('_'), // Skip private methods
  true,  // Include inherited methods
  false  // Exclude instance properties
);
```

### Type Safety Without Extra Work

All mocked methods retain their original types:

```typescript
class UserRepository {
  async findById(id: number): Promise<User> {
    return db.users.findById(id);
  }
}

const repo = new UserRepository();
const mocker = mockMethod(repo, repo.findById);

// TypeScript knows this is a User object
mocker.mock.mockResolvedValue({ id: 1, name: 'User 1' });

// TypeScript prevents incorrect types
// @ts-expect-error - Can't return a string for a User
mocker.mock.mockResolvedValue('wrong type');
```

## TypeScript Troubleshooting

### TypeScript Linter Errors

If you see TypeScript errors like:
```
Argument of type '"mocked"' is not assignable to parameter of type 'never'.
```

Or:
```
Property 'methodName' does not exist on type '{}'.
```

These are typically due to TypeScript's limitations with complex type inference and don't affect runtime functionality. Your tests will still run correctly.

### Solutions

1. **Use type assertions**: Add type assertions to tell TypeScript the expected type.

```typescript
// Method 1: Type assertion on the mock itself
(mocker.mock.mockReturnValue as any)('mocked'); 

// Method 2: Type assertion on the return value
mocker.mock.mockReturnValue('mocked' as any);
```

2. **Disable specific linter rules**: If you're using ESLint, you can disable specific rules for test files.

```typescript
// At the top of your test file
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
```

3. **Add helper types**: Create helper types to make your tests more type-safe.

```typescript
// Define a helper type for your mocks
type TypedMock<T> = {
  mockReturnValue(value: T): void;
  mockResolvedValue(value: T extends Promise<infer U> ? U : never): void;
};

// Use it in your tests
const { mock } = mockMethod(service, service.someMethod);
(mock as unknown as TypedMock<ReturnType<typeof service.someMethod>>)
  .mockReturnValue(expectedValue);
```

4. **Use the simplest approach**: If you don't need type checking in tests, use a simple type assertion.

```typescript
// Just let it work and focus on testing behavior
mocker.mock.mockReturnValue('mocked' as any);
```

Remember, the most important thing is that your tests verify the correct behavior, not that they pass the TypeScript checker. The runtime behavior is what matters.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
