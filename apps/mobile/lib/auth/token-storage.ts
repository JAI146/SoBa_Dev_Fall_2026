import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'purposemint.refresh-token';

export function getStoredRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export function storeRefreshToken(refreshToken: string) {
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export function removeStoredRefreshToken() {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
