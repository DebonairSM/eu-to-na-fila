# Contributing Guide

This guide helps you work effectively with this AI-friendly codebase.

## Architecture Overview

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed system design.

### Key Principles

1. **Explicit over Implicit** - Patterns are documented, not assumed
2. **Type Safety First** - Validate at boundaries, trust internally
3. **Separation of Concerns** - Services for logic, routes for HTTP, DB for persistence
4. **Comprehensive Documentation** - JSDoc on exports, examples for patterns

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- (Optional) Android Studio for mobile development

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm db:migrate

# Seed test data
pnpm db:seed

# Start development servers
pnpm dev
```

## Project Structure

```
apps/
├── api/           # Fastify backend
│   ├── src/
│   │   ├── db/           # Database schema and connection
│   │   ├── services/     # Business logic layer
│   │   ├── routes/       # HTTP endpoints
│   │   ├── middleware/   # Reusable middleware
│   │   ├── lib/          # Utilities (validation, errors)
│   │   └── websocket/    # WebSocket handlers
│   └── drizzle/          # Database migrations
├── web/           # React frontend
│   └── src/
│       ├── pages/        # Route components
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Utilities (API client, config)
│       └── components/   # UI components
└── android/       # Kotlin mobile app

packages/
└── shared/        # Shared types and validation
    └── src/
        ├── schemas/      # Zod validation schemas
        └── types/        # TypeScript types

docs/              # Comprehensive documentation
examples/          # Complete code examples
```

## Development Workflow

### Adding a New Feature

Follow the established patterns:

1. **Review Documentation**
   - Read [docs/PATTERNS.md](./docs/PATTERNS.md) for common patterns
   - Check [examples/](./examples/) for similar features

2. **Define Types** (Shared Package)
   - Create Zod schema in `packages/shared/src/schemas/`
   - Export from `packages/shared/src/index.ts`

3. **Database Changes** (If needed)
   - Add table to `apps/api/src/db/schema.ts`
   - Run `pnpm --filter api db:generate`
   - Run `pnpm db:migrate`

4. **Business Logic** (Service Layer)
   - Create service class in `apps/api/src/services/`
   - Add comprehensive JSDoc
   - Export singleton instance

5. **API Endpoint** (Route Layer)
   - Create route in `apps/api/src/routes/`
   - Use validation helpers
   - Call service methods
   - Register in `apps/api/src/server.ts`

6. **Frontend** (React)
   - Add API client methods to `apps/web/src/lib/api.ts`
   - Create custom hook in `apps/web/src/hooks/`
   - Build page component in `apps/web/src/pages/`
   - Add route to `apps/web/src/App.tsx`

7. **Real-time Updates** (Optional)
   - Add event type to `packages/shared/src/types/websocket.ts`
   - Add broadcast method to WebSocketService
   - Emit from service layer
   - Handle in React components

### Code Quality

#### Type Safety

```typescript
// ✅ Good: Explicit types
async function getTicket(id: number): Promise<Ticket | null> {
  return await ticketService.getById(id);
}

// ❌ Bad: Using any
async function getTicket(id: any): Promise<any> {
  return await ticketService.getById(id);
}
```

#### Error Handling

```typescript
// ✅ Good: Throw typed errors
if (!shop) {
  throw new NotFoundError('Shop not found');
}

// ❌ Bad: Generic error
if (!shop) {
  throw new Error('Not found');
}
```

#### Validation

```typescript
// ✅ Good: Validate at route boundary
const data = validateRequest(createTicketSchema, request.body);
const ticket = await ticketService.create(data);

// ❌ Bad: No validation
const ticket = await ticketService.create(request.body as any);
```

#### Documentation

```typescript
// ✅ Good: Comprehensive JSDoc
/**
 * Create a new ticket and add it to the queue.
 * 
 * @param shopId - Shop database ID
 * @param data - Ticket creation data
 * @returns The created ticket with position and estimated wait time
 * @throws {NotFoundError} If shop or service doesn't exist
 * @throws {ConflictError} If queue is full
 * 
 * @example
 * ```typescript
 * const ticket = await ticketService.create(1, {
 *   serviceId: 2,
 *   customerName: 'João Silva'
 * });
 * ```
 */
async create(shopId: number, data: CreateTicket): Promise<Ticket> {
  // Implementation
}

