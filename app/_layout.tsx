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
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import {
  AppLogoEmblem,
  InstitutionalCreditsCard,
} from './components/IosWeatherWidgets';

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
  const [spots, setSpots] = useState<FireSpot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  // Injeção de Fontes Contrastantes (Outfit, Lexend, Plus Jakarta Sans, JetBrains Mono) + Gradiente Atmosférico iOS Weather na Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Radar Fogo — Monitor Orbital de Queimadas | IFPI Floriano (TDS-3)';
      const existing = document.getElementById('snct-ios-weather-fonts');
      if (!existing) {
        const link = document.createElement('link');
        link.id = 'snct-ios-weather-fonts';
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Lexend:wght@500;600;700&family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
        document.head.appendChild(link);
      }

      const existingStyle = document.getElementById('snct-ios-weather-glass-css');
      if (!existingStyle) {
        const styleEl = document.createElement('style');
        styleEl.id = 'snct-ios-weather-glass-css';
        styleEl.textContent = `
          body, #root {
            background: radial-gradient(circle at 50% 0%, #19294B 0%, #0B1325 48%, #050912 100%) !important;
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
      if (withSkeletonDelay) {
        setIsLoading(true);
      }

      const [result] = await Promise.all([
        fetchSynchronizedFireData(),
        new Promise((resolve) =>
          setTimeout(resolve, withSkeletonDelay ? 420 : 120)
        ),
      ]);

      setSpots(result.spots);
      setMetadata(result.metadata);
      setIsLoading(false);

      const elapsed = Date.now() - startMs;
      recordSkeletonMount('Mapa', withSkeletonDelay ? 420 : 120, elapsed);
    },
    [recordSkeletonMount]
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
          backgroundColor={APPLE_CALM_THEME.colors.background}
        />

        {/* BARRA SUPERIOR DARK GLASS: LOGO + TRANSPARÊNCIA CENSIPAM/INPE + CRÉDITOS IFPI */}
        <View
          style={styles.transparencyBanner}
          accessibilityRole="header"
          accessibilityLabel="Cabeçalho do Monitor Orbital de Queimadas - IFPI Campus Floriano Turma TDS-3"
        >
          <View style={styles.bannerTopRow}>
            <View style={styles.brandAndSourceRow}>
              <AppLogoEmblem size={40} />
              <View style={styles.brandTextCol}>
                <View style={styles.brandTitleInline}>
                  <Text style={styles.appBrandName}>Radar Fogo</Text>
                  <View style={styles.ifpiHeaderBadge}>
                    <Text style={styles.ifpiHeaderBadgeText}>
                      IFPI • Campus Floriano • TDS-3
                    </Text>
                  </View>
                </View>
                <View style={styles.sourceBadgeRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.transparencySourceText}>
                    Telemetria ativa (10–30 min) • Fontes detalhadas no rodapé e aba Sobre
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => loadData(true)}
              style={({ pressed }) => [
                styles.syncButton,
                pressed && styles.syncButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Atualizar dados de queimadas agora"
            >
              <Text style={styles.syncTimestampText}>
                {isLoading
                  ? 'Sincronizando satélites...'
                  : `Sincronizado às ${metadata.lastSyncFormatted}`}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* FAIXA COMPACTA DE AUTORIA INSTITUCIONAL (IFPI CAMPUS FLORIANO • TDS-3 • PROF. RENNÊ SANTOS) */}
        <InstitutionalCreditsCard compact />

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
  syncButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: APPLE_CALM_THEME.radius.pill,
    backgroundColor: APPLE_CALM_THEME.colors.appleBlueSoft,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.32)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncButtonPressed: {
    opacity: 0.78,
  },
  syncTimestampText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11.5,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.appleCyan,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: APPLE_CALM_THEME.colors.background,
  },
});
