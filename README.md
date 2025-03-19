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

### `moqFn`

Easy-to-use utility to mock any method. Just pass your instance and a method:

```typescript
import { moqFn } from 'vitest-automoq';

class UserService {
  async getUser(id: number) {
    return { id, name: 'John' };
  }
}

const service = new UserService();

// Returns a type-safe mock function
const mock = moqFn(service, service.getUser);

// Set up your mock implementation with full type safety
mock.mockResolvedValue({ id: 1, name: 'Mock User' }); // ✅ Type-safe
mock.mockResolvedValue('wrong type'); // ❌ Type error
mock.mockResolvedValue({ id: 1 }); // ❌ Type error - missing name

// Use your mocked service
const user = await service.getUser(1);
console.log(user); // { id: 1, name: 'Mock User' }

// Verify your mock was called
expect(mock).toHaveBeenCalledWith(1);

// Restore all mocks when done
vi.restoreAllMocks();
```

### `moqFns`

Creates a reusable mocker for cleaner test setup. Perfect for mocking multiple methods on the same instance:

```typescript
import { moqFns } from 'vitest-automoq';

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
const mocker = moqFns(service);

// Simple and clean API with full type safety
const getMock = mocker(service.get);
getMock.mockResolvedValue({ id: 1, data: 'mocked' }); // ✅ Type-safe

const saveMock = mocker(service.save);
saveMock.mockResolvedValue(true); // ✅ Type-safe

// Use your mocked service
const result = await service.get(1);
expect(result.data).toBe('mocked');
```

### `moqAllPrototypeFns`

Bulk mock all methods with smart filtering options:

```typescript
import { moqAllPrototypeFns } from 'vitest-automoq';

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

// Mock all methods at once - returns an object of type-safe mocks
const mocks = moqAllPrototypeFns(paymentService);

// All methods are mocked and accessible directly with full type safety
mocks.processPayment.mockResolvedValue({ success: false }); // ✅ Type-safe
mocks.refund.mockResolvedValue({ success: true }); // ✅ Type-safe

// Use your mocked service
const result = await paymentService.processPayment(100);
expect(result.success).toBe(false);

// Clean up when done
vi.restoreAllMocks();
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
const mock = moqFn(Calculator, 'add');
mock.mockReturnValue(100); // ✅ Type-safe

// Use mocked static method
const result = Calculator.add(5, 10);
expect(result).toBe(100);
```

### Filtering Methods to Mock

Selectively mock only the methods you need:

```typescript
const mocks = moqAllPrototypeFns(
  service,
  (key) => !key.startsWith('_'), // Skip private methods
  true,  // Include inherited methods
  false  // Exclude instance properties
);
```

### Type Safety Without Extra Work

All mocked methods retain their original types with zero configuration:

```typescript
interface User {
  id: number;
  name: string;
}

class UserRepository {
  async findById(id: number): Promise<User> {
    return db.users.findById(id);
  }
}

const repo = new UserRepository();
const mock = moqFn(repo, repo.findById);

// TypeScript knows this is a User object
mock.mockResolvedValue({ id: 1, name: 'User 1' }); // ✅ Type-safe

// TypeScript prevents incorrect types
mock.mockResolvedValue('wrong type'); // ❌ Type error
mock.mockResolvedValue({ id: 1 }); // ❌ Type error - missing name
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
