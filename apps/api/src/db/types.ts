import type { db } from './index.js';

/** Database client type. Used for constructor injection in services. */
export type DbClient = typeof db;
