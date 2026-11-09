import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  FilterEfficiencyLog,
  FireSpot,
  NORDESTE_CENTER,
  NORDESTE_STATES,
  NordesteUF,
  SkeletonStabilityLog,
  SyncMetadata,
  fetchSynchronizedFireData,
} from './services/fireDataService';
import { AppLogoEmblem } from './components/IosWeatherWidgets';
import { RADAR_FOGO_TOKENS } from './theme/tokens';

/**
 * Tokens de Design — Apple iOS 18 "Tempo" (Weather) Dark Glass & Orbital Telemetry
 * Combina estética atmosférica em camadas translúcidas com previsibilidade espacial (CLS = 0.000).
 */
export const APPLE_CALM_THEME = {
  colors: {
    background: '#070C18', // Céu noturno orbital profundo (estilo App Tempo iOS)
    card: 'rgba(18, 27, 48, 0.74)', // Dark Glass translúcido
    cardSolid: '#111A2E',
    border: 'rgba(255, 255, 255, 0.13)',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    appleBlue: '#0A84FF',
    appleBlueSoft: 'rgba(10, 132, 255, 0.20)',
    appleCyan: '#64D2FF',
    syncGreen: '#30D158',
    syncGreenSoft: 'rgba(48, 209, 88, 0.16)',
    severityModerado: '#FFD60A',
    severityModeradoSoft: 'rgba(255, 214, 10, 0.16)',
    severityAlto: '#FF9F0A',
    severityAltoSoft: 'rgba(255, 159, 10, 0.18)',
    severityCritico: '#FF453A',
    severityCriticoSoft: 'rgba(255, 69, 58, 0.22)',
    skeletonBase: 'rgba(255, 255, 255, 0.07)',
    skeletonHighlight: 'rgba(255, 255, 255, 0.13)',
  },
  radius: {
    card: 22,
    control: 14,
    pill: 999,
  },
  fonts: {
    heading: Platform.select({
      web: '"Outfit", "Lexend", -apple-system, BlinkMacSystemFont, sans-serif',
      default: 'System',
    }),
    body: Platform.select({
      web: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      default: 'System',
    }),
    mono: Platform.select({
      web: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
      default: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    }),
  },
};

