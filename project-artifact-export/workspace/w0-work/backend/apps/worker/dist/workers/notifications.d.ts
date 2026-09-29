import { type JobRecord } from '@platform/db';
import type { WorkerContext } from '../runner';
export declare function handleNotificationJob(job: JobRecord, ctx: WorkerContext): Promise<void>;
export declare function handleEmailJob(job: JobRecord, ctx: WorkerContext): Promise<void>;
export declare function handleSmsJob(job: JobRecord, ctx: WorkerContext): Promise<void>;
