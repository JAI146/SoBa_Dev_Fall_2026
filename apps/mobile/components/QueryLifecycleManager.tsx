import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

export function QueryLifecycleManager() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const onAppStateChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    };

    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    onlineManager.setEventListener((setOnline) => {
      let receivedEvent = false;
      const subscription = Network.addNetworkStateListener((state) => {
        receivedEvent = true;
        setOnline(Boolean(state.isConnected));
      });

      void Network.getNetworkStateAsync()
        .then((state) => {
          if (!receivedEvent) {
            setOnline(Boolean(state.isConnected));
          }
        })
        .catch(() => undefined);

      return () => subscription.remove();
    });
  }, []);

  return null;
}
