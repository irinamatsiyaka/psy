import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableMessage {
  id: string;
  text: string;
}

interface SearchMatch {
  messageId: string;
  occurrence: number;
}

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * In-chat text search: collects every occurrence of the query across messages,
 * keeps an active match and scrolls it into view inside the given container.
 */
export function useChatSearch(messages: SearchableMessage[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQueryState] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const normalizedQuery = query.trim();

  const matches = useMemo<SearchMatch[]>(() => {
    if (!normalizedQuery) {
      return [];
    }
    const result: SearchMatch[] = [];
    for (const message of messages) {
      const pattern = new RegExp(escapeRegExp(normalizedQuery), 'gi');
      let occurrence = 0;
      while (pattern.exec(message.text) !== null) {
        result.push({ messageId: message.id, occurrence });
        occurrence += 1;
      }
    }
    return result;
  }, [messages, normalizedQuery]);

  const currentIndex = matches.length > 0 ? Math.min(activeIndex, matches.length - 1) : -1;
  const activeMatch = currentIndex >= 0 ? matches[currentIndex] : null;

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    // Start from the most recent match.
    setActiveIndex(Number.MAX_SAFE_INTEGER);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQueryState('');
    setActiveIndex(0);
  }, []);

  const goToPrevious = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((currentIndex - 1 + matches.length) % matches.length);
  }, [currentIndex, matches.length]);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((currentIndex + 1) % matches.length);
  }, [currentIndex, matches.length]);

  const activeMessageId = activeMatch?.messageId ?? null;

  useEffect(() => {
    if (!activeMessageId || !containerRef.current) {
      return;
    }
    const target = containerRef.current.querySelector<HTMLElement>(`[data-message-id="${activeMessageId}"]`);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeMessageId, currentIndex, normalizedQuery]);

  return {
    isOpen,
    query,
    normalizedQuery,
    total: matches.length,
    currentIndex,
    activeMatch,
    containerRef,
    open,
    close,
    setQuery,
    goToPrevious,
    goToNext,
  };
}

export type ChatSearch = ReturnType<typeof useChatSearch>;
