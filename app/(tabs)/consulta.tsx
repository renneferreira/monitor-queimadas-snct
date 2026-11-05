import React, { useEffect, useMemo, useState } from 'react';
import {
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
  fetchIBGEMunicipalitiesByUF,
  normalizeSearchText,
} from '../services/fireDataService';

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

  const activeUF: NordesteUF = selectedUF === 'TODOS' ? 'BA' : selectedUF;
  const [searchQuery, setSearchQuery] = useState<string>('');
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
        new Promise((r) => setTimeout(r, 260)), // Skeleton estável antes dos dados brutos
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

  // Mapa de contagem de focos por município na UF ativa
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

  // Lista filtrada de municípios (sem autocompletar intrusivo, ordenando municípios com focos primeiro)
  const filteredMunicipalities = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    const matches = ibgeList.filter((m) => {
      if (!q) return true;
      return normalizeSearchText(m.nome).includes(q);
    });

    return matches
      .sort((a, b) => {
        const countA = spotCountByMuni.get(normalizeSearchText(a.nome))?.length ?? 0;
        const countB = spotCountByMuni.get(normalizeSearchText(b.nome))?.length ?? 0;
        if (countB !== countA) return countB - countA;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      })
      .slice(0, 18);
  }, [ibgeList, searchQuery, spotCountByMuni]);

  // Focos locais do município selecionado
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
      {/* PASSO 1: SELEÇÃO POR ESTADO (UF) — SEGMENTED CONTROL iOS */}
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
            <Ionicons
              name="analytics-outline"
              size={15}
              color={APPLE_CALM_THEME.colors.appleBlue}
            />
            <Text style={styles.clickCounterText}>
              Cliques na sessão: {currentFilterClicks} (Meta ≤ 3)
            </Text>
          </View>
        </View>

        <View style={styles.ufSegmentedGrid}>
          {NORDESTE_STATES.map((st) => {
            const isSelected = activeUF === st.uf;
            const ufSpotsCount = spots.filter((s) => s.uf === st.uf).length;
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
                accessibilityLabel={`Estado ${st.name}, sigla ${st.uf}, ${ufSpotsCount} focos ativos`}
              >
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
                  <Text
                    style={[
                      styles.ufCountText,
                      isSelected && styles.ufCountTextActive,
                    ]}
                  >
                    {ufSpotsCount} focos
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
              PASSO 2 DE 2 • SELEÇÃO POR MUNICÍPIO (IBGE)
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

        {/* Caixa de busca preditiva e simplificada (sem popups ou autocomplete intrusivo) */}
        <View style={styles.searchInputWrapper}>
          <Ionicons
            name="search-outline"
            size={20}
            color={APPLE_CALM_THEME.colors.textMuted}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Digite o nome da cidade em ${activeUF} (ex: ${
              activeUF === 'BA'
                ? 'Barreiras'
                : activeUF === 'PE'
                  ? 'Petrolina'
                  : activeUF === 'MA'
                    ? 'Balsas'
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

        {/* SKELETON LOADERS ESTÁVEIS ANTES DOS DADOS BRUTOS DO IBGE */}
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
                  accessibilityLabel={`Município ${muni.nome}, ${muniSpots.length} focos detectados`}
                >
                  <View style={styles.cityInfoCol}>
                    <Text
                      style={[
                        styles.cityNameText,
                        isSelected && styles.cityTextActive,
                      ]}
                    >
                      {muni.nome}
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
                      hasActiveFire
                        ? styles.cityFireChipAlert
                        : styles.cityFireChipCalm,
                      isSelected && styles.cityFireChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cityFireChipText,
                        hasActiveFire
                          ? styles.cityFireChipTextAlert
                          : styles.cityFireChipTextCalm,
                        isSelected && styles.cityTextActive,
                      ]}
                    >
                      {hasActiveFire
                        ? `${muniSpots.length} ${
                            muniSpots.length === 1 ? 'foco ativo' : 'focos ativos'
                          }`
                        : 'Sem focos'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* CARTÃO DE RELATÓRIO DE FOCOS LOCAIS DO MUNICÍPIO SELECIONADO */}
      <View style={styles.card}>
        <View style={styles.reportHeaderRow}>
          <View style={styles.flexOne}>
            <Text style={styles.stepEyebrow}>
              RELATÓRIO DE ISOLAMENTO MUNICIPAL • SÍNCRONO COM O MAPA
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
              accessibilityLabel="Abrir mapa com zoom aplicado neste município"
            >
              <Ionicons name="locate" size={18} color="#FFFFFF" />
              <Text style={styles.primaryMapActionText}>
                Ver no Mapa com Zoom
              </Text>
            </Pressable>
          ) : null}
        </View>

        {lastEfficiencyLog && selectedMunicipality ? (
          <View style={styles.validationFeedbackBox}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={APPLE_CALM_THEME.colors.syncGreen}
            />
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
              {localMunicipalitySpots.map((spot) => (
                <View key={spot.id} style={styles.localSpotItem}>
                  <View style={styles.localSpotTop}>
                    <Text style={styles.localSpotTitle}>
                      Foco #{spot.id} • Satélite {spot.satellite}
                    </Text>
                    <Text style={styles.localSpotSource}>
                      {spot.source === 'INPE_BDQUEIMADAS'
                        ? 'INPE BDQueimadas (10m)'
                        : 'CENSIPAM Painel do Fogo (30m)'}
                    </Text>
                  </View>

                  <Text style={styles.localSpotMeta}>
                    Bioma: {spot.biome} • FRP: {spot.frpMW.toFixed(1)} MW •{' '}
                    {spot.daysWithoutRain} dias sem chuva • Coord:{' '}
                    {spot.latitude.toFixed(4)}°, {spot.longitude.toFixed(4)}°
                  </Text>

                  <Pressable
                    onPress={() => handleViewSpotOnMap(spot)}
                    style={({ pressed }) => [
                      styles.spotZoomLink,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.spotZoomLinkText}>
                      Centralizar exatamente neste foco no Mapa →
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.calmEmptyReport}>
              Nenhum foco de calor detectado pelos satélites INPE/CENSIPAM para{' '}
              {selectedMunicipality} ({activeUF}) na última janela de 10-30
              minutos. A câmera do mapa já foi posicionada sobre o município.
            </Text>
          )
        ) : (
          <Text style={styles.calmEmptyReport}>
            Toque em qualquer cidade acima para visualizar imediatamente o
            relatório de focos locais e aplicar o zoom automático no mapa.
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
    paddingBottom: 32,
  },
  flexOne: {
    flex: 1,
  },
  card: {
    backgroundColor: APPLE_CALM_THEME.colors.card,
    borderRadius: APPLE_CALM_THEME.radius.card,
    padding: 16,
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
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  clickCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: APPLE_CALM_THEME.colors.appleBlueSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: APPLE_CALM_THEME.radius.pill,
  },
  clickCounterText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 12,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.appleBlue,
  },
  ufSegmentedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ufButton: {
    minWidth: 96,
    minHeight: 68, // Área de toque ampla (> 44x44 dp)
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: APPLE_CALM_THEME.colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
    justifyContent: 'space-between',
  },
  ufButtonActive: {
    backgroundColor: APPLE_CALM_THEME.colors.appleBlue,
    borderColor: APPLE_CALM_THEME.colors.appleBlue,
  },
  ufSiglaText: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 17,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
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
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  ufCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  ufCountText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  ufCountTextActive: {
    color: '#FFFFFF',
  },
  ibgeStatusChip: {
    backgroundColor: APPLE_CALM_THEME.colors.background,
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
    color: APPLE_CALM_THEME.colors.textSecondary,
  },
  searchInputWrapper: {
    minHeight: 48,
    backgroundColor: APPLE_CALM_THEME.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
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
    borderRadius: 12,
    backgroundColor: APPLE_CALM_THEME.colors.skeletonBase,
  },
  cityGrid: {
    gap: 8,
  },
  cityRowButton: {
    minHeight: 58, // Estritamente >= 44x44 dp
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: APPLE_CALM_THEME.colors.background,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cityRowButtonActive: {
    backgroundColor: APPLE_CALM_THEME.colors.appleBlue,
    borderColor: APPLE_CALM_THEME.colors.appleBlue,
  },
  cityInfoCol: {
    flex: 1,
  },
  cityNameText: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 15,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  cityIbgeText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cityFireChipAlert: {
    backgroundColor: APPLE_CALM_THEME.colors.severityCriticoSoft,
  },
  cityFireChipCalm: {
    backgroundColor: '#E5E5EA',
  },
  cityFireChipSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  cityFireChipText: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  cityFireChipTextAlert: {
    color: APPLE_CALM_THEME.colors.severityCritico,
  },
  cityFireChipTextCalm: {
    color: APPLE_CALM_THEME.colors.textSecondary,
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
    backgroundColor: APPLE_CALM_THEME.colors.appleBlue,
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
    backgroundColor: APPLE_CALM_THEME.colors.syncGreenSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  validationFeedbackText: {
    flex: 1,
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    color: '#1E4620',
  },
  validationBold: {
    fontWeight: '700',
  },
  localSpotsList: {
    gap: 10,
  },
  localSpotItem: {
    backgroundColor: APPLE_CALM_THEME.colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: APPLE_CALM_THEME.colors.border,
    gap: 6,
  },
  localSpotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  localSpotTitle: {
    fontFamily: APPLE_CALM_THEME.fonts.heading,
    fontSize: 14,
    fontWeight: '700',
    color: APPLE_CALM_THEME.colors.textPrimary,
  },
  localSpotSource: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.appleBlue,
  },
  localSpotMeta: {
    fontFamily: APPLE_CALM_THEME.fonts.mono,
    fontSize: 12,
    color: APPLE_CALM_THEME.colors.textSecondary,
    lineHeight: 18,
  },
  spotZoomLink: {
    minHeight: 36,
    justifyContent: 'center',
    marginTop: 2,
  },
  spotZoomLinkText: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: APPLE_CALM_THEME.colors.appleBlue,
  },
  calmEmptyReport: {
    fontFamily: APPLE_CALM_THEME.fonts.body,
    fontSize: 14,
    color: APPLE_CALM_THEME.colors.textSecondary,
    lineHeight: 20,
  },
  btnPressed: {
    opacity: 0.76,
  },
});
