import { supabase } from '@/lib/customSupabaseClient';
import { logger } from '@/lib/logger';

const AVATAR_BUCKET = 'avatars';

export async function getSignedAvatarUrl(path, expiresIn = 3600, client = supabase) {
  if (!client || !path) return '';

  if (path.includes('://')) {
    return path;
  }

  try {
    const { data, error } = await client.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error) {
      logger.warn('Signed avatar URL fetch failed:', error);
      return '';
    }
    return data?.signedUrl || '';
  } catch (error) {
    logger.warn('Signed avatar URL fetch failed:', error);
    return '';
  }
}

export async function getSignedAvatarUrls(paths, expiresIn = 3600, client = supabase) {
  if (!client || !Array.isArray(paths) || !paths.length) {
    return new Map();
  }

  const urlMap = new Map();
  const filtered = paths.filter(Boolean);
  const directUrls = filtered.filter((path) => path.includes('://'));
  for (const direct of directUrls) {
    urlMap.set(direct, direct);
  }

  const uniquePaths = Array.from(new Set(filtered.filter((path) => !path.includes('://'))));
  if (!uniquePaths.length) {
    return urlMap;
  }

  try {
    const { data, error } = await client.storage
      .from(AVATAR_BUCKET)
      .createSignedUrls(uniquePaths, expiresIn);
    if (error) {
      logger.warn('Signed avatar URLs batch fetch failed:', error);
      return urlMap;
    }

    for (const row of data || []) {
      if (row?.path) {
        urlMap.set(row.path, row.signedUrl || '');
      }
    }
    return urlMap;
  } catch (error) {
    logger.warn('Signed avatar URLs batch fetch failed:', error);
    return new Map();
  }
}
