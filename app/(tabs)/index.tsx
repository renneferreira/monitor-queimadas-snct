import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { APPLE_CALM_THEME, useFireMonitor } from '../_layout';
import {
  FireSeverity,
  FireSpot,
  MapClusterItem,
  NORDESTE_STATES,
  NordesteUF,
  clusterFireSpots,
} from '../services/fireDataService';

/**
 * Polígonos simplificados e georreferenciados dos 9 Estados do Nordeste
 * para projeção cartográfica limpa (baixo ruído sensorial — estilo Apple Maps Light).
 */
const UF_GEO_POLYGONS: Record<
  NordesteUF,
  { path: string; labelLat: number; labelLng: number }
> = {
  MA: {
    // Maranhão
    path: 'M -47.4,-2.2 L -44.2,-1.8 L -41.9,-2.8 L -42.8,-5.5 L -43.2,-6.8 L -45.5,-9.5 L -46.9,-8.9 L -47.5,-5.2 Z',
    labelLat: -5.2,
    labelLng: -45.1,
  },
  PI: {
    // Piauí
    path: 'M -41.9,-2.8 L -41.3,-3.0 L -40.9,-5.5 L -40.5,-7.8 L -41.2,-9.2 L -44.2,-10.9 L -45.8,-10.2 L -45.5,-9.5 L -43.2,-6.8 L -42.8,-5.5 Z',
    labelLat: -7.4,
    labelLng: -42.6,
  },
  CE: {
    // Ceará
    path: 'M -41.3,-3.0 L -38.5,-3.2 L -37.2,-4.8 L -38.4,-6.9 L -39.2,-7.8 L -40.5,-7.8 L -40.9,-5.5 Z',
    labelLat: -5.3,
    labelLng: -39.4,
  },
  RN: {
    // Rio Grande do Norte
    path: 'M -37.2,-4.8 L -35.0,-5.1 L -35.0,-6.5 L -36.8,-6.9 L -38.4,-6.4 Z',
    labelLat: -5.8,
    labelLng: -36.5,
  },
  PB: {
    // Paraíba
    path: 'M -38.4,-6.4 L -36.8,-6.9 L -34.8,-6.5 L -34.8,-7.6 L -37.2,-8.1 L -38.6,-7.5 Z',
    labelLat: -7.2,
    labelLng: -36.8,
  },
  PE: {
    // Pernambuco
    path: 'M -40.5,-7.8 L -39.2,-7.8 L -37.2,-8.1 L -34.8,-7.6 L -35.1,-8.9 L -37.5,-9.2 L -38.3,-9.5 L -40.8,-9.6 L -41.2,-9.2 Z',
    labelLat: -8.5,
    labelLng: -38.0,
  },
  AL: {
    // Alagoas
    path: 'M -38.1,-9.1 L -35.1,-8.9 L -35.8,-10.4 L -37.9,-9.6 Z',
    labelLat: -9.6,
    labelLng: -36.5,
  },
  SE: {
    // Sergipe
    path: 'M -37.9,-9.6 L -36.4,-10.2 L -37.3,-11.5 L -38.2,-10.8 Z',
    labelLat: -10.6,
    labelLng: -37.3,
  },
  BA: {
    // Bahia
    path: 'M -45.8,-10.2 L -44.2,-10.9 L -41.2,-9.2 L -40.8,-9.6 L -38.3,-9.5 L -38.2,-10.8 L -37.3,-11.5 L -38.9,-15.5 L -39.2,-17.9 L -40.8,-17.5 L -44.5,-14.8 L -46.4,-13.5 L -46.3,-11.2 Z',
    labelLat: -12.8,
    labelLng: -41.9,
  },
};

