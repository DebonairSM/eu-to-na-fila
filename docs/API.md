# API Reference

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://yourdomain.com/api`

## Authentication

Currently, all endpoints are public. Future versions will add JWT authentication for staff endpoints.

## Response Format

### Success Response
```json
{
  "id": 1,
  "field": "value"
}
```

### Error Response
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

## Endpoints

### Health Check

#### `GET /health`

Check if the API is running.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Get Shop Queue

#### `GET /api/shops/:slug/queue`

Get the current queue for a barbershop.

**Parameters**
- `slug` (path) - Shop identifier (e.g., "mineiro")

**Response**
```json
{
  "shop": {
    "id": 1,
    "slug": "mineiro",
    "name": "Barbearia Mineiro",
    "domain": "mineiro.eutonafila.com",
    "path": "/mineiro",
    "theme": {
      "primary": "#8B4513",
      "accent": "#D2691E"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "tickets": [
    {
      "id": 1,
      "shopId": 1,
      "serviceId": 2,
      "barberId": 3,
      "customerName": "João Silva",
      "customerPhone": "11999999999",
      "status": "in_progress",
      "position": 0,
      "estimatedWaitTime": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:15:00.000Z"
    },
    {
      "id": 2,
      "shopId": 1,
      "serviceId": 1,
      "barberId": null,
      "customerName": "Maria Santos",
      "customerPhone": null,
      "status": "waiting",
      "position": 1,
      "estimatedWaitTime": 25,
      "createdAt": "2024-01-15T10:10:00.000Z",
      "updatedAt": "2024-01-15T10:10:00.000Z"
    }
  ]
}
```

**Error Responses**
- `404 Not Found` - Shop not found

---

### Create Ticket (Join Queue)

#### `POST /api/shops/:slug/tickets`

Add a customer to the queue.

**Parameters**
- `slug` (path) - Shop identifier

**Request Body**
```json
{
  "serviceId": 2,
  "customerName": "Pedro Costa",
  "customerPhone": "11988888888"
}
```

**Validation Rules**
- `serviceId`: Required, must be a valid service ID for the shop
- `customerName`: Required, 1-200 characters
- `customerPhone`: Optional, string

**Response** (201 Created)
```json
{
  "id": 3,
  "shopId": 1,
  "serviceId": 2,
  "barberId": null,
  "customerName": "Pedro Costa",
  "customerPhone": "11988888888",
  "status": "waiting",
  "position": 2,
  "estimatedWaitTime": 50,
  "createdAt": "2024-01-15T10:20:00.000Z",
  "updatedAt": "2024-01-15T10:20:00.000Z"
}
```

**Error Responses**
- `400 Bad Request` - Invalid input data
- `404 Not Found` - Shop or service not found

**WebSocket Event**
After successful creation, broadcasts:
```json
{
  "type": "ticket.created",
  "shopId": "mineiro",
  "timestamp": "2024-01-15T10:20:00.000Z",
  "data": {
    "ticket": { /* ticket object */ }
  }
}
```

---

### Update Ticket Status

#### `PATCH /api/tickets/:id/status`

Update the status of a ticket (e.g., start service, complete, cancel).

**Parameters**
- `id` (path) - Ticket ID

**Request Body**
```json
{
  "status": "in_progress",
  "barberId": 3
}
```

**Validation Rules**
- `status`: Required, one of: `waiting`, `in_progress`, `completed`, `cancelled`
- `barberId`: Optional, must be valid barber ID

**Response**
```json
{
  "id": 2,
  "shopId": 1,
  "serviceId": 1,
  "barberId": 3,
  "customerName": "Maria Santos",
  "customerPhone": null,
  "status": "in_progress",
  "position": 0,
  "estimatedWaitTime": null,
  "createdAt": "2024-01-15T10:10:00.000Z",
  "updatedAt": "2024-01-15T10:25:00.000Z"
}
```

**Error Responses**
- `400 Bad Request` - Invalid status or barberId
- `404 Not Found` - Ticket not found
- `409 Conflict` - Invalid status transition

**WebSocket Event**
After successful update, broadcasts:
```json
{
  "type": "ticket.status.changed",
  "shopId": "mineiro",
  "timestamp": "2024-01-15T10:25:00.000Z",
  "data": {
    "ticket": { /* updated ticket */ },
    "previousStatus": "waiting"
  }
}
```

---

### Get Ticket by ID

#### `GET /api/tickets/:id`

Get details for a specific ticket.

**Parameters**
- `id` (path) - Ticket ID

