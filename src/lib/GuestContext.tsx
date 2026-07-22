'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuestContextValue {
  isGuest: boolean;
  loading: boolean;
}

const GuestContext = createContext<GuestContextValue>({ isGuest: false, loading: true });

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => { setIsGuest(!r.ok); })
      .catch(() => setIsGuest(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <GuestContext.Provider value={{ isGuest, loading }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  return useContext(GuestContext);
}
