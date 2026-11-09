import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
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
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { APPLE_CALM_THEME, MapCameraState, useFireMonitor } from '../_layout';
import {
  FireSeverity,
  FireSpot,
  MapClusterItem,
  NORDESTE_STATES,
  NordesteUF,
  buildGoogleMapsSpotUrl,
  clusterFireSpots,
} from '../services/fireDataService';
import { IBGE_OFFICIAL_UF_MESH } from '../services/ibgeNordesteGeoMesh';
import {
  BentoEnvironmentalWidgets,
  FrpOrbitalAreaChart,
  InstitutionalCreditsCard,
  StateThermalRangeBars,
} from '../components/IosWeatherWidgets';

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

/**
 * Hook de interpolação fluida de câmera (60 FPS com Cubic Ease-Out)
 * Garante transições suaves de zoom e deslocamento no mapa vetorial IBGE.
 */
function useSmoothMapCamera(target: MapCameraState, durationMs = 420): MapCameraState {
  const [current, setCurrent] = useState<MapCameraState>(target);
  const currentRef = useRef<MapCameraState>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startCamera = { ...currentRef.current };
    const dLat = target.latitude - startCamera.latitude;
    const dLng = target.longitude - startCamera.longitude;
    const dZoom = target.zoom - startCamera.zoom;

    if (
      Math.abs(dLat) < 0.001 &&
      Math.abs(dLng) < 0.001 &&
      Math.abs(dZoom) < 0.005
    ) {
      setCurrent(target);
      currentRef.current = target;
      return;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Cubic Ease-Out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);

      const nextState: MapCameraState = {
        latitude: startCamera.latitude + dLat * eased,
        longitude: startCamera.longitude + dLng * eased,
        zoom: startCamera.zoom + dZoom * eased,
      };

      currentRef.current = nextState;
      setCurrent(nextState);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target.latitude, target.longitude, target.zoom, durationMs]);

  return current;
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

  // Câmera interpolada a 60 FPS para animações fluidas no radar
  const smoothCamera = useSmoothMapCamera(mapCamera, 420);

  // Estado local para destacar imediatamente o cluster/foco clicado com o nome da(s) cidade(s)
  const [clickedClusterId, setClickedClusterId] = useState<string | null>(null);

  const clusters = useMemo(
    () => clusterFireSpots(filteredSpots, mapCamera.zoom),
    [filteredSpots, mapCamera.zoom]
  );

  const viewBoxString = useMemo(() => {
    const baseSpanLng = 15.8 / smoothCamera.zoom;
    const baseSpanLat = 16.8 / smoothCamera.zoom;
    const minX = smoothCamera.longitude - baseSpanLng / 2;
    const minY = -smoothCamera.latitude - baseSpanLat / 2;
    return `${minX.toFixed(3)} ${minY.toFixed(3)} ${baseSpanLng.toFixed(3)} ${baseSpanLat.toFixed(3)}`;
  }, [smoothCamera]);

  const handleClusterOrSpotPress = (item: MapClusterItem) => {
    setClickedClusterId(item.id);
    selectSpotOnMap(item.spots[0]);

    if (item.isCluster && mapCamera.zoom < 2.6) {
      setMapCamera({
        latitude: item.latitude,
        longitude: item.longitude,
        zoom: Math.min(3.6, Number((mapCamera.zoom + 0.75).toFixed(2))),
      });
    } else {
      setMapCamera({
        latitude: item.latitude,
        longitude: item.longitude,
        zoom: Math.max(mapCamera.zoom, 2.2),
      });
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

    return { inpe, censipam, maxFrp, minFrp };
  }, [filteredSpots]);

  const heroLocationTitle = selectedMunicipality
    ? `${selectedMunicipality}, ${selectedUF}`
    : selectedUF === 'TODOS'
      ? 'Região Nordeste'
      : `${
          NORDESTE_STATES.find((s) => s.uf === selectedUF)?.name ?? selectedUF
        } (${selectedUF})`;

  // Ordena para que o cluster selecionado seja desenhado por último (sempre no topo do SVG)
  const orderedClusters = useMemo(() => {
    return [...clusters].sort((a, b) => {
      const aSelected =
        a.id === clickedClusterId ||
        (activeSpot ? a.spots.some((s) => s.id === activeSpot.id) : false);
      const bSelected =
        b.id === clickedClusterId ||
        (activeSpot ? b.spots.some((s) => s.id === activeSpot.id) : false);
      if (aSelected && !bSelected) return 1;
      if (!aSelected && bSelected) return -1;
      return 0;
    });
  }, [clusters, clickedClusterId, activeSpot]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. CARD DE MONITORAMENTO COMPACTO (ESTILO BARRA CLIMÁTICA iOS WEATHER) */}
      <View style={styles.compactHeroCard}>
        <View style={styles.compactHeroMainRow}>
          {/* Coluna Esquerda: Região e Condição Orbital */}
          <View style={styles.compactHeroLeft}>
            <View style={styles.heroTopPill}>
              <Ionicons name="radio-outline" size={12} color="#64D2FF" />
              <Text style={styles.heroTopPillText}>
                MONITORAMENTO ORBITAL • IFPI CAMPUS FLORIANO (TDS-3)
              </Text>
            </View>

            <Text style={styles.heroLocationName}>{heroLocationTitle}</Text>

            <Text style={styles.heroConditionText} numberOfLines={1}>
              {activeSpot
                ? `Alerta ${
                    activeSpot.severity === 'critico' ? 'Crítico' : 'Elevado'
                  } no Bioma ${activeSpot.biome} • Satélite ${activeSpot.satellite}`
                : 'Sem focos críticos no recorte selecionado'}
            </Text>
          </View>

          {/* Coluna Central: Contagem Compacta de Focos + Pico FRP */}
          {isLoading ? (
            <View style={styles.heroSkeletonNum} />
          ) : (
            <View style={styles.compactCountBox}>
              <Text style={styles.heroCompactNumber}>{filteredSpots.length}</Text>
              <View style={styles.heroUnitCol}>
                <Text style={styles.heroUnitTitle}>FOCOS ATIVOS</Text>
                <Text style={styles.heroUnitSub}>
                  Pico: {weatherHeroSummary.maxFrp.toFixed(1)} MW (Mín{' '}
                  {weatherHeroSummary.minFrp.toFixed(0)} MW)
                </Text>
              </View>
            </View>
          )}

          {/* Coluna Direita: Botões Rápidos */}
          <View style={styles.compactActionsCol}>
            <Pressable
              onPress={() => router.push('/(tabs)/consulta')}
              style={({ pressed }) => [
                styles.searchCityGlassBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ir para busca por cidade em até 3 cliques"
            >
              <Ionicons name="search-outline" size={15} color="#64D2FF" />
              <Text style={styles.searchCityGlassBtnText}>
                Filtrar Cidade (≤ 3 cliques)
              </Text>
            </Pressable>

            {selectedUF !== 'TODOS' || selectedMunicipality ? (
              <Pressable
                onPress={() => {
                  setClickedClusterId(null);
                  resetMapToNordeste();
                }}
                style={({ pressed }) => [
                  styles.resetFilterGlassBtn,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
              >
                <Ionicons name="refresh-outline" size={14} color="#FFD60A" />
                <Text style={styles.resetFilterGlassText}>Visão Geral NE</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Segmented Control Compacto das 9 UFs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentedScroll}
        >
          <Pressable
            onPress={() => {
              setClickedClusterId(null);
              selectUF('TODOS');
            }}
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
                onPress={() => {
                  setClickedClusterId(null);
                  selectUF(st.uf);
                }}
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

      {/* 2. RADAR CARTOGRÁFICO OFICIAL IBGE (MALHA OFICIAL + CIDADES NOS FOCOS + ANIMAÇÃO FLUIDA) */}
      <View style={styles.mapGlassCard}>
        <View style={styles.mapCardHeader}>
          <View style={styles.mapHeaderLeft}>
            <Ionicons name="analytics-outline" size={15} color="#64D2FF" />
            <Text style={styles.sectionEyebrow}>
              MALHA CARTOGRÁFICA OFICIAL IBGE • RADAR TERMAL ({clusters.length}{' '}
              AGRUPAMENTOS)
            </Text>
          </View>
          <Text style={styles.mapZoomBadge}>
            Zoom {smoothCamera.zoom.toFixed(1)}x • Toque em um foco para ver a cidade
          </Text>
        </View>

        {isLoading ? (
          <View
            style={styles.mapSkeletonContainer}
            accessibilityLabel="Carregando radar preditivo sem alteração de layout"
          >
            <View style={styles.skeletonBadge} />
            <Text style={styles.skeletonStatusText}>
              Carregando malha territorial oficial do IBGE (CLS 0.000)...
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
                {/* Gradiente Topográfico / Satelital dos Estados do Nordeste */}
                <LinearGradient id="ibgeLandGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#142642" />
                  <Stop offset="55%" stopColor="#102039" />
                  <Stop offset="100%" stopColor="#0C172B" />
                </LinearGradient>
                <LinearGradient id="ibgeFocusedLandGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#1E3F73" />
                  <Stop offset="100%" stopColor="#132A52" />
                </LinearGradient>
                <RadialGradient id="heatHaloCritico" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FF453A" stopOpacity="0.62" />
                  <Stop offset="50%" stopColor="#FF9F0A" stopOpacity="0.26" />
                  <Stop offset="100%" stopColor="#FF453A" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="heatHaloAlto" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FF9F0A" stopOpacity="0.52" />
                  <Stop offset="100%" stopColor="#FFD60A" stopOpacity="0" />
                </RadialGradient>
              </Defs>

              {/* Grade geográfica oficial SIRGAS 2000 / WGS84 */}
              {[-46, -43, -40, -37].map((lng) => (
                <Line
                  key={`meridian-${lng}`}
                  x1={lng}
                  y1={1.0}
                  x2={lng}
                  y2={18.8}
                  stroke="rgba(100, 210, 255, 0.09)"
                  strokeWidth={0.035 / smoothCamera.zoom}
                  strokeDasharray="0.16,0.16"
                />
              ))}
              {[4, 8, 12, 16].map((latInv) => (
                <Line
                  key={`parallel-${latInv}`}
                  x1={-48.8}
                  y1={latInv}
                  x2={-34.0}
                  y2={latInv}
                  stroke="rgba(100, 210, 255, 0.09)"
                  strokeWidth={0.035 / smoothCamera.zoom}
                  strokeDasharray="0.16,0.16"
                />
              ))}

              {/* MALHA CARTOGRÁFICA REAL DO IBGE (9 ESTADOS DO NORDESTE) */}
              <G transform="scale(1, -1)">
                {/* Camada 1: Brilho Costeiro / Plataforma Continental */}
                {NORDESTE_STATES.map((st) => {
                  const mesh = IBGE_OFFICIAL_UF_MESH[st.uf];
                  return (
                    <Path
                      key={`coast-glow-${st.uf}`}
                      d={mesh.path}
                      fill="none"
                      stroke="rgba(56, 189, 248, 0.16)"
                      strokeWidth={0.18 / Math.sqrt(smoothCamera.zoom)}
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* Camada 2: Preenchimento Topográfico e Divisas Estaduais do IBGE */}
                {NORDESTE_STATES.map((st) => {
                  const mesh = IBGE_OFFICIAL_UF_MESH[st.uf];
                  const isFocused = selectedUF === st.uf;
                  return (
                    <Path
                      key={st.uf}
                      d={mesh.path}
                      fill={
                        isFocused
                          ? 'url(#ibgeFocusedLandGrad)'
                          : 'url(#ibgeLandGrad)'
                      }
                      stroke={
                        isFocused ? '#64D2FF' : 'rgba(148, 163, 184, 0.48)'
                      }
                      strokeWidth={
                        isFocused
                          ? 0.11 / Math.sqrt(smoothCamera.zoom)
                          : 0.055 / Math.sqrt(smoothCamera.zoom)
                      }
                      strokeLinejoin="round"
                      onPress={() => selectUF(st.uf)}
                    />
                  );
                })}
              </G>

              {/* Siglas das UFs posicionadas sobre os centróides do IBGE */}
              {NORDESTE_STATES.map((st) => {
                const mesh = IBGE_OFFICIAL_UF_MESH[st.uf];
                const isFocused = selectedUF === st.uf;
                return (
                  <SvgText
                    key={`label-${st.uf}`}
                    x={mesh.labelLng}
                    y={-mesh.labelLat}
                    fill={isFocused ? '#64D2FF' : 'rgba(203, 213, 225, 0.58)'}
                    fontSize={0.48 / Math.sqrt(smoothCamera.zoom)}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {st.uf}
                  </SvgText>
                );
              })}

              {/* FOCOS & CLUSTERS COM EXIBIÇÃO DO NOME DA CIDADE AO CLICAR */}
              {orderedClusters.map((item) => {
                const cx = item.longitude;
                const cy = -item.latitude;
                const sevColor = getSeverityColors(item.maxSeverity).bg;
                const isSelectedSpot =
                  item.id === clickedClusterId ||
                  Boolean(
                    activeSpot &&
                      item.spots.some((s) => s.id === activeSpot.id)
                  );
                const radius = item.isCluster
                  ? 0.44 / Math.sqrt(smoothCamera.zoom)
                  : 0.33 / Math.sqrt(smoothCamera.zoom);

                // Lista única de cidades dentro do foco/cluster clicado
                const uniqueCities = Array.from(
                  new Set(item.spots.map((s) => s.municipality))
                );
                const cityCalloutTitle =
                  uniqueCities.length > 1
                    ? `${uniqueCities[0]} +${uniqueCities.length - 1} (${item.uf})`
                    : `${item.primaryMunicipality} (${item.uf})`;
                const cityCalloutSub = `${item.avgFrpMW.toFixed(0)} MW • ${item.spots[0].biome}`;

                const showCityLabel =
                  isSelectedSpot || smoothCamera.zoom >= 1.95;

                const boxW =
                  (isSelectedSpot ? 3.55 : 2.65) /
                  Math.sqrt(smoothCamera.zoom);
                const boxH =
                  (isSelectedSpot ? 0.84 : 0.48) /
                  Math.sqrt(smoothCamera.zoom);
                const boxX = cx - boxW / 2;
                const boxY = cy - radius * 1.45 - boxH;

                return (
                  <G
                    key={item.id}
                    onPress={() => handleClusterOrSpotPress(item)}
                  >
                    {/* Halo térmico suave */}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={radius * (isSelectedSpot ? 3.1 : 2.4)}
                      fill={
                        item.maxSeverity === 'critico'
                          ? 'url(#heatHaloCritico)'
                          : 'url(#heatHaloAlto)'
                      }
                    />

                    {/* Anéis de Radar Pulsantes no foco clicado */}
                    {isSelectedSpot ? (
                      <G>
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={radius * 1.95}
                          fill="none"
                          stroke="#64D2FF"
                          strokeOpacity={0.55}
                          strokeWidth={0.05 / Math.sqrt(smoothCamera.zoom)}
                          strokeDasharray="0.12,0.08"
                        />
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={radius * 1.42}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth={0.075 / Math.sqrt(smoothCamera.zoom)}
                        />
                      </G>
                    ) : null}

                    {/* Marcador circular principal */}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={sevColor}
                      stroke="#080E1E"
                      strokeWidth={0.08 / Math.sqrt(smoothCamera.zoom)}
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

                    {/* CALLOUT COM O NOME DA CIDADE (Sempre visível no foco clicado ou em zoom >= 1.95) */}
                    {showCityLabel ? (
                      <G>
                        {/* Seta apontando para o foco */}
                        <Polygon
                          points={`${cx - 0.14 / Math.sqrt(smoothCamera.zoom)},${boxY + boxH} ${cx + 0.14 / Math.sqrt(smoothCamera.zoom)},${boxY + boxH} ${cx},${cy - radius * 1.08}`}
                          fill={isSelectedSpot ? '#0A1936' : '#0D162B'}
                        />
                        <Rect
                          x={boxX}
                          y={boxY}
                          width={boxW}
                          height={boxH}
                          rx={0.16 / Math.sqrt(smoothCamera.zoom)}
                          fill={isSelectedSpot ? '#0A1936' : '#0D162B'}
                          stroke={
                            isSelectedSpot
                              ? '#64D2FF'
                              : 'rgba(255, 255, 255, 0.28)'
                          }
                          strokeWidth={
                            (isSelectedSpot ? 0.055 : 0.03) /
                            Math.sqrt(smoothCamera.zoom)
                          }
                        />
                        <SvgText
                          x={cx}
                          y={
                            boxY +
                            (isSelectedSpot ? 0.36 : 0.33) /
                              Math.sqrt(smoothCamera.zoom)
                          }
                          fill="#FFFFFF"
                          fontSize={
                            (isSelectedSpot ? 0.31 : 0.26) /
                            Math.sqrt(smoothCamera.zoom)
                          }
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {cityCalloutTitle}
                        </SvgText>
                        {isSelectedSpot ? (
                          <SvgText
                            x={cx}
                            y={boxY + 0.68 / Math.sqrt(smoothCamera.zoom)}
                            fill="#FFD60A"
                            fontSize={0.23 / Math.sqrt(smoothCamera.zoom)}
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            {cityCalloutSub}
                          </SvgText>
                        ) : null}
                      </G>
                    ) : null}
                  </G>
                );
              })}
            </Svg>

            {/* PÍLULA FLUTUANTE DA CIDADE CLICADA NO TOPO ESQUERDO DO RADAR */}
            {activeSpot ? (
              <View style={styles.selectedCityFloatingCard}>
                <View style={styles.selectedCityTopRow}>
                  <View style={styles.selectedCityBadgeDot} />
                  <Text style={styles.selectedCityNameText}>
                    {activeSpot.municipality} ({activeSpot.uf})
                  </Text>
                  <Text style={styles.selectedCityFrpText}>
                    • {activeSpot.frpMW.toFixed(1)} MW ({activeSpot.biome})
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      buildGoogleMapsSpotUrl(
                        activeSpot.latitude,
                        activeSpot.longitude,
                        15
                      )
                    )
                  }
                  style={({ pressed }) => [
                    styles.selectedCityMapsBtn,
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityRole="link"
                >
                  <Ionicons name="location" size={12} color="#30D158" />
                  <Text style={styles.selectedCityMapsBtnText}>
                    Abrir {activeSpot.municipality} no Google Maps ↗
                  </Text>
                </Pressable>
              </View>
            ) : null}

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
                onPress={() => {
                  setClickedClusterId(null);
                  resetMapToNordeste();
                }}
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
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    buildGoogleMapsSpotUrl(
                      activeSpot ? activeSpot.latitude : mapCamera.latitude,
                      activeSpot ? activeSpot.longitude : mapCamera.longitude,
                      activeSpot ? 14 : 7
                    )
                  )
                }
                style={({ pressed }) => [
                  styles.radarCoordLinkBtn,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="link"
                accessibilityLabel="Abrir coordenadas atuais no Google Maps"
              >
                <Ionicons name="location-outline" size={14} color="#64D2FF" />
                <Text style={styles.mapTelemetryText}>
                  {activeSpot
                    ? `${activeSpot.municipality} (${activeSpot.uf}): ${activeSpot.latitude.toFixed(3)}°, ${activeSpot.longitude.toFixed(3)}° (Google Maps ↗)`
                    : `Centro: ${mapCamera.latitude.toFixed(2)}°, ${mapCamera.longitude.toFixed(2)}° (Google Maps ↗)`}
                </Text>
              </Pressable>
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
      <FrpOrbitalAreaChart
        spots={filteredSpots.length > 0 ? filteredSpots : spots}
      />

      {/* 4. BENTO WIDGETS AMBIENTAIS (ÍNDICE DE IGNIÇÃO + PRESSÃO POR BIOMA) */}
      <BentoEnvironmentalWidgets
        spots={filteredSpots.length > 0 ? filteredSpots : spots}
      />

      {/* 5. BARRAS DE AMPLITUDE TÉRMICA POR UF (ESTILO PREVISÃO DE 10 DIAS DO iOS) */}
      <StateThermalRangeBars
        allSpots={spots}
        selectedUF={selectedUF}
        onSelectUF={(uf) => {
          setClickedClusterId(null);
          selectUF(uf);
        }}
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
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    buildGoogleMapsSpotUrl(
                      activeSpot.latitude,
                      activeSpot.longitude,
                      15
                    )
                  )
                }
                style={({ pressed }) => [
                  styles.googleMapsCoordLink,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="link"
                accessibilityLabel={`Abrir foco de ${activeSpot.municipality} nas coordenadas ${activeSpot.latitude.toFixed(4)}, ${activeSpot.longitude.toFixed(4)} no Google Maps`}
              >
                <Text style={styles.telemetryValueMonoUnderline}>
                  {activeSpot.latitude.toFixed(4)}°,{' '}
                  {activeSpot.longitude.toFixed(4)}° • IBGE{' '}
                  {activeSpot.ibgeCode}
                </Text>
                <View style={styles.gmapsBadge}>
                  <Ionicons
                    name="navigate-circle-outline"
                    size={15}
                    color="#30D158"
                  />
                  <Text style={styles.gmapsBadgeText}>
                    Consultar Foco no Google Maps ↗
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyStateText}>
            Não há focos registrados neste município no ciclo atual. Toque em
            &quot;Visão Geral NE&quot; para retornar ao panorama regional.
          </Text>
        )}
      </View>

      {/* 7. RODAPÉ INSTITUCIONAL COMPLETO (IFPI CAMPUS FLORIANO • TDS-3 • PROF. RENNÊ SANTOS @oxe.renne + FONTES) */}
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
    padding: 14,
    gap: 14,
    paddingBottom: 34,
  },
  compactHeroCard: {
    backgroundColor: 'rgba(15, 24, 46, 0.76)',
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    gap: 10,
  },
  compactHeroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  compactHeroLeft: {
    flex: 1,
    minWidth: 220,
    gap: 2,
  },
  heroTopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.28)',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 2,
  },
  heroTopPillText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64D2FF',
    letterSpacing: 0.4,
  },
  heroLocationName: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 21,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.4,
  },
  heroConditionText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD60A',
  },
  compactCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(8, 13, 26, 0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroCompactNumber: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 38,
  },
  heroUnitCol: {
    justifyContent: 'center',
    gap: 1,
  },
  heroUnitTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FF9F0A',
    letterSpacing: 0.5,
  },
  heroUnitSub: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  heroSkeletonNum: {
    width: 120,
    height: 44,
    borderRadius: 12,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
  },
  compactActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  searchCityGlassBtn: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 132, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchCityGlassBtnText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64D2FF',
  },
  resetFilterGlassBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 214, 10, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resetFilterGlassText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD60A',
  },
  btnPressed: {
    opacity: 0.75,
  },
  segmentedScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 2,
  },
  segmentPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(9, 15, 30, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.11)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentPillActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#64D2FF',
  },
  segmentPillText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
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
    height: 465,
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(9, 15, 29, 0.65)',
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
    fontWeight: '600',
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
    backgroundColor: '#060C1A',
    position: 'relative',
  },
  selectedCityFloatingCard: {
    position: 'absolute',
    left: 14,
    top: 14,
    backgroundColor: 'rgba(9, 16, 32, 0.92)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.42)',
    gap: 5,
    maxWidth: 320,
  },
  selectedCityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedCityBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF453A',
  },
  selectedCityNameText: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectedCityFrpText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFD60A',
  },
  selectedCityMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.38)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  selectedCityMapsBtnText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 11,
    fontWeight: '700',
    color: '#30D158',
  },
  mapControlsOverlay: {
    position: 'absolute',
    right: 14,
    top: 14,
    gap: 10,
  },
  zoomControlButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 24, 46, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetZoomButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 24, 46, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonSymbol: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 22,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 24,
  },
  mapTelemetryBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(9, 15, 29, 0.92)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    color: '#64D2FF',
    textDecorationLine: 'underline',
  },
  radarCoordLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
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
  googleMapsCoordLink: {
    gap: 7,
    marginTop: 2,
  },
  telemetryValueMonoUnderline: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: '#64D2FF',
    textDecorationLine: 'underline',
  },
  gmapsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.38)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  gmapsBadgeText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#30D158',
  },
  emptyStateText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    color: APPLE_CALM_THEME.colors.textSecondary,
    lineHeight: 20,
  },
});
