import http from 'http';
import app from './app';
import { initSocket } from './socket/socket';

// Safety net for any unhandled promise rejection (should not happen after fix)
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: exit gracefully after logging
  // process.exit(1);
});

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Initialize WebSocket via socket.ts
const io = initSocket(server);

// BigInt serialization fix
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Make io available to controllers (if needed)
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});