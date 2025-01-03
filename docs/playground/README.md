# Playground Service

The Playground service is a flexible execution environment that allows you to run custom code through a plugin-based architecture while leveraging the same powerful webhook and event system as the crawler service.

## Table of Contents

- [Getting Started](./guides/getting-started.md)
- [API Reference](./api/README.md)
- [Plugin System](./plugins/README.md)
- [Webhook Events](./guides/webhooks.md)
- [Integration Examples](./examples/README.md)

## Key Features

- **Plugin Architecture**: Extensible system for custom code execution and analysis
- **Job Management**: Efficient handling of multiple execution jobs
- **Storage System**: Built-in storage capabilities for plugins
- **Webhook Integration**: Real-time progress notifications and event tracking
- **Error Handling**: Comprehensive error tracking and reporting
- **TypeScript Support**: Full type safety and excellent IDE integration

## Quick Start

```bash
# Create a new job
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "data": "your input data here"
    },
    "plugins": ["example-plugin"]
  }'

# Start the job
curl -X POST http://localhost:3000/playground/jobs/{jobId}/start

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

1. **Custom Data Processing**: Execute custom data transformation and analysis
2. **Integration Testing**: Run integration tests with external services
3. **Workflow Automation**: Create complex automation workflows with n8n or make.com
4. **Data Enrichment**: Process and enrich data through custom plugins
5. **Scheduled Tasks**: Execute periodic tasks with webhook notifications

## Contributing

We welcome contributions! Please see our [Contributing Guide](../guides/contributing.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
