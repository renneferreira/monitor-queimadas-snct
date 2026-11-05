import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { APPLE_CALM_THEME, useFireMonitor } from '../_layout';

export default function TabsLayout() {
  const { selectedUF, selectedMunicipality } = useFireMonitor();

  const filterBadge =
    selectedMunicipality
      ? selectedUF
      : selectedUF !== 'TODOS'
        ? selectedUF
        : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: APPLE_CALM_THEME.colors.appleBlue,
        tabBarInactiveTintColor: APPLE_CALM_THEME.colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa Nordeste',
          tabBarAccessibilityLabel: 'Aba Mapa Interativo do Nordeste',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'map' : 'map-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="consulta"
        options={{
          title: 'Consulta (UF/Cidade)',
          tabBarBadge: filterBadge,
          tabBarBadgeStyle: styles.badge,
          tabBarAccessibilityLabel: 'Aba Consulta Seletiva por Estado e Cidade',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'options' : 'options-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sobre"
        options={{
          title: 'Info & Artigo SNCT',
          tabBarAccessibilityLabel: 'Aba Transparência das Fontes e Validação Científica',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderTopWidth: 1,
    borderTopColor: APPLE_CALM_THEME.colors.border,
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
    elevation: 0,
  },
  tabBarItem: {
    minHeight: 48, // Garante área de clique >= 44x44 dp (Apple HIG)
  },
  tabBarLabel: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    backgroundColor: APPLE_CALM_THEME.colors.appleBlue,
    color: '#FFFFFF',
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
  },
});
