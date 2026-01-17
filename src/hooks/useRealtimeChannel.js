import { useEffect, useRef } from 'react';
import { getSupabase, hasSupabaseConfig } from '@/lib/customSupabaseClient';
import { logger } from '@/lib/logger';

// Realtime channel hook with:
// - Single removal guard
// - Join timeout cleanup
// - Exponential backoff + jitter resubscribe on CHANNEL_ERROR/TIMED_OUT/unexpected CLOSED
// - Optional telemetry logging (env flag VITE_REALTIME_DEBUG or debug prop)
// Parameters (existing kept backwards compatible):
// enabled, channelName, event, schema, table, filter, onChange, joinTimeoutMs
// New optional params: maxRetries, baseDelayMs, maxDelayMs, debug, changes
export function useRealtimeChannel({
  enabled = true,
  channelName,
  event = '*',
  schema = 'public',
  table,
  filter,
  onChange,
  joinTimeoutMs = 10000,
  maxRetries = 3,
  baseDelayMs = 800,
  maxDelayMs = 10000,
  debug,
  // Optional: multiple postgres_changes bindings on a single channel.
  // Each item: { event?: string, schema?: string, table: string, filter?: string }
  changes,
}) {
  const attemptRef = useRef(0);
  const removedRef = useRef(false);
  const retryTimerRef = useRef(null);
  const cleanupTimerRef = useRef(null);
  const channelRef = useRef(null);
  const supabaseRef = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;
    if (!hasSupabaseConfig) return;
    if (!channelName) return;

    const hasSingleBinding = Boolean(table);
    const hasMultiBindings = Array.isArray(changes) && changes.length > 0;
    if (!hasSingleBinding && !hasMultiBindings) return;

    if (typeof window === 'undefined') return;

    const runtimeEnv =
      typeof window !== 'undefined' && window.__QUIZ_DANGAL_ENV__ ? window.__QUIZ_DANGAL_ENV__ : {};
    const envDebugRaw =
      import.meta.env?.VITE_REALTIME_DEBUG ?? runtimeEnv?.VITE_REALTIME_DEBUG ?? '0';
    const envDebug = ['1', 'true', 'yes', 'on'].includes(String(envDebugRaw).toLowerCase());
    const logEnabled = Boolean(debug ?? envDebug);

    function log(...args) {
      if (logEnabled) {
        try {
          logger.debug('[realtime]', ...args);
        } catch {
          /* ignore */
        }
      }
    }

    let cancelled = false;

    const init = async () => {
      try {
        const sb = await getSupabase();
        if (!sb || cancelled) return null;
        supabaseRef.current = sb;
        return sb;
      } catch {
        return null;
      }
    };

    const removeChannel = () => {
      try {
        if (channelRef.current && !removedRef.current) {
          removedRef.current = true;
          log('remove', channelName, 'attempt', attemptRef.current);
          supabaseRef.current?.removeChannel?.(channelRef.current);
        }
      } catch {
        /* ignore */
      }
    };

    const scheduleRetry = (reason) => {
      if (cancelled) return;
      if (removedRef.current) return;
      if (attemptRef.current >= maxRetries) {
        log('max retries reached', channelName);
        return;
      }
      const attempt = attemptRef.current + 1; // next attempt number
      const rawDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = rawDelay * 0.2 * (Math.random() - 0.5); // +/-10%
      const delay = Math.max(150, Math.round(rawDelay + jitter));
      log('schedule retry', channelName, 'in', delay, 'ms reason=', reason, 'attempt', attempt);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        subscribe(attempt);
      }, delay);
    };

    const subscribe = async (attempt) => {
      if (cancelled) return;
      const sb = supabaseRef.current || (await init());
      if (!sb || cancelled) return;
      attemptRef.current = attempt;
      removedRef.current = false; // reset removal for new channel instance
      if (channelRef.current) {
        try {
          sb.removeChannel(channelRef.current);
        } catch {
          /* ignore */
        }
        channelRef.current = null;
      }
      let ch;
      try {
        log('subscribe start', channelName, 'attempt', attempt);
        ch = sb.channel(channelName, { config: { broadcast: { ack: false } } });

        if (hasMultiBindings) {
          for (const binding of changes) {
            if (!binding?.table) continue;
            const bEvent = binding.event ?? '*';
            const bSchema = binding.schema ?? 'public';
            const bFilter = binding.filter;
            ch = ch.on('postgres_changes', { event: bEvent, schema: bSchema, table: binding.table, filter: bFilter }, (payload) => {
              try {
                onChangeRef.current && onChangeRef.current(payload);
              } catch {
                /* ignore */
              }
            });
          }
        } else {
          ch = ch.on('postgres_changes', { event, schema, table, filter }, (payload) => {
            try {
              onChangeRef.current && onChangeRef.current(payload);
            } catch {
              /* ignore */
            }
          });
        }

        ch = ch.subscribe((status) => {
            log('status', channelName, status, 'attempt', attemptRef.current);
            if (status === 'SUBSCRIBED') {
              // Channel joined; clear join timeout
              if (cleanupTimerRef.current) {
                clearTimeout(cleanupTimerRef.current);
                cleanupTimerRef.current = null;
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              removeChannel();
              scheduleRetry(status);
            } else if (status === 'CLOSED') {
              // If closed without manual removal and we still have retries left
              if (!removedRef.current) {
                removeChannel();
                scheduleRetry('CLOSED');
              }
            }
          });
        channelRef.current = ch;
        // Join timeout safety
        if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = setTimeout(() => {
          try {
            if (
              !cancelled &&
              channelRef.current &&
              channelRef.current.state !== 'joined' &&
              !removedRef.current
            ) {
              log('join timeout remove', channelName);
              removeChannel();
              scheduleRetry('JOIN_TIMEOUT');
            }
          } catch {
            /* ignore */
          }
        }, joinTimeoutMs);
      } catch (e) {
        log('subscribe error immediate', channelName, e?.message || e);
        scheduleRetry('SETUP_THROW');
      }
    };

    // initial attempt
    void subscribe(1);

    return () => {
      cancelled = true;
      try {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
        removeChannel();
      } catch {
        /* ignore */
      }
    };
  }, [
    enabled,
    channelName,
    event,
    schema,
    table,
    filter,
    joinTimeoutMs,
    maxRetries,
    baseDelayMs,
    maxDelayMs,
    debug,
    changes,
  ]);
}

export default useRealtimeChannel;
