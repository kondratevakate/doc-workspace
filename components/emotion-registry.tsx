'use client';

import * as React from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';

/**
 * Collects Emotion styles during SSR and injects them via useServerInsertedHTML
 * so the server HTML matches what the client renders — fixes MUI hydration errors.
 */
export function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = React.useState(() => {
    const emotionCache = createCache({ key: 'css' });
    emotionCache.compat = true;

    const prevInsert = emotionCache.insert.bind(emotionCache);
    let inserted: string[] = [];

    emotionCache.insert = (...args: Parameters<typeof prevInsert>) => {
      const [, serialized] = args;
      if (emotionCache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };

    return {
      cache: emotionCache,
      flush() {
        const prev = inserted;
        inserted = [];
        return prev;
      }
    };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    const styles = names.map((name) => cache.inserted[name]).join('');
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
