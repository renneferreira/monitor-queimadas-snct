# Monitor de Queimadas Acessível — SNCT (Foco: Região Nordeste)

Aplicativo Progressive Web App (PWA) desenvolvido em **React Native com Expo Router**, projetado segundo o **Apple Human Interface Guidelines (HIG)** com adaptações de acessibilidade cognitiva para **TDAH e TEA Nível 1**, destinado à apresentação e avaliação científica na **Semana Nacional de Ciência e Tecnologia (SNCT / MCTI)**.

---

## 1. Estrutura Modular do Projeto

```text
/
├── app.json                   # Configuração PWA, tema #F2F2F7 e metadados SNCT
├── package.json               # Dependências Expo Router, React Native Web e SVG
├── tsconfig.json              # Configuração TypeScript estrita
├── public/
│   └── preview-snct.html      # Versão interativa standalone (abre direto no navegador sem build)
└── app/
    ├── _layout.tsx            # Provedor global, Tema Apple (#F2F2F7) e Barra Fixa CENSIPAM/INPE
    ├── (tabs)/
    │   ├── _layout.tsx        # Navegação inferior por abas (Mapa, Consulta, Info & Artigo)
    │   ├── index.tsx          # Tela do Mapa Interativo com Foco no Nordeste e Clusters Limpos
    │   ├── consulta.tsx       # Filtros por UF (Segmented Control) e Cidade (API IBGE em <= 3 cliques)
    │   └── sobre.tsx          # Transparência das fontes (CENSIPAM/INPE) e Logs do Artigo Científico
    └── services/
        └── fireDataService.ts # Camada HTTP (INPE 10m / CENSIPAM 30m / API IBGE) e Clusterização
```

---

## 2. Como Executar

### Opção A — Executar via Expo Router (PWA / Mobile)
```bash
cd "C:\Users\PC\.gemini\antigravity\scratch\monitor-queimadas-snct"
npm install
npm run web
```

### Opção B — Visualização Imediata (Zero Build / Apresentação Offline SNCT)
Abra diretamente no navegador o arquivo:
`C:\Users\PC\.gemini\antigravity\scratch\monitor-queimadas-snct\public\preview-snct.html`

---

## 3. Diretrizes de Acessibilidade Cognitiva Implementadas (TDAH & TEA Nível 1)

1. **Fundo Previsível (`#F2F2F7`):** Reduz o brilho e a fadiga visual em comparação ao branco puro.
2. **Contraste e Isolamento (`#FFFFFF`, `borderRadius: 16`):** Agrupamento semântico de informações com baixo ruído sensorial.
3. **Indicação Temporal Clara (Cabeçalho Fixo):** Exibe permanentemente `"Fonte: CENSIPAM / INPE | Atualização automática a cada 10-30 min"` e o horário exato da última sincronização em azul Apple (`#007AFF`).
4. **Estabilidade Visual (`CLS = 0.000`):** *Skeleton Loaders* de dimensões fixas antecedem os dados brutos.
5. **Isolamento Municipal em $\le 3$ Cliques:** Seleção direta de UF (9 estados do Nordeste) + Município (integrado à API do IBGE) com zoom síncrono no mapa.
