import { useRef, useState, useEffect, useCallback } from 'react';

const useWebSocket = () => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribedTopicsRef = useRef(new Set());
  const maxReconnectAttempts = 5;
  const messageHandlersRef = useRef(new Map()); // Store message handlers

  const connect = useCallback(() => {
    // Check if WebSocket is disabled via environment variable
    if (import.meta.env.VITE_DISABLE_WEBSOCKET === 'true') {
      console.log('⚠️ WebSocket disabled via environment variable');
      return;
    }

    // Don't attempt to connect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('⚠️ WebSocket max reconnection attempts reached. Stopping reconnection.');
      return;
    }

    // Check if already connected or connecting
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return wsRef.current;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      console.log('⏳ WebSocket connection already in progress');
      return;
    }

    if (isConnecting) {
      console.log('⏳ WebSocket connection attempt already in progress');
      return;
    }

    setIsConnecting(true);
    const wsURL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    console.log(`🔌 Connecting to WebSocket: ${wsURL} (Attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
    
    try {
      // Clean up existing connection if any
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      const ws = new WebSocket(wsURL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
        
        // Resubscribe to all topics
        subscribedTopicsRef.current.forEach(topic => {
          console.log('🔄 Resubscribing to MQTT topic:', topic);
          ws.send(JSON.stringify({
            type: 'subscribe',
            topic
          }));
        });
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('❌ WebSocket disconnected', event.code, event.reason, 'wasClean:', event.wasClean);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Only clear wsRef if this is the current WebSocket instance
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Only attempt to reconnect for unexpected disconnections
        // and only if this was the current WebSocket instance
        const shouldReconnect = 
          (wsRef.current === ws || wsRef.current === null) && // Either current instance or no instance
          event.code !== 1000 && // Not a normal closure
          event.code !== 1001 && // Not going away
          event.code !== 3000 && // Not unsupported data
          !event.wasClean &&      // Not a clean closure
          reconnectAttemptsRef.current < maxReconnectAttempts; // Haven't exceeded max attempts
          
        if (shouldReconnect) {
          reconnectAttemptsRef.current++;
          
          const backoffDelay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          
          console.log(`🔄 Will attempt to reconnect in ${backoffDelay/1000}s... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            // Double-check we're not already connected before attempting reconnect
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
              connect();
            }
          }, backoffDelay);
        } else {
          console.log('✅ WebSocket closed cleanly or max attempts reached, no reconnection needed');
        }
      };

      // Handle incoming messages
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📥 WebSocket message:', message);

          // Broadcast to all registered handlers for this topic
          if (message.type === 'mqtt_message' && message.topic && message.data) {
            const handlers = messageHandlersRef.current.get(message.topic) || [];
            handlers.forEach(handler => {
              try {
                handler(message.data);
              } catch (error) {
                console.error('❌ Error in message handler:', error);
              }
            });
          }
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error);
        }
      };

      return ws;
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      setIsConnecting(false);
      
      reconnectAttemptsRef.current++;
      const backoffDelay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, backoffDelay);
      return null;
    }
  }, [isConnecting]);

  const subscribe = useCallback((topic, onMessage) => {
    if (!topic) return;

    // Add message handler to the handlers map
    if (onMessage) {
      const handlers = messageHandlersRef.current.get(topic) || [];
      handlers.push(onMessage);
      messageHandlersRef.current.set(topic, handlers);
    }

    // Check if already subscribed to avoid duplicate subscriptions
    if (subscribedTopicsRef.current.has(topic)) {
      console.log('📡 Already subscribed to MQTT topic:', topic);
      
      // Return cleanup function for message handler only
      return () => {
        if (onMessage) {
          const handlers = messageHandlersRef.current.get(topic) || [];
          const updatedHandlers = handlers.filter(handler => handler !== onMessage);
          if (updatedHandlers.length > 0) {
            messageHandlersRef.current.set(topic, updatedHandlers);
          } else {
            messageHandlersRef.current.delete(topic);
            // Don't unsubscribe from MQTT topic, keep it active
          }
        }
      };
    }

    subscribedTopicsRef.current.add(topic);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('📡 Subscribing to MQTT topic:', topic);
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        topic
      }));
    }

    // Return cleanup function for message handler only
    return () => {
      if (onMessage) {
        const handlers = messageHandlersRef.current.get(topic) || [];
        const updatedHandlers = handlers.filter(handler => handler !== onMessage);
        if (updatedHandlers.length > 0) {
          messageHandlersRef.current.set(topic, updatedHandlers);
        } else {
          messageHandlersRef.current.delete(topic);
          // Don't unsubscribe from MQTT topic, keep it active
        }
      }
    };
  }, []);

  const unsubscribe = useCallback((topic) => {
    if (!topic) return;

    // Only manually unsubscribe when explicitly called
    subscribedTopicsRef.current.delete(topic);
    messageHandlersRef.current.delete(topic);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('📡 Manually unsubscribing from MQTT topic:', topic);
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        topic
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket...');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close(1000, 'Manual disconnect'); // Use code 1000 for normal closure
    }
    
    wsRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
    subscribedTopicsRef.current.clear();
    messageHandlersRef.current.clear();
  }, []);

  const resetAndReconnect = useCallback(() => {
    console.log('🔄 Manually resetting WebSocket connection...');
    reconnectAttemptsRef.current = 0;
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [connect, disconnect]);

  // Initialize connection on mount
  useEffect(() => {
    const initConnection = () => {
      // Only connect if not already connected or connecting
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
        console.log('🔌 Initializing WebSocket connection...');
        connect();
      } else {
        console.log('✅ WebSocket already initialized, state:', wsRef.current.readyState);
      }
    };

    // Small delay to prevent immediate reconnection loops
    const initTimer = setTimeout(initConnection, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(initTimer);
      disconnect();
    };
  }, []); // Empty dependency array - only run once on mount

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    resetAndReconnect,
    subscribe,
    unsubscribe,
    wsRef,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts
  };
};

export default useWebSocket;