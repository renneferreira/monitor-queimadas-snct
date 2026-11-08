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
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
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
import {
  BentoEnvironmentalWidgets,
  FrpOrbitalAreaChart,
  InstitutionalCreditsCard,
  StateThermalRangeBars,
} from '../components/IosWeatherWidgets';

/**
 * Polígonos simplificados e georreferenciados dos 9 Estados do Nordeste
 * projetados sobre o Radar Orbital Dark Glass.
 */
const UF_GEO_POLYGONS: Record<
  NordesteUF,
  { path: string; labelLat: number; labelLng: number }
> = {
  MA: {
    path: 'M -47.4,-2.2 L -44.2,-1.8 L -41.9,-2.8 L -42.8,-5.5 L -43.2,-6.8 L -45.5,-9.5 L -46.9,-8.9 L -47.5,-5.2 Z',
    labelLat: -5.2,
    labelLng: -45.1,
  },
  PI: {
    path: 'M -41.9,-2.8 L -41.3,-3.0 L -40.9,-5.5 L -40.5,-7.8 L -41.2,-9.2 L -44.2,-10.9 L -45.8,-10.2 L -45.5,-9.5 L -43.2,-6.8 L -42.8,-5.5 Z',
    labelLat: -7.4,
    labelLng: -42.6,
  },
  CE: {
    path: 'M -41.3,-3.0 L -38.5,-3.2 L -37.2,-4.8 L -38.4,-6.9 L -39.2,-7.8 L -40.5,-7.8 L -40.9,-5.5 Z',
    labelLat: -5.3,
    labelLng: -39.4,
  },
  RN: {
    path: 'M -37.2,-4.8 L -35.0,-5.1 L -35.0,-6.5 L -36.8,-6.9 L -38.4,-6.4 Z',
    labelLat: -5.8,
    labelLng: -36.5,
  },
  PB: {
    path: 'M -38.4,-6.4 L -36.8,-6.9 L -34.8,-6.5 L -34.8,-7.6 L -37.2,-8.1 L -38.6,-7.5 Z',
    labelLat: -7.2,
    labelLng: -36.8,
  },
  PE: {
    path: 'M -40.5,-7.8 L -39.2,-7.8 L -37.2,-8.1 L -34.8,-7.6 L -35.1,-8.9 L -37.5,-9.2 L -38.3,-9.5 L -40.8,-9.6 L -41.2,-9.2 Z',
    labelLat: -8.5,
    labelLng: -38.0,
  },
  AL: {
    path: 'M -38.1,-9.1 L -35.1,-8.9 L -35.8,-10.4 L -37.9,-9.6 Z',
    labelLat: -9.6,
    labelLng: -36.5,
  },
  SE: {
    path: 'M -37.9,-9.6 L -36.4,-10.2 L -37.3,-11.5 L -38.2,-10.8 Z',
    labelLat: -10.6,
    labelLng: -37.3,
  },
  BA: {
    path: 'M -45.8,-10.2 L -44.2,-10.9 L -41.2,-9.2 L -40.8,-9.6 L -38.3,-9.5 L -38.2,-10.8 L -37.3,-11.5 L -38.9,-15.5 L -39.2,-17.9 L -40.8,-17.5 L -44.5,-14.8 L -46.4,-13.5 L -46.3,-11.2 Z',
    labelLat: -12.8,
    labelLng: -41.9,
  },
};

function getSeverityColors(severity: FireSeverity) {
  switch (severity) {
    case 'critico':
      return {
        bg: '#FF453A',
        soft: 'rgba(255, 69, 58, 0.20)',
        label: 'Crítico (FRP Elevado)',
      };
    case 'alto':
      return {
        bg: '#FF9F0A',
        soft: 'rgba(255, 159, 10, 0.20)',
        label: 'Atenção Elevada',
      };
    default:
      return {
        bg: '#FFD60A',
        soft: 'rgba(255, 214, 10, 0.18)',
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

  const clusters = useMemo(
    () => clusterFireSpots(filteredSpots, mapCamera.zoom),
    [filteredSpots, mapCamera.zoom]
  );

  const viewBoxString = useMemo(() => {
    const baseSpanLng = 16.5 / mapCamera.zoom;
    const baseSpanLat = 17.5 / mapCamera.zoom;
    const minX = mapCamera.longitude - baseSpanLng / 2;
    const minY = -mapCamera.latitude - baseSpanLat / 2;
    return `${minX.toFixed(3)} ${minY.toFixed(3)} ${baseSpanLng.toFixed(3)} ${baseSpanLat.toFixed(3)}`;
  }, [mapCamera]);

  const handleClusterOrSpotPress = (item: MapClusterItem) => {
    if (item.isCluster && mapCamera.zoom < 3.0) {
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

  const weatherHeroSummary = useMemo(() => {
    const inpe = filteredSpots.filter(
      (s) => s.source === 'INPE_BDQUEIMADAS'
    ).length;
    const censipam = filteredSpots.filter(
      (s) => s.source === 'CENSIPAM_PAINEL_DO_FOGO'
    ).length;
    const maxFrp =
      filteredSpots.length > 0
        ? Math.max(...filteredSpots.map((s) => s.frpMW))
        : 0;
    const minFrp =
      filteredSpots.length > 0
        ? Math.min(...filteredSpots.map((s) => s.frpMW))
        : 0;
    const maxDrought =
      filteredSpots.length > 0
        ? Math.max(...filteredSpots.map((s) => s.daysWithoutRain))
        : 0;

    return { inpe, censipam, maxFrp, minFrp, maxDrought };
  }, [filteredSpots]);

  const heroLocationTitle = selectedMunicipality
    ? `${selectedMunicipality}, ${selectedUF}`
    : selectedUF === 'TODOS'
      ? 'Região Nordeste'
      : `${
          NORDESTE_STATES.find((s) => s.uf === selectedUF)?.name ?? selectedUF
        } (${selectedUF})`;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO ATMOSFÉRICO ESTILO APP TEMPO DO iOS (DARK GLASS) */}
      <View style={styles.weatherHeroContainer}>
        <View style={styles.heroTopPill}>
          <Ionicons name="radio-outline" size={14} color="#64D2FF" />
          <Text style={styles.heroTopPillText}>
             MONITORAMENTO ORBITAL • IFPI CAMPUS FLORIANO (TDS-3)
          </Text>
        </View>

        <Text style={styles.heroLocationName}>{heroLocationTitle}</Text>

        {isLoading ? (
          <View style={styles.heroSkeletonNum} />
        ) : (
          <View style={styles.heroNumberRow}>
            <Text style={styles.heroGiantNumber}>{filteredSpots.length}</Text>
            <View style={styles.heroUnitCol}>
              <Text style={styles.heroUnitTitle}>FOCOS ATIVOS</Text>
              <Text style={styles.heroUnitSub}>
                Pico: {weatherHeroSummary.maxFrp.toFixed(1)} MW
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.heroConditionText}>
          {activeSpot
            ? `Alerta ${
                activeSpot.severity === 'critico' ? 'Crítico' : 'Elevado'
              } no Bioma ${activeSpot.biome} • Satélite ${activeSpot.satellite}`
            : 'Sem focos críticos no recorte selecionado'}
        </Text>

        <Text style={styles.heroHighLowText}>
          Mín: {weatherHeroSummary.minFrp.toFixed(0)} MW • Máx:{' '}
          {weatherHeroSummary.maxFrp.toFixed(0)} MW • INPE (10m):{' '}
          {weatherHeroSummary.inpe} • CENSIPAM (30m):{' '}
          {weatherHeroSummary.censipam}
        </Text>

        {/* Ações Rápidas & Segmented Control dos 9 Estados */}
        <View style={styles.heroActionsRow}>
          <Pressable
            onPress={() => router.push('/(tabs)/consulta')}
            style={({ pressed }) => [
              styles.searchCityGlassBtn,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ir para busca por cidade em até 3 cliques"
          >
            <Ionicons name="search-outline" size={16} color="#64D2FF" />
            <Text style={styles.searchCityGlassBtnText}>
              Filtrar Cidade (≤ 3 cliques)
            </Text>
          </Pressable>

          {selectedUF !== 'TODOS' || selectedMunicipality ? (
            <Pressable
              onPress={resetMapToNordeste}
              style={({ pressed }) => [
                styles.resetFilterGlassBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={16} color="#FFD60A" />
              <Text style={styles.resetFilterGlassText}>Visão Geral NE</Text>
            </Pressable>
          ) : null}
        </View>

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
              Nordeste ({spots.length})
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

      {/* 2. RADAR ORBITAL DARK GLASS (MAPA INTERATIVO DO NORDESTE COM GRADIENTES TÉRMICOS) */}
      <View style={styles.mapGlassCard}>
        <View style={styles.mapCardHeader}>
          <View style={styles.mapHeaderLeft}>
            <Ionicons name="analytics-outline" size={15} color="#64D2FF" />
            <Text style={styles.sectionEyebrow}>
              RADAR TERMAL SATELITAL • REGIÃO NORDESTE ({clusters.length}{' '}
              AGRUPAMENTOS VISÍVEIS)
            </Text>
          </View>
          <Text style={styles.mapZoomBadge}>
            Zoom {mapCamera.zoom.toFixed(1)}x
          </Text>
        </View>

        {isLoading ? (
          <View
            style={styles.mapSkeletonContainer}
            accessibilityLabel="Carregando radar preditivo sem alteração de layout"
          >
            <View style={styles.skeletonBadge} />
            <Text style={styles.skeletonStatusText}>
              Sincronizando camada de radar orbital (Zero Layout Shift • CLS 0.000)...
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
              <Defs>
                <RadialGradient id="heatHaloCritico" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FF453A" stopOpacity="0.55" />
                  <Stop offset="55%" stopColor="#FF9F0A" stopOpacity="0.22" />
                  <Stop offset="100%" stopColor="#FF453A" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="heatHaloAlto" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FF9F0A" stopOpacity="0.48" />
                  <Stop offset="100%" stopColor="#FFD60A" stopOpacity="0" />
                </RadialGradient>
                <LinearGradient id="stateFocusedGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#17315E" />
                  <Stop offset="100%" stopColor="#0E2144" />
                </LinearGradient>
              </Defs>

              {/* Grade de coordenadas estilo Radar Apple Weather */}
              {[-46, -43, -40, -37].map((lng) => (
                <Line
                  key={`meridian-${lng}`}
                  x1={lng}
                  y1={1.0}
                  x2={lng}
                  y2={18.5}
                  stroke="rgba(100, 210, 255, 0.10)"
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
                  stroke="rgba(100, 210, 255, 0.10)"
                  strokeWidth={0.04 / mapCamera.zoom}
                  strokeDasharray="0.18,0.18"
                />
              ))}

              {/* Polígonos dos 9 Estados do Nordeste */}
              <G transform="scale(1, -1)">
                {NORDESTE_STATES.map((st) => {
                  const poly = UF_GEO_POLYGONS[st.uf];
                  const isFocused = selectedUF === st.uf;
                  return (
                    <Path
                      key={st.uf}
                      d={poly.path}
                      fill={isFocused ? 'url(#stateFocusedGrad)' : '#101B33'}
                      stroke={isFocused ? '#64D2FF' : 'rgba(255,255,255,0.22)'}
                      strokeWidth={
                        isFocused
                          ? 0.12 / Math.sqrt(mapCamera.zoom)
                          : 0.06 / Math.sqrt(mapCamera.zoom)
                      }
                      onPress={() => selectUF(st.uf)}
                    />
                  );
                })}
              </G>

              {/* Siglas das UFs no Radar */}
              {NORDESTE_STATES.map((st) => {
                const poly = UF_GEO_POLYGONS[st.uf];
                const isFocused = selectedUF === st.uf;
                return (
                  <SvgText
                    key={`label-${st.uf}`}
                    x={poly.labelLng}
                    y={-poly.labelLat}
                    fill={isFocused ? '#64D2FF' : 'rgba(203, 213, 225, 0.65)'}
                    fontSize={0.52 / Math.sqrt(mapCamera.zoom)}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {st.uf}
                  </SvgText>
                );
              })}

              {/* Halos de Calor & Clusters Numéricos Dark Glass */}
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
                    {/* Halo térmico suave estilo mapa de calor iOS Weather */}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={radius * 2.6}
                      fill={
                        item.maxSeverity === 'critico'
                          ? 'url(#heatHaloCritico)'
                          : 'url(#heatHaloAlto)'
                      }
                    />

                    {/* Anel de foco selecionado */}
                    {isSelectedSpot ? (
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={radius * 1.55}
                        fill="none"
                        stroke="#64D2FF"
                        strokeWidth={0.08 / Math.sqrt(mapCamera.zoom)}
                      />
                    ) : null}

                    {/* Marcador circular principal */}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={sevColor}
                      stroke="#080E1E"
                      strokeWidth={0.08 / Math.sqrt(mapCamera.zoom)}
                    />

                    {/* Número de focos no cluster */}
                    <SvgText
                      x={cx}
                      y={cy + radius * 0.36}
                      fill="#060A14"
                      fontSize={radius * 1.05}
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {item.count}
                    </SvgText>

                    {/* Rótulo Dark Glass do município em zoom próximo (>= 2.2) */}
                    {mapCamera.zoom >= 2.2 ? (
                      <G>
                        <Rect
                          x={cx - 1.4 / Math.sqrt(mapCamera.zoom)}
                          y={cy + radius * 1.25}
                          width={2.8 / Math.sqrt(mapCamera.zoom)}
                          height={0.54 / Math.sqrt(mapCamera.zoom)}
                          rx={0.16 / Math.sqrt(mapCamera.zoom)}
                          fill="#0D162B"
                          stroke="rgba(100, 210, 255, 0.45)"
                          strokeWidth={0.03 / Math.sqrt(mapCamera.zoom)}
                        />
                        <SvgText
                          x={cx}
                          y={
                            cy +
                            radius * 1.25 +
                            0.37 / Math.sqrt(mapCamera.zoom)
                          }
                          fill="#F8FAFC"
                          fontSize={0.29 / Math.sqrt(mapCamera.zoom)}
                          fontWeight="700"
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

            {/* Controles Flutuantes Dark Glass (>= 48x48 dp) */}
            <View style={styles.mapControlsOverlay}>
              <Pressable
                onPress={zoomIn}
                style={({ pressed }) => [
                  styles.zoomControlButton,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Aumentar zoom no radar"
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
                accessibilityLabel="Diminuir zoom no radar"
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
                accessibilityLabel="Centralizar radar na Região Nordeste"
              >
                <Ionicons name="locate-outline" size={20} color="#64D2FF" />
              </Pressable>
            </View>

            {/* Barra de Legenda & Coordenadas no Rodapé do Radar */}
            <View style={styles.mapTelemetryBar}>
              <Text style={styles.mapTelemetryText}>
                Centro: {mapCamera.latitude.toFixed(2)}°,{' '}
                {mapCamera.longitude.toFixed(2)}° • Toque em um cluster para aproximar
              </Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: '#FFD60A' }]}
                  />
                  <Text style={styles.legendLabel}>Moderado</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: '#FF9F0A' }]}
                  />
                  <Text style={styles.legendLabel}>Alto</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: '#FF453A' }]}
                  />
                  <Text style={styles.legendLabel}>Crítico</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 3. GRÁFICO DE CURVA HORÁRIA COM GRADIENTE (ESTILO APP TEMPO iOS) */}
      <FrpOrbitalAreaChart spots={filteredSpots.length > 0 ? filteredSpots : spots} />

      {/* 4. BENTO WIDGETS AMBIENTAIS (ÍNDICE DE IGNIÇÃO + PRESSÃO POR BIOMA) */}
      <BentoEnvironmentalWidgets spots={filteredSpots.length > 0 ? filteredSpots : spots} />

      {/* 5. BARRAS DE AMPLITUDE TÉRMICA POR UF (ESTILO PREVISÃO DE 10 DIAS DO iOS) */}
      <StateThermalRangeBars
        allSpots={spots}
        selectedUF={selectedUF}
        onSelectUF={(uf) => selectUF(uf)}
      />

      {/* 6. INSPEÇÃO DETALHADA DO FOCO SELECIONADO */}
      <View style={styles.card}>
        <View style={styles.spotDetailHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              TELEMETRIA DE PRECISÃO • FOCO SELECIONADO NO RADAR
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
                  ? 'INPE BDQueimadas (Ciclo 10 min)'
                  : 'CENSIPAM Painel do Fogo (Ciclo 30 min)'}
              </Text>
            </View>

            <View style={styles.telemetryCell}>
              <Text style={styles.telemetryKey}>Satélite & Passagem</Text>
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
                {activeSpot.frpMW.toFixed(1)} MW • Confiança{' '}
                {activeSpot.confidencePercent}%
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
                {activeSpot.latitude.toFixed(4)}°,{' '}
                {activeSpot.longitude.toFixed(4)}° • IBGE {activeSpot.ibgeCode}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyStateText}>
            Não há focos registrados neste município no ciclo atual. Toque em
            &quot;Visão Geral NE&quot; para retornar ao panorama regional.
          </Text>
        )}
      </View>

      {/* 7. CARTÃO INSTITUCIONAL COMPLETO (IFPI CAMPUS FLORIANO • TURMA TDS-3 • PROF. RENNÊ SANTOS) */}
      <InstitutionalCreditsCard />
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
    paddingBottom: 34,
  },
  weatherHeroContainer: {
    backgroundColor: 'rgba(15, 24, 46, 0.72)',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  heroTopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10, 132, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  heroTopPillText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64D2FF',
    letterSpacing: 0.5,
  },
  heroLocationName: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginVertical: 4,
  },
  heroGiantNumber: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 70,
  },
  heroUnitCol: {
    justifyContent: 'center',
    gap: 3,
  },
  heroUnitTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9F0A',
    letterSpacing: 0.6,
  },
  heroUnitSub: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  heroSkeletonNum: {
    width: 140,
    height: 62,
    borderRadius: 14,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
    marginVertical: 8,
  },
  heroConditionText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFD60A',
    textAlign: 'center',
    marginTop: 2,
  },
  heroHighLowText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  heroActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchCityGlassBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 132, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  searchCityGlassBtnText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64D2FF',
  },
  resetFilterGlassBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 214, 10, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetFilterGlassText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD60A',
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
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(9, 15, 30, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentPillActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#64D2FF',
  },
  segmentPillText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  segmentPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mapGlassCard: {
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
    overflow: 'hidden',
    height: 440,
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(9, 15, 29, 0.55)',
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  mapZoomBadge: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#64D2FF',
  },
  sectionEyebrow: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  mapSkeletonContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#080F1E',
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
    backgroundColor: '#070D1B',
    position: 'relative',
  },
  mapControlsOverlay: {
    position: 'absolute',
    right: 14,
    top: 14,
    gap: 10,
  },
  zoomControlButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 24, 46, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetZoomButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 24, 46, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonSymbol: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 24,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 26,
  },
  mapTelemetryBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(9, 15, 29, 0.90)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
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
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  card: {
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderRadius: APPLE_CALM_THEME.radius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
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
    fontSize: 19,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
    marginTop: 4,
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
    backgroundColor: 'rgba(9, 14, 28, 0.55)',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
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
    color: '#64D2FF',
  },
  emptyStateText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    color: APPLE_CALM_THEME.colors.textSecondary,
    lineHeight: 20,
  },
});
