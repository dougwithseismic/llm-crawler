// Define core types that represent our domain
export const JobType = {
  CREATE_JOB: 'create-job',
  CREATE_BATCH_JOBS: 'create-batch-jobs',
} as const;

export const JobStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const JobPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
export type JobPriority = (typeof JobPriority)[keyof typeof JobPriority];

export type Job<T = unknown> = {
  id: string;
  type: (typeof JobType)[keyof typeof JobType];
  status: JobStatus;
  priority: JobPriority;
  data: T;
  metadata: JobMetadata;
};

export type JobMetadata = {
  createdAt: Date;
  updatedAt: Date;
  attempts: number;
  requestId: string;
  source: string;
  owner?: string;
};
