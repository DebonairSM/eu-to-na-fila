# Code Examples

Complete, working examples for common development tasks. Each example is self-contained and follows the established patterns.

## Available Examples

1. **[Adding a New API Endpoint](./01-add-api-endpoint.md)** - Complete guide to adding a new endpoint from scratch
2. **[Creating a Database Table](./02-create-database-table.md)** - How to add a new table with migrations
3. **[Adding a WebSocket Event](./03-add-websocket-event.md)** - Implement real-time event broadcasting
4. **[Creating a React Page](./04-create-react-page.md)** - Build a new page with data fetching and real-time updates

## Quick Reference

### Adding an API Endpoint
```
1. Define Zod schema in shared package
2. Create service class with business logic
3. Create route handler with validation
4. Register route in server.ts
```

### Creating a Database Table
```
1. Define schema in apps/api/src/db/schema.ts
2. Run: pnpm --filter api db:generate
3. Run: pnpm db:migrate
4. Add seed data (optional)
```

### Adding a WebSocket Event
```
1. Define event type in shared/src/types/websocket.ts
2. Add broadcast method to WebSocketService
3. Emit event from service layer
4. Handle event in React components
```

### Creating a React Page
```
1. Create page component in apps/web/src/pages/
2. Add route to App.tsx
3. Create custom hook for data fetching
4. Add WebSocket integration for real-time updates
```

## Example Project Structure

After following all examples, your project will have this structure:

```
apps/api/src/
├── db/
│   └── schema.ts              # Database tables
├── services/
│   ├── TicketService.ts       # Business logic
│   ├── QueueService.ts
│   ├── WebSocketService.ts
│   └── NotificationService.ts # Example service
├── routes/
│   ├── queue.ts
│   ├── tickets.ts
│   ├── status.ts
│   └── notifications.ts       # Example route
├── lib/
│   ├── validation.ts
│   └── errors.ts
└── server.ts

packages/shared/src/
├── schemas/
│   ├── ticket.ts
│   └── notification.ts        # Example schema
└── types/
    ├── api.ts
    ├── websocket.ts
    └── errors.ts

apps/web/src/
├── pages/
│   ├── QueuePage.tsx
│   ├── StatusPage.tsx
│   └── NotificationsPage.tsx  # Example page
├── hooks/
│   ├── useWebSocket.ts
│   └── useNotifications.ts    # Example hook
└── lib/
    └── api.ts
```

## Best Practices

### Type Safety
- Always use TypeScript with strict mode
- Define types in shared package when used across apps
- Use Zod for runtime validation
- Leverage type inference where possible

### Error Handling
- Use custom error classes (ValidationError, NotFoundError, etc.)
- Return meaningful error messages
- Include field-level errors for forms
- Log errors appropriately

### Code Organization
- Keep business logic in services
- Keep HTTP concerns in routes
- Validate at boundaries (route handlers)
- Use middleware for cross-cutting concerns

### Testing
- Write unit tests for services
- Write integration tests for routes
- Test error cases
- Mock external dependencies

### Documentation
- Add JSDoc to all exported functions
- Include usage examples in comments
- Document error conditions
- Keep README files up to date

## Contributing

When adding new examples:

1. Follow the numbering scheme (01-, 02-, etc.)
2. Include complete, working code
3. Explain the "why" not just the "how"
4. Add cross-references to related examples
5. Test all code before committing

