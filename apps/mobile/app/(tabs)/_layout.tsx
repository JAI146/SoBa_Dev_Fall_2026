import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { theme } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ color, focused, name }: { color: string; focused: boolean; name: IoniconName }) {
  return <Ionicons color={color} name={focused ? name : (`${name}-outline` as IoniconName)} size={23} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.deepGreen,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopColor: theme.colors.border,
          height: Platform.OS === 'ios' ? 86 : 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="home" />,
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          tabBarAccessibilityLabel: 'Goals tab',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="flag" />,
          title: 'Goals',
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          tabBarAccessibilityLabel: 'Journal tab',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="book" />,
          title: 'Journal',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="person" />,
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
