---
name: radar-fogo-ui
description: Guia de redesenho visual do app Radar Fogo (PWA Expo + React Native, monitor de queimadas e temperaturas no Nordeste do Brasil). Use SEMPRE que o pedido envolver interface, layout, tema Dark Glass, cards, gráficos, animações, microinterações, acessibilidade ou "deixar o app mais bonito/profissional/intuitivo", mesmo que o usuário não cite esta skill. Aplica regras de design para público neurodivergente (TDAH e TEA nível de suporte 1) e usa repositórios open source do GitHub como referência visual.
---

# Radar Fogo — Skill de UI/UX

## Contexto do projeto

- **App:** Radar Fogo — monitor em tempo real de temperaturas e focos de queimada na região Nordeste do Brasil.
- **Produção:** https://radar-fogo-snct.vercel.app
- **Stack:** Expo + React Native, exportado como PWA (web). Também deve funcionar em Android/iOS.
- **Identidade atual:** PWA "Dark Glass" no estilo do app Tempo do iOS; `theme-color` `#070C18`. Dados do INPE/CENSIPAM.
- **Público:** pessoas com TDAH e TEA nível de suporte 1. A interface precisa ser calma, previsível e clara.
- **Ambiente de desenvolvimento:** IDE Antigravity, com Gemini como assistente de código.

## Objetivo

Deixar o app mais intuitivo, profissional e agradável, com mais elementos visuais interessantes e animações sutis, **sem exageros** e sem prejudicar a acessibilidade.

## Passo 0 — Antes de alterar qualquer coisa

1. Leia a estrutura do projeto (`package.json`, `app.json`/`app.config.*`, pasta de telas, componentes, tema/cores).
2. Liste as telas e os componentes existentes e o que cada um mostra (temperatura, focos, mapa, alertas etc.).
3. Identifique como o estilo é feito hoje (StyleSheet, NativeWind, tema próprio) e **mantenha essa abordagem**, a menos que o usuário peça migração.
4. Proponha um plano curto por tela e **peça confirmação** antes de mudanças grandes.
5. Faça mudanças incrementais, uma tela ou componente por vez, sempre mantendo o app funcionando.

## Princípios para público neurodivergente

**Estrutura e previsibilidade**
- Mesma estrutura em todas as telas: título, resumo, detalhes. Controles sempre nas mesmas posições.
- Primeiro um **resumo simples** (ex.: "Risco de fogo: Alto", temperatura atual); detalhes só ao tocar ou expandir (divulgação progressiva).
- Um objetivo principal por tela. Evite excesso de cards, abas e informações simultâneas.
- Textos curtos, linguagem direta, sem jargão técnico sem explicação.

**Cor e contraste**
- Contraste mínimo WCAG AA (4.5:1 para texto). Evite brilhos e neon muito saturado sobre fundo escuro.
- **Nunca use só a cor** para indicar risco. Combine cor + ícone + texto ("Alto").
- Paleta pequena e consistente, definida como tokens (ver abaixo). O efeito glass deve ser discreto, sem blur excessivo que reduza a legibilidade.

**Movimento (regras rígidas)**
- Respeitar `prefers-reduced-motion` (web) e `AccessibilityInfo.isReduceMotionEnabled()` (nativo). Oferecer também um **interruptor "Reduzir animações"** nas configurações do app.
- Duração entre **150 ms e 300 ms**, easing suave (ease-out). Sem molas exageradas.
- Movimento só para comunicar **mudança de estado** (dado atualizado, card expandido, troca de tela).
- Proibido: loops infinitos, piscadas, flashes, parallax, animações que disputam atenção ao mesmo tempo, auto-play de vídeo.
- Uma animação principal por vez na tela. Dados em tempo real devem atualizar com transição curta de valor, sem chamar atenção repetidamente.
- Indicador de "atualizando" discreto e estático ou com fade simples.

**Interação**
- Alvos de toque de no mínimo 44×44 px. Feedback visual claro ao tocar (opacidade ou escala sutil, até 0.97).
- Estados de carregamento com **skeleton estático** ou fade, sem spinners agressivos.
- Mensagens de erro calmas e acionáveis ("Não foi possível atualizar. Tentar de novo").

## Tokens de design (adaptar ao tema existente)

Definir em um único arquivo de tema, por exemplo `theme/tokens.ts`:

- **Fundo:** base `#070C18` (já usado), superfícies em camadas levemente mais claras.
- **Glass:** fundo semitransparente (alpha 0.06–0.12), borda de 1 px com alpha baixo, blur moderado.
- **Níveis de risco de fogo:** baixo, médio, alto, crítico — cada um com cor, ícone e rótulo próprios.
- **Tipografia:** uma família (ex.: Inter ou a fonte do sistema), 3 a 4 tamanhos, bom espaçamento entre linhas.
- **Espaçamento:** escala de 4/8 px. **Raio:** 12–20 px para cards.
- **Animação:** constantes `DURATION_FAST = 150`, `DURATION_BASE = 250`, `DURATION_SLOW = 300`.

