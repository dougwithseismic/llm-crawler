import { Router } from 'express';

const testRoutes = Router();

/**
 * Test Webhook Endpoint
 * Echoes back the request body and headers for testing webhook functionality
 *
 * @example
 * ```bash
 * curl -X POST http://localhost:3000/test/webhook \
 *   -H "Content-Type: application/json" \
 *   -H "X-Custom-Header: test" \
 *   -d '{"hello": "world"}'
 * ```
 */
testRoutes.post('/webhook', (req, res) => {
  const timestamp = new Date().toISOString();

  console.log('Webhook received', req.body);

  res.json({
    message: 'Webhook received',
    timestamp,
    headers: req.headers,
    body: req.body,
    method: req.method,
    url: req.url,
  });
});

export default testRoutes;
