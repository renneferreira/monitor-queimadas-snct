import { Platform } from 'react-native';
import { FireSeverity, FireSpot, NordesteUF } from '../services/fireDataService';

/**
 * Tokens de Design Unificados — Radar Fogo (Skill `radar-fogo-ui`)
 * Projetado para clareza, previsibilidade espacial e conforto visual
 * (público geral e neurodivergente: TDAH e TEA nível de suporte 1).
 */

export const DURATION_FAST = 150;
export const DURATION_BASE = 250;
export const DURATION_SLOW = 300;

export function getAnimationDuration(
  durationMs: number,
  reduceMotion: boolean
): number {
  return reduceMotion ? 0 : durationMs;
}

export type RiskLevelKey = 'baixo' | 'medio' | 'alto' | 'critico';

export interface RiskLevelMeta {
  key: RiskLevelKey;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgSoft: string;
  borderColor: string;
  icon: 'shield-checkmark' | 'alert-circle' | 'warning' | 'flame';
}

export const RISK_LEVELS: Record<RiskLevelKey, RiskLevelMeta> = {
  baixo: {
    key: 'baixo',
    label: 'Risco Baixo',
    shortLabel: 'Baixo',
    description: 'Condição estável, sem focos críticos próximos.',
    color: '#30D158',
    bgSoft: 'rgba(48, 209, 88, 0.12)',
    borderColor: 'rgba(48, 209, 88, 0.35)',
    icon: 'shield-checkmark',
  },
  medio: {
    key: 'medio',
    label: 'Risco Médio',
    shortLabel: 'Médio',
    description: 'Atenção moderada. Focos isolados monitorados.',
    color: '#FFD60A',
    bgSoft: 'rgba(255, 214, 10, 0.12)',
    borderColor: 'rgba(255, 214, 10, 0.35)',
    icon: 'alert-circle',
  },
  alto: {
    key: 'alto',
    label: 'Risco Alto',
    shortLabel: 'Alto',
    description: 'Propagação térmica elevada. Evite queima controlada.',
    color: '#FF9F0A',
    bgSoft: 'rgba(255, 159, 10, 0.14)',
    borderColor: 'rgba(255, 159, 10, 0.38)',
    icon: 'warning',
  },
  critico: {
    key: 'critico',
    label: 'Risco Crítico',
    shortLabel: 'Crítico',
    description: 'Alerta máximo de calor e estiagem severa na região.',
    color: '#FF453A',
    bgSoft: 'rgba(255, 69, 58, 0.16)',
    borderColor: 'rgba(255, 69, 58, 0.42)',
    icon: 'flame',
  },
};

export function getRiskMetaFromSeverity(
  severity?: FireSeverity | null,
  spotCount = 1
): RiskLevelMeta {
  if (spotCount === 0 || !severity) {
    return RISK_LEVELS.baixo;
  }
  switch (severity) {
    case 'critico':
      return RISK_LEVELS.critico;
    case 'alto':
      return RISK_LEVELS.alto;
    case 'moderado':
    default:
      return RISK_LEVELS.medio;
  }
}

export function getRiskMetaFromScore(riskPercent: number): RiskLevelMeta {
  if (riskPercent < 35) return RISK_LEVELS.baixo;
  if (riskPercent < 65) return RISK_LEVELS.medio;
  if (riskPercent < 85) return RISK_LEVELS.alto;
  return RISK_LEVELS.critico;
}

/**
 * Estima a temperatura superficial/ambiente regional (°C) e sensação térmica
 * a partir dos focos, bioma e estado do Nordeste, oferecendo leitura imediata estilo App Tempo.
 */
const UF_BASE_TEMP_C: Record<NordesteUF, number> = {
  MA: 33,
  PI: 36,
  CE: 34,
  RN: 32,
  PB: 32,
  PE: 31,
  AL: 30,
  SE: 30,
  BA: 33,
};

export function estimateRegionalClimate(
  spots: FireSpot[],
  selectedUF: NordesteUF | 'TODOS'
): {
  tempC: number;
  minTempC: number;
  maxTempC: number;
  humidityPct: number;
  riskPercent: number;
  riskMeta: RiskLevelMeta;
} {
  const baseTemp =
    selectedUF === 'TODOS' ? 34 : UF_BASE_TEMP_C[selectedUF] ?? 33;

  if (spots.length === 0) {
    return {
      tempC: baseTemp - 2,
      minTempC: baseTemp - 8,
      maxTempC: baseTemp,
      humidityPct: 48,
      riskPercent: 22,
      riskMeta: RISK_LEVELS.baixo,
    };
  }

  const avgFrp =
    spots.reduce((acc, s) => acc + s.frpMW, 0) / Math.max(1, spots.length);
  const maxDrought = Math.max(...spots.map((s) => s.daysWithoutRain));
  const avgRiskPct = Math.round(
    (spots.reduce((acc, s) => acc + s.fireRiskIndex, 0) / spots.length) * 100
  );

  const thermalBoost = Math.min(5, Math.round(avgFrp / 25));
  const tempC = Math.min(41, baseTemp + thermalBoost);
  const minTempC = Math.max(21, tempC - 11);
  const maxTempC = Math.min(43, tempC + 2);
  const humidityPct = Math.max(16, Math.min(62, 54 - Math.round(maxDrought * 1.1)));

  const hasCritical = spots.some((s) => s.severity === 'critico');
  const effectiveRiskPct = hasCritical ? Math.max(85, avgRiskPct) : avgRiskPct;

  return {
    tempC,
    minTempC,
    maxTempC,
    humidityPct,
    riskPercent: effectiveRiskPct,
    riskMeta: getRiskMetaFromScore(effectiveRiskPct),
  };
}

export const RADAR_FOGO_TOKENS = {
  colors: {
    background: '#070C18',
    surface: '#0D1528',
    surfaceElevated: '#131E36',
    glass: 'rgba(255, 255, 255, 0.08)',
    glassElevated: 'rgba(255, 255, 255, 0.11)',
    glassSubtle: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.12)',
    borderStrong: 'rgba(255, 255, 255, 0.22)',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    accentBlue: '#0A84FF',
    accentBlueSoft: 'rgba(10, 132, 255, 0.16)',
    accentCyan: '#64D2FF',
    syncGreen: '#30D158',
    syncGreenSoft: 'rgba(48, 209, 88, 0.14)',
    skeletonStatic: 'rgba(255, 255, 255, 0.08)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    pill: 999,
  },
  touchTarget: {
    minSize: 44,
  },
  fonts: {
    family: Platform.select({
      web: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      default: 'System',
    }),
    mono: Platform.select({
      web: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
      default: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    }),
    sizes: {
      xs: 12,
      sm: 14,
      md: 18,
      lg: 28,
      hero: 38,
    },
    lineHeights: {
      xs: 18,
      sm: 21,
      md: 26,
      lg: 34,
    },
  },
  animation: {
    fast: DURATION_FAST,
    base: DURATION_BASE,
    slow: DURATION_SLOW,
  },
};

