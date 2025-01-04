import { Counter } from 'prom-client';

export const prometheus = {
  httpErrorsTotal: new Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors',
    labelNames: ['path', 'method', 'error_type'],
  }),
};
