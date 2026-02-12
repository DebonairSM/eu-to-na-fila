/**
 * Service composition root.
 * All service instances are created here with their dependencies injected.
 * Routes import from this file instead of individual service files.
 */
import { db } from '../db/index.js';
import { AuditService } from './AuditService.js';
import { ClientService } from './ClientService.js';
import { QueueService } from './QueueService.js';
import { TicketService } from './TicketService.js';

const auditService = new AuditService(db);
const clientService = new ClientService(db);
const queueService = new QueueService(db, auditService);
const ticketService = new TicketService(db, queueService, auditService, clientService);

export { auditService, clientService, queueService, ticketService };
export type { AuditService } from './AuditService.js';
export type { ClientService } from './ClientService.js';
export type { QueueService } from './QueueService.js';
export type { TicketService } from './TicketService.js';