// ❌ Bad: No documentation
async create(shopId: number, data: CreateTicket): Promise<Ticket> {
  // Implementation
}
```

## Testing

### Unit Tests (Future)

```typescript
// Test services
describe('TicketService', () => {
  it('should create ticket with correct position', async () => {
    const ticket = await ticketService.create(shopId, data);
    expect(ticket.position).toBe(1);
  });
});
```

### Integration Tests (Future)

```typescript
// Test API endpoints
describe('POST /api/shops/:slug/tickets', () => {
  it('should create a ticket', async () => {
    const response = await request(app)
      .post('/api/shops/mineiro/tickets')
      .send({ serviceId: 1, customerName: 'Test' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

## Common Tasks

### Adding Dependencies

```bash
# Backend dependency
pnpm --filter api add package-name

# Frontend dependency
pnpm --filter web add package-name

# Shared package dependency
pnpm --filter shared add package-name

# Workspace-wide dev dependency
pnpm add -D -w package-name
```

### Database Operations

```bash
# Generate migration from schema changes
pnpm --filter api db:generate

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Open Drizzle Studio
pnpm --filter api db:studio
```

### Building

```bash
# Build everything
pnpm build

# Build specific app
pnpm --filter api build
pnpm --filter web build

# Build for production
pnpm build:web
pnpm integrate:web  # Copy web build to API public folder
pnpm build:api
```

## Git Workflow

### Commit Messages

Follow conventional commits:

```
type(scope): brief description

Detailed explanation (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code refactoring
- `style`: Formatting changes
- `test`: Adding tests
- `chore`: Build/tooling changes

Examples:
```
feat(api): add barber status toggle endpoint
fix(web): resolve WebSocket reconnection loop
docs(examples): add React page creation guide
```

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch (if using GitFlow)
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes

## Documentation

### When to Document

1. **Always**
   - All exported functions and classes
   - Complex algorithms
   - API endpoints
   - Custom hooks

2. **Usually**
   - Non-obvious logic
   - Performance considerations
   - Error handling strategies

3. **Rarely**
   - Obvious code (e.g., getters/setters)
   - Standard implementations

### Documentation Style

Use JSDoc with examples:

```typescript
/**
 * Brief one-line description.
 * 
 * Longer description with details about:
 * - What it does
 * - When to use it
 * - Important considerations
 * 
 * @param param1 - Description of first parameter
 * @param param2 - Description of second parameter
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 * 
 * @example
 * ```typescript
 * const result = await function(arg1, arg2);
 * ```
 */
```

## Resources

- [Architecture Documentation](./docs/ARCHITECTURE.md) - System design overview
- [API Reference](./docs/API.md) - Complete API documentation
- [Code Conventions](./docs/CONVENTIONS.md) - Coding standards
- [Common Patterns](./docs/PATTERNS.md) - Pattern examples
- [Code Examples](./examples/) - Complete working examples

## Getting Help

### Before Asking

1. Check existing documentation in `docs/`
2. Look for similar examples in `examples/`
3. Search for patterns in the codebase
4. Review related files

### When Asking

Provide:
1. What you're trying to achieve
2. What you've tried
3. Error messages (if any)
4. Relevant code snippets

## Best Practices Summary

1. **Type Safety** - Use TypeScript strictly, avoid `any`
2. **Validation** - Validate at boundaries with Zod
3. **Error Handling** - Use custom error classes
4. **Separation of Concerns** - Services, routes, and DB layers
5. **Documentation** - JSDoc on all exports
6. **Testing** - Write tests for critical paths (future)
7. **Code Style** - Follow established conventions
8. **Git Hygiene** - Clear commit messages, logical commits

## AI-Friendly Practices

This codebase is optimized for AI assistance:

1. **Explicit Patterns** - Documented in `docs/PATTERNS.md`
2. **Complete Examples** - Working code in `examples/`
3. **Type Information** - Comprehensive TypeScript types
4. **Inline Documentation** - JSDoc with usage examples
5. **Consistent Structure** - Predictable file organization
6. **Clear Conventions** - Defined in `docs/CONVENTIONS.md`

When working with AI:
- Reference specific documentation files
- Point to similar examples
- Describe desired patterns explicitly
- Ask for code that matches established conventions

