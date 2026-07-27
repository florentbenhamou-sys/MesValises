import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Household } from '../types';

const HOUSEHOLD_ID_KEY = 'mesvalises.householdId';
const PERSON_ID_KEY = 'mesvalises.personId';

interface HouseholdContextValue {
  ready: boolean;
  configured: boolean;
  household: Household | null;
  currentPersonId: string | null;
  setCurrentPersonId: (personId: string | null) => void;
  createHousehold: (name: string, displayName: string) => Promise<void>;
  joinHousehold: (code: string, displayName: string) => Promise<void>;
  leaveHousehold: () => void;
  error: string | null;
  clearError: () => void;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [currentPersonId, setCurrentPersonIdState] = useState<string | null>(
    () => localStorage.getItem(PERSON_ID_KEY),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          if (!cancelled) setError(signInError.message);
        }
      }

      const storedHouseholdId = localStorage.getItem(HOUSEHOLD_ID_KEY);
      if (storedHouseholdId) {
        const { data, error: fetchError } = await supabase
          .from('households')
          .select('*')
          .eq('id', storedHouseholdId)
          .maybeSingle();
        if (!cancelled) {
          if (fetchError) {
            setError(fetchError.message);
          } else if (data) {
            setHousehold(data as Household);
          } else {
            localStorage.removeItem(HOUSEHOLD_ID_KEY);
          }
        }
      }

      if (!cancelled) setReady(true);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrentPersonId = useCallback((personId: string | null) => {
    setCurrentPersonIdState(personId);
    if (personId) {
      localStorage.setItem(PERSON_ID_KEY, personId);
    } else {
      localStorage.removeItem(PERSON_ID_KEY);
    }
  }, []);

  const createHousehold = useCallback(async (name: string, displayName: string) => {
    setError(null);
    const { data: householdId, error: rpcError } = await supabase.rpc('create_household', {
      p_name: name,
      p_display_name: displayName,
    });
    if (rpcError) {
      setError(rpcError.message);
      throw rpcError;
    }
    const { data, error: fetchError } = await supabase
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single();
    if (fetchError) {
      setError(fetchError.message);
      throw fetchError;
    }
    localStorage.setItem(HOUSEHOLD_ID_KEY, householdId as string);
    setHousehold(data as Household);
  }, []);

  const joinHousehold = useCallback(async (code: string, displayName: string) => {
    setError(null);
    const { data: householdId, error: rpcError } = await supabase.rpc('join_household', {
      p_code: code.trim().toUpperCase(),
      p_display_name: displayName,
    });
    if (rpcError) {
      setError(rpcError.message);
      throw rpcError;
    }
    const { data, error: fetchError } = await supabase
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single();
    if (fetchError) {
      setError(fetchError.message);
      throw fetchError;
    }
    localStorage.setItem(HOUSEHOLD_ID_KEY, householdId as string);
    setHousehold(data as Household);
  }, []);

  const leaveHousehold = useCallback(() => {
    localStorage.removeItem(HOUSEHOLD_ID_KEY);
    setCurrentPersonId(null);
    setHousehold(null);
  }, [setCurrentPersonId]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<HouseholdContextValue>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      household,
      currentPersonId,
      setCurrentPersonId,
      createHousehold,
      joinHousehold,
      leaveHousehold,
      error,
      clearError,
    }),
    [ready, household, currentPersonId, setCurrentPersonId, createHousehold, joinHousehold, leaveHousehold, error, clearError],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within a HouseholdProvider');
  return ctx;
}
