import { useMemo, useState } from 'react';

import { filterEntries, getReferenceEntries } from '@/lib/reference';

export function useReference() {
  const [entries] = useState(() => getReferenceEntries());
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => filterEntries(entries, query), [entries, query]);

  return { entries: filtered, query, setQuery };
}
