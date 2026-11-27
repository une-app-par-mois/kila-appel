// Lecture partagée par les hooks de données (CONV-10) : une action qui échoue est relayée à
// l'écran ; tout écran ouvert recharge après une modification (dataChanged) ; à chaque changement
// de lecture, la valeur est vidée (sauf `keepPrevious`) et une réponse tardive de l'ancienne ignorée.
import { useCallback, useEffect, useRef, useState } from 'react';
import { log } from '@/data/log';
import { onDataChanged } from '@/hooks/dataChanged';

/** Lit une valeur, garde seulement la dernière réponse, recharge à chaque modification. */
export const useLoaded = <T>(
  load: (() => Promise<T>) | null,
  failureCode: string,
  details = {},
  /**
   * Garde la valeur précédente, et `loaded`, pendant la nouvelle lecture (recherche pendant la
   * frappe ; accueil qui suit l'heure sans se vider, ticket 012).
   */
  keepPrevious = false,
) => {
  const [value, setValue] = useState<T | null>(null);
  // Vrai dès la première lecture réussie : distingue « en cours » de « introuvable ».
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const lastLoad = useRef(0);
  const detailsRef = useRef(details);
  detailsRef.current = details;

  const reload = useCallback(async () => {
    const current = ++lastLoad.current;
    if (!load) return;
    try {
      const result = await load();
      if (current !== lastLoad.current) return;
      setValue(result);
      setLoaded(true);
      setLoadFailed(false);
    } catch {
      log(failureCode, detailsRef.current);
      if (current === lastLoad.current) setLoadFailed(true);
    }
  }, [load, failureCode]);

  useEffect(() => {
    if (!keepPrevious) {
      setValue(null);
      setLoaded(false);
    }
    setLoadFailed(false);
    void reload();
    return onDataChanged(() => void reload());
  }, [reload, keepPrevious]);

  return { value, loaded, loadFailed };
};
