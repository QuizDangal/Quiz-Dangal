// ========================================================================
// FILE: src/contexts/SupabaseAuthContext.jsx
// Is file ka poora purana code delete karke yeh naya code paste karen.
// ========================================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { supabase, hasSupabaseConfig, getSupabase } from '@/lib/customSupabaseClient';
import { loadReferralCode, clearReferralCode, normalizeReferralCode } from '@/lib/referralStorage';
import { RATE_LIMIT_DEFAULT_WINDOW_MS, RATE_LIMIT_DEFAULT_MAX_ATTEMPTS } from '@/constants';

const AuthContext = createContext();

// Inner provider with all hooks so outer wrapper can early-return without tripping hooks rule
function AuthProviderInner({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const initProfileRef = useRef(false);
  const authSubRef = useRef(null);
  const rateLimitRef = useRef({});

  const checkRateLimit = useCallback((key) => {
    const now = Date.now();
    const bucket = rateLimitRef.current[key] || { start: now, count: 0 };
    const withinWindow = now - bucket.start < RATE_LIMIT_DEFAULT_WINDOW_MS;
    const next = withinWindow
      ? { start: bucket.start, count: bucket.count + 1 }
      : { start: now, count: 1 };
    rateLimitRef.current[key] = next;
    if (withinWindow && next.count > RATE_LIMIT_DEFAULT_MAX_ATTEMPTS) {
      throw new Error('Too many attempts. Please wait a few seconds and try again.');
    }
  }, []);

  // Profile fetch karne ka function
  const refreshUserProfile = async (currentUser) => {
    if (currentUser) {
      try {
        const sb = await getSupabase();
        if (!sb) return;
        const { data, error } = await sb
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        // "no rows found" (PGRST116) error ko ignore karenge, kyunki naye user ka profile turant nahi banta.
        // Lekin, agar multiple rows milti hain (jo ek data integrity issue hai), to error throw karna zaroori hai.
        if (error) {
          // Sirf "0 rows" wala error ignore karein.
          const isNoRowsError = error.code === 'PGRST116' && error.details?.includes('0 rows');
          if (!isNoRowsError) throw error;
        }
        setUserProfile(data || null);
      } catch (error) {
        setUserProfile(null);
      }
    }
  };

  const hardSignOut = useCallback(async ({ redirect = true } = {}) => {
    try {
      await supabase?.auth.signOut();
    } catch {
      // ignore signOut errors (likely already signed out)
    }
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('sb-') || k.startsWith('qd_') || k.toLowerCase().includes('supabase')) {
          localStorage.removeItem(k);
        }
      });
    } catch {
      // storage might be unavailable (Safari private mode etc.)
    }
    try {
      clearReferralCode();
    } catch {
      // ignore inability to clear referral storage
    }
    try {
      sessionStorage.clear();
    } catch {
      // ignore sessionStorage issues
    }
    setUser(null);
    setUserProfile(null);
    setIsRecoveryFlow(false);
    if (redirect) {
      try {
        window.location.assign('/login');
      } catch {
        window.location.href = '/login';
      }
    }
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    // Detect recovery intent in URL once, so routing can allow reset page even if a session appears
    try {
      const u = new URL(window.location.href);
      const isRec =
        (u.hash || '').includes('type=recovery') ||
        new URLSearchParams(u.search).get('type') === 'recovery';
      if (isRec) setIsRecoveryFlow(true);
    } catch (e) {
      /* recovery URL parse fail */
    }
    const path = (() => {
      try {
        return window.location?.pathname || '/';
      } catch {
        return '/';
      }
    })();

    const hasStoredSession = (() => {
      try {
        // Supabase stores session keys under sb-* in localStorage
        for (const k of Object.keys(localStorage || {})) {
          if (k && k.startsWith('sb-')) return true;
        }
      } catch {
        /* ignore */
      }
      return false;
    })();

    // Init immediately for returning sessions or for non-home routes.
    // For anonymous home ('/'), defer init to keep Mobile PSI clean.
    const shouldInitNow = hasStoredSession || path !== '/';

    const initAuth = async ({ showLoading } = {}) => {
      if (authSubRef.current) return; // already initialized
      if (showLoading) setLoading(true);
      const sb = await getSupabase();
      if (!sb) {
        if (showLoading) setLoading(false);
        return;
      }

      // First session check
      try {
        const { data } = await supabase.auth.getSession();
        const currentUser = data?.session?.user;
        setUser(currentUser ?? null);
        if (currentUser) {
          refreshUserProfile(currentUser);
        } else {
          setUserProfile(null);
        }
      } catch {
        // Network/offline errors shouldn't force logout; keep prior session state
      } finally {
        if (showLoading) setLoading(false);
      }

      // Subscribe to auth state
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          const currentUser = session?.user;
          setUser(currentUser ?? null);
          setLoading(false);
          if (currentUser) {
            refreshUserProfile(currentUser);
          } else {
            setUserProfile(null);
          }
          if (event === 'PASSWORD_RECOVERY') {
            setIsRecoveryFlow(true);
          }
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setUserProfile(null);
            setIsRecoveryFlow(false);
          }
        });
        authSubRef.current = data?.subscription || null;
      } catch {
        /* ignore */
      }
    };

    if (shouldInitNow) {
      void initAuth({ showLoading: true });
    } else {
      // Anonymous home: don't block render.
      setLoading(false);

      // Warm Supabase after user interaction or after a delay.
      const warm = () => {
        void initAuth({ showLoading: false });
      };
      const opts = { once: true, passive: true };
      window.addEventListener('pointerdown', warm, opts);
      window.addEventListener('touchstart', warm, opts);
      window.addEventListener('keydown', warm, { once: true });

      const tid = window.setTimeout(warm, 8000);
      return () => {
        try {
          window.removeEventListener('pointerdown', warm, opts);
          window.removeEventListener('touchstart', warm, opts);
          window.removeEventListener('keydown', warm, { once: true });
          window.clearTimeout(tid);
        } catch {
          /* ignore */
        }
        authSubRef.current?.unsubscribe?.();
      };
    }

    return () => {
      authSubRef.current?.unsubscribe?.();
    };
  }, []);

  // Realtime: profile row watch via shared hook (single removal + timeout logic abstracted)
  const profileRealtimeEnabled = (() => {
    try {
      if (typeof window === 'undefined') return false;
      if (!('WebSocket' in window)) return false;
      if (navigator && navigator.onLine === false) return false;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
      if (typeof window !== 'undefined' && window.isSecureContext === false) return false;
      return true;
    } catch {
      return false;
    }
  })();
  useRealtimeChannel({
    enabled: !!user?.id && !!hasSupabaseConfig && !!supabase && profileRealtimeEnabled,
    channelName: user?.id ? `profile-updates-${user.id}` : undefined,
    table: 'profiles',
    filter: user?.id ? `id=eq.${user.id}` : undefined,
    onChange: () => {
      try {
        if (user) refreshUserProfile(user);
      } catch {
        /* ignore */
      }
    },
    joinTimeoutMs: 5000,
  });

  // Safety net: periodic session validation to recover from invalid/expired refresh tokens
  useEffect(() => {
    if (!user) return;

    const id = setInterval(
      async () => {
        if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
          return; // offline mode: defer session checks
        }

        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            if (
              error.message?.includes('Invalid Refresh Token') ||
              (error instanceof Error && error.message.includes('Refresh Token'))
            ) {
              await hardSignOut();
            }
            return; // transient/handled
          }

          if (!data?.session) {
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              if (refreshError.message?.includes('Invalid Refresh Token')) {
                await hardSignOut();
              }
              return;
            }
            if (!refreshed?.session) {
              await hardSignOut();
            }
          }
        } catch (err) {
          if (err?.message?.includes('Invalid Refresh Token')) {
            await hardSignOut();
          }
        }
      },
      5 * 60 * 1000,
    ); // every 5 minutes

    return () => clearInterval(id);
  }, [user, hardSignOut]);

  // Auto-create/upsert profile row for new users if not exists + referral attribution (via secure RPC)
  useEffect(() => {
    if (!user || loading) return;

    // Guard double execution in React 18 StrictMode in dev
    if (initProfileRef.current) return;
    initProfileRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const refParam = normalizeReferralCode(params.get('ref'));
    const storedReferral = loadReferralCode();
    const metadataReferral = normalizeReferralCode(
      user?.user_metadata?.pending_referral_code || '',
    );

    const candidates = [refParam, storedReferral, metadataReferral].filter(Boolean);
    const normalizedUserId = normalizeReferralCode(user?.id || '');
    const chosenReferral = candidates.find((code) => code && code !== normalizedUserId) || '';

    // Only include safe defaults so we don't overwrite user's existing data on refresh
    const payload = {
      id: user.id,
      full_name: user.user_metadata?.full_name || '',
      // NOTE: Do NOT set mobile_number (or other fields) here.
      // Upsert runs on every fresh login; providing an empty string would overwrite
      // the user's saved number. We'll let the profile modal manage it explicitly.
    };

    supabase
      .from('profiles')
      .upsert([payload], { onConflict: 'id' })
      .then(async () => {
        // Process referral once via SECURITY DEFINER function to avoid RLS trigger issues
        const refFlag = `qd_referral_processed_${user.id}`;
        const alreadyProcessed = (() => {
          try {
            return sessionStorage.getItem(refFlag) === '1';
          } catch {
            return false;
          }
        })();
        if (!alreadyProcessed && chosenReferral) {
          try {
            await supabase.rpc('handle_referral_bonus', {
              referred_user_uuid: user.id,
              referrer_code: chosenReferral,
            });
            try {
              sessionStorage.setItem(refFlag, '1');
            } catch (e3) {
              /* sessionStorage blocked */
            }
            if (chosenReferral === storedReferral) {
              clearReferralCode();
            }
          } catch {
            // ignore referral errors so profile init continues
          }
        }
      })
      .catch(() => {
        // Ignore upsert errors here; UI can still function and retries will happen on next auth state change
      })
      .finally(() => {
        // Refresh local profile state so navbar and UI update immediately
        refreshUserProfile(user);
      });
  }, [user, loading, userProfile]);

  // Ensure referral_code exists for sharing
  useEffect(() => {
    if (userProfile && !userProfile.referral_code && user) {
      const code = (user.id || '').replace(/-/g, '').slice(0, 8);
      supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', user.id)
        .then(() => {
          refreshUserProfile(user);
        })
        .catch(() => {
          // ignore
        });
    }
  }, [userProfile, user]);

  // SIGN UP FUNCTION (EMAIL)
  const signUp = async (email, password, { referralCode, options } = {}) => {
    checkRateLimit('signup');
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const supabaseOptions = { ...(options || {}) };
    // Ensure a valid redirect URL exists to avoid Gotrue 500 if SITE_URL is not configured
    if (!supabaseOptions.emailRedirectTo) {
      try {
        // Use current origin as a safe default (e.g., http://localhost:5173 or prod domain)
        supabaseOptions.emailRedirectTo = `${window.location.origin}/`;
      } catch {
        // In non-browser contexts, skip
      }
    }
    const normalizedReferral = normalizeReferralCode(referralCode);
    if (normalizedReferral) {
      supabaseOptions.data = {
        ...(supabaseOptions.data || {}),
        pending_referral_code: normalizedReferral,
      };
    }

    const payload = { email, password };
    if (Object.keys(supabaseOptions).length > 0) {
      payload.options = supabaseOptions;
    }

    return await sb.auth.signUp(payload);
  };

  // SIGN IN FUNCTION (EMAIL)
  const signIn = async (email, password) => {
    checkRateLimit('signin');
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const e = (email || '').trim();
    const p = (password || '').trim();
    return await sb.auth.signInWithPassword({ email: e, password: p });
  };

  const value = {
    supabase,
    user,
    userProfile,
    loading,
    isRecoveryFlow,
    hasSupabaseConfig,
    signUp,
    signIn,
    signOut: hardSignOut,
    refreshUserProfile,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const AuthProvider = ({ children }) => {
  const _bypass = String(import.meta.env.VITE_BYPASS_AUTH || '').toLowerCase();
  // SECURITY: Never allow auth bypass in production builds.
  // `import.meta.env.DEV` is false in `vite build` output.
  const devBypass = import.meta.env.DEV && (_bypass === '1' || _bypass === 'true' || _bypass === 'yes');
  if (devBypass) {
    const mockUser = {
      id: 'dev-bypass-admin',
      email: 'dev-admin@example.com',
      app_metadata: { provider: 'dev-bypass' },
    };
    const mockProfile = {
      id: mockUser.id,
      full_name: 'Dev Admin',
      role: 'admin',
      wallet_balance: 0,
      current_streak: 0,
      referral_code: 'DEVADMIN',
    };
    const value = {
      supabase: null,
      user: mockUser,
      userProfile: mockProfile,
      loading: false,
      isRecoveryFlow: false,
      hasSupabaseConfig: false,
      signUp: async () => {
        throw new Error('Auth disabled in dev bypass');
      },
      signIn: async () => {
        throw new Error('Auth disabled in dev bypass');
      },
      signOut: async () => {},
      refreshUserProfile: () => {},
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }
  if (!hasSupabaseConfig) {
    const value = {
      supabase: null,
      user: null,
      userProfile: null,
      loading: false,
      isRecoveryFlow: false,
      hasSupabaseConfig: false,
      signUp: async () => {
        throw new Error('Supabase config missing');
      },
      signIn: async () => {
        throw new Error('Supabase config missing');
      },
      signOut: async () => {},
      refreshUserProfile: () => {},
    };
    return (
      <AuthContext.Provider value={value}>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-lg w-full shadow-xl text-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Configuration Missing
            </h2>
            <p className="text-gray-700 mb-2">
              Create a <code>.env</code> file in the project root with:
            </p>
            <pre className="text-left text-sm bg-gray-100 p-3 rounded-md overflow-auto">
              <code>
                VITE_SUPABASE_URL=your_supabase_url VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
              </code>
            </pre>
            <p className="text-gray-600 mt-3">
              For local UI-only testing you can set <code>VITE_BYPASS_AUTH=1</code> in dev mode
              (only works with <code>npm run dev</code>).
            </p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }
  return <AuthProviderInner>{children}</AuthProviderInner>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