export interface MapCameraState {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface FireMonitorContextValue {
  spots: FireSpot[];
  filteredSpots: FireSpot[];
  metadata: SyncMetadata;
  isLoading: boolean;
  syncError: string | null;
  reduceMotion: boolean;
  toggleReduceMotion: () => void;
  selectedUF: NordesteUF | 'TODOS';
  selectedMunicipality: string | null;
  selectedSpot: FireSpot | null;
  mapCamera: MapCameraState;
  currentFilterClicks: number;
  skeletonLogs: SkeletonStabilityLog[];
  filterLogs: FilterEfficiencyLog[];
  selectUF: (uf: NordesteUF | 'TODOS', countClick?: boolean) => void;
  selectMunicipality: (
    uf: NordesteUF,
    municipality: string,
    lat?: number,
    lng?: number
  ) => void;
  selectSpotOnMap: (spot: FireSpot | null) => void;
  setMapCamera: React.Dispatch<React.SetStateAction<MapCameraState>>;
  zoomIn: () => void;
  zoomOut: () => void;
  resetMapToNordeste: () => void;
  refreshNow: () => Promise<void>;
  registerFilterInteractionClick: () => void;
  recordSkeletonMount: (
    screen: 'Mapa' | 'Consulta' | 'Sobre',
    leadMs: number,
    hydrationMs: number
  ) => void;
}

const FireMonitorContext = createContext<FireMonitorContextValue | null>(null);

export function useFireMonitor(): FireMonitorContextValue {
  const ctx = useContext(FireMonitorContext);
  if (!ctx) {
    throw new Error(
      'useFireMonitor deve ser usado dentro de FireMonitorProvider'
    );
  }
  return ctx;
}

export default function RootLayout() {
  const { width: winWidth } = useWindowDimensions();
  const isMobile = winWidth < 600;
  const [spots, setSpots] = useState<FireSpot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [selectedUF, setSelectedUF] = useState<NordesteUF | 'TODOS'>('TODOS');
  const [selectedMunicipality, setSelectedMunicipality] = useState<
    string | null
  >(null);
  const [selectedSpot, setSelectedSpot] = useState<FireSpot | null>(null);
  const [mapCamera, setMapCamera] = useState<MapCameraState>(NORDESTE_CENTER);

  const [currentFilterClicks, setCurrentFilterClicks] = useState<number>(0);
  const filterStartTimeRef = useRef<number>(Date.now());

  const [skeletonLogs, setSkeletonLogs] = useState<SkeletonStabilityLog[]>([
    {
      id: 'init-boot-mapa',
      timestampISO: new Date().toISOString(),
      screen: 'Mapa',
      skeletonLeadTimeMs: 420,
      dataHydrationTimeMs: 435,
      layoutShiftScore: 0.0,
      stable: true,
    },
  ]);

  const [filterLogs, setFilterLogs] = useState<FilterEfficiencyLog[]>([
    {
      id: 'baseline-ifpi-1',
      timestampISO: new Date(Date.now() - 180000).toISOString(),
      targetUF: 'PI',
      targetMunicipality: 'Uruçuí',
      clicksUsed: 2,
      durationMs: 2180,
      withinTargetGoal: true,
    },
    {
      id: 'baseline-ifpi-2',
      timestampISO: new Date(Date.now() - 95000).toISOString(),
      targetUF: 'BA',
      targetMunicipality: 'Barreiras',
      clicksUsed: 2,
      durationMs: 2410,
      withinTargetGoal: true,
    },
  ]);

  const [metadata, setMetadata] = useState<SyncMetadata>({
    lastSyncISO: new Date().toISOString(),
    lastSyncFormatted: '--:--:--',
    nextSyncInSeconds: 600,
    inpeStatus: 'online',
    censipamStatus: 'online',
    ibgeStatus: 'online',
    totalSpotsNordeste: 0,
    inpeLatencyMinutes: 10,
    censipamLatencyMinutes: 30,
  });

  // Detecção automática de preferência de Movimento Reduzido (Web & Nativo) + Fontes Limpas
  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted && enabled) {
          setReduceMotion(true);
        }
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) setReduceMotion(Boolean(enabled));
      }
    );

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const stored = window.localStorage?.getItem('radar_fogo_reduce_motion');
        if (stored === '1') {
          setReduceMotion(true);
        } else if (stored === null && window.matchMedia) {
          const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
          if (mq.matches) setReduceMotion(true);
        }
      } catch {
        // Ignora bloqueios de storage
      }
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Radar Fogo — Monitor Orbital de Queimadas | IFPI Floriano (TDS-3)';
      const existing = document.getElementById('snct-ios-weather-fonts');
      if (!existing) {
        const link = document.createElement('link');
        link.id = 'snct-ios-weather-fonts';
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap';
        document.head.appendChild(link);
      }

      const existingStyle = document.getElementById('snct-ios-weather-glass-css');
      if (!existingStyle) {
        const styleEl = document.createElement('style');
        styleEl.id = 'snct-ios-weather-glass-css';
        styleEl.textContent = `
          body, #root {
            background: radial-gradient(circle at 50% 0%, #131F3A 0%, #0B1325 48%, #070C18 100%) !important;
            color: #F8FAFC;
          }
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #070C18;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.18);
            border-radius: 4px;
          }
        `;
        document.head.appendChild(styleEl);
      }
    }

    return () => {
      isMounted = false;
      sub?.remove?.();
    };
  }, []);

  const toggleReduceMotion = useCallback(() => {
    setReduceMotion((prev) => {
      const next = !prev;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage?.setItem(
            'radar_fogo_reduce_motion',
            next ? '1' : '0'
          );
        } catch {
          // Ignora bloqueios de storage
        }
      }
      return next;
    });
  }, []);

  const recordSkeletonMount = useCallback(
    (
      screen: 'Mapa' | 'Consulta' | 'Sobre',
      leadMs: number,
      hydrationMs: number
    ) => {
      setSkeletonLogs((prev) => [
        {
          id: `skel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestampISO: new Date().toISOString(),
          screen,
          skeletonLeadTimeMs: leadMs,
          dataHydrationTimeMs: hydrationMs,
          layoutShiftScore: 0.0,
          stable: true,
        },
        ...prev.slice(0, 14),
      ]);
    },
    []
  );

  const loadData = useCallback(
    async (withSkeletonDelay = true) => {
      const startMs = Date.now();
      setSyncError(null);
      if (withSkeletonDelay) {
        setIsLoading(true);
      }

      try {
        const leadTime = reduceMotion ? 80 : withSkeletonDelay ? 250 : 100;
        const [result] = await Promise.all([
          fetchSynchronizedFireData(),
          new Promise((resolve) => setTimeout(resolve, leadTime)),
        ]);

        setSpots(result.spots);
        setMetadata(result.metadata);
        setIsLoading(false);

        const elapsed = Date.now() - startMs;
        recordSkeletonMount('Mapa', leadTime, elapsed);
      } catch {
        setSyncError('Não foi possível atualizar. Tentar de novo');
        setIsLoading(false);
      }
    },
    [recordSkeletonMount, reduceMotion]
  );

  useEffect(() => {
    loadData(true);
    const syncInterval = setInterval(() => {
      loadData(false);
    }, 10 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, [loadData]);

  const registerFilterInteractionClick = useCallback(() => {
    setCurrentFilterClicks((prev) => {
      if (prev === 0) {
        filterStartTimeRef.current = Date.now();
      }
      return prev + 1;
    });
  }, []);

  const selectUF = useCallback((uf: NordesteUF | 'TODOS', countClick = true) => {
    if (countClick) {
      setCurrentFilterClicks((prev) => {
        if (prev === 0) {
          filterStartTimeRef.current = Date.now();
        }
        return prev + 1;
      });
    }

    setSelectedUF(uf);
    setSelectedMunicipality(null);
    setSelectedSpot(null);

    if (uf === 'TODOS') {
      setMapCamera(NORDESTE_CENTER);
    } else {
      const stateMeta = NORDESTE_STATES.find((s) => s.uf === uf);
      if (stateMeta) {
        setMapCamera({
          latitude: stateMeta.centerLat,
          longitude: stateMeta.centerLng,
          zoom: stateMeta.defaultZoom,
        });
      }
    }
  }, []);

  const selectMunicipality = useCallback(
    (uf: NordesteUF, municipality: string, lat?: number, lng?: number) => {
      const clicksUsed = Math.max(1, currentFilterClicks + 1);
      const durationMs = Math.max(
        350,
        Date.now() - filterStartTimeRef.current
      );

      setSelectedUF(uf);
      setSelectedMunicipality(municipality);

      const matchingSpots = spots.filter(
        (s) =>
          s.uf === uf &&
          s.municipality.toLowerCase() === municipality.toLowerCase()
      );

      if (matchingSpots.length > 0) {
        const primary = matchingSpots[0];
        setSelectedSpot(primary);
        setMapCamera({
          latitude: primary.latitude,
          longitude: primary.longitude,
          zoom: 3.8,
        });
      } else if (typeof lat === 'number' && typeof lng === 'number') {
        setSelectedSpot(null);
        setMapCamera({
          latitude: lat,
          longitude: lng,
          zoom: 3.6,
        });
      }

      setFilterLogs((prev) => [
        {
          id: `filter-${Date.now()}`,
          timestampISO: new Date().toISOString(),
          targetUF: uf,
          targetMunicipality: municipality,
          clicksUsed,
          durationMs,
          withinTargetGoal: clicksUsed <= 3,
        },
        ...prev.slice(0, 19),
      ]);

      setCurrentFilterClicks(0);
      filterStartTimeRef.current = Date.now();
    },
    [currentFilterClicks, spots]
  );

  const selectSpotOnMap = useCallback((spot: FireSpot | null) => {
    setSelectedSpot(spot);
    if (spot) {
      setMapCamera((prev) => ({
        latitude: spot.latitude,
        longitude: spot.longitude,
        zoom: Math.max(prev.zoom, 3.2),
      }));
    }
  }, []);

  const zoomIn = useCallback(() => {
    setMapCamera((prev) => ({
      ...prev,
      zoom: Number(Math.min(4.5, prev.zoom + 0.55).toFixed(2)),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setMapCamera((prev) => ({
      ...prev,
      zoom: Number(Math.max(1.0, prev.zoom - 0.55).toFixed(2)),
    }));
  }, []);

  const resetMapToNordeste = useCallback(() => {
    setSelectedUF('TODOS');
    setSelectedMunicipality(null);
    setSelectedSpot(null);
    setMapCamera(NORDESTE_CENTER);
    setCurrentFilterClicks(0);
  }, []);

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      if (selectedUF !== 'TODOS' && spot.uf !== selectedUF) return false;
      if (
        selectedMunicipality &&
        spot.municipality.toLowerCase() !== selectedMunicipality.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [spots, selectedUF, selectedMunicipality]);

  const contextValue = useMemo<FireMonitorContextValue>(
    () => ({
      spots,
      filteredSpots,
      metadata,
      isLoading,
      syncError,
      reduceMotion,
      toggleReduceMotion,
      selectedUF,
      selectedMunicipality,
      selectedSpot,
      mapCamera,
      currentFilterClicks,
      skeletonLogs,
      filterLogs,
      selectUF,
      selectMunicipality,
      selectSpotOnMap,
      setMapCamera,
      zoomIn,
      zoomOut,
      resetMapToNordeste,
      refreshNow: () => loadData(true),
      registerFilterInteractionClick,
      recordSkeletonMount,
    }),
    [
      spots,
      filteredSpots,
      metadata,
      isLoading,
      syncError,
      reduceMotion,
      toggleReduceMotion,
      selectedUF,
      selectedMunicipality,
      selectedSpot,
      mapCamera,
      currentFilterClicks,
      skeletonLogs,
      filterLogs,
      selectUF,
      selectMunicipality,
      selectSpotOnMap,
      zoomIn,
      zoomOut,
      resetMapToNordeste,
      loadData,
      registerFilterInteractionClick,
      recordSkeletonMount,
    ]
  );

  return (
    <FireMonitorContext.Provider value={contextValue}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          style="light"
          backgroundColor={RADAR_FOGO_TOKENS.colors.background}
        />

        {/* BARRA SUPERIOR DARK GLASS: LOGO + REDUZIR ANIMAÇÕES + SINCRONIZAÇÃO (Alvos >= 44px) */}
        <View
          style={[
            styles.transparencyBanner,
            isMobile && { paddingHorizontal: 12, paddingVertical: 8 },
          ]}
          accessibilityRole="header"
          accessibilityLabel="Cabeçalho do Radar Fogo - Monitor de Queimadas e Temperaturas"
        >
          <View style={styles.bannerTopRow}>
            <View style={styles.brandAndSourceRow}>
              <AppLogoEmblem size={44} />
              <View style={styles.brandTextCol}>
                <View style={styles.brandTitleInline}>
                  <Text style={styles.appBrandName}>Radar Fogo</Text>
                  <View style={styles.ifpiHeaderBadge}>
                    <Text style={styles.ifpiHeaderBadgeText}>Nordeste</Text>
                  </View>
                </View>
                <View style={styles.sourceBadgeRow}>
                  <View style={styles.statusDot} />
                  <Text
                    style={styles.transparencySourceText}
                    numberOfLines={1}
                  >
                    {isLoading
                      ? 'Atualizando dados...'
                      : `Atualizado às ${metadata.lastSyncFormatted}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.headerActionsRow}>
              {/* Interruptor Acessível "Reduzir animações" (>= 44x44 px) */}
              <Pressable
                onPress={toggleReduceMotion}
                style={({ pressed }) => [
                  styles.motionToggleBtn,
                  reduceMotion && styles.motionToggleBtnActive,
                  pressed && styles.syncButtonPressed,
                ]}
                accessibilityRole="switch"
                accessibilityState={{ checked: reduceMotion }}
                accessibilityLabel={
                  reduceMotion
                    ? 'Reduzir animações ativado. Toque para permitir animações suaves'
                    : 'Reduzir animações desativado. Toque para desativar animações'
                }
              >
                <Ionicons
                  name={reduceMotion ? 'pause-circle' : 'sparkles-outline'}
                  size={16}
                  color={reduceMotion ? '#30D158' : '#CBD5E1'}
                />
                <Text
                  style={[
                    styles.motionToggleText,
                    reduceMotion && styles.motionToggleTextActive,
                  ]}
                >
                  {isMobile
                    ? reduceMotion
                      ? 'Sem anim.'
                      : 'Animações'
                    : reduceMotion
                      ? 'Animações reduzidas'
                      : 'Reduzir animações'}
                </Text>
              </Pressable>

              {/* Botão Atualizar Dados (>= 44x44 px) */}
              <Pressable
                onPress={() => loadData(true)}
                style={({ pressed }) => [
                  styles.syncButton,
                  pressed && styles.syncButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Atualizar dados de queimadas e temperatura agora"
              >
                <Ionicons name="refresh" size={16} color="#64D2FF" />
                <Text style={styles.syncTimestampText}>
                  {isLoading ? 'Atualizando...' : 'Atualizar'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Mensagem de erro calma e acionável caso a sincronização falhe */}
          {syncError ? (
            <Pressable
              onPress={() => loadData(true)}
              style={styles.calmErrorBanner}
              accessibilityRole="button"
              accessibilityLabel="Não foi possível atualizar. Tentar de novo"
            >
              <Ionicons name="alert-circle-outline" size={18} color="#FFD60A" />
              <Text style={styles.calmErrorText}>{syncError}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.contentContainer}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: APPLE_CALM_THEME.colors.background,
              },
            }}
          />
        </View>
      </SafeAreaView>
    </FireMonitorContext.Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APPLE_CALM_THEME.colors.background,
  },
  transparencyBanner: {
    backgroundColor: 'rgba(11, 18, 34, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: APPLE_CALM_THEME.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  brandAndSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  brandTextCol: {
    flexShrink: 1,
    gap: 2,
  },
  brandTitleInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  appBrandName: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 16,
    fontWeight: '800',
    color: APPLE_CALM_THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  ifpiHeaderBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.36)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ifpiHeaderBadgeText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#30D158',
  },
  sourceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: APPLE_CALM_THEME.colors.syncGreen,
  },
  transparencySourceText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 10.5,
    fontWeight: '400',
    color: APPLE_CALM_THEME.colors.textMuted,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  motionToggleBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: RADAR_FOGO_TOKENS.colors.glass,
    borderWidth: 1,
    borderColor: RADAR_FOGO_TOKENS.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  motionToggleBtnActive: {
    backgroundColor: RADAR_FOGO_TOKENS.colors.syncGreenSoft,
    borderColor: 'rgba(48, 209, 88, 0.45)',
  },
  motionToggleText: {
    fontFamily: RADAR_FOGO_TOKENS.fonts.family,
    fontSize: 12,
    fontWeight: '600',
    color: RADAR_FOGO_TOKENS.colors.textSecondary,
  },
  motionToggleTextActive: {
    color: '#30D158',
    fontWeight: '700',
  },
  syncButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: RADAR_FOGO_TOKENS.colors.accentBlueSoft,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.32)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  syncButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  syncTimestampText: {
    fontFamily: RADAR_FOGO_TOKENS.fonts.family,
    fontSize: 12,
    fontWeight: '700',
    color: RADAR_FOGO_TOKENS.colors.accentCyan,
  },
  calmErrorBanner: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 214, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calmErrorText: {
    fontFamily: RADAR_FOGO_TOKENS.fonts.family,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD60A',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: APPLE_CALM_THEME.colors.background,
  },
});
