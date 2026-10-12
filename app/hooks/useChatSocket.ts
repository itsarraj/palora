import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';

import { getAccessToken } from '@/lib/auth-storage';
import { datingKeys } from '@/hooks/useDating';
import type { ChatMessage } from '@/lib/fixtures';

const VERSION = process.env.EXPO_PUBLIC_BFF_API_VERSION?.trim() || 'v1';

function getWsUrl(token: string): string {
  const fromEnv = process.env.EXPO_PUBLIC_BFF_API_URL?.trim();
  const fromExtra = (Constants.expoConfig?.extra as { bffApiUrl?: string } | undefined)?.bffApiUrl;
  const root = (fromEnv || fromExtra || 'https://palora.kraftisium.xyz').replace(/\/$/, '');
  const wsRoot = root.replace(/^http/, 'ws');
  return `${wsRoot}/api/${VERSION}/ws?token=${encodeURIComponent(token)}`;
}

export function useChatSocket(conversationId?: string, peerId?: string) {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let unmounted = false;
    let reconnectTimer: NodeJS.Timeout | null = null;

    async function connect() {
      const token = await getAccessToken();
      if (!token || unmounted) return;

      const url = getWsUrl(token);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!unmounted) setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.message) {
            const convoId = data.conversation_id;
            const msg: ChatMessage = data.message;

            qc.setQueryData<{ pages: ChatMessage[][]; pageParams: unknown[] }>(
              datingKeys.messages(convoId),
              (old) => {
                if (!old) return old;
                const [first = [], ...rest] = old.pages;
                if (first.some((m) => m.id === msg.id)) return old;
                return { ...old, pages: [[msg, ...first], ...rest] };
              }
            );
            qc.invalidateQueries({ queryKey: datingKeys.conversations });
          } else if (data.type === 'typing' && data.conversation_id === conversationId) {
            setIsPeerTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsPeerTyping(false);
            }, 3000);
          }
        } catch {
          // ignore non-json frames
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conversationId, qc]);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && conversationId && peerId) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          conversation_id: conversationId,
          peer_id: peerId,
        })
      );
    }
  }, [conversationId, peerId]);

  return { isConnected, isPeerTyping, sendTyping };
}
