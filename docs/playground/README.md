# Playground Service

The Playground service is a flexible execution environment that allows you to run custom code through a plugin-based architecture with support for both synchronous and asynchronous execution modes.

## Table of Contents

- [Getting Started](./guides/getting-started.md)
- [API Reference](./api/README.md)
- [Plugin System](./plugins/README.md)
- [Webhook Events](./guides/webhooks.md)
- [Integration Examples](./examples/README.md)

## Key Features

- **Flexible Execution Modes**: Choose between synchronous and asynchronous execution
- **Plugin Architecture**: Extensible system for custom code execution and analysis
- **Job Management**: Efficient handling of multiple execution jobs
- **Storage System**: Built-in storage capabilities for plugins
- **Real-time Updates**: Comprehensive event system with webhook integration
- **Error Handling**: Comprehensive error tracking and reporting
- **TypeScript Support**: Full type safety and excellent IDE integration

## Quick Start

### Synchronous Execution

```bash
# Create and execute a job synchronously
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "data": "your input data here"
    },
    "plugins": ["example-plugin"],
    "async": false
  }'
```

### Asynchronous Execution

```bash
# Create and execute a job asynchronously
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "data": "your input data here"
    },
    "plugins": ["example-plugin"],
    "async": true,
    "webhook": {
      "url": "https://your-server.com/webhook",
      "on": ["completed", "failed"]
    }
  }'

# Check job status
curl http://localhost:3000/playground/jobs/{jobId}
```

## Project Structure

```
src/
├── services/
│   └── playground/
│       ├── playground.ts    # Main playground service
│       ├── plugins/         # Plugin implementations
│       └── types.ts         # TypeScript type definitions
└── routes/
    └── playground.ts        # API endpoints
```

## Use Cases

The Playground service is ideal for:

1. **Quick Data Processing**: Use synchronous mode for immediate results
   - Data validation
   - Simple transformations
   - Quick API integrations

2. **Long-running Tasks**: Use asynchronous mode with webhooks
   - Complex data processing
   - Multi-step workflows
   - Resource-intensive operations

3. **Integration Workflows**: Build automated pipelines
   - Connect with n8n or make.com
   - Chain multiple services
   - Process results automatically

4. **Real-time Monitoring**: Track progress with webhooks
   - Monitor job execution
   - Get plugin-level updates
   - Handle errors immediately

## Event System

The service provides real-time updates through four event types:

- `started`: Job execution has begun
- `progress`: Plugin execution updates
- `completed`: Job finished successfully
- `failed`: Job encountered an error

Configure which events to receive:

```json
{
  "webhook": {
    "url": "https://your-server.com/webhook",
    "on": ["started", "completed", "failed"]
  }
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](../guides/contributing.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
