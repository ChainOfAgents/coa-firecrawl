import "dotenv/config";
import "./sentry";
import * as http from 'http';
import {
  getScrapeQueue,
  getExtractQueue,
  getDeepResearchQueue,
  getGenerateLlmsTxtQueue,
} from "./queue-service";

// Import the original worker file functionality
import '../services/queue-worker';

// Create a simple HTTP server for Cloud Run health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    // Check Redis connection
    if (!redisConnection.status || redisConnection.status !== 'ready') {
      res.writeHead(503);
      res.end('Redis connection not ready');
      return;
    }
    res.writeHead(200);
    res.end('Worker is healthy');
  } else {
    res.writeHead(200);
    res.end('Worker service running');
  }
});

// Add error handler for the server
server.on('error', (err) => {
  console.error('Server error:', err);
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Worker health check server listening on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// The workers will be started by the imported queue-worker.ts
// We're just adding the HTTP server for Cloud Run compatibility
