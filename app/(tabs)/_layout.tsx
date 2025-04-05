import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Define Dark Theme Colors
const darkTheme = {
  background: '#121212',       // Deep charcoal
  card: '#1e1e1e',            // Slightly lighter surface
  text: '#ffffff',             // White text
  textSecondary: '#b0b0b0',    // Lighter gray for less emphasis
  primary: '#00bcd4',          // Teal accent
  inactive: '#757575',        // Gray for inactive elements
  border: '#272727',          // Dark border/separator
  error: '#cf6679',           // Standard dark theme error color
  success: '#4caf50',         // Green
  warning: '#ffab00',         // Amber/Orange
  stop: '#f44336',            // Red
};

export default function TabLayout() {
  // const colorScheme = useColorScheme(); // Force dark theme for now
  const theme = darkTheme;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,    // Use theme accent
        tabBarInactiveTintColor: theme.inactive,  // Use theme inactive
        headerShown: false,
        tabBarButton: HapticTab,
        // Remove custom background component for simple color styling
        // tabBarBackground: TabBarBackground, 
        tabBarStyle: {
            backgroundColor: theme.background, // Dark background
            borderTopColor: theme.border,      // Dark border
            borderTopWidth: StyleSheet.hairlineWidth,
            // Ensure position absolute isn't causing issues if not needed
             position: Platform.OS === 'ios' ? 'absolute' : 'relative', 
             bottom: 0, // Ensure it's at the bottom
             left: 0,
             right: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Generate', // Changed title
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles" color={color} />, // Changed icon
        }}
      />
      <Tabs.Screen
        name="mytopics"
        options={{
          title: 'Backlog', // Changed title
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
        }}
      />
    </Tabs>
  );
}
