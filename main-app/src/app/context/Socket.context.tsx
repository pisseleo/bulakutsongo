'use client';

/**
 * context/Socket.context.tsx
 *
 * Provides a single Socket.IO client instance to the whole app.
 * The socket connects once the user is authenticated and disconnects on logout.
 *
 * Usage:
 *   const { socket, isConnected } = useSocket();
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './Auth.context';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Disconnect & clean up if the user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Read token from localStorage (saved by Auth.service.ts on login)
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] connected:', socket.id);
      setIsConnected(true);

      // Keep the server presence TTL alive every 30 s
      const heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat');
      }, 30_000);

      socket.on('disconnect', () => {
        clearInterval(heartbeatInterval);
        setIsConnected(false);
        console.log('[Socket] disconnected');
      });
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] connect error:', err.message);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}