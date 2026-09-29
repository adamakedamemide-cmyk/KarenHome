import { type JobRecord } from '@platform/db';
import type { WorkerContext } from '../runner';
export declare function handleMediaJob(job: JobRecord, ctx: WorkerContext): Promise<void>;
