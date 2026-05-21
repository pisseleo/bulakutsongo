import http from 'http';
import app from './app';
import { initializeSocket } from './configs/socket';

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Inicializar WebSocket
const io = initializeSocket(server);

// Disponibilizar io para os controllers (se necessário)
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});