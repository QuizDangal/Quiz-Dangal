const STORAGE_KEY = 'qd_pending_referral_code';

const hasWindow = () => typeof window !== 'undefined';
const getSession = () => {
  if (!hasWindow()) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};
const getLocal = () => {
  if (!hasWindow()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const REFERRAL_STORAGE_KEY = STORAGE_KEY;

export function normalizeReferralCode(code) {
  if (typeof code !== 'string') return '';
  const trimmed = code.trim();
  if (!trimmed) return '';
  // Remove whitespace and convert to uppercase
  const normalized = trimmed.replace(/\s+/g, '').toUpperCase();
  // Validate: alphanumeric and hyphens, 3-32 characters length
  if (!/^[A-Z0-9-]{3,32}$/.test(normalized)) return '';
  return normalized;
}

export function saveReferralCode(code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return normalized;
  const session = getSession();
  if (session) {
    try {
      session.setItem(STORAGE_KEY, normalized);
    } catch {
      /* ignore */
    }
  }
  const local = getLocal();
  if (local) {
    try {
      local.setItem(STORAGE_KEY, normalized);
    } catch {
      /* ignore */
    }
  }
  return normalized;
}

export function loadReferralCode() {
  const session = getSession();
  if (session) {
    try {
      const value = session.getItem(STORAGE_KEY);
      if (value) return normalizeReferralCode(value);
    } catch {
      /* ignore */
    }
  }
  const local = getLocal();
  if (local) {
    try {
      const value = local.getItem(STORAGE_KEY);
      if (value) return normalizeReferralCode(value);
    } catch {
      /* ignore */
    }
  }
  return '';
}

export function clearReferralCode() {
  const session = getSession();
  if (session) {
    try {
      session.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  const local = getLocal();
  if (local) {
    try {
      local.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