function getSeverityColors(severity: FireSeverity) {
  switch (severity) {
    case 'critico':
      return {
        bg: APPLE_CALM_THEME.colors.severityCritico,
        soft: APPLE_CALM_THEME.colors.severityCriticoSoft,
        label: 'Crítico (FRP Alto)',
      };
    case 'alto':
      return {
        bg: APPLE_CALM_THEME.colors.severityAlto,
        soft: APPLE_CALM_THEME.colors.severityAltoSoft,
        label: 'Atenção Elevada',
      };
    default:
      return {
        bg: APPLE_CALM_THEME.colors.severityModerado,
        soft: APPLE_CALM_THEME.colors.severityModeradoSoft,
        label: 'Moderado',
      };
  }
}

export default function MapaNordesteScreen() {
  const router = useRouter();
  const {
    spots,
    filteredSpots,
    isLoading,
    selectedUF,
    selectedMunicipality,
    selectedSpot,
    mapCamera,
    selectUF,
    selectSpotOnMap,
    setMapCamera,
    zoomIn,
    zoomOut,
    resetMapToNordeste,
  } = useFireMonitor();

  // Clusterização limpa baseada no zoom atual para evitar sobrecarga visual
  const clusters = useMemo(
    () => clusterFireSpots(filteredSpots, mapCamera.zoom),
    [filteredSpots, mapCamera.zoom]
  );

  // Cálculo da ViewBox SVG baseada na câmera (Latitude/Longitude + Zoom de alta precisão)
  const viewBoxString = useMemo(() => {
    const baseSpanLng = 16.5 / mapCamera.zoom;
    const baseSpanLat = 17.5 / mapCamera.zoom;
    const minX = mapCamera.longitude - baseSpanLng / 2;
    const minY = -mapCamera.latitude - baseSpanLat / 2; // Inverte eixo Y para norte no topo
    return `${minX.toFixed(3)} ${minY.toFixed(3)} ${baseSpanLng.toFixed(3)} ${baseSpanLat.toFixed(3)}`;
  }, [mapCamera]);

  const handleClusterOrSpotPress = (item: MapClusterItem) => {
    if (item.isCluster && mapCamera.zoom < 3.0) {
      // Aproxima suavemente no cluster
      setMapCamera({
        latitude: item.latitude,
        longitude: item.longitude,
        zoom: Math.min(4.0, Number((mapCamera.zoom + 0.95).toFixed(2))),
      });
      selectSpotOnMap(item.spots[0]);
    } else {
      selectSpotOnMap(item.spots[0]);
    }
  };

  const activeSpot: FireSpot | null =
    selectedSpot || (filteredSpots.length > 0 ? filteredSpots[0] : null);

  const countBySource = useMemo(() => {
    const inpe = filteredSpots.filter((s) => s.source === 'INPE_BDQUEIMADAS').length;
    const censipam = filteredSpots.filter(
      (s) => s.source === 'CENSIPAM_PAINEL_DO_FOGO'
    ).length;
    return { inpe, censipam };
  }, [filteredSpots]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* CABEÇALHO CONTEXTUAL & SELETOR RÁPIDO DE UF (SEGMENTED CONTROL iOS) */}
      <View style={styles.card}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.sectionEyebrow}>
              MONITORAMENTO ORBITAL • REGIÃO NORDESTE
            </Text>
            <Text style={styles.screenTitle}>
              {selectedMunicipality
                ? `${selectedMunicipality} (${selectedUF})`
                : selectedUF === 'TODOS'
                  ? 'Visão Geral do Nordeste (9 Estados)'
                  : `Estado: ${
                      NORDESTE_STATES.find((s) => s.uf === selectedUF)?.name ??
                      selectedUF
                    } (${selectedUF})`}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/consulta')}
            style={({ pressed }) => [
              styles.searchShortcutBtn,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ir para busca por cidade em até 3 cliques"
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={APPLE_CALM_THEME.colors.appleBlue}
            />
            <Text style={styles.searchShortcutText}>Filtrar Cidade</Text>
          </Pressable>
        </View>

        {/* Segmented Control iOS para os 9 Estados do Nordeste */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentedScroll}
        >
          <Pressable
            onPress={() => selectUF('TODOS')}
            style={[
              styles.segmentPill,
              selectedUF === 'TODOS' && styles.segmentPillActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Mostrar todos os 9 estados do Nordeste"
          >
            <Text
              style={[
                styles.segmentPillText,
                selectedUF === 'TODOS' && styles.segmentPillTextActive,
              ]}
            >
              Nordeste (Todos)
            </Text>
          </Pressable>

          {NORDESTE_STATES.map((st) => {
            const isSelected = selectedUF === st.uf;
            const ufCount = spots.filter((s) => s.uf === st.uf).length;
            return (
              <Pressable
                key={st.uf}
                onPress={() => selectUF(st.uf)}
                style={[
                  styles.segmentPill,
                  isSelected && styles.segmentPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar estado ${st.name}, ${ufCount} focos ativos`}
              >
                <Text
                  style={[
                    styles.segmentPillText,
                    isSelected && styles.segmentPillTextActive,
                  ]}
                >
                  {st.uf} ({ufCount})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* CARTÃO PRINCIPAL DO MAPA INTERATIVO COM ZOOM DE ALTA PRECISÃO */}
      <View style={styles.mapCard}>
        {isLoading ? (
          /* SKELETON LOADER DE ALTURA FIXA (Mitiga quebra de layout para TEA Nível 1) */
          <View
            style={styles.mapSkeletonContainer}
            accessibilityLabel="Carregando mapa preditivo sem alteração de layout"
          >
            <View style={styles.skeletonBadge} />
            <Text style={styles.skeletonStatusText}>
              Preparando camada cartográfica estável (Zero Layout Shift)...
            </Text>
            <View style={styles.skeletonMapGrid} />
          </View>
        ) : (
          <View style={styles.mapViewport}>
            <Svg
              width="100%"
              height="100%"
              viewBox={viewBoxString}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grade geográfica sutil para orientação espacial */}
              {[-46, -43, -40, -37].map((lng) => (
                <Line
                  key={`meridian-${lng}`}
                  x1={lng}
                  y1={1.0}
                  x2={lng}
                  y2={18.5}
                  stroke="#E5E5EA"
                  strokeWidth={0.04 / mapCamera.zoom}
                  strokeDasharray="0.18,0.18"
                />
              ))}
              {[4, 8, 12, 16].map((latInv) => (
                <Line
                  key={`parallel-${latInv}`}
                  x1={-48.5}
                  y1={latInv}
                  x2={-34.0}
                  y2={latInv}
                  stroke="#E5E5EA"
                  strokeWidth={0.04 / mapCamera.zoom}
                  strokeDasharray="0.18,0.18"
                />
              ))}

              {/* Polígonos dos 9 Estados do Nordeste ( coordenadas Y invertidas: -lat ) */}
              <G transform="scale(1, -1)">
                {NORDESTE_STATES.map((st) => {
                  const poly = UF_GEO_POLYGONS[st.uf];
                  const isFocused = selectedUF === st.uf;
                  return (
                    <Path
                      key={st.uf}
                      d={poly.path}
                      fill={isFocused ? '#DCEBFA' : '#EFEFF4'}
                      stroke={isFocused ? '#007AFF' : '#C7C7CC'}
                      strokeWidth={
                        isFocused
                          ? 0.11 / Math.sqrt(mapCamera.zoom)
                          : 0.06 / Math.sqrt(mapCamera.zoom)
                      }
                      onPress={() => selectUF(st.uf)}
                    />
                  );
                })}
              </G>

              {/* Siglas das UFs no Mapa */}
              {NORDESTE_STATES.map((st) => {
                const poly = UF_GEO_POLYGONS[st.uf];
                const isFocused = selectedUF === st.uf;
                return (
                  <SvgText
                    key={`label-${st.uf}`}
                    x={poly.labelLng}
                    y={-poly.labelLat}
                    fill={isFocused ? '#0051A8' : '#636366'}
                    fontSize={0.52 / Math.sqrt(mapCamera.zoom)}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {st.uf}
                  </SvgText>
                );
              })}

              {/* MARCADORES MINIMALISTAS & CLUSTERS NUMÉRICOS LIMPOS */}
              {clusters.map((item) => {
                const cx = item.longitude;
                const cy = -item.latitude;
                const sevColor = getSeverityColors(item.maxSeverity).bg;
                const isSelectedSpot =
                  activeSpot &&
                  item.spots.some((s) => s.id === activeSpot.id);
                const radius = item.isCluster
                  ? 0.46 / Math.sqrt(mapCamera.zoom)
                  : 0.34 / Math.sqrt(mapCamera.zoom);

                return (
                  <G
                    key={item.id}
                    onPress={() => handleClusterOrSpotPress(item)}
                  >
                    {/* Halo de seleção calmo (sem piscar abruptamente) */}
                    {isSelectedSpot ? (
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={radius * 1.65}
                        fill={sevColor}
                        fillOpacity={0.22}
                        stroke="#007AFF"
                        strokeWidth={0.07 / Math.sqrt(mapCamera.zoom)}
                      />
                    ) : null}

                    {/* Marcador circular de alto contraste */}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={sevColor}
                      stroke="#FFFFFF"
                      strokeWidth={0.08 / Math.sqrt(mapCamera.zoom)}
                    />

                    {/* Contagem numérica limpa para clusters ou ponto central para foco único */}
                    <SvgText
                      x={cx}
                      y={cy + radius * 0.36}
                      fill="#FFFFFF"
                      fontSize={radius * 1.05}
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {item.count}
                    </SvgText>

                    {/* Rótulo do município quando aproximado (Zoom >= 2.3) */}
                    {mapCamera.zoom >= 2.3 ? (
                      <G>
                        <Rect
                          x={cx - 1.35 / Math.sqrt(mapCamera.zoom)}
                          y={cy + radius * 1.25}
                          width={2.7 / Math.sqrt(mapCamera.zoom)}
                          height={0.52 / Math.sqrt(mapCamera.zoom)}
                          rx={0.14 / Math.sqrt(mapCamera.zoom)}
                          fill="#FFFFFF"
                          stroke="#E5E5EA"
                          strokeWidth={0.03 / Math.sqrt(mapCamera.zoom)}
                        />
                        <SvgText
                          x={cx}
                          y={cy + radius * 1.25 + 0.36 / Math.sqrt(mapCamera.zoom)}
                          fill="#1C1C1E"
                          fontSize={0.29 / Math.sqrt(mapCamera.zoom)}
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {item.primaryMunicipality}
                        </SvgText>
                      </G>
                    ) : null}
                  </G>
                );
              })}
            </Svg>

            {/* CONTROLES FLUTUANTES ACESSÍVEIS DE ZOOM (+ / - MÍNIMO 48x48 dp) */}
            <View style={styles.mapControlsOverlay}>
              <Pressable
                onPress={zoomIn}
                style={({ pressed }) => [
                  styles.zoomControlButton,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Aumentar zoom no mapa"
              >
                <Text style={styles.zoomButtonSymbol}>+</Text>
              </Pressable>

              <Pressable
                onPress={zoomOut}
                style={({ pressed }) => [
                  styles.zoomControlButton,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Diminuir zoom no mapa"
              >
                <Text style={styles.zoomButtonSymbol}>−</Text>
              </Pressable>

              <Pressable
                onPress={resetMapToNordeste}
                style={({ pressed }) => [
                  styles.resetZoomButton,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Centralizar mapa na Região Nordeste"
              >
                <Ionicons
                  name="locate-outline"
                  size={20}
                  color={APPLE_CALM_THEME.colors.appleBlue}
                />
              </Pressable>
            </View>

            {/* Indicador de Zoom e Coordenadas no Rodapé do Mapa */}
            <View style={styles.mapTelemetryBar}>
              <Text style={styles.mapTelemetryText}>
                Zoom: {mapCamera.zoom.toFixed(1)}x • Centro:{' '}
                {mapCamera.latitude.toFixed(2)}°, {mapCamera.longitude.toFixed(2)}°
              </Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: APPLE_CALM_THEME.colors.severityModerado },
                    ]}
                  />
                  <Text style={styles.legendLabel}>Moderado</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: APPLE_CALM_THEME.colors.severityAlto },
                    ]}
                  />
                  <Text style={styles.legendLabel}>Alto</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: APPLE_CALM_THEME.colors.severityCritico },
                    ]}
                  />
                  <Text style={styles.legendLabel}>Crítico</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* RESUMO SÍNCRONO DE FOCOS E CARTÃO DE DETALHE DO FOCO SELECIONADO */}
      <View style={styles.metricsGrid}>
        <View style={[styles.card, styles.metricHalfCard]}>
          <Text style={styles.metricLabel}>FOCOS NO RECORTE ATUAL</Text>
          {isLoading ? (
            <View style={styles.skeletonValueBox} />
          ) : (
            <Text style={styles.metricBigNumber}>{filteredSpots.length}</Text>
          )}
          <Text style={styles.metricSubtext}>
            INPE (10m): {countBySource.inpe} • CENSIPAM (30m): {countBySource.censipam}
          </Text>
        </View>

        <View style={[styles.card, styles.metricHalfCard]}>
          <Text style={styles.metricLabel}>AGRUPAMENTOS VISÍVEIS</Text>
          {isLoading ? (
            <View style={styles.skeletonValueBox} />
          ) : (
            <Text style={styles.metricBigNumber}>{clusters.length}</Text>
          )}
          <Text style={styles.metricSubtext}>
            Toque em um número no mapa para aproximar
          </Text>
        </View>
      </View>

      {/* CARTÃO DE INSPEÇÃO DO FOCO SELECIONADO (ISOLAMENTO VISUAL) */}
      <View style={styles.card}>
        <View style={styles.spotDetailHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              DETALHAMENTO DO FOCO SELECIONADO
            </Text>
            <Text style={styles.spotDetailTitle}>
              {activeSpot
                ? `${activeSpot.municipality} — ${activeSpot.stateName} (${activeSpot.uf})`
                : 'Nenhum foco ativo no filtro selecionado'}
            </Text>
          </View>

          {activeSpot ? (
            <View
              style={[
                styles.severityBadge,
                {
                  backgroundColor: getSeverityColors(activeSpot.severity).soft,
                },
              ]}
            >
              <Text
                style={[
                  styles.severityBadgeText,
                  { color: getSeverityColors(activeSpot.severity).bg },
                ]}
              >
                {getSeverityColors(activeSpot.severity).label}
              </Text>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.skeletonSpotDetails} />
        ) : activeSpot ? (
          <View style={styles.telemetryTable}>
            <View style={styles.telemetryCell}>
              <Text style={styles.telemetryKey}>Fonte Oficial & Latência</Text>
              <Text style={styles.telemetryValue}>
                {activeSpot.source === 'INPE_BDQUEIMADAS'
                  ? 'INPE BDQueimadas (10 min)'
                  : 'CENSIPAM Painel do Fogo (30 min)'}
              </Text>
            </View>

            <View style={styles.telemetryCell}>
              <Text style={styles.telemetryKey}>Satélite & Detecção</Text>
              <Text style={styles.telemetryValueMono}>
                {activeSpot.satellite} • há {activeSpot.minutesAgo} min
              </Text>
            </View>

            <View style={styles.telemetryCell}>
              <Text style={styles.telemetryKey}>Bioma Predominante</Text>
              <Text style={styles.telemetryValue}>{activeSpot.biome}</Text>
            </View>

            <View style={styles.telemetryCell}>
              <Text style={styles.telemetryKey}>Potência Radiativa (FRP)</Text>
              <Text style={styles.telemetryValueMono}>
                {activeSpot.frpMW.toFixed(1)} MW • Confiança {activeSpot.confidencePercent}%
              </Text>
            </View>

            <View style={styles.telemetryCell}>
              <Text style={styles.telemetryKey}>Estiagem & Risco de Fogo</Text>
              <Text style={styles.telemetryValueMono}>
                {activeSpot.daysWithoutRain} dias sem chuva • Índice{' '}
                {(activeSpot.fireRiskIndex * 100).toFixed(0)}%
              </Text>
            </View>

            <View style={styles.telemetryCell}>
              <Text style={styles.telemetryKey}>Coordenadas & Código IBGE</Text>
              <Text style={styles.telemetryValueMono}>
                {activeSpot.latitude.toFixed(4)}°, {activeSpot.longitude.toFixed(4)}° • IBGE{' '}
                {activeSpot.ibgeCode}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyStateText}>
            Não há focos registrados neste município no ciclo atual. Use o botão
            &quot;Nordeste (Todos)&quot; para retornar à visão regional.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APPLE_CALM_THEME.colors.background,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderRadius: APPLE_CALM_THEME.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 220,
  },
  sectionEyebrow: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 20,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  searchShortcutBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: APPLE_CALM_THEME.radius.control,
    backgroundColor: APPLE_CALM_THEME.colors.appleBlueSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchShortcutText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.appleBlue,
  },
  btnPressed: {
    opacity: 0.75,
  },
  segmentedScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  segmentPill: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: APPLE_CALM_THEME.radius.control,
    backgroundColor: APPLE_CALM_THEME.colors.background,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentPillActive: {
    backgroundColor: APPLE_CALM_THEME.colors.appleBlue,
    borderColor: APPLE_CALM_THEME.colors.appleBlue,
  },
  segmentPillText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  segmentPillTextActive: {
    color: '#FFFFFF',
  },
  mapCard: {
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderRadius: APPLE_CALM_THEME.radius.card,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
    overflow: 'hidden',
    height: 410,
  },
  mapSkeletonContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    gap: 12,
  },
  skeletonBadge: {
    width: 140,
    height: 18,
    borderRadius: 8,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
  },
  skeletonStatusText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    color: APPLE_CALM_THEME.colors.textSecondary,
  },
  skeletonMapGrid: {
    width: '92%',
    height: 280,
    borderRadius: 14,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
  },
  mapViewport: {
    flex: 1,
    backgroundColor: '#F9F9FB',
    position: 'relative',
  },
  mapControlsOverlay: {
    position: 'absolute',
    right: 14,
    top: 14,
    gap: 10,
  },
  zoomControlButton: {
    width: 48, // Estritamente >= 44x44 dp (Apple HIG)
    height: 48,
    borderRadius: 14,
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  resetZoomButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonSymbol: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 24,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textPrimary,
    lineHeight: 26,
  },
  mapTelemetryBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapTelemetryText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    color: APPLE_CALM_THEME.colors.textSecondary,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendLabel: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 11,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricHalfCard: {
    flex: 1,
    minWidth: 220,
  },
  metricLabel: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textMuted,
    marginBottom: 6,
  },
  metricBigNumber: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 28,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
    marginBottom: 4,
  },
  metricSubtext: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    color: APPLE_CALM_THEME.colors.textSecondary,
  },
  skeletonValueBox: {
    width: 80,
    height: 32,
    borderRadius: 8,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
    marginBottom: 6,
  },
  spotDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  spotDetailTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: APPLE_CALM_THEME.radius.pill,
  },
  severityBadgeText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    fontWeight: '700',
  },
  skeletonSpotDetails: {
    height: 140,
    borderRadius: 12,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
  },
  telemetryTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  telemetryCell: {
    flex: 1,
    minWidth: 220,
    backgroundColor: APPLE_CALM_THEME.colors.background,
    borderRadius: 12,
    padding: 12,
  },
  telemetryKey: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    fontWeight: '500',
    color: APPLE_CALM_THEME.colors.textMuted,
    marginBottom: 4,
  },
  telemetryValue: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  telemetryValueMono: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 13,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  emptyStateText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    color: APPLE_CALM_THEME.colors.textSecondary,
    lineHeight: 20,
  },
});
