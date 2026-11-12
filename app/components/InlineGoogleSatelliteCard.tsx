import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APPLE_CALM_THEME } from '../_layout';
import { FireSpot, NordesteUF } from '../services/fireDataService';

export interface InlineGoogleSatelliteCardProps {
  municipality: string;
  uf: NordesteUF;
  latitude: number;
  longitude: number;
  riskLabel?: string;
  riskColor?: string;
  frpMW?: number;
  spotCount?: number;
  reduceMotion?: boolean;
  onClose?: () => void;
}

export function InlineGoogleSatelliteCard({
  municipality,
  uf,
  latitude,
  longitude,
  riskLabel = 'Monitorado',
  riskColor = '#30D158',
  frpMW,
  spotCount = 1,
  reduceMotion = false,
  onClose,
}: InlineGoogleSatelliteCardProps) {
  const [mapType, setMapType] = useState<'k' | 'm'>('k'); // 'k' = satélite, 'm' = mapa padrão
  const [isInteractive, setIsInteractive] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // URL de embed do Google Maps com coordenadas e tipo de mapa (k=satélite, m=mapa)
  const embedUrl = `https://maps.google.com/maps?q=${latitude.toFixed(4)},${longitude.toFixed(4)}&t=${mapType}&z=13&ie=UTF8&iwloc=&output=embed`;

  return (
    <View style={styles.cardContainer}>
      {/* 1. TÍTULO E CABEÇALHO */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.statusDot, { backgroundColor: riskColor }]} />
            <Text style={styles.eyebrowText}>
              SATÉLITE ORBITAL GOOGLE • {uf}
            </Text>
          </View>
          <Text style={styles.cardTitle}>
            {municipality} ({uf})
          </Text>
        </View>

        <View style={styles.headerBadges}>
          <View style={[styles.riskPill, { borderColor: riskColor }]}>
            <Ionicons name="flame" size={14} color={riskColor} />
            <Text style={[styles.riskPillText, { color: riskColor }]}>
              {riskLabel}
            </Text>
          </View>
          {onClose && (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Fechar visualização de satélite"
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. RESUMO COGNITIVO DIRETO (TDAH & TEA Nível 1) */}
      <View style={styles.summaryBox}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>COORDENADAS</Text>
          <Text style={styles.summaryValue}>
            {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>FOCOS NA REGIÃO</Text>
          <Text style={styles.summaryValue}>
            {spotCount} {spotCount === 1 ? 'foco ativo' : 'focos ativos'}
          </Text>
        </View>
        {frpMW !== undefined && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>INTENSIDADE TÉRMICA</Text>
              <Text style={[styles.summaryValue, { color: '#FFD60A' }]}>
                {frpMW.toFixed(0)} MW (FRP)
              </Text>
            </View>
          </>
        )}
      </View>

      {/* 3. BARRA DE CONTROLES ACESSÍVEIS (ALVOS >= 44x44px) */}
      <View style={styles.controlsRow}>
        <View style={styles.segmentedGroup}>
          <Pressable
            onPress={() => setMapType('k')}
            style={({ pressed }) => [
              styles.controlTabBtn,
              mapType === 'k' && styles.controlTabBtnActive,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Alternar para visão de Satélite"
          >
            <Ionicons
              name="planet-outline"
              size={16}
              color={mapType === 'k' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[
                styles.controlTabText,
                mapType === 'k' && styles.controlTabTextActive,
              ]}
            >
              Satélite Real
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMapType('m')}
            style={({ pressed }) => [
              styles.controlTabBtn,
              mapType === 'm' && styles.controlTabBtnActive,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Alternar para visão de Mapa Rodoviário"
          >
            <Ionicons
              name="map-outline"
              size={16}
              color={mapType === 'm' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[
                styles.controlTabText,
                mapType === 'm' && styles.controlTabTextActive,
              ]}
            >
              Mapa Terreno
            </Text>
          </Pressable>
        </View>

        {/* Botão de desbloqueio de rolagem / interação (Anti-Scroll Trap) */}
        <Pressable
          onPress={() => setIsInteractive((prev) => !prev)}
          style={({ pressed }) => [
            styles.interactiveToggleBtn,
            isInteractive && styles.interactiveToggleBtnActive,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isInteractive
              ? 'Bloquear mapa para rolar a tela com tranquilidade'
              : 'Ativar gestos de zoom e arrastar mapa'
          }
        >
          <Ionicons
            name={isInteractive ? 'lock-open-outline' : 'lock-closed-outline'}
            size={16}
            color={isInteractive ? '#30D158' : '#64D2FF'}
          />
          <Text
            style={[
              styles.interactiveToggleBtnText,
              isInteractive && { color: '#30D158' },
            ]}
          >
            {isInteractive ? 'Gestos Ativos' : 'Rolar Página (Seguro)'}
          </Text>
        </Pressable>
      </View>

      {/* 4. CONTAINER DE MAPA EMBUTIDO COM SKELETON */}
      <View style={styles.mapViewport}>
        {Platform.OS === 'web' ? (
          <iframe
            title={`Satélite Google Maps - ${municipality}`}
            src={embedUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              borderRadius: 14,
              pointerEvents: isInteractive ? 'auto' : 'none',
              filter: mapType === 'm' ? 'invert(90%) hue-rotate(180deg)' : 'none',
              transition: reduceMotion ? 'none' : 'filter 0.25s ease',
            }}
            loading="lazy"
            allowFullScreen={false}
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setHasLoaded(true)}
          />
        ) : (
          <View style={styles.nativeFallbackBox}>
            <Ionicons name="map-outline" size={32} color="#64D2FF" />
            <Text style={styles.nativeFallbackTitle}>
              Visão Satélite Disponível na Versão Web (PWA)
            </Text>
            <Text style={styles.nativeFallbackSub}>
              Abra radar-fogo-snct.vercel.app para visualização interativa contínua.
            </Text>
          </View>
        )}

        {/* Camada de aviso e proteção quando gestos estão travados */}
        {!isInteractive && Platform.OS === 'web' && (
          <Pressable
            onPress={() => setIsInteractive(true)}
            style={styles.tapToInteractOverlay}
            accessibilityRole="button"
            accessibilityLabel="Toque no mapa para aproximar ou mover"
          >
            <View style={styles.tapToInteractBadge}>
              <Ionicons name="finger-print-outline" size={15} color="#FFFFFF" />
              <Text style={styles.tapToInteractText}>
                Toque para ativar zoom e arrasto
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* 5. RODAPÉ INFORMATIVO */}
      <View style={styles.footerRow}>
        <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
        <Text style={styles.footerText}>
          Carregamento direto sem sair do app • Coordenadas vinculadas ao foco ativo do INPE
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderRadius: APPLE_CALM_THEME.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.24)',
    gap: 12,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  titleCol: {
    flex: 1,
    minWidth: 180,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  eyebrowText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textMuted,
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 20,
    fontWeight: '800',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(9, 14, 28, 0.65)',
  },
  riskPillText: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: 'rgba(9, 14, 28, 0.62)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  summaryItem: {
    flex: 1,
    minWidth: 100,
  },
  summaryLabel: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 10.5,
    color: APPLE_CALM_THEME.colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryValue: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentedGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(9, 14, 28, 0.7)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlTabBtn: {
    minHeight: 44,
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  controlTabBtnActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.28)',
  },
  controlTabText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  controlTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  interactiveToggleBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.28)',
  },
  interactiveToggleBtnActive: {
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
    borderColor: 'rgba(48, 209, 88, 0.45)',
  },
  interactiveToggleBtnText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64D2FF',
  },
  mapViewport: {
    width: '100%',
    height: 290,
    backgroundColor: '#090F1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  nativeFallbackBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  nativeFallbackTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  nativeFallbackSub: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  tapToInteractOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 12, 24, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToInteractBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7, 12, 24, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.35)',
  },
  tapToInteractText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 11.5,
    color: APPLE_CALM_THEME.colors.textMuted,
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
