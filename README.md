# Radar Fogo — Monitor de Queimadas Acessível (SNCT)

<p align="center">
  <img src="./public/logo-radar-fogo.png" alt="Logo Radar Fogo - IFPI Campus Floriano" width="160" style="border-radius: 34px;" />
</p>

> **Projeto Institucional:** **IFPI — Campus Floriano** (Instituto Federal do Piauí)  
> **Desenvolvimento:** **Turma TDS-3** (Técnico em Desenvolvimento de Sistemas)  
> **Supervisão e Orientação:** **Prof. Rennê Santos**  
> **Evento:** Semana Nacional de Ciência e Tecnologia (**SNCT / MCTI**)

---

## 1. Visão Geral & Design System (Estilo App *Tempo* do iOS • Dark Glass)

O **Radar Fogo** é um *Progressive Web App* (PWA) construído em **React Native com Expo Router**, projetado sob a estética **Apple iOS 18 Weather (*App Tempo*) Dark Glass** combinada com diretrizes de **acessibilidade cognitiva para TDAH e TEA Nível 1** (`CLS = 0.000` e isolamento municipal em `<= 3 cliques`).

### Destaques Visuais e Gráficos com Gradiente:
1. **Hero Atmosférico estilo App Tempo do iOS:** Exibição central de alto impacto com contagem orbital ativa, potência radiativa máxima (FRP em MW), resumo de severidade por bioma e filtro imediato para os 9 estados do Nordeste (`MA`, `PI`, `CE`, `RN`, `PB`, `PE`, `AL`, `SE`, `BA`), com destaque para **Floriano (PI)**.
2. **Curva Horária de Potência Radiativa (`FrpOrbitalAreaChart`):** Gráfico vetorial em curva de Bézier cúbica com preenchimento em gradiente térmico (`#FF453A` → `#FF9F0A` → transparente) mapeando as janelas orbitais de 10 a 30 minutos dos satélites `AQUA_M-T`, `NOAA-20`, `GOES-16`, `NPP-SUOMI` e `TERRA`.
3. **Barras de Amplitude Térmica por Estado (`StateThermalRangeBars`):** Inspirado na "Previsão de 10 Dias" do app Tempo do iOS, exibe cápsulas horizontais em gradiente multicolorido (`#30D158` → `#FFD60A` → `#FF9F0A` → `#FF453A`) comparando FRP mínimo e máximo de cada UF.
4. **Bento Grid Ambiental (`BentoEnvironmentalWidgets`):** Medidor de espectro contínuo de Risco de Ignição (estilo Índice UV / Qualidade do Ar da Apple) e distribuição proporcional por bioma (*Caatinga*, *Cerrado MATOPIBA* e *Mata Atlântica*).
5. **Radar Cartográfico Dark Glass:** Mapa vetorial interativo do Nordeste com halos térmicos em `<RadialGradient>`, clusterização limpa e controles de zoom acessíveis (`>= 48x48 dp`).

---

## 2. Estrutura Modular do Projeto

```text
/
├── app.json                             # Metadados PWA Dark Glass, ícone e identidade Radar Fogo / IFPI TDS-3
├── package.json                         # Dependências Expo Router, React Native Web e SVG
├── public/
│   ├── logo-radar-fogo.png              # Logo oficial 3D Dark Glass com "RADAR FOGO" em destaque
│   └── preview-snct.html                # Versão standalone para apresentação offline
└── app/
    ├── _layout.tsx                      # Tema Dark Glass (#070C18), Barra CENSIPAM/INPE e Faixa IFPI
    ├── components/
    │   └── IosWeatherWidgets.tsx        # Gráficos com gradiente (Curva FRP, Barras UF, Bento, Logo e Créditos)
    ├── (tabs)/
    │   ├── _layout.tsx                  # Tab Bar translúcida Dark Glass
    │   ├── index.tsx                    # Radar Nordeste + Hero Clima Fogo + Gráficos iOS Weather
    │   ├── consulta.tsx                 # Isolamento por UF e Município (API IBGE em <= 3 cliques)
    │   └── sobre.tsx                    # Créditos IFPI Campus Floriano (TDS-3 / Prof. Rennê Santos) e Artigo SNCT
    └── services/
        └── fireDataService.ts           # Integração INPE (10m), CENSIPAM (30m), IBGE e Clusterização
```

---

## 3. Como Executar Localmente

```bash
npm install
npm run web
```
Acesse no navegador: **http://localhost:8081**