**Response**
```json
{
  "id": 2,
  "shopId": 1,
  "serviceId": 1,
  "barberId": 3,
  "customerName": "Maria Santos",
  "customerPhone": null,
  "status": "in_progress",
  "position": 0,
  "estimatedWaitTime": null,
  "createdAt": "2024-01-15T10:10:00.000Z",
  "updatedAt": "2024-01-15T10:25:00.000Z"
}
```

**Error Responses**
- `404 Not Found` - Ticket not found

---

### List Services (Future)

#### `GET /api/shops/:slug/services`

Get all available services for a shop.

**Response**
```json
{
  "services": [
    {
      "id": 1,
      "shopId": 1,
      "name": "Corte Simples",
      "description": "Corte de cabelo tradicional",
      "duration": 30,
      "price": 4000,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### List Barbers (Future)

#### `GET /api/shops/:slug/barbers`

Get all barbers for a shop.

**Response**
```json
{
  "barbers": [
    {
      "id": 1,
      "shopId": 1,
      "name": "Carlos Silva",
      "email": "carlos@mineiro.com",
      "phone": "11977777777",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## WebSocket API

### Connection

Connect to: `ws://localhost:3000/ws?shopId=mineiro`

**Query Parameters**
- `shopId` - Shop slug to subscribe to

### Events from Server

#### `connection.established`
Sent immediately after connection.

```json
{
  "type": "connection.established",
  "shopId": "mineiro",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "data": {
    "clientId": "client"
  }
}
```

#### `ticket.created`
Sent when a new ticket is created.

```json
{
  "type": "ticket.created",
  "shopId": "mineiro",
  "timestamp": "2024-01-15T10:20:00.000Z",
  "data": {
    "ticket": {
      "id": 3,
      "customerName": "Pedro Costa",
      "status": "waiting",
      "position": 2
    }
  }
}
```

#### `ticket.status.changed`
Sent when a ticket status changes.

```json
{
  "type": "ticket.status.changed",
  "shopId": "mineiro",
  "timestamp": "2024-01-15T10:25:00.000Z",
  "data": {
    "ticket": {
      "id": 2,
      "status": "in_progress",
      "barberId": 3
    },
    "previousStatus": "waiting"
  }
}
```

#### `metrics.updated`
Sent when queue metrics change.

```json
{
  "type": "metrics.updated",
  "shopId": "mineiro",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "queueLength": 5,
    "averageWaitTime": 35,
    "activeBarbers": 2
  }
}
```

### Events to Server (Future)

Currently, the WebSocket is one-way (server → client). Future versions may support:
- `ping` - Keep connection alive
- `subscribe` - Subscribe to specific events
- `unsubscribe` - Unsubscribe from events

## Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Response** when exceeded:
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded, retry in 1 minute"
}
```

## CORS

- **Allowed Origins**: Configured via `CORS_ORIGIN` environment variable
- **Credentials**: Enabled
- **Methods**: GET, POST, PATCH, DELETE
- **Headers**: Content-Type, Authorization

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `SHOP_NOT_FOUND` | 404 | Shop does not exist |
| `TICKET_NOT_FOUND` | 404 | Ticket does not exist |
| `SERVICE_NOT_FOUND` | 404 | Service does not exist |
| `BARBER_NOT_FOUND` | 404 | Barber does not exist |
| `INVALID_STATUS_TRANSITION` | 409 | Cannot change ticket to requested status |
| `QUEUE_FULL` | 409 | Maximum queue size reached |
| `INTERNAL_ERROR` | 500 | Server error |

## SDK / Client Libraries

### JavaScript/TypeScript

Type-safe client available in `apps/web/src/lib/api.ts`:

```typescript
import { api } from './lib/api';

// Get queue
const { shop, tickets } = await api.getQueue('mineiro');

// Create ticket
const ticket = await api.createTicket('mineiro', {
  serviceId: 2,
  customerName: 'João Silva',
  customerPhone: '11999999999'
});

// Update status
const updated = await api.updateTicketStatus(ticket.id, {
  status: 'in_progress',
  barberId: 3
});
```

### Kotlin (Android)

API service available in `apps/android/src/main/kotlin/com/eutonafila/network/ApiService.kt`

## Changelog

### v1.0.0 (Current)
- Initial API implementation
- Basic CRUD for tickets
- WebSocket support for real-time updates
- Queue management

### Future Versions
- v1.1.0: Authentication and authorization
- v1.2.0: Analytics endpoints
- v1.3.0: Multi-barber assignment
- v2.0.0: PostgreSQL support

