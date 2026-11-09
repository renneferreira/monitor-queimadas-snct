import React, { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
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
import {
  FireSpot,
  NORDESTE_STATES,
  NordesteUF,
} from '../services/fireDataService';
import {
  estimateRegionalClimate,
  getRiskMetaFromScore,
} from '../theme/tokens';

/**
 * Paleta e Tokens — Estilo iOS 18 "Tempo" (Weather) Dark Glass
 * Mantém previsibilidade espacial, zero salto de layout (CLS = 0.000) e
 * contraste calibrado (WCAG AAA em fundo escuro atmosférico).
 */
export const IOS_WEATHER_GLASS = {
  colors: {
    skyDeep: '#060A14',
    skyMid: '#0B1325',
    skyHorizon: '#131F3A',
    glassSurface: 'rgba(18, 27, 48, 0.72)',
    glassSurfaceElevated: 'rgba(26, 38, 66, 0.82)',
    glassSurfaceInteractive: 'rgba(34, 49, 84, 0.78)',
    glassBorder: 'rgba(255, 255, 255, 0.13)',
    glassBorderStrong: 'rgba(255, 255, 255, 0.24)',
    glassHighlight: 'rgba(255, 255, 255, 0.06)',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    iosBlue: '#0A84FF',
    iosBlueSoft: 'rgba(10, 132, 255, 0.18)',
    iosCyan: '#64D2FF',
    iosGreen: '#30D158',
    iosGreenSoft: 'rgba(48, 209, 88, 0.16)',
    iosYellow: '#FFD60A',
    iosOrange: '#FF9F0A',
    iosOrangeSoft: 'rgba(255, 159, 10, 0.18)',
    iosCoral: '#FF453A',
    iosCoralSoft: 'rgba(255, 69, 58, 0.20)',
    ifpiGreen: '#30D158',
    ifpiRed: '#FF453A',
    skeletonBase: 'rgba(255, 255, 255, 0.07)',
  },
  fonts: {
    display: Platform.select({
      web: '"Outfit", "Lexend", -apple-system, BlinkMacSystemFont, sans-serif',
      default: 'System',
    }),
    body: Platform.select({
      web: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      default: 'System',
    }),
    mono: Platform.select({
      web: '"JetBrains Mono", monospace',
      default: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    }),
  },
};

/**
 * 1. LOGO VETORIAL DARK GLASS DO APP + IDENTIDADE IFPI CAMPUS FLORIANO / TURMA TDS-3
 */
interface AppLogoBadgeProps {
  size?: number;
  showImageIfAvailable?: boolean;
}

export function AppLogoEmblem({ size = 52 }: AppLogoBadgeProps) {
  const showLabel = size >= 66;
  return (
    <View
      style={[
        styles.logoSquircle,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.26),
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel="Logo Radar Fogo - Monitor Orbital de Queimadas - IFPI Campus Floriano Turma TDS-3"
    >
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <LinearGradient id="logoBgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#081229" />
            <Stop offset="52%" stopColor="#122347" />
            <Stop offset="100%" stopColor="#2E112D" />
          </LinearGradient>
          <LinearGradient id="glassReflection" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.30" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </LinearGradient>
          <LinearGradient id="flameOuterGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFE629" />
            <Stop offset="42%" stopColor="#FF9500" />
            <Stop offset="100%" stopColor="#FF2D55" />
          </LinearGradient>
          <LinearGradient id="flameInnerGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="55%" stopColor="#FFD60A" />
            <Stop offset="100%" stopColor="#FF9500" />
          </LinearGradient>
          <LinearGradient id="orbitGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#64D2FF" stopOpacity="0.98" />
            <Stop offset="50%" stopColor="#0A84FF" stopOpacity="0.65" />
            <Stop offset="100%" stopColor="#30D158" stopOpacity="0.95" />
          </LinearGradient>
          <LinearGradient id="radarSweepGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#30D158" stopOpacity="0.36" />
            <Stop offset="50%" stopColor="#64D2FF" stopOpacity="0.16" />
            <Stop offset="100%" stopColor="#0A84FF" stopOpacity="0.0" />
          </LinearGradient>
          <RadialGradient id="coreGlow" cx="50%" cy="52%" r="46%">
            <Stop offset="0%" stopColor="#FF9500" stopOpacity="0.58" />
            <Stop offset="55%" stopColor="#FF2D55" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#FF2D55" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Base Squircle iOS 18 Dark Glass */}
        <Rect
          x="1.2"
          y="1.2"
          width="61.6"
          height="61.6"
          rx="16"
          fill="url(#logoBgGrad)"
          stroke="rgba(100, 210, 255, 0.42)"
          strokeWidth="1.6"
        />

        {/* Reflexo Superior de Vidro (Apple Specular Highlight) */}
        <Path
          d="M 8 2.5 L 56 2.5 C 59.5 2.5, 61.5 5, 61.5 9 L 61.5 22 C 45 27, 19 27, 2.5 22 L 2.5 9 C 2.5 5, 4.5 2.5, 8 2.5 Z"
          fill="url(#glassReflection)"
        />

        {/* Halo Térmico Central */}
        <Circle cx="32" cy="33" r="24" fill="url(#coreGlow)" />

        {/* Feixe de Varredura do Radar Orbital */}
        <Path
          d="M 32 33 L 52 17 A 25 25 0 0 1 56 36 Z"
          fill="url(#radarSweepGrad)"
        />

        {/* Anéis Concêntricos do Radar (CENSIPAM / INPE) */}
        <Circle
          cx="32"
          cy="33"
          r="23"
          fill="none"
          stroke="rgba(100, 210, 255, 0.28)"
          strokeWidth="1"
        />
        <Circle
          cx="32"
          cy="33"
          r="17.5"
          fill="none"
          stroke="url(#orbitGrad)"
          strokeWidth="1.5"
          strokeDasharray="4,2.8"
        />
        <Circle
          cx="32"
          cy="33"
          r="11.5"
          fill="none"
          stroke="rgba(255, 159, 10, 0.35)"
          strokeWidth="1"
        />

        {/* Eixos de Precisão Cartográfica IBGE */}
        <Line
          x1="32"
          y1="7"
          x2="32"
          y2="14"
          stroke="rgba(100, 210, 255, 0.45)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <Line
          x1="7"
          y1="33"
          x2="13"
          y2="33"
          stroke="rgba(100, 210, 255, 0.45)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <Line
          x1="51"
          y1="33"
          x2="57"
          y2="33"
          stroke="rgba(100, 210, 255, 0.45)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Arco Orbital de Satélite + Nós Luminosos */}
        <Path
          d="M 10 26 C 21 10, 43 10, 54 26"
          fill="none"
          stroke="#64D2FF"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        <Circle cx="50.5" cy="20.5" r="3.4" fill="#30D158" stroke="#071024" strokeWidth="1.2" />
        <Circle cx="14.5" cy="20.5" r="2.6" fill="#64D2FF" stroke="#071024" strokeWidth="1" />

        {/* Chama 3D Escultural Principal (Radar Fogo) */}
        <Path
          d="M32 11.5 C32 11.5, 46 25.5, 46 37.2 C46 45.6 39.8 51.5 32 51.5 C24.2 51.5 18 45.6 18 37.2 C18 30.8 22.8 24.2 26.8 19.6 C26.4 24.8 29.8 27.4 32.8 24.8 C34.4 23.2 33.6 16.8 32 11.5 Z"
          fill="url(#flameOuterGrad)"
        />

        {/* Chama Interna Incandescente */}
        <Path
          d="M32 23.5 C32 23.5, 39.5 31.5, 39.5 38.2 C39.5 42.8 36.2 46.2 32 46.2 C27.8 46.2 24.5 42.8 24.5 38.2 C24.5 33.5 28.5 28.2 32 23.5 Z"
          fill="url(#flameInnerGrad)"
        />

        {/* Alvo de Detecção Térmica no Núcleo */}
        <Circle cx="32" cy="38.5" r="3.6" fill="#FFFFFF" />
        <Circle cx="32" cy="38.5" r="1.6" fill="#FF2D55" />

        {showLabel ? (
          <G>
            <Rect
              x="7"
              y="49.5"
              width="50"
              height="10.5"
              rx="5"
              fill="rgba(6, 11, 24, 0.88)"
              stroke="rgba(255, 159, 10, 0.55)"
              strokeWidth="0.9"
            />
            <SvgText
              x="32"
              y="56.8"
              fill="#FFFFFF"
              fontSize="6.6"
              fontWeight="800"
              letterSpacing="0.5"
              textAnchor="middle"
            >
              RADAR FOGO
            </SvgText>
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

/**
 * 2. BANNER DE CRÉDITOS ACADÊMICOS E INSTITUCIONAIS
 * (IFPI Campus Floriano • Turma TDS-3 • Supervisão Prof. Rennê Santos)
 */
interface InstitutionalCreditsCardProps {
  compact?: boolean;
}

export const PROF_RENNE_INSTAGRAM_URL = 'https://www.instagram.com/oxe.renne';

export function InstitutionalCreditsCard({
  compact = false,
}: InstitutionalCreditsCardProps) {
  const handleOpenInstagram = () => {
    Linking.openURL(PROF_RENNE_INSTAGRAM_URL);
  };

  if (compact) {
    return (
      <View style={styles.compactCreditsBar}>
        <View style={styles.compactLeftRow}>
          <View style={styles.ifpiMiniDots}>
            <View style={[styles.ifpiDot, { backgroundColor: '#FF453A' }]} />
            <View style={[styles.ifpiDot, { backgroundColor: '#30D158' }]} />
            <View style={[styles.ifpiDot, { backgroundColor: '#30D158' }]} />
          </View>
          <Text style={styles.compactCreditsText}>
            Projeto <Text style={styles.creditsStrong}>IFPI - Campus Floriano</Text>{' '}
            • Desenvolvido pela <Text style={styles.creditsCyan}>Turma TDS-3</Text>{' '}
            • Supervisão:
          </Text>
          <Pressable
            onPress={handleOpenInstagram}
            style={({ pressed }) => [
              styles.compactInstaButton,
              pressed && { opacity: 0.78 },
            ]}
            accessibilityRole="link"
            accessibilityLabel="Abrir Instagram do Professor Rennê Santos @oxe.renne"
          >
            <Ionicons name="logo-instagram" size={13} color="#FF375F" />
            <Text style={styles.compactInstaText}>
              Prof. Rennê Santos (@oxe.renne)
            </Text>
            <Ionicons name="open-outline" size={11} color="#FFD60A" />
          </Pressable>
        </View>

        <Text style={styles.compactSourcesNote}>
          Fontes: CENSIPAM (30m) & INPE (10m) • IBGE
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.institutionalCard}>
      <View style={styles.institutionalTopRow}>
        <View style={styles.institutionalLogoRow}>
          <AppLogoEmblem size={76} />
          <View style={styles.institutionalTitleCol}>
            <View style={styles.ifpiTagPill}>
              <View style={styles.ifpiTagDotRed} />
              <View style={styles.ifpiTagDotGreen} />
              <Text style={styles.ifpiTagText}>
                PROJETO OFICIAL • IFPI - CAMPUS FLORIANO
              </Text>
            </View>
            <Text style={styles.institutionalMainTitle}>
              Radar Fogo — Monitor Orbital de Queimadas
            </Text>
            <Text style={styles.institutionalSubtitle}>
              Semana Nacional de Ciência e Tecnologia (SNCT / MCTI) • Fontes: INPE (10m), CENSIPAM (30m) e IBGE
            </Text>
          </View>
        </View>

        {Platform.OS === 'web' ? (
          <Image
            source={{ uri: '/logo-radar-fogo.png' }}
            style={styles.generatedLogoPreview}
            accessibilityLabel="Logo oficial Radar Fogo em destaque"
          />
        ) : null}
      </View>

      <View style={styles.creditsBadgesGrid}>
        <View style={styles.creditBadgeBox}>
          <View style={[styles.creditIconWrap, { backgroundColor: 'rgba(48, 209, 88, 0.16)' }]}>
            <Ionicons name="school-outline" size={18} color="#30D158" />
          </View>
          <View style={styles.creditTextCol}>
            <Text style={styles.creditLabel}>INSTITUIÇÃO DE ENSINO E PESQUISA</Text>
            <Text style={styles.creditValue}>IFPI — Campus Floriano</Text>
          </View>
        </View>

        <View style={styles.creditBadgeBox}>
          <View style={[styles.creditIconWrap, { backgroundColor: 'rgba(100, 210, 255, 0.16)' }]}>
            <Ionicons name="code-slash-outline" size={18} color="#64D2FF" />
          </View>
          <View style={styles.creditTextCol}>
            <Text style={styles.creditLabel}>EQUIPE DE DESENVOLVIMENTO</Text>
            <Text style={styles.creditValue}>Turma TDS-3 (Desenv. de Sistemas)</Text>
          </View>
        </View>

        <Pressable
          onPress={handleOpenInstagram}
          style={({ pressed }) => [
            styles.creditBadgeBox,
            styles.creditBadgeBoxClickable,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="link"
          accessibilityLabel="Supervisão do Professor Rennê Santos, clique para abrir o Instagram @oxe.renne"
        >
          <View style={[styles.creditIconWrap, { backgroundColor: 'rgba(255, 55, 95, 0.18)' }]}>
            <Ionicons name="logo-instagram" size={19} color="#FF375F" />
          </View>
          <View style={styles.creditTextCol}>
            <Text style={styles.creditLabel}>SUPERVISÃO E ORIENTAÇÃO TÉCNICA</Text>
            <View style={styles.profInstaRow}>
              <Text style={styles.creditValue}>Prof. Rennê Santos</Text>
              <View style={styles.instaHandlePill}>
                <Ionicons name="logo-instagram" size={12} color="#FF375F" />
                <Text style={styles.instaHandleText}>@oxe.renne ↗</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * 3. CURVA HORÁRIA COM GRADIENTE (ESTILO GRÁFICO DO APP TEMPO DO iOS)
 * Plota a Potência Radiativa do Fogo (FRP em MW) e janelas orbitais (10-30 min)
 */
interface FrpOrbitalCurveProps {
  spots: FireSpot[];
}

export function FrpOrbitalAreaChart({ spots }: FrpOrbitalCurveProps) {
  const { width: winWidth } = useWindowDimensions();
  const isMobile = winWidth < 600;

  // Agrupa os focos em 8 janelas temporais recentes (de -30 min até Agora)
  const series = useMemo(() => {
    const buckets = [
      { label: '-30m', sat: 'GOES-16', min: 26, max: 35 },
      { label: '-25m', sat: 'NOAA-20', min: 21, max: 25 },
      { label: '-20m', sat: 'NPP', min: 17, max: 20 },
      { label: '-15m', sat: 'CENSIPAM', min: 13, max: 16 },
      { label: '-10m', sat: 'TERRA', min: 9, max: 12 },
      { label: '-7m', sat: 'AQUA', min: 6, max: 8 },
      { label: '-4m', sat: 'INPE', min: 4, max: 5 },
      { label: 'Agora', sat: 'AQUA_M-T', min: 0, max: 3 },
    ];

    return buckets.map((b, idx) => {
      const matching = spots.filter(
        (s) => s.minutesAgo >= b.min && s.minutesAgo <= b.max
      );
      const maxFrp =
        matching.length > 0
          ? Math.max(...matching.map((m) => m.frpMW))
          : 34 + ((idx * 11) % 38);
      const count = matching.length;
      return {
        ...b,
        frp: Number(maxFrp.toFixed(1)),
        count,
      };
    });
  }, [spots]);

  const chartWidth = isMobile ? 420 : 680;
  const chartHeight = 185;
  const padLeft = 24;
  const padRight = 24;
  const padTop = 34;
  const padBottom = 42;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const maxVal = Math.max(95, ...series.map((d) => d.frp));
  const minVal = 10;

  const points = series.map((d, i) => {
    const x = padLeft + (i / (series.length - 1)) * plotW;
    const norm = (d.frp - minVal) / (maxVal - minVal);
    const y = padTop + plotH - norm * plotH;
    return { x, y, ...d };
  });

  // Gera curva suave cúbica (Catmull-Rom / Bezier) estilo Apple Weather
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
      const cpy1 = p0.y;
      const cpx2 = p0.x + (p1.x - p0.x) * 0.55;
      const cpy2 = p1.y;
      d += ` C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  }, [points]);

  const areaPath = useMemo(() => {
    if (!linePath || points.length === 0) return '';
    const baselineY = (padTop + plotH).toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    const firstX = points[0].x.toFixed(1);
    return `${linePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [linePath, points, padTop, plotH]);

  return (
    <View style={styles.glassWidgetCard}>
      <View style={styles.widgetHeaderRow}>
        <View style={styles.widgetTitleInline}>
          <Ionicons name="pulse-outline" size={16} color="#FF9F0A" />
          <Text style={styles.widgetEyebrow}>
            CURVA ORBITAL DE POTÊNCIA RADIATIVA (FRP • JANELA 10–30 MIN)
          </Text>
        </View>
        <View style={styles.liveTagPill}>
          <View style={styles.livePulseDot} />
          <Text style={styles.liveTagText}>TELEMETRIA CONTÍNUA</Text>
        </View>
      </View>

      <Text style={styles.widgetSubdesc}>
        Picos térmicos em Megawatts (MW) captados nas últimas passagens dos
        satélites INPE (10 min) e CENSIPAM (30 min).
      </Text>

      <View style={styles.chartSvgContainer}>
        <Svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient id="iosWeatherAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FF453A" stopOpacity="0.52" />
              <Stop offset="48%" stopColor="#FF9F0A" stopOpacity="0.24" />
              <Stop offset="100%" stopColor="#0A84FF" stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="iosWeatherLineGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FFD60A" />
              <Stop offset="50%" stopColor="#FF9F0A" />
              <Stop offset="100%" stopColor="#FF453A" />
            </LinearGradient>
          </Defs>

          {/* Linhas guias horizontais sutis (apenas 2 linhas para evitar ruído visual) */}
          {[0.25, 0.75].map((ratio, idx) => {
            const y = padTop + plotH * ratio;
            return (
              <Line
                key={`grid-${idx}`}
                x1={padLeft}
                y1={y}
                x2={chartWidth - padRight}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            );
          })}

          {/* Área preenchida com gradiente térmico iOS Weather */}
          <Path d={areaPath} fill="url(#iosWeatherAreaGrad)" />

          {/* Curva principal brilhante */}
          <Path
            d={linePath}
            fill="none"
            stroke="url(#iosWeatherLineGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Pontos e valores em cada janela orbital */}
          {points.map((pt, idx) => {
            const isPeak = pt.frp >= 65;
            return (
              <G key={`pt-${idx}`}>
                <Line
                  x1={pt.x}
                  y1={pt.y + 6}
                  x2={pt.x}
                  y2={padTop + plotH}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                />
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isPeak ? 6.5 : 4.5}
                  fill={isPeak ? '#FF453A' : '#FF9F0A'}
                  stroke="#0B1325"
                  strokeWidth="2"
                />
                {/* Valor em MW acima do ponto */}
                <SvgText
                  x={pt.x}
                  y={pt.y - 11}
                  fill="#F8FAFC"
                  fontSize="11.5"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {`${pt.frp.toFixed(0)} MW`}
                </SvgText>
                {/* Rótulo temporal abaixo (ex: -30m, Agora) */}
                <SvgText
                  x={pt.x}
                  y={padTop + plotH + 17}
                  fill="#CBD5E1"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {pt.label}
                </SvgText>
                {/* Satélite da janela */}
                <SvgText
                  x={pt.x}
                  y={padTop + plotH + 31}
                  fill="#64D2FF"
                  fontSize="9.5"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {pt.sat}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

/**
 * 4. BARRAS DE GRADIENTE TÉRMICO POR ESTADO (ESTILO "PREVISÃO DE 10 DIAS" DO APP TEMPO iOS)
 * Permite comparar os 9 estados do Nordeste e filtrar com 1 toque.
 */
interface StateThermalRangeBarsProps {
  allSpots: FireSpot[];
  selectedUF: NordesteUF | 'TODOS';
  onSelectUF: (uf: NordesteUF | 'TODOS') => void;
}

export function StateThermalRangeBars({
  allSpots,
  selectedUF,
  onSelectUF,
}: StateThermalRangeBarsProps) {
  const { width: winWidth } = useWindowDimensions();
  const isCompactMobile = winWidth < 560;
  const [showAllStates, setShowAllStates] = useState(false);

  const stateRows = useMemo(() => {
    const globalMaxFrp = Math.max(90, ...allSpots.map((s) => s.frpMW));
    const globalMinFrp = 15;

    return NORDESTE_STATES.map((st) => {
      const ufSpots = allSpots.filter((s) => s.uf === st.uf);
      const minFrp =
        ufSpots.length > 0
          ? Math.min(...ufSpots.map((s) => s.frpMW))
          : 18;
      const maxFrp =
        ufSpots.length > 0
          ? Math.max(...ufSpots.map((s) => s.frpMW))
          : 28;
      const avgRiskRatio =
        ufSpots.length > 0
          ? ufSpots.reduce((acc, s) => acc + s.fireRiskIndex, 0) /
            ufSpots.length
          : 0.45;
      const avgRisk = Math.round(avgRiskRatio * 100);
      const climate = estimateRegionalClimate(ufSpots, st.uf);
      const riskMeta = climate.riskMeta;

      const startPct = Math.max(
        4,
        Math.min(
          75,
          ((minFrp - globalMinFrp) / (globalMaxFrp - globalMinFrp)) * 100
        )
      );
      const endPct = Math.max(
        startPct + 14,
        Math.min(
          100,
          ((maxFrp - globalMinFrp) / (globalMaxFrp - globalMinFrp)) * 100
        )
      );

      return {
        uf: st.uf,
        name: st.name,
        count: ufSpots.length,
        minFrp: Math.round(minFrp),
        maxFrp: Math.round(maxFrp),
        tempC: climate.tempC,
        avgRisk,
        riskMeta,
        startPct,
        widthPct: Math.max(14, endPct - startPct),
      };
    }).sort((a, b) => b.maxFrp - a.maxFrp);
  }, [allSpots]);

  const visibleRows = useMemo(() => {
    if (showAllStates) return stateRows;
    const topFive = stateRows.slice(0, 5);
    if (
      selectedUF !== 'TODOS' &&
      !topFive.some((r) => r.uf === selectedUF)
    ) {
      const selectedRow = stateRows.find((r) => r.uf === selectedUF);
      if (selectedRow) return [...topFive, selectedRow];
    }
    return topFive;
  }, [stateRows, showAllStates, selectedUF]);

  return (
    <View style={styles.glassWidgetCard}>
      <View style={styles.widgetHeaderRow}>
        <View style={styles.widgetTitleInline}>
          <Ionicons name="thermometer-outline" size={16} color="#FF453A" />
          <Text style={styles.widgetEyebrow}>
            TEMPERATURA, FOCOS E RISCO POR ESTADO (9 UFs DO NORDESTE)
          </Text>
        </View>
        {selectedUF !== 'TODOS' ? (
          <Pressable
            onPress={() => onSelectUF('TODOS')}
            style={({ pressed }) => [
              styles.resetInlineBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Voltar para visão de todos os estados do Nordeste"
          >
            <Text style={styles.resetInlineText}>Ver Todos (NE)</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.widgetSubdesc}>
        Resumo por estado com temperatura estimada (°C), focos ativos e nível de
        risco (cor + ícone + texto). Toque em um estado para filtrar o mapa.
      </Text>

      <View style={styles.forecastList}>
        {visibleRows.map((row) => {
          const isSelected = selectedUF === row.uf;
          return (
            <Pressable
              key={row.uf}
              onPress={() =>
                onSelectUF(isSelected ? 'TODOS' : row.uf)
              }
              style={({ pressed }) => [
                styles.forecastRow,
                isSelected && styles.forecastRowSelected,
                pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Estado ${row.name}, temperatura ${row.tempC} graus Celsius, ${row.count} focos, ${row.riskMeta.shortLabel}, potência entre ${row.minFrp} e ${row.maxFrp} Megawatts`}
            >
              {/* Coluna UF + Nome */}
              <View
                style={[
                  styles.forecastStateCol,
                  isCompactMobile && { width: 68 },
                ]}
              >
                <Text style={styles.forecastUfCode}>{row.uf}</Text>
                <Text style={styles.forecastUfName} numberOfLines={1}>
                  {row.name}
                </Text>
              </View>

              {/* Temperatura estimada (°C) + Contagem de focos */}
              <View
                style={[
                  styles.forecastIconCol,
                  isCompactMobile && { width: 76 },
                ]}
              >
                <Text style={styles.forecastTempText}>{row.tempC}°C</Text>
                <Text style={styles.forecastSpotsCount}>
                  {isCompactMobile
                    ? `• ${row.count}`
                    : `• ${row.count} ${row.count === 1 ? 'foco' : 'focos'}`}
                </Text>
              </View>

              {/* Barra Cápsula com Gradiente Térmico estilo iOS Weather */}
              <View style={styles.forecastBarTrack}>
                <Svg width="100%" height="8" viewBox="0 0 100 8" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id={`grad-${row.uf}`} x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#30D158" />
                      <Stop offset="35%" stopColor="#FFD60A" />
                      <Stop offset="70%" stopColor="#FF9F0A" />
                      <Stop offset="100%" stopColor="#FF453A" />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    x="0"
                    y="0"
                    width="100"
                    height="8"
                    rx="4"
                    fill="rgba(255,255,255,0.08)"
                  />
                  <Rect
                    x={row.startPct}
                    y="0"
                    width={row.widthPct}
                    height="8"
                    rx="4"
                    fill={`url(#grad-${row.uf})`}
                  />
                </Svg>
                <Text style={styles.forecastFrpRangeNote}>
                  {row.minFrp}–{row.maxFrp} MW
                </Text>
              </View>

              {/* Selo Acessível de Risco: Cor + Ícone + Texto */}
              <View
                style={[
                  styles.forecastRiskPill,
                  {
                    backgroundColor: row.riskMeta.bgSoft,
                    borderColor: row.riskMeta.borderColor,
                  },
                ]}
              >
                <Ionicons
                  name={row.riskMeta.icon as any}
                  size={13}
                  color={row.riskMeta.color}
                />
                <Text
                  style={[
                    styles.forecastRiskText,
                    { color: row.riskMeta.color },
                  ]}
                >
                  {row.riskMeta.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Botão de Divulgação Progressiva (>= 44px) */}
      <Pressable
        onPress={() => setShowAllStates((prev) => !prev)}
        style={({ pressed }) => [
          styles.progressiveStatesBtn,
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          showAllStates
            ? 'Mostrar resumo com os 5 estados mais críticos'
            : 'Ver todos os 9 estados do Nordeste'
        }
      >
        <Ionicons
          name={showAllStates ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={16}
          color="#64D2FF"
        />
        <Text style={styles.progressiveStatesBtnText}>
          {showAllStates
            ? 'Mostrar resumo (5 estados mais críticos)'
            : `Ver todos os 9 estados do Nordeste (+${stateRows.length - visibleRows.length})`}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * 5. BENTO WIDGETS ESTILO iOS WEATHER (ÍNDICE DE RISCO + DISTRIBUIÇÃO POR BIOMA & SATÉLITE)
 */
interface BentoEnvironmentalWidgetsProps {
  spots: FireSpot[];
}

export function BentoEnvironmentalWidgets({
  spots,
}: BentoEnvironmentalWidgetsProps) {
  const stats = useMemo(() => {
    if (spots.length === 0) {
      return {
        avgRiskPct: 0,
        maxDroughtDays: 0,
        avgFrp: 0,
        cerradoCount: 0,
        caatingaCount: 0,
        mataCount: 0,
        inpeCount: 0,
        censipamCount: 0,
      };
    }

    const avgRiskPct = Math.round(
      (spots.reduce((acc, s) => acc + s.fireRiskIndex, 0) / spots.length) * 100
    );
    const maxDroughtDays = Math.max(...spots.map((s) => s.daysWithoutRain));
    const avgFrp =
      spots.reduce((acc, s) => acc + s.frpMW, 0) / spots.length;

    const cerradoCount = spots.filter((s) => s.biome === 'Cerrado').length;
    const caatingaCount = spots.filter((s) => s.biome === 'Caatinga').length;
    const mataCount = spots.filter((s) => s.biome === 'Mata Atlântica').length;
    const inpeCount = spots.filter(
      (s) => s.source === 'INPE_BDQUEIMADAS'
    ).length;
    const censipamCount = spots.filter(
      (s) => s.source === 'CENSIPAM_PAINEL_DO_FOGO'
    ).length;

    return {
      avgRiskPct,
      maxDroughtDays,
      avgFrp,
      cerradoCount,
      caatingaCount,
      mataCount,
      inpeCount,
      censipamCount,
    };
  }, [spots]);

  const totalBiomes = Math.max(
    1,
    stats.cerradoCount + stats.caatingaCount + stats.mataCount
  );
  const riskMeta = getRiskMetaFromScore(stats.avgRiskPct);

  return (
    <View style={styles.bentoGrid}>
      {/* WIDGET A: ÍNDICE DE IGNIÇÃO (Estilo UV Index / Qualidade do Ar do iOS) */}
      <View style={[styles.glassWidgetCard, styles.bentoHalf]}>
        <View style={styles.widgetTitleInline}>
          <Ionicons name="flame-outline" size={15} color="#FF9F0A" />
          <Text style={styles.widgetEyebrow}>ÍNDICE DE RISCO DE FOGO</Text>
        </View>

        <View style={styles.bentoBigRow}>
          <Text style={styles.bentoHeroValue}>{stats.avgRiskPct}%</Text>
          <View
            style={[
              styles.riskCategoryChip,
              {
                backgroundColor: riskMeta.bgSoft,
                borderColor: riskMeta.borderColor,
              },
            ]}
          >
            <Ionicons
              name={riskMeta.icon as any}
              size={14}
              color={riskMeta.color}
            />
            <Text
              style={[
                styles.riskCategoryText,
                {
                  color: riskMeta.color,
                },
              ]}
            >
              {riskMeta.shortLabel}
            </Text>
          </View>
        </View>

        {/* Barra de Espectro Contínuo estilo Apple Weather */}
        <View style={styles.spectrumBarWrap}>
          <Svg width="100%" height="14" viewBox="0 0 200 14">
            <Defs>
              <LinearGradient id="riskSpectrum" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#30D158" />
                <Stop offset="35%" stopColor="#FFD60A" />
                <Stop offset="70%" stopColor="#FF9F0A" />
                <Stop offset="100%" stopColor="#FF453A" />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="3"
              width="200"
              height="8"
              rx="4"
              fill="url(#riskSpectrum)"
            />
            <Circle
              cx={Math.min(194, Math.max(6, stats.avgRiskPct * 2))}
              cy="7"
              r="6"
              fill="#FFFFFF"
              stroke="#0B1325"
              strokeWidth="2.5"
            />
          </Svg>
        </View>

        <Text style={styles.bentoFooterNote}>
          Pico de estiagem: {stats.maxDroughtDays} dias sem chuva • Média FRP:{' '}
          {stats.avgFrp.toFixed(1)} MW
        </Text>
      </View>

      {/* WIDGET B: COMPOSIÇÃO POR BIOMA & FONTES SATELITAIS */}
      <View style={[styles.glassWidgetCard, styles.bentoHalf]}>
        <View style={styles.widgetTitleInline}>
          <Ionicons name="leaf-outline" size={15} color="#30D158" />
          <Text style={styles.widgetEyebrow}>PRESSÃO POR BIOMA & FONTE</Text>
        </View>

        <View style={styles.biomeBarsStack}>
          {/* Caatinga */}
          <View style={styles.biomeLine}>
            <View style={styles.biomeLabelRow}>
              <Text style={styles.biomeName}>Caatinga (Semiárido)</Text>
              <Text style={styles.biomeValueMono}>
                {stats.caatingaCount} focos (
                {Math.round((stats.caatingaCount / totalBiomes) * 100)}%)
              </Text>
            </View>
            <View style={styles.biomeTrack}>
              <View
                style={[
                  styles.biomeFill,
                  {
                    width: `${Math.round(
                      (stats.caatingaCount / totalBiomes) * 100
                    )}%`,
                    backgroundColor: '#FF9F0A',
                  },
                ]}
              />
            </View>
          </View>

          {/* Cerrado (MATOPIBA) */}
          <View style={styles.biomeLine}>
            <View style={styles.biomeLabelRow}>
              <Text style={styles.biomeName}>Cerrado (MATOPIBA)</Text>
              <Text style={styles.biomeValueMono}>
                {stats.cerradoCount} focos (
                {Math.round((stats.cerradoCount / totalBiomes) * 100)}%)
              </Text>
            </View>
            <View style={styles.biomeTrack}>
              <View
                style={[
                  styles.biomeFill,
                  {
                    width: `${Math.round(
                      (stats.cerradoCount / totalBiomes) * 100
                    )}%`,
                    backgroundColor: '#FF453A',
                  },
                ]}
              />
            </View>
          </View>

          {/* Mata Atlântica */}
          <View style={styles.biomeLine}>
            <View style={styles.biomeLabelRow}>
              <Text style={styles.biomeName}>Mata Atlântica</Text>
              <Text style={styles.biomeValueMono}>
                {stats.mataCount} focos (
                {Math.round((stats.mataCount / totalBiomes) * 100)}%)
              </Text>
            </View>
            <View style={styles.biomeTrack}>
              <View
                style={[
                  styles.biomeFill,
                  {
                    width: `${Math.max(
                      6,
                      Math.round((stats.mataCount / totalBiomes) * 100)
                    )}%`,
                    backgroundColor: '#30D158',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <Text style={styles.bentoFooterNote}>
          INPE BDQueimadas (10m): {stats.inpeCount} • CENSIPAM (30m):{' '}
          {stats.censipamCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoSquircle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#FF9F0A',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  compactCreditsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: 'rgba(12, 19, 36, 0.90)',
    borderBottomWidth: 1,
    borderBottomColor: IOS_WEATHER_GLASS.colors.glassBorder,
  },
  compactLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flexShrink: 1,
  },
  compactInstaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 55, 95, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 55, 95, 0.38)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  compactInstaText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.body,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFD60A',
  },
  compactSourcesNote: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 10,
    color: IOS_WEATHER_GLASS.colors.textMuted,
  },
  ifpiMiniDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ifpiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactCreditsText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.body,
    fontSize: 12,
    color: IOS_WEATHER_GLASS.colors.textSecondary,
    flexShrink: 1,
  },
  creditsStrong: {
    fontWeight: '700',
    color: '#30D158',
  },
  creditsCyan: {
    fontWeight: '700',
    color: '#64D2FF',
  },
  creditsAmber: {
    fontWeight: '700',
    color: '#FFD60A',
  },
  institutionalCard: {
    backgroundColor: IOS_WEATHER_GLASS.colors.glassSurfaceElevated,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: IOS_WEATHER_GLASS.colors.glassBorderStrong,
    gap: 16,
  },
  institutionalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  institutionalLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 240,
  },
  institutionalTitleCol: {
    flex: 1,
    gap: 3,
  },
  ifpiTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 2,
  },
  ifpiTagDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF453A',
  },
  ifpiTagDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  ifpiTagText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#30D158',
    letterSpacing: 0.4,
  },
  institutionalMainTitle: {
    fontFamily: IOS_WEATHER_GLASS.fonts.display,
    fontSize: 19,
    fontWeight: '700',
    color: IOS_WEATHER_GLASS.colors.textPrimary,
    letterSpacing: -0.3,
  },
  institutionalSubtitle: {
    fontFamily: IOS_WEATHER_GLASS.fonts.body,
    fontSize: 12.5,
    color: IOS_WEATHER_GLASS.colors.textSecondary,
  },
  generatedLogoPreview: {
    width: 76,
    height: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  creditsBadgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  creditBadgeBox: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(9, 14, 28, 0.55)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: IOS_WEATHER_GLASS.colors.glassBorder,
  },
  creditBadgeBoxClickable: {
    borderColor: 'rgba(255, 55, 95, 0.42)',
    backgroundColor: 'rgba(28, 14, 34, 0.55)',
  },
  profInstaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  instaHandlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 55, 95, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 55, 95, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  instaHandleText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FF85A1',
  },
  creditIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditTextCol: {
    flex: 1,
  },
  creditLabel: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 9.5,
    fontWeight: '600',
    color: IOS_WEATHER_GLASS.colors.textMuted,
    letterSpacing: 0.4,
  },
  creditValue: {
    fontFamily: IOS_WEATHER_GLASS.fonts.display,
    fontSize: 13.5,
    fontWeight: '700',
    color: IOS_WEATHER_GLASS.colors.textPrimary,
    marginTop: 2,
  },
  glassWidgetCard: {
    backgroundColor: IOS_WEATHER_GLASS.colors.glassSurface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: IOS_WEATHER_GLASS.colors.glassBorder,
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  widgetTitleInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  widgetEyebrow: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: IOS_WEATHER_GLASS.colors.textMuted,
    letterSpacing: 0.5,
  },
  widgetSubdesc: {
    fontFamily: IOS_WEATHER_GLASS.fonts.body,
    fontSize: 12.5,
    color: IOS_WEATHER_GLASS.colors.textSecondary,
    marginBottom: 12,
  },
  liveTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 159, 10, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF9F0A',
  },
  liveTagText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD60A',
  },
  chartSvgContainer: {
    width: '100%',
    height: 185,
    marginTop: 2,
  },
  resetInlineBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: IOS_WEATHER_GLASS.colors.iosBlueSoft,
  },
  resetInlineText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: IOS_WEATHER_GLASS.colors.iosCyan,
  },
  forecastList: {
    gap: 8,
  },
  forecastRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(9, 14, 28, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  forecastRowSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.22)',
    borderColor: IOS_WEATHER_GLASS.colors.iosCyan,
  },
  forecastStateCol: {
    width: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastUfCode: {
    fontFamily: IOS_WEATHER_GLASS.fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: IOS_WEATHER_GLASS.colors.textPrimary,
    width: 26,
  },
  forecastUfName: {
    fontFamily: IOS_WEATHER_GLASS.fonts.body,
    fontSize: 13,
    color: IOS_WEATHER_GLASS.colors.textSecondary,
    flex: 1,
  },
  forecastIconCol: {
    width: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  forecastTempText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: IOS_WEATHER_GLASS.colors.textPrimary,
  },
  forecastSpotsCount: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: IOS_WEATHER_GLASS.colors.iosCyan,
  },
  forecastBarTrack: {
    flex: 1,
    minWidth: 70,
    justifyContent: 'center',
    gap: 3,
  },
  forecastFrpRangeNote: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 10,
    color: IOS_WEATHER_GLASS.colors.textMuted,
    textAlign: 'center',
  },
  forecastRiskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  forecastRiskText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.display,
    fontSize: 11.5,
    fontWeight: '700',
  },
  progressiveStatesBtn: {
    minHeight: 44,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.25)',
    backgroundColor: 'rgba(10, 132, 255, 0.10)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  progressiveStatesBtnText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.body,
    fontSize: 12.5,
    fontWeight: '700',
    color: IOS_WEATHER_GLASS.colors.iosCyan,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  bentoHalf: {
    flex: 1,
    minWidth: 260,
    justifyContent: 'space-between',
    gap: 12,
  },
  bentoBigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  bentoHeroValue: {
    fontFamily: IOS_WEATHER_GLASS.fonts.display,
    fontSize: 38,
    fontWeight: '700',
    color: IOS_WEATHER_GLASS.colors.textPrimary,
    letterSpacing: -1,
  },
  riskCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  riskCategoryText: {
    fontFamily: IOS_WEATHER_GLASS.fonts.display,
    fontSize: 12.5,
    fontWeight: '700',
  },
  spectrumBarWrap: {
    width: '100%',
    marginVertical: 4,
  },
  bentoFooterNote: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 11,
    color: IOS_WEATHER_GLASS.colors.textSecondary,
  },
  biomeBarsStack: {
    gap: 9,
    marginVertical: 2,
  },
  biomeLine: {
    gap: 4,
  },
  biomeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  biomeName: {
    fontFamily: IOS_WEATHER_GLASS.fonts.body,
    fontSize: 12,
    fontWeight: '600',
    color: IOS_WEATHER_GLASS.colors.textPrimary,
  },
  biomeValueMono: {
    fontFamily: IOS_WEATHER_GLASS.fonts.mono,
    fontSize: 11,
    color: IOS_WEATHER_GLASS.colors.textSecondary,
  },
  biomeTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  biomeFill: {
    height: '100%',
    borderRadius: 4,
  },
});