## Bibliotecas recomendadas (Expo + PWA)

| Necessidade | Opção | Observação |
|---|---|---|
| Base de componentes e tokens | gluestack-ui + NativeWind | Funciona em Expo e web; componentes copia-e-cola |
| Animações de estado | react-native-reanimated | Suporta modo de movimento reduzido |
| Microinterações simples | Moti | Camada declarativa sobre o Reanimated |
| Gráficos e efeitos visuais | react-native-skia | Usar com moderação; checar suporte web antes |
| Design system alternativo | UI Kitten (Eva) | Mais rígido; usar só como referência de telas |

Antes de instalar qualquer biblioteca, **confirme compatibilidade com a versão do Expo SDK do projeto e com a build web**.

## Fontes de inspiração (GitHub)

Usar para **referência visual e de padrões de animação**. Não copiar código de outro framework nem assets; reimplementar em React Native. Verifique a licença de cada repositório antes de reutilizar qualquer trecho.

1. **Best-Flutter-UI-Templates** (Flutter) — cards de dashboard, anéis de progresso, gráficos e transições.
   https://github.com/mitesh77/Best-Flutter-UI-Templates
2. **flutter_ui_challenges** (Flutter) — catálogo de telas e clones de apps (dashboards, onboarding, listas, navegação, animações).
   https://github.com/lohanidamodar/flutter_ui_challenges
3. **UI Kitten** (React Native) — design system baseado no Eva, tema claro/escuro.
   https://github.com/akveo/react-native-ui-kitten
4. **Kitten Tricks** (React Native) — app de exemplo com cerca de 40 telas prontas.
   https://github.com/akveo/kittenTricks
5. **gluestack-ui** (React Native + web) — base recomendada de componentes.
   https://github.com/gluestack/gluestack-ui
6. **react-native-reanimated** — https://github.com/software-mansion/react-native-reanimated
7. **Moti** — https://github.com/nandorojo/moti
8. **react-native-skia** — https://github.com/Shopify/react-native-skia

## Receitas de melhoria visual

Aplicar uma de cada vez, validando no navegador (PWA) e no celular.

1. **Card de resumo principal (hero):** cidade/região, temperatura grande e nível de risco com ícone + texto. Entrada com fade de 250 ms. Inspiração: cards de dashboard do Best-Flutter-UI-Templates.
2. **Anel ou barra de nível de risco:** preenchimento animado uma única vez ao carregar (250–300 ms), com valor também em texto. Sem animação contínua.
3. **Lista de focos por estado/município:** cards em glass com ícone de risco, contagem e variação. Expansão ao toque com altura animada em 200 ms.
4. **Gráfico de temperatura (linha ou barras):** traço simples, poucas linhas de grade, rótulos legíveis. Transição de dados com fade/morph curto.
5. **Navegação inferior:** no máximo 4 destinos, ícone + rótulo sempre visíveis, indicador de aba ativa com transição leve.
6. **Estados vazios, de carregamento e de erro:** ilustração simples e estática, texto curto e botão claro.
7. **Mapa:** camadas e legenda simples; evitar marcadores pulsando. Destacar só o que é relevante ao filtro atual.
8. **Onboarding opcional:** até 3 telas curtas explicando o que o app mostra e o significado das cores/ícones, com opção de pular.

## Checklist de entrega (conferir antes de concluir cada tarefa)

- [ ] Funciona no PWA (web) e não quebra no nativo.
- [ ] Respeita movimento reduzido e há interruptor nas configurações.
- [ ] Nenhuma animação em loop, piscada ou parallax.
- [ ] Contraste AA em textos e ícones; risco nunca indicado só por cor.
- [ ] Alvos de toque ≥ 44 px; textos curtos e consistentes.
- [ ] Sem regressão nos dados em tempo real (INPE/CENSIPAM).
- [ ] Sem dependência nova sem checar compatibilidade com o Expo SDK.
- [ ] Desempenho: sem animações pesadas em listas longas.
- [ ] Resumo das mudanças explicado em linguagem simples ao final.

## Como responder ao usuário

- Explique cada mudança em poucas linhas e diga o motivo (acessibilidade, clareza, consistência).
- Se algo conflitar com os princípios acima (ex.: pedido de animação intensa), proponha uma alternativa mais sutil em vez de simplesmente obedecer ou recusar.
- Pergunte antes de remover funcionalidades ou trocar a stack de estilo.

