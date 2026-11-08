import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { APPLE_CALM_THEME, useFireMonitor } from '../_layout';

export default function TabsLayout() {
  const { selectedUF, selectedMunicipality } = useFireMonitor();

  const filterBadge = selectedMunicipality
    ? selectedUF
    : selectedUF !== 'TODOS'
      ? selectedUF
      : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: APPLE_CALM_THEME.colors.background,
        },
        tabBarActiveTintColor: APPLE_CALM_THEME.colors.appleCyan,
        tabBarInactiveTintColor: APPLE_CALM_THEME.colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Radar & Clima Fogo',
          tabBarAccessibilityLabel:
            'Aba Radar Orbital e Gráficos Estilo App Tempo iOS',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'partly-sunny' : 'partly-sunny-outline'}
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
          tabBarAccessibilityLabel:
            'Aba Consulta Seletiva por Estado e Cidade em até 3 cliques',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sobre"
        options={{
          title: 'IFPI • TDS-3 & Artigo',
          tabBarAccessibilityLabel:
            'Aba Créditos IFPI Campus Floriano Turma TDS-3 e Validação Científica SNCT',
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
    backgroundColor: 'rgba(9, 15, 29, 0.94)',
    borderTopWidth: 1,
    borderTopColor: APPLE_CALM_THEME.colors.border,
    height: 70,
    paddingTop: 6,
    paddingBottom: 9,
    elevation: 0,
  },
  tabBarItem: {
    minHeight: 48,
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
