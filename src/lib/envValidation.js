// Environment validation for startup safety
// Run this before app initialization to ensure all required env vars are present

const requiredEnvVars = {
  VITE_SUPABASE_URL: 'Supabase project URL',
  VITE_SUPABASE_ANON_KEY: 'Supabase anonymous key',
};

const optionalEnvVars = {
  VITE_VAPID_PUBLIC_KEY: 'VAPID public key for push notifications',
  VITE_PUBLIC_SITE_URL: 'Public site URL for sharing',
};

/**
 * Validate environment variables at startup
 * @throws {Error} If required environment variables are missing
 * @returns {Object} Environment configuration object
 */
export function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const config = {};

  // Check if we're in browser environment
  const isBrowser = typeof window !== 'undefined';
  const runtimeEnv = isBrowser ? window.__QUIZ_DANGAL_ENV__ : {};

  // Check required variables
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    const value = import.meta.env[key] || runtimeEnv?.[key];
    
    if (!value || String(value).trim() === '') {
      errors.push(`Missing required environment variable: ${key} (${description})`);
    } else {
      config[key] = value;
    }
  }

  // Check optional variables (warn only)
  for (const [key, description] of Object.entries(optionalEnvVars)) {
    const value = import.meta.env[key] || runtimeEnv?.[key];

    if (!value || String(value).trim() === '') {
      // For sharing URLs, default to current origin in the browser (no warning).
      if (key === 'VITE_PUBLIC_SITE_URL' && isBrowser) {
        try {
          const origin = globalThis.location?.origin;
          if (origin) {
            config[key] = origin;
            continue;
          }
        } catch {
          // ignore
        }
      }

      warnings.push(`Optional environment variable not set: ${key} (${description})`);
    } else {
      config[key] = value;
    }
  }

  // Provide safe defaults for optional feature flags (no warnings).
  // These are intentionally non-fatal and default to disabled.
  config.VITE_ENABLE_REALTIME =
    import.meta.env.VITE_ENABLE_REALTIME || runtimeEnv?.VITE_ENABLE_REALTIME || '0';
  config.VITE_ENABLE_CLIENT_COMPUTE =
    import.meta.env.VITE_ENABLE_CLIENT_COMPUTE || runtimeEnv?.VITE_ENABLE_CLIENT_COMPUTE || '0';
  config.VITE_ALLOW_CLIENT_COMPUTE =
    import.meta.env.VITE_ALLOW_CLIENT_COMPUTE || runtimeEnv?.VITE_ALLOW_CLIENT_COMPUTE || '0';

  // VITE_PUBLIC_SITE_URL fallback is handled during optional var validation.

  // Validate URL formats
  if (config.VITE_SUPABASE_URL && !isValidURL(config.VITE_SUPABASE_URL)) {
    errors.push('VITE_SUPABASE_URL is not a valid URL');
  }

  if (config.VITE_PUBLIC_SITE_URL && !isValidURL(config.VITE_PUBLIC_SITE_URL)) {
    warnings.push('VITE_PUBLIC_SITE_URL is not a valid URL');
  }

  // Log warnings in development
  if (import.meta.env.DEV && warnings.length > 0) {
    console.warn('Environment warnings:', warnings);
  }

  // Throw errors if any critical issues found
  if (errors.length > 0) {
    const errorMessage = `Environment validation failed:\n${errors.join('\n')}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return config;
}

/**
 * Simple URL validator
 */
function isValidURL(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Get environment mode
 */
export function getEnvMode() {
  return {
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    isTest: import.meta.env.MODE === 'test',
  };
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(featureFlag) {
  const value = import.meta.env[featureFlag] || window.__QUIZ_DANGAL_ENV__?.[featureFlag];
  
  if (!value) return false;
  
  const normalized = String(value).toLowerCase().trim();
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
}
