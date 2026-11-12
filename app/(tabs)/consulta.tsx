import React, { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { APPLE_CALM_THEME, useFireMonitor } from '../_layout';
import {
  FireSpot,
  IBGEMunicipality,
  NORDESTE_STATES,
  NordesteUF,
  buildGoogleMapsSpotUrl,
  fetchIBGEMunicipalitiesByUF,
  normalizeSearchText,
} from '../services/fireDataService';
import { InstitutionalCreditsCard } from '../components/IosWeatherWidgets';
import {
  estimateRegionalClimate,
  getRiskMetaFromSeverity,
} from '../theme/tokens';

export default function ConsultaSeletivaScreen() {
  const router = useRouter();
  const {
    spots,
    selectedUF,
    selectedMunicipality,
    currentFilterClicks,
    filterLogs,
    selectUF,
    selectMunicipality,
    selectSpotOnMap,
    recordSkeletonMount,
  } = useFireMonitor();

  // Padrão inicial em PI (Piauí — sede do IFPI Campus Floriano) quando UF está em TODOS
  const activeUF: NordesteUF = selectedUF === 'TODOS' ? 'PI' : selectedUF;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [showAllCities, setShowAllCities] = useState<boolean>(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 180);
    return () => clearTimeout(handler);
  }, [searchQuery]);
  const [ibgeList, setIbgeList] = useState<IBGEMunicipality[]>([]);
  const [isLoadingIBGE, setIsLoadingIBGE] = useState<boolean>(false);
  const [ibgeLiveSource, setIbgeLiveSource] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadMunicipalities = async () => {
      const t0 = Date.now();
      setIsLoadingIBGE(true);

      const [res] = await Promise.all([
        fetchIBGEMunicipalitiesByUF(activeUF),
        new Promise((r) => setTimeout(r, 260)),
      ]);

      if (!isMounted) return;
      setIbgeList(res.municipalities);
      setIbgeLiveSource(res.fromLiveAPI);
      setIsLoadingIBGE(false);
      recordSkeletonMount('Consulta', 260, Date.now() - t0);
    };

    loadMunicipalities();
    return () => {
      isMounted = false;
    };
  }, [activeUF, recordSkeletonMount]);

  const spotCountByMuni = useMemo(() => {
    const map = new Map<string, FireSpot[]>();
    for (const s of spots) {
      if (s.uf !== activeUF) continue;
      const key = normalizeSearchText(s.municipality);
      const current = map.get(key) ?? [];
      current.push(s);
      map.set(key, current);
    }
    return map;
  }, [spots, activeUF]);

  const filteredMunicipalities = useMemo(() => {
    const q = normalizeSearchText(debouncedQuery);
    const matches = ibgeList.filter((m) => {
      if (!q) return true;
      return normalizeSearchText(m.nome).includes(q);
    });

    const limit = q.length > 0 || showAllCities ? 18 : 8;

    return matches
      .sort((a, b) => {
        const countA =
          spotCountByMuni.get(normalizeSearchText(a.nome))?.length ?? 0;
        const countB =
          spotCountByMuni.get(normalizeSearchText(b.nome))?.length ?? 0;
        if (countB !== countA) return countB - countA;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      })
      .slice(0, limit);
  }, [ibgeList, searchQuery, showAllCities, spotCountByMuni]);

  const localMunicipalitySpots = useMemo(() => {
    if (!selectedMunicipality) return [];
    return spots.filter(
      (s) =>
        s.uf === activeUF &&
        normalizeSearchText(s.municipality) ===
        normalizeSearchText(selectedMunicipality)
    );
  }, [spots, activeUF, selectedMunicipality]);

  const lastEfficiencyLog = filterLogs[0];

  const handleSelectUF = (uf: NordesteUF) => {
    setSearchQuery('');
    selectUF(uf, true);
  };

  const handleSelectCity = (muni: IBGEMunicipality) => {
    selectMunicipality(muni.uf, muni.nome, muni.latitude, muni.longitude);
  };

  const handleViewSpotOnMap = (spot?: FireSpot) => {
    if (spot) {
      selectSpotOnMap(spot);
    }
    router.push('/(tabs)');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* PASSO 1: SELEÇÃO POR ESTADO (UF) — SEGMENTED CONTROL DARK GLASS */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.stepEyebrow}>
              PASSO 1 DE 2 • SELEÇÃO POR ESTADO (UF)
            </Text>
            <Text style={styles.cardTitle}>
              Escolha uma das 9 UFs do Nordeste
            </Text>
          </View>

          <View style={styles.clickCounterPill}>
            <Ionicons name="analytics-outline" size={15} color="#64D2FF" />
            <Text style={styles.clickCounterText}>
              Cliques na sessão: {currentFilterClicks} (Meta ≤ 3)
            </Text>
          </View>
        </View>

        <View style={styles.ufSegmentedGrid}>
          {NORDESTE_STATES.map((st) => {
            const isSelected = activeUF === st.uf;
            const ufSpots = spots.filter((s) => s.uf === st.uf);
            const ufSpotsCount = ufSpots.length;
            const ufClimate = estimateRegionalClimate(ufSpots, st.uf);
            return (
              <Pressable
                key={st.uf}
                onPress={() => handleSelectUF(st.uf)}
                style={({ pressed }) => [
                  styles.ufButton,
                  isSelected && styles.ufButtonActive,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Estado ${st.name}, sigla ${st.uf}, temperatura ${ufClimate.tempC} graus Celsius, ${ufSpotsCount} focos ativos, ${ufClimate.riskMeta.label}`}
              >
                <View style={styles.ufTopRow}>
                  <Text
                    style={[
                      styles.ufSiglaText,
                      isSelected && styles.ufTextActive,
                    ]}
                  >
                    {st.uf}
                  </Text>
                  <Text
                    style={[
                      styles.ufTempBadgeText,
                      isSelected && styles.ufTextActive,
                    ]}
                  >
                    {ufClimate.tempC}°C
                  </Text>
                </View>
                <Text
                  style={[
                    styles.ufNameText,
                    isSelected && styles.ufTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {st.name}
                </Text>
                <View
                  style={[
                    styles.ufCountBadge,
                    isSelected && styles.ufCountBadgeActive,
                  ]}
                >
                  <Ionicons
                    name={ufClimate.riskMeta.icon}
                    size={12}
                    color={isSelected ? '#FFFFFF' : ufClimate.riskMeta.color}
                  />
                  <Text
                    style={[
                      styles.ufCountText,
                      isSelected && styles.ufCountTextActive,
                    ]}
                  >
                    {ufSpotsCount} focos • {ufClimate.riskMeta.shortLabel}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* PASSO 2: SELEÇÃO POR CIDADE (BUSCA PREDITIVA CALMA + LISTA IBGE) */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <Text style={styles.stepEyebrow}>
              PASSO 2 DE 2 • SELEÇÃO POR MUNICÍPIO (API IBGE)
            </Text>
            <Text style={styles.cardTitle}>
              Municípios de{' '}
              {NORDESTE_STATES.find((s) => s.uf === activeUF)?.name} ({activeUF})
            </Text>
          </View>

          <View style={styles.ibgeStatusChip}>
            <Text style={styles.ibgeStatusText}>
              {ibgeLiveSource
                ? `IBGE Oficial (${ibgeList.length} mun.)`
                : 'Catálogo Local NE'}
            </Text>
          </View>
        </View>

        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color="#64D2FF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Digite a cidade em ${activeUF} (ex: ${activeUF === 'PI'
                ? 'Floriano ou Uruçuí'
                : activeUF === 'BA'
                  ? 'Barreiras'
                  : activeUF === 'PE'
                    ? 'Petrolina'
                    : 'filtrar município'
              })...`}
            placeholderTextColor={APPLE_CALM_THEME.colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="words"
            accessibilityLabel="Caixa de busca preditiva simplificada por cidade"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              accessibilityRole="button"
              accessibilityLabel="Limpar texto da busca"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={APPLE_CALM_THEME.colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        {isLoadingIBGE ? (
          <View
            style={styles.skeletonListContainer}
            accessibilityLabel="Carregando lista de municípios com layout estável"
          >
            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.skeletonCityRow} />
            ))}
          </View>
        ) : (
          <View style={styles.cityGrid}>
            {filteredMunicipalities.map((muni) => {
              const muniSpots =
                spotCountByMuni.get(normalizeSearchText(muni.nome)) ?? [];
              const isSelected =
                selectedMunicipality?.toLowerCase() === muni.nome.toLowerCase();
              const hasActiveFire = muniSpots.length > 0;
              const maxSeverity = muniSpots.some((s) => s.severity === 'critico')
                ? 'critico'
                : muniSpots.some((s) => s.severity === 'alto')
                  ? 'alto'
                  : hasActiveFire
                    ? 'moderado'
                    : null;
              const cityRiskMeta = getRiskMetaFromSeverity(
                maxSeverity,
                muniSpots.length
              );

              return (
                <Pressable
                  key={muni.id}
                  onPress={() => handleSelectCity(muni)}
                  style={({ pressed }) => [
                    styles.cityRowButton,
                    isSelected && styles.cityRowButtonActive,
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Município ${muni.nome}, ${muniSpots.length} focos detectados, ${cityRiskMeta.label}`}
                >
                  <View style={styles.cityInfoCol}>
                    <Text
                      style={[
                        styles.cityNameText,
                        isSelected && styles.cityTextActive,
                      ]}
                    >
                      {muni.nome}
                      {muni.nome === 'Floriano' && muni.uf === 'PI'
                        ? '  •  Sede IFPI TDS-3'
                        : ''}
                    </Text>
                    <Text
                      style={[
                        styles.cityIbgeText,
                        isSelected && styles.citySubtextActive,
                      ]}
                    >
                      Código IBGE: {muni.id} • {muni.uf}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.cityFireChip,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(255, 255, 255, 0.24)'
                          : cityRiskMeta.bgSoft,
                        borderColor: isSelected
                          ? 'rgba(255, 255, 255, 0.45)'
                          : cityRiskMeta.borderColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cityRiskMeta.icon}
                      size={13}
                      color={isSelected ? '#FFFFFF' : cityRiskMeta.color}
                    />
                    <Text
                      style={[
                        styles.cityFireChipText,
                        { color: isSelected ? '#FFFFFF' : cityRiskMeta.color },
                      ]}
                    >
                      {hasActiveFire
                        ? `${cityRiskMeta.shortLabel} • ${muniSpots.length} ${
                            muniSpots.length === 1 ? 'foco' : 'focos'
                          }`
                        : 'Baixo • Sem focos'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {searchQuery.trim().length === 0 && ibgeList.length > 8 ? (
              <Pressable
                onPress={() => setShowAllCities((prev) => !prev)}
                style={({ pressed }) => [
                  styles.moreCitiesBtn,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  showAllCities
                    ? 'Mostrar lista resumida de municípios'
                    : 'Mostrar mais municípios deste estado'
                }
              >
                <Ionicons
                  name={
                    showAllCities
                      ? 'chevron-up-outline'
                      : 'chevron-down-outline'
                  }
                  size={16}
                  color="#64D2FF"
                />
                <Text style={styles.moreCitiesBtnText}>
                  {showAllCities
                    ? 'Mostrar resumo (8 cidades principais)'
                    : `Ver mais cidades de ${activeUF} (18 municípios)`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {/* CARTÃO DE RELATÓRIO DE FOCOS LOCAIS DO MUNICÍPIO SELECIONADO */}
      <View style={styles.card}>
        <View style={styles.reportHeaderRow}>
          <View style={styles.flexOne}>
            <Text style={styles.stepEyebrow}>
              RELATÓRIO DE ISOLAMENTO MUNICIPAL • SÍNCRONO COM O RADAR
            </Text>
            <Text style={styles.cardTitle}>
              {selectedMunicipality
                ? `Relatório Local: ${selectedMunicipality} (${activeUF})`
                : 'Selecione um município acima para isolar os focos locais'}
            </Text>
          </View>

          {selectedMunicipality ? (
            <Pressable
              onPress={() => handleViewSpotOnMap(localMunicipalitySpots[0])}
              style={({ pressed }) => [
                styles.primaryMapActionBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Abrir radar com zoom aplicado neste município"
            >
              <Ionicons name="locate" size={18} color="#FFFFFF" />
              <Text style={styles.primaryMapActionText}>
                Ver no Radar com Zoom
              </Text>
            </Pressable>
          ) : null}
        </View>

        {lastEfficiencyLog && selectedMunicipality ? (
          <View style={styles.validationFeedbackBox}>
            <Ionicons name="checkmark-circle" size={18} color="#30D158" />
            <Text style={styles.validationFeedbackText}>
              Isolamento municipal concluído em{' '}
              <Text style={styles.validationBold}>
                {lastEfficiencyLog.clicksUsed}{' '}
                {lastEfficiencyLog.clicksUsed === 1 ? 'clique' : 'cliques'}
              </Text>{' '}
              ({(lastEfficiencyLog.durationMs / 1000).toFixed(2)}s) — Dentro da
              meta científica SNCT (≤ 3 cliques).
            </Text>
          </View>
        ) : null}

        {selectedMunicipality ? (
          localMunicipalitySpots.length > 0 ? (
            <View style={styles.localSpotsList}>
              {localMunicipalitySpots.map((spot) => {
                const spotRisk = getRiskMetaFromSeverity(spot.severity, 1);
                return (
                  <View key={spot.id} style={styles.localSpotItem}>
                    <View style={styles.localSpotTop}>
                      <Text style={styles.localSpotTitle}>
                        Foco #{spot.id} • Satélite {spot.satellite}
                      </Text>
                      <View
                        style={[
                          styles.localSpotRiskBadge,
                          {
                            backgroundColor: spotRisk.bgSoft,
                            borderColor: spotRisk.borderColor,
                          },
                        ]}
                      >
                        <Ionicons
                          name={spotRisk.icon}
                          size={13}
                          color={spotRisk.color}
                        />
                        <Text
                          style={[
                            styles.localSpotRiskText,
                            { color: spotRisk.color },
                          ]}
                        >
                          {spotRisk.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.localSpotSource}>
                      Fonte:{' '}
                      {spot.source === 'INPE_BDQUEIMADAS'
                        ? 'INPE BDQueimadas (10m)'
                        : 'CENSIPAM Painel do Fogo (30m)'}
                    </Text>

                    <Text style={styles.localSpotMeta}>
                      Bioma: {spot.biome} • FRP: {spot.frpMW.toFixed(1)} MW •{' '}
                      {spot.daysWithoutRain} dias sem chuva • Coord:{' '}
                      <Text
                        style={styles.coordInlineLink}
                        onPress={() =>
                          Linking.openURL(
                            buildGoogleMapsSpotUrl(
                              spot.latitude,
                              spot.longitude,
                              15
                            )
                          )
                        }
                      >
                        {spot.latitude.toFixed(4)}°, {spot.longitude.toFixed(4)}° (Google Maps ↗)
                      </Text>
                    </Text>

                    <View style={styles.spotActionsRow}>
                      <Pressable
                        onPress={() => handleViewSpotOnMap(spot)}
                        style={({ pressed }) => [
                          styles.spotZoomLink,
                          pressed && styles.btnPressed,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.spotZoomLinkText}>
                          Centralizar no Radar do App →
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          Linking.openURL(
                            buildGoogleMapsSpotUrl(
                              spot.latitude,
                              spot.longitude,
                              15
                            )
                          )
                        }
                        style={({ pressed }) => [
                          styles.googleMapsActionPill,
                          pressed && styles.btnPressed,
                        ]}
                        accessibilityRole="link"
                        accessibilityLabel={`Abrir foco ${spot.id} exatamente no Google Maps`}
                      >
                        <Ionicons
                          name="location-outline"
                          size={15}
                          color="#30D158"
                        />
                        <Text style={styles.googleMapsActionText}>
                          Ver Foco no Google Maps (Satélite) ↗
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.calmEmptyReport}>
              Nenhum foco de calor detectado pelos satélites INPE/CENSIPAM para{' '}
              {selectedMunicipality} ({activeUF}) na última janela de 10-30
              minutos. A câmera do radar já foi posicionada sobre o município.
            </Text>
          )
        ) : (
          <Text style={styles.calmEmptyReport}>
            Toque em qualquer cidade acima (ex: Floriano em PI) para visualizar
            imediatamente o relatório de focos locais e aplicar o zoom no radar.
          </Text>
        )}
      </View>

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
  flexOne: {
    flex: 1,
  },
  card: {
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderRadius: APPLE_CALM_THEME.radius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  stepEyebrow: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 19,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  clickCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: APPLE_CALM_THEME.radius.pill,
  },
  clickCounterText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 12,
    fontWeight: '600',
    color: '#64D2FF',
  },
  ufSegmentedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ufButton: {
    minWidth: 96,
    minHeight: 72,
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: 'rgba(9, 14, 28, 0.62)',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-between',
  },
  ufButtonActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#64D2FF',
  },
  ufTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  ufSiglaText: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  ufTempBadgeText: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64D2FF',
  },
  ufNameText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12,
    color: APPLE_CALM_THEME.colors.textSecondary,
    marginVertical: 2,
  },
  ufTextActive: {
    color: '#FFFFFF',
  },
  ufCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 4,
  },
  ufCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  ufCountText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  ufCountTextActive: {
    color: '#FFFFFF',
  },
  ibgeStatusChip: {
    backgroundColor: 'rgba(9, 14, 28, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
  },
  ibgeStatusText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: '#64D2FF',
  },
  searchInputWrapper: {
    minHeight: 50,
    backgroundColor: 'rgba(9, 14, 28, 0.72)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.28)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 15,
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  clearSearchBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonListContainer: {
    gap: 8,
  },
  skeletonCityRow: {
    height: 58,
    borderRadius: 14,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
  },
  cityGrid: {
    gap: 8,
  },
  cityRowButton: {
    minHeight: 60,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(9, 14, 28, 0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cityRowButtonActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#64D2FF',
  },
  cityInfoCol: {
    flex: 1,
  },
  cityNameText: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 15.5,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  cityIbgeText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 12,
    color: APPLE_CALM_THEME.colors.textMuted,
    marginTop: 2,
  },
  cityTextActive: {
    color: '#FFFFFF',
  },
  citySubtextActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  cityFireChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cityFireChipText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  moreCitiesBtn: {
    minHeight: 44,
    marginTop: 6,
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
  moreCitiesBtnText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64D2FF',
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  primaryMapActionBtn: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryMapActionText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  validationFeedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.35)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  validationFeedbackText: {
    flex: 1,
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    color: '#E2F8E8',
  },
  validationBold: {
    fontWeight: '700',
    color: '#30D158',
  },
  localSpotsList: {
    gap: 10,
  },
  localSpotItem: {
    backgroundColor: 'rgba(9, 14, 28, 0.6)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  localSpotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  localSpotTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 14.5,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  localSpotRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  localSpotRiskText: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 11.5,
    fontWeight: '700',
  },
  localSpotSource: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: '#64D2FF',
  },
  localSpotMeta: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 12,
    color: APPLE_CALM_THEME.colors.textSecondary,
    lineHeight: 18,
  },
  spotZoomLink: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 214, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.3)',
    justifyContent: 'center',
  },
  spotZoomLinkText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD60A',
  },
  coordInlineLink: {
    color: '#64D2FF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  spotActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  googleMapsActionPill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.38)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  googleMapsActionText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#30D158',
  },
  calmEmptyReport: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    color: APPLE_CALM_THEME.colors.textSecondary,
    lineHeight: 20,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
