import { useState, useCallback, useRef, useEffect } from 'react';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Custom hook for WebSocket connection (proctoring)
 */
export const useWebSocket = (url) => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const onMessageCallbackRef = useRef(null);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const wsUrl = token ? `${url}?token=${token}` : url;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessageCallbackRef.current) {
            onMessageCallbackRef.current(data);
          }
        } catch {
          setLastMessage(event.data);
        }
      };

      wsRef.current.onerror = (event) => {
        setError('WebSocket connection error');
        console.error('WebSocket error:', event);
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        if (event.code !== 1000) {
          // Attempt reconnect after 3 seconds if not normal closure
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    } catch (err) {
      setError(err.message);
    }
  }, [url]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  /**
   * Send message
   */
  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    }
    return false;
  }, []);

  /**
   * Send frame for proctoring
   */
  const sendFrame = useCallback((base64Frame) => {
    return sendMessage({
      frame: base64Frame.replace(/^data:image\/\w+;base64,/, ''),
      timestamp: Date.now() / 1000,
    });
  }, [sendMessage]);

  /**
   * Set message handler
   */
  const onMessage = useCallback((callback) => {
    onMessageCallbackRef.current = callback;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    sendFrame,
    onMessage,
  };
};

export default useWebSocket;
