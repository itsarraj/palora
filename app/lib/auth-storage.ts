import * as SecureStore from 'expo-secure-store';

const ACCESS = 'palora_access';
const LEGACY_ACCESS = 'flick_access';
const REFRESH = 'palora_refresh';
const LEGACY_REFRESH = 'flick_refresh';
const REMEMBER_EMAIL = 'palora_remember_email';
const LEGACY_REMEMBER_EMAIL = 'flick_remember_email';

export async function getAccessToken(): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(ACCESS);
    if (val) return val;
    return await SecureStore.getItemAsync(LEGACY_ACCESS);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(REFRESH);
    if (val) return val;
    return await SecureStore.getItemAsync(LEGACY_REFRESH);
  } catch {
    return null;
  }
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS, access);
    await SecureStore.setItemAsync(REFRESH, refresh);
    // Clean up legacy keys if present
    SecureStore.deleteItemAsync(LEGACY_ACCESS).catch(() => {});
    SecureStore.deleteItemAsync(LEGACY_REFRESH).catch(() => {});
  } catch {
    /* SecureStore missing in this binary — session memory-only until rebuild */
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
    await SecureStore.deleteItemAsync(LEGACY_ACCESS).catch(() => {});
    await SecureStore.deleteItemAsync(LEGACY_REFRESH).catch(() => {});
  } catch {
    /* ignore */
  }
}

export async function getRememberedEmail(): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(REMEMBER_EMAIL);
    if (val) return val;
    return await SecureStore.getItemAsync(LEGACY_REMEMBER_EMAIL);
  } catch {
    return null;
  }
}

export async function setRememberedEmail(email: string | null): Promise<void> {
  try {
    if (email) {
      await SecureStore.setItemAsync(REMEMBER_EMAIL, email);
      SecureStore.deleteItemAsync(LEGACY_REMEMBER_EMAIL).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(REMEMBER_EMAIL);
      await SecureStore.deleteItemAsync(LEGACY_REMEMBER_EMAIL).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}
