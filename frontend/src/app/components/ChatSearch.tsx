import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { escapeRegExp, type ChatSearch } from '../hooks/useChatSearch';

interface ChatSearchBarProps {
  search: ChatSearch;
}

/** Search field shown under the chat header. */
export function ChatSearchBar({ search }: ChatSearchBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-6 py-2">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={search.query}
        onChange={(event) => search.setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (event.shiftKey) {
              search.goToPrevious();
            } else {
              search.goToNext();
            }
          } else if (event.key === 'Escape') {
            search.close();
          }
        }}
        placeholder={t('chat.searchPlaceholder')}
        className="flex-1 bg-transparent py-1 text-sm focus:outline-none"
      />
      <button
        type="button"
        onClick={search.close}
        title={t('chat.searchClose')}
        aria-label={t('chat.searchClose')}
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

interface ChatSearchNavProps {
  search: ChatSearch;
}

/** Bottom bar with the match counter and up/down arrows (replaces the message input while searching). */
export function ChatSearchNav({ search }: ChatSearchNavProps) {
  const { t } = useTranslation();
  const hasMatches = search.total > 0;

  return (
    <div className="flex items-center justify-between border-t border-border bg-card px-6 py-3">
      <span className="text-sm text-muted-foreground">
        {hasMatches
          ? t('chat.searchCount', { current: search.currentIndex + 1, total: search.total })
          : t('chat.searchNoResults')}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={search.goToPrevious}
          disabled={!hasMatches}
          title={t('chat.searchPrevious')}
          aria-label={t('chat.searchPrevious')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/70 disabled:opacity-40"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={search.goToNext}
          disabled={!hasMatches}
          title={t('chat.searchNext')}
          aria-label={t('chat.searchNext')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/70 disabled:opacity-40"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

interface HighlightedTextProps {
  text: string;
  query: string;
  /** Index of the occurrence inside this message that is currently active, or -1. */
  activeOccurrence: number;
}

export function HighlightedText({ text, query, activeOccurrence }: HighlightedTextProps) {
  if (!query) {
    return <>{text}</>;
  }

  const pattern = new RegExp(escapeRegExp(query), 'gi');
  const parts: Array<string | { match: string; occurrence: number }> = [];
  let lastIndex = 0;
  let occurrence = 0;
  let found = pattern.exec(text);
  while (found !== null) {
    if (found.index > lastIndex) {
      parts.push(text.slice(lastIndex, found.index));
    }
    parts.push({ match: found[0], occurrence });
    occurrence += 1;
    lastIndex = found.index + found[0].length;
    found = pattern.exec(text);
  }
  if (parts.length === 0) {
    return <>{text}</>;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <>
      {parts.map((part, index) =>
        typeof part === 'string' ? (
          <span key={index}>{part}</span>
        ) : (
          <mark
            key={index}
            className={`rounded px-0.5 text-black ${part.occurrence === activeOccurrence ? 'bg-orange-400' : 'bg-yellow-200'}`}
          >
            {part.match}
          </mark>
        )
      )}
    </>
  );
}
