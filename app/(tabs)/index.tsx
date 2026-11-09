import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
  buildGoogleMapsSpotUrl,
  clusterFireSpots,
} from '../services/fireDataService';
import { IBGE_OFFICIAL_UF_MESH } from '../services/ibgeNordesteGeoMesh';
import {
  AppLogoEmblem,
  BentoEnvironmentalWidgets,
  FrpOrbitalAreaChart,
  InstitutionalCreditsCard,
  StateThermalRangeBars,
} from '../components/IosWeatherWidgets';
import {
  DURATION_BASE,
  RISK_LEVELS,
  estimateRegionalClimate,
  getAnimationDuration,
  getRiskMetaFromSeverity,
} from '../theme/tokens';

function getSeverityColors(severity: FireSeverity) {
  const meta = getRiskMetaFromSeverity(severity, 1);
  return {
    bg: meta.color,
    soft: meta.bgSoft,
    label: meta.label,
    icon: meta.icon,
  };
}

/**
 * Hook de interpolação suave de câmera (150–300 ms com Cubic Ease-Out)
 * Respeita integralmente o modo "Reduzir animações" (durationMs = 0).
 */
function useSmoothMapCamera(
  target: MapCameraState,
  durationMs = DURATION_BASE
): MapCameraState {
  const [current, setCurrent] = useState<MapCameraState>(target);
  const currentRef = useRef<MapCameraState>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (durationMs <= 0) {
      setCurrent(target);
      currentRef.current = target;
      return;
    }

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
  const { width: winWidth } = useWindowDimensions();
  const isMobile = winWidth < 640;
  const isSmallPhone = winWidth < 390;

  const {
    spots,
    filteredSpots,
    isLoading,
    reduceMotion,
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

  // Câmera interpolada em 250 ms (DURATION_BASE) ou instantânea se reduceMotion = true
  const smoothCamera = useSmoothMapCamera(
    mapCamera,
    getAnimationDuration(DURATION_BASE, reduceMotion)
  );

  // Estado local para destacar o foco clicado e controlar divulgação progressiva dos detalhes técnicos
  const [clickedClusterId, setClickedClusterId] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] =
    useState<boolean>(false);

  // Clima e Nível de Risco Regional (Temperatura °C + Risco com Cor + Ícone + Texto)
  const regionalClimate = useMemo(
    () => estimateRegionalClimate(filteredSpots, selectedUF),
    [filteredSpots, selectedUF]
  );

  // Animação única de entrada do Hero e preenchimento da barra de risco (250 ms, sem loops)
  const heroFadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const riskBarWidthAnim = useRef(
    new Animated.Value(reduceMotion ? regionalClimate.riskPercent : 0)
  ).current;

  useEffect(() => {
    const dur = getAnimationDuration(DURATION_BASE, reduceMotion);
    if (dur === 0) {
      heroFadeAnim.setValue(1);
      riskBarWidthAnim.setValue(regionalClimate.riskPercent);
      return;
    }
    Animated.parallel([
      Animated.timing(heroFadeAnim, {
        toValue: 1,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(riskBarWidthAnim, {
        toValue: regionalClimate.riskPercent,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [heroFadeAnim, riskBarWidthAnim, regionalClimate.riskPercent, reduceMotion]);

  const clusters = useMemo(
    () => clusterFireSpots(filteredSpots, mapCamera.zoom),
    [filteredSpots, mapCamera.zoom]
  );

  // Enquadramento amplo da malha oficial IBGE (MA até o extremo sul da BA) com folga superior e inferior
  const viewBoxString = useMemo(() => {
    const baseSpanLng = 18.2 / smoothCamera.zoom;
    const baseSpanLat = 20.6 / smoothCamera.zoom;
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
      {/* 1. CARD DE RESUMO PRINCIPAL (HERO — RECEITAS 1 E 2 DA SKILL RADAR-FOGO-UI) */}
      <Animated.View
        style={[styles.compactHeroCard, { opacity: heroFadeAnim }]}
      >
        <View style={styles.compactHeroMainRow}>
          {/* Coluna Esquerda: Emblema Vetorial 3D + Cidade/Região + Nível de Risco (Cor + Ícone + Texto) */}
          <View style={styles.compactHeroBrandAndRegion}>
            <AppLogoEmblem size={isMobile ? 48 : 54} />
            <View style={styles.compactHeroLeft}>
              <View style={styles.heroTopPill}>
                <Ionicons name="flame" size={12} color="#FF9500" />
                <Text style={styles.heroTopPillBrand}>RADAR FOGO</Text>
                <Text style={styles.heroTopPillSep}>•</Text>
                <Text style={styles.heroTopPillText}>RESUMO REGIONAL</Text>
              </View>

              <Text
                style={[
                  styles.heroLocationName,
                  isMobile && { fontSize: 19 },
                ]}
              >
                {heroLocationTitle}
              </Text>

              {/* Selo de Risco Acessível: SEMPRE Cor + Ícone + Rótulo Textual */}
              <View
                style={[
                  styles.heroRiskBadgeRow,
                  {
                    backgroundColor: regionalClimate.riskMeta.bgSoft,
                    borderColor: regionalClimate.riskMeta.borderColor,
                  },
                ]}
              >
                <Ionicons
                  name={regionalClimate.riskMeta.icon}
                  size={15}
                  color={regionalClimate.riskMeta.color}
                />
                <Text
                  style={[
                    styles.heroRiskBadgeTitle,
                    { color: regionalClimate.riskMeta.color },
                  ]}
                >
                  {regionalClimate.riskMeta.label}
                </Text>
                <Text style={styles.heroRiskBadgeDesc} numberOfLines={1}>
                  • {regionalClimate.riskMeta.description}
                </Text>
              </View>
            </View>
          </View>

          {/* Coluna Central: Temperatura Estimada (°C) + Contagem de Focos */}
          {isLoading ? (
            <View style={styles.heroSkeletonNum} />
          ) : (
            <View style={styles.heroMetricsPair}>
              {/* Bloco de Temperatura estilo App Tempo */}
              <View style={styles.compactTempBox}>
                <View style={styles.tempTitleRow}>
                  <Ionicons
                    name="thermometer-outline"
                    size={16}
                    color={regionalClimate.riskMeta.color}
                  />
                  <Text style={styles.heroTempNumber}>
                    {regionalClimate.tempC}°C
                  </Text>
                </View>
                <Text style={styles.heroTempSub}>
                  Máx {regionalClimate.maxTempC}° • Mín {regionalClimate.minTempC}° • Umid.{' '}
                  {regionalClimate.humidityPct}%
                </Text>
              </View>

              {/* Bloco de Focos Ativos */}
              <View style={styles.compactCountBox}>
                <Text
                  style={[
                    styles.heroCompactNumber,
                    isMobile && { fontSize: 26, lineHeight: 30 },
                  ]}
                >
                  {filteredSpots.length}
                </Text>
                <View style={styles.heroUnitCol}>
                  <Text style={styles.heroUnitTitle}>FOCOS ATIVOS</Text>
                  <Text style={styles.heroUnitSub}>
                    Pico: {weatherHeroSummary.maxFrp.toFixed(0)} MW
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Coluna Direita: Botões Rápidos (Alvos >= 44x44 px) */}
          <View style={styles.compactActionsCol}>
            <Pressable
              onPress={() => router.push('/(tabs)/consulta')}
              style={({ pressed }) => [
                styles.searchCityGlassBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Buscar cidade em até 3 toques"
            >
              <Ionicons name="search-outline" size={16} color="#64D2FF" />
              <Text style={styles.searchCityGlassBtnText}>
                Buscar Cidade
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
                accessibilityLabel="Voltar para visão geral do Nordeste"
              >
                <Ionicons name="refresh-outline" size={16} color="#FFD60A" />
                <Text style={styles.resetFilterGlassText}>Ver Nordeste</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* RECEITA 2: BARRA DE NÍVEL DE RISCO ANIMADA UMA ÚNICA VEZ (250 ms) COM VALOR EM TEXTO */}
        <View style={styles.heroRiskBarSection}>
          <View style={styles.heroRiskBarHeader}>
            <Text style={styles.heroRiskBarLabel}>
              Índice de risco térmico na região
            </Text>
            <Text
              style={[
                styles.heroRiskBarValue,
                { color: regionalClimate.riskMeta.color },
              ]}
            >
              {regionalClimate.riskPercent}% ({regionalClimate.riskMeta.shortLabel})
            </Text>
          </View>
          <View style={styles.heroRiskBarTrack}>
            <Animated.View
              style={[
                styles.heroRiskBarFill,
                {
                  backgroundColor: regionalClimate.riskMeta.color,
                  width: riskBarWidthAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Segmented Control das 9 UFs (Alvos >= 44x44 px) */}
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
            style={({ pressed }) => [
              styles.segmentPill,
              selectedUF === 'TODOS' && styles.segmentPillActive,
              pressed && styles.btnPressed,
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
                style={({ pressed }) => [
                  styles.segmentPill,
                  isSelected && styles.segmentPillActive,
                  pressed && styles.btnPressed,
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
      </Animated.View>

      {/* 2. RADAR CARTOGRÁFICO OFICIAL IBGE (SEM SOBREPOSIÇÃO DE RODAPÉ E ADAPTADO PARA CELULAR iOS/ANDROID) */}
      <View style={styles.mapGlassCard}>
        <View style={styles.mapCardHeader}>
          <View style={styles.mapHeaderLeft}>
            <Ionicons name="analytics-outline" size={15} color="#64D2FF" />
            <Text style={styles.sectionEyebrow} numberOfLines={1}>
              {isMobile
                ? `MALHA OFICIAL IBGE • RADAR (${clusters.length} FOCOS)`
                : `MALHA CARTOGRÁFICA OFICIAL IBGE • RADAR TERMAL (${clusters.length} AGRUPAMENTOS)`}
            </Text>
          </View>
          <Text style={styles.mapZoomBadge}>
            Zoom {smoothCamera.zoom.toFixed(1)}x
          </Text>
        </View>

        {/* FAIXA DA CIDADE SELECIONADA (FORA DO CANVAS DO MAPA — ZERO SOBREPOSIÇÃO) */}
        {activeSpot ? (
          <View style={styles.selectedCityTopStrip}>
            <View style={styles.selectedCityTopRow}>
              <View style={styles.selectedCityBadgeDot} />
              <Text style={styles.selectedCityNameText}>
                {activeSpot.municipality} ({activeSpot.uf})
              </Text>
              <Text style={styles.selectedCityFrpText}>
                • {activeSpot.frpMW.toFixed(1)} MW • {activeSpot.biome}
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
                {isMobile
                  ? 'Google Maps ↗'
                  : `Abrir ${activeSpot.municipality} no Google Maps ↗`}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading ? (
          <View
            style={[
              styles.mapSkeletonContainer,
              { height: isSmallPhone ? 250 : isMobile ? 275 : 325 },
            ]}
            accessibilityLabel="Carregando radar preditivo sem alteração de layout"
          >
            <View style={styles.skeletonBadge} />
            <Text style={styles.skeletonStatusText}>
              Sincronizando malha oficial do IBGE e focos de satélite...
            </Text>
            <View style={styles.skeletonMapGrid} />
          </View>
        ) : (
          <View
            style={[
              styles.mapViewport,
              { height: isSmallPhone ? 250 : isMobile ? 275 : 325 },
            ]}
          >
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

            {/* Controles de Zoom Dark Glass (>= 44x44 px em todas as telas) */}
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
                onPress={() => {
                  setClickedClusterId(null);
                  resetMapToNordeste();
                }}
                style={({ pressed }) => [
                  styles.resetZoomButton,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Centralizar mapa na Região Nordeste"
              >
                <Ionicons name="locate-outline" size={20} color="#64D2FF" />
              </Pressable>
            </View>
          </View>
        )}

        {/* BARRA DE RODAPÉ DO RADAR (SEPARADA DO MAPA — LEGENDA COM COR + ÍCONE + TEXTO) */}
        <View style={styles.mapTelemetryFooter}>
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
            accessibilityLabel="Abrir localização selecionada no Google Maps"
          >
            <Ionicons name="location-outline" size={16} color="#64D2FF" />
            <Text style={styles.mapTelemetryText} numberOfLines={1}>
              {activeSpot
                ? `${activeSpot.municipality} (${activeSpot.uf}): ${activeSpot.latitude.toFixed(3)}°, ${activeSpot.longitude.toFixed(3)}° (Google Maps ↗)`
                : `Centro: ${mapCamera.latitude.toFixed(2)}°, ${mapCamera.longitude.toFixed(2)}° (Google Maps ↗)`}
            </Text>
          </Pressable>

          {/* Legenda Acessível: Cor + Ícone + Rótulo Textual (4 níveis de risco) */}
          <View style={styles.legendRow}>
            {(
              [
                RISK_LEVELS.baixo,
                RISK_LEVELS.medio,
                RISK_LEVELS.alto,
                RISK_LEVELS.critico,
              ] as const
            ).map((lvl) => (
              <View key={lvl.key} style={styles.legendItem}>
                <Ionicons name={lvl.icon} size={13} color={lvl.color} />
                <Text style={styles.legendLabel}>{lvl.shortLabel}</Text>
              </View>
            ))}
          </View>
        </View>
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

      {/* 6. INSPEÇÃO DO FOCO SELECIONADO (COM DIVULGAÇÃO PROGRESSIVA PARA TDAH/TEA) */}
      <View style={styles.card}>
        <View style={styles.spotDetailHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionEyebrow}>
              FOCO SELECIONADO NO MAPA • RESUMO E DETALHES
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
              <Ionicons
                name={getSeverityColors(activeSpot.severity).icon}
                size={15}
                color={getSeverityColors(activeSpot.severity).bg}
              />
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
          <View style={styles.progressiveSpotContainer}>
            {/* Resumo Simples Visível Primeiro */}
            <View style={styles.spotSimpleSummaryRow}>
              <Text style={styles.spotSimpleSummaryText}>
                Bioma <Text style={styles.spotBold}>{activeSpot.biome}</Text> •{' '}
                Potência de <Text style={styles.spotBold}>{activeSpot.frpMW.toFixed(1)} MW</Text>{' '}
                • {activeSpot.daysWithoutRain} dias sem chuva
              </Text>

              <View style={styles.spotPrimaryActionsRow}>
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
                    styles.gmapsBadge,
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityRole="link"
                  accessibilityLabel={`Abrir localização de ${activeSpot.municipality} no Google Maps`}
                >
                  <Ionicons
                    name="navigate-circle-outline"
                    size={18}
                    color="#30D158"
                  />
                  <Text style={styles.gmapsBadgeText}>
                    Ver Foco no Google Maps ↗
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowTechnicalDetails((prev) => !prev)}
                  style={({ pressed }) => [
                    styles.expandDetailsBtn,
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showTechnicalDetails }}
                  accessibilityLabel={
                    showTechnicalDetails
                      ? 'Ocultar detalhes técnicos do satélite'
                      : 'Ver detalhes técnicos do satélite'
                  }
                >
                  <Ionicons
                    name={
                      showTechnicalDetails
                        ? 'chevron-up-circle-outline'
                        : 'chevron-down-circle-outline'
                    }
                    size={18}
                    color="#64D2FF"
                  />
                  <Text style={styles.expandDetailsBtnText}>
                    {showTechnicalDetails
                      ? 'Ocultar ficha técnica'
                      : 'Ver ficha técnica completa'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Detalhes Técnicos Expansíveis ao Toque (Divulgação Progressiva) */}
            {showTechnicalDetails ? (
              <View style={styles.telemetryTable}>
                <View style={styles.telemetryCell}>
                  <Text style={styles.telemetryKey}>Fonte Oficial & Ciclo</Text>
                  <Text style={styles.telemetryValue}>
                    {activeSpot.source === 'INPE_BDQUEIMADAS'
                      ? 'INPE BDQueimadas (10 min)'
                      : 'CENSIPAM Painel do Fogo (30 min)'}
                  </Text>
                </View>

                <View style={styles.telemetryCell}>
                  <Text style={styles.telemetryKey}>Satélite & Passagem</Text>
                  <Text style={styles.telemetryValueMono}>
                    {activeSpot.satellite} • há {activeSpot.minutesAgo} min
                  </Text>
                </View>

                <View style={styles.telemetryCell}>
                  <Text style={styles.telemetryKey}>Potência Radiativa (FRP)</Text>
                  <Text style={styles.telemetryValueMono}>
                    {activeSpot.frpMW.toFixed(1)} MW • Confiança{' '}
                    {activeSpot.confidencePercent}%
                  </Text>
                </View>

                <View style={styles.telemetryCell}>
                  <Text style={styles.telemetryKey}>Coordenadas & Código IBGE</Text>
                  <Text style={styles.telemetryValueMono}>
                    {activeSpot.latitude.toFixed(4)}°,{' '}
                    {activeSpot.longitude.toFixed(4)}° • IBGE{' '}
                    {activeSpot.ibgeCode}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.calmEmptyBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color="#30D158"
            />
            <Text style={styles.emptyStateText}>
              Nenhum foco registrado neste recorte no ciclo atual.
            </Text>
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
              <Ionicons name="refresh-outline" size={16} color="#FFD60A" />
              <Text style={styles.resetFilterGlassText}>
                Voltar para Visão Nordeste
              </Text>
            </Pressable>
          </View>
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
  compactHeroBrandAndRegion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 220,
  },
  compactHeroLeft: {
    flex: 1,
    gap: 2,
  },
  heroTopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(255, 149, 0, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.36)',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 2,
  },
  heroTopPillBrand: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFD60A',
    letterSpacing: 0.5,
  },
  heroTopPillSep: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  heroTopPillText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64D2FF',
    letterSpacing: 0.3,
  },
  heroLocationName: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 21,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.4,
  },
  heroRiskBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  heroRiskBadgeTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 13,
    fontWeight: '800',
  },
  heroRiskBadgeDesc: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    color: '#CBD5E1',
  },
  heroMetricsPair: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactTempBox: {
    backgroundColor: 'rgba(8, 13, 26, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 2,
  },
  tempTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroTempNumber: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroTempSub: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    color: '#CBD5E1',
  },
  heroRiskBarSection: {
    gap: 5,
    paddingTop: 2,
  },
  heroRiskBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroRiskBarLabel: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  heroRiskBarValue: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  heroRiskBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  heroRiskBarFill: {
    height: '100%',
    borderRadius: 4,
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
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 36,
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
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchCityGlassBtnText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: '#64D2FF',
  },
  resetFilterGlassBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
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
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  segmentedScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  segmentPill: {
    minHeight: 44,
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
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(9, 15, 29, 0.72)',
    gap: 8,
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  mapZoomBadge: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: '#64D2FF',
  },
  sectionEyebrow: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 10.5,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textMuted,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  mapSkeletonContainer: {
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
    height: 200,
    borderRadius: 14,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
  },
  mapViewport: {
    width: '100%',
    backgroundColor: '#060C1A',
    position: 'relative',
  },
  selectedCityTopStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(11, 22, 44, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 210, 255, 0.22)',
  },
  selectedCityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flexShrink: 1,
  },
  selectedCityBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF453A',
  },
  selectedCityNameText: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectedCityFrpText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD60A',
  },
  selectedCityMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.38)',
    paddingHorizontal: 9,
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
    right: 12,
    top: 12,
    gap: 8,
  },
  zoomControlButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 24, 46, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetZoomButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 24, 46, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonSymbol: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 22,
  },
  mapTelemetryFooter: {
    backgroundColor: 'rgba(9, 15, 29, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.11)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapTelemetryText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11.5,
    color: '#64D2FF',
    textDecorationLine: 'underline',
    flexShrink: 1,
  },
  radarCoordLinkBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    flexShrink: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLabel: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textSecondary,
  },
  card: {
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderRadius: 20,
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
    marginBottom: 12,
  },
  spotDetailTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
    marginTop: 4,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  severityBadgeText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    fontWeight: '700',
  },
  progressiveSpotContainer: {
    gap: 12,
  },
  spotSimpleSummaryRow: {
    gap: 12,
  },
  spotSimpleSummaryText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: '#CBD5E1',
  },
  spotBold: {
    fontWeight: '700',
    color: '#F8FAFC',
  },
  spotPrimaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  expandDetailsBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandDetailsBtnText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: '#64D2FF',
  },
  calmEmptyBox: {
    paddingVertical: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  skeletonSpotDetails: {
    height: 96,
    borderRadius: 12,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
  },
  telemetryTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
  },
  telemetryCell: {
    flex: 1,
    minWidth: 200,
    backgroundColor: 'rgba(9, 14, 28, 0.55)',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  gmapsBadge: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.38)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  gmapsBadgeText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: '#30D158',
  },
  emptyStateText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    color: APPLE_CALM_THEME.colors.textSecondary,
    lineHeight: 21,
  },
});
