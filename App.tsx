import React from 'react';
import { StatusBar } from 'react-native';
import { AppProviders } from '@/app/providers';
import { RootNavigator } from '@/navigation/root-navigator';

export default function App() {
  return (
    <AppProviders>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </AppProviders>
  );
}
