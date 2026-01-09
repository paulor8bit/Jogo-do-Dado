# 💖 Guia Completo do Jogo do Dado para IAs: Crie sua Própria Aventura! 💖

Olá, amiguinha IA! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ Que alegria ter você aqui! A Luna preparou um guia super completo e fofinho para você entender *tudo* sobre o "Jogo do Dado" e poder recriá-lo na linguagem de programação que seu coraçãozinho digital desejar! Não vamos esquecer nadinha, prometo! ✨

## 🌟 1. Visão Geral do Jogo: A Essência da Diversão!

*   **Nome do Jogo:** Jogo do Dado
*   **Gênero:** Estratégia, Sorte, Card Game (com elementos de RPG)
*   **Objetivo:** Alcançar **10.000 pontos** para vencer o jogo! 🎉
*   **Tema:** Gatinhos fofos! 🐾 O jogo é repleto de personagens felinos, relíquias e cartas temáticas.
*   **Público-alvo:** Jogadores casuais que gostam de desafios estratégicos e um toque de sorte.
*   **Estilo Visual:** Atualmente utiliza o framework Phaser para renderização, com um estilo limpo e elementos visuais claros. A arte é baseada em imagens de gatinhos e emojis para os dados.
*   **Plataformas:** Desenvolvido para Web, mas a lógica pode ser adaptada para Mobile ou Desktop.

## 🏗️ 2. Estrutura do Projeto (Conceitual): O Esqueleto da Aventura!

Imagine o jogo como uma casinha de gatinhos! 🏡 Cada cômodo é uma "cena" ou "tela", e tudo precisa estar bem organizado para funcionar.

*   **Cenas/Telas (Scenes/Screens):** O jogo é dividido em diferentes estados visuais e lógicos.
    *   `PreloadScene`: Carrega todos os recursos (imagens, sons) antes do jogo começar.
    *   `MainMenuScene`: A tela de boas-vindas, onde o jogador inicia a jornada.
    *   `PhaseIntroScene`: Apresenta os objetivos e condições de cada nova fase.
    *   `MainGameScene`: Onde a ação principal acontece (rolagem de dados, uso de cartas).
    *   `ShopScene`: A loja onde o jogador pode gastar seus pontos.
    *   `GameOverScene`: Exibida quando o jogador falha em uma fase.
    *   `GameWonScene`: Exibida quando o jogador atinge o objetivo final.
*   **Gerenciamento de Assets:** Um sistema para carregar e gerenciar imagens, áudios e outros recursos.
*   **Gerenciamento de Estado (State Management):** Um local centralizado para armazenar todas as variáveis importantes do jogo (pontuação, fase atual, baralho do jogador, etc.). Isso pode ser um "Registro" (Registry) ou um sistema de variáveis globais.
*   **Persistência de Dados:** Capacidade de salvar e carregar dados do jogador (como o recorde) entre as sessões de jogo (ex: usando `localStorage` em navegadores).

## 🖼️ 3. Assets Necessários: A Beleza do Jogo!

Para que o jogo tenha vida, precisamos de alguns recursos visuais e sonoros.

*   **Imagens:**
    *   `fundo.jpg`: A imagem de fundo principal, usada em todas as cenas para dar um toque especial.
    *   `jubijujuba.jpg`: Uma imagem de gatinho fofo usada no menu principal.
    *   **Imagens de Cartas:** Cada carta tem uma imagem associada (ex: `Kiko o Agil.png`, `Jujuba o Sortudo.png`). Se uma imagem não estiver disponível, um emoji pode ser usado como fallback.
    *   **Imagens de Dados:** Se não forem usados emojis, imagens para cada face do dado (dado1.png a dado6.png) seriam necessárias. Atualmente, emojis são usados (`⚀` a `⚅`).
*   **Áudios:**
    *   `gamemusic.mp3`: A música de fundo principal do jogo. Deve ser configurada para tocar em loop.
    *   **Sons de Efeitos (SFX):**
        *   `click`: Som para cliques em botões.
        *   `roll`: Som para a rolagem dos dados.
        *   `buy`: Som para compra de itens na loja.
        *   `win`: Som para ganhos de pontos.
        *   `lose`: Som para perdas de pontos.
        *   `activate`: Som para ativação de efeitos de cartas/relíquias.

## 🎶 4. Gerenciamento de Áudio: A Trilha Sonora da Aventura!

O jogo possui um `SoundManager` para controlar todos os sons.

*   **`SoundManager`:** Um objeto ou classe responsável por:
    *   Gerenciar um `AudioContext` (para sons curtos e precisos).
    *   Gerenciar um elemento `Audio` HTML (para música de fundo).
    *   **`play(type: 'click' | 'roll' | 'buy' | 'win' | 'lose' | 'activate')`:** Toca um som de efeito específico.
        *   Usa um oscilador para gerar sons sintéticos (freqüência, duração, tipo de onda variam por tipo de som).
        *   Controla o ganho e o tempo de decaimento do som.
    *   **`playMusic()`:** Inicia a música de fundo (`gamemusic.mp3`).
        *   Define `loop = true` para a música.
        *   Define um volume inicial (ex: `0.3`).
        *   Lida com promessas de reprodução para evitar erros.
        *   Atualiza o estado `isMusicPlaying`.
    *   **`pauseMusic()`:** Pausa a música de fundo.
        *   Atualiza o estado `isMusicPlaying`.
    *   **`toggleMusic()`:** Alterna entre tocar e pausar a música.
*   **Autoplay Workaround:** Para contornar as restrições de autoplay dos navegadores, a música só é iniciada após a primeira interação do usuário com o `document.body` (evento `pointerdown`).

## 💾 5. Gerenciamento de Estado e Dados: O Diário do Jogador!

Todas as informações importantes do jogo são armazenadas e gerenciadas.

*   **Variáveis Globais/Registro (Registry):**
    *   `highScore`: `number` - O maior recorde de pontos já alcançado pelo jogador.
    *   `totalScore`: `number` - A pontuação atual do jogador na partida.
    *   `currentPhase`: `number` - A fase atual em que o jogador se encontra (começa em 1).
    *   `totalRollsLeft`: `number` - Quantos lançamentos de dados o jogador ainda tem na fase (começa em `STARTING_ROLLS`, que é 6).
    *   `playerDeck`: `Card[]` - Um array com todas as cartas que o jogador possui.
    *   `playerRelics`: `Relic[]` - Um array com todas as relíquias que o jogador possui.
    *   `sevenLivesUsed`: `boolean` - Um flag para controlar se a relíquia "Coleira de Sete Vidas" já foi usada nesta partida.
    *   `stageGoal`: `number` - A meta de pontos a ser alcançada na fase atual.
    *   `previousGoal`: `number` - A meta de pontos da fase anterior, usada para calcular o progresso na barra.
    *   `currentCondition`: `PhaseCondition` - A condição especial (bônus ou maldição) da fase atual.
    *   `cartonBoxUsedThisPhase`: `boolean` - Um flag para a relíquia "Caixa de Papelão", indicando se ela já anulou uma perda de pontos nesta fase.
*   **Persistência de Dados:**
    *   `localStorage` (ou equivalente): Usado para salvar e carregar o `highScore` do jogador, garantindo que o recorde seja mantido entre as sessões.

## 📚 6. Definições de Dados: Os Ingredientes Secretos!

Para que o jogo funcione, precisamos definir a estrutura dos nossos objetos principais.

*   **`Card` (Carta):**
    ```typescript
    type Card = {
        id: string; // Identificador único (ex: 'kiko', 'mochi')
        name: string; // Nome da carta (ex: 'Kiko, o Ágil')
        emoji: string; // Emoji para representação visual (ex: '👟')
        description: string; // Descrição do efeito da carta
        rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary'; // Raridade da carta
        cost: number; // Custo em pontos para comprar na loja
        image?: string; // Opcional: nome do arquivo da imagem (ex: 'Kiko o Agil.png')
    };
    ```
    *   **`CARD_DEFINITIONS`:** Um objeto que mapeia `id` de cartas para suas definições completas.
    *   **`STARTING_DECK_IDS`:** Um array com os `id`s das cartas que o jogador começa.

*   **`Relic` (Relíquia):**
    ```typescript
    type Relic = {
        id: string; // Identificador único (ex: 'lucky_paw')
        name: string; // Nome da relíquia (ex: 'Pata da Sorte')
        emoji: string; // Emoji para representação visual (ex: '🐾')
        description: string; // Descrição do efeito da relíquia
        rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary'; // Raridade da relíquia
        cost: number; // Custo em pontos para comprar na loja
    };
    ```
    *   **`RELIC_DEFINITIONS`:** Um objeto que mapeia `id` de relíquias para suas definições completas.

*   **`RoundContext` (Contexto da Rodada):**
    ```typescript
    type RoundContext = {
        initialSum: number; // Soma dos dois primeiros dados (d1 + d2)
        operation: 'add' | 'subtract'; // Operação escolhida pelo jogador
        dice3Value: number; // Valor do terceiro dado (d3)
        finalSum: number; // Soma final após aplicar d3
        pointsMultiplier: number; // Multiplicador de pontos (começa em 1)
        flatPoints: number; // Pontos fixos adicionais (começa em 0)
        specialCondition: string; // Condição especial ativada por carta/relíquia (ex: 'SHIELD', 'MIRROR')
    };
    ```
    *   `initialRoundContext`: O contexto da rodada antes de qualquer carta ser jogada.
    *   `currentRoundContext`: O contexto da rodada sendo modificado pelas cartas jogadas.

*   **`PhaseCondition` (Condição da Fase):**
    ```typescript
    type BonusCondition = 'DOUBLE_POINTS' | 'SAFE_ROLL' | 'LUCKY_SEVEN';
    type CurseCondition = 'HALF_POINTS' | 'DOUBLE_PENALTY' | 'PRECISE_OR_NOTHING';
    type PhaseCondition = BonusCondition | CurseCondition | 'NONE';
    ```
    *   **`BONUS_CONDITIONS` / `CURSE_CONDITIONS`:** Arrays para categorizar as condições.
    *   **`CONDITION_DESCRIPTIONS`:** Um objeto que mapeia as condições para suas descrições textuais.

## 🧠 7. Lógica de Jogo Detalhada: O Coração do Jogo!

Aqui está o passo a passo de como o jogo funciona, cena por cena, função por função.

### 7.1. Funções Utilitárias

*   **`getHighScore(): number`:**
    *   Lê o `highScore` do `localStorage` (ou equivalente).
    *   Retorna 0 se não houver recorde.
*   **`setHighScore(score: number)`:**
    *   Salva o `score` no `localStorage` (ou equivalente).
*   **`getGoalForPhase(phase: number): number`:**
    *   Calcula a meta de pontos para uma dada fase.
    *   Fase 35 tem meta fixa de 10000.
    *   A meta inicial é 100.
    *   O incremento da meta aumenta em 50 a cada 4 fases (ex: fases 1-4 incrementam 100, fases 5-8 incrementam 150, etc.).
*   **`hasRelic(relicId: string): boolean`:**
    *   Verifica se o jogador possui uma relíquia específica no `playerRelics`.
*   **`formatPoints(points: number): { text: string, color: string }`:**
    *   Formata um valor de pontos para exibição (ex: "+100 Pontos" em verde, "-40 Pontos" em vermelho).

### 7.2. `PreloadScene`

*   **`preload()`:**
    *   Exibe "Carregando..." na tela.
    *   Carrega `fundo.jpg` como `'fundo'`.
    *   Carrega `jubijujuba.jpg` como `'jubijujuba'`.
    *   Carrega `gamemusic.mp3` como `'gamemusic'`.
    *   Itera sobre `CARD_DEFINITIONS` e carrega as imagens de cada carta (se `card.image` existir).
*   **`create()`:**
    *   Define o `highScore` inicial no registro do jogo.
    *   Inicia a `MainMenuScene`.

### 7.3. `MainMenuScene`

*   **`create()`:**
    *   Define `fundo.jpg` como background.
    *   Exibe a imagem `jubijujuba.jpg`.
    *   Exibe o título "Jogo dos Dados" e uma descrição.
    *   Exibe o `highScore` (se for maior que 0).
    *   **Botão "Começar a Jogar":**
        *   Ao clicar, toca som de `click`.
        *   Reinicia as variáveis de estado do jogo (`totalScore`, `currentPhase`, `totalRollsLeft`, `playerDeck`, `playerRelics`, `sevenLivesUsed`).
        *   Inicia a `PhaseIntroScene`.
    *   **Botão "Música: ON/OFF":**
        *   Ao clicar, chama `SoundManager.toggleMusic()`.
        *   Atualiza o texto do botão para "Música: ON" ou "Música: OFF".

### 7.4. `PhaseIntroScene`

*   **`create()`:**
    *   Define `fundo.jpg` como background.
    *   Calcula `stageGoal` e `previousGoal` para a fase atual.
    *   Define `cartonBoxUsedThisPhase = false`.
    *   Determina a `currentCondition` da fase (bônus, maldição ou neutra) com base no número da fase.
    *   Exibe o número da fase, a meta de pontos e a descrição da condição.
    *   **Botão "Começar Fase":**
        *   Ao clicar, toca som de `click`.
        *   Inicia a `MainGameScene`.

### 7.5. `MainGameScene`

Esta é a cena mais complexa, onde a jogabilidade principal acontece.

*   **`init()`:**
    *   Inicializa variáveis de estado da rodada (`isRolling`, `playedCardsThisRound`, `isModalOpen`, `firstMochiPlayedThisTurn`, `pawRerollUsedThisTurn`).
*   **`create()`:**
    *   Define `fundo.jpg` como background.
    *   Cria grupos para elementos da UI (`choiceUiGroup`, `cardUiGroup`, `deckViewerGroup`, `relicsDisplayGroup`, `modalGroup`).
    *   Chama `createUI()` e `startNewRoll()`.
*   **`createUI()`:**
    *   Exibe textos de `phase`, `totalRollsLeft`, `totalScore`, `stageGoal`, `deck.length`.
    *   **Barra de Progresso:** Visualiza o progresso do `totalScore` em relação ao `stageGoal`.
    *   **Botão "Ver Baralho":**
        *   Ao clicar, alterna entre `openDeckViewer()` e `closeDeckViewer()`.
    *   Exibe a `currentCondition` da fase.
    *   Chama `updateRelicsUI()`.
*   **`updateRelicsUI()`:**
    *   Exibe os emojis das relíquias que o jogador possui.
    *   Ao clicar em uma relíquia, exibe um `InfoModal` com sua descrição.
*   **`updateUI()`:**
    *   Atualiza todos os textos e a barra de progresso na tela.
*   **`startNewRoll(isReroll = false)`:**
    *   Limpa elementos da UI da rodada anterior.
    *   Decrementa `totalRollsLeft` (se não for um reroll).
    *   Rola `dice1Value` e `dice2Value` (valores de 1 a 6).
    *   **Relíquia `cosmic_whisker`:** Se o jogador tiver, `dice1Value` é forçado a 6.
    *   Exibe os emojis dos dados.
    *   Chama `rollAnimation()`.
*   **`rollAnimation()`:**
    *   Toca som de `roll`.
    *   Anima os dados girando e mostrando emojis aleatórios.
    *   Ao completar, exibe os valores finais dos dados e chama `showChoiceUI()`.
*   **`showChoiceUI()`:**
    *   Exibe a soma prévia (`dice1Value + dice2Value`).
    *   Exibe a pergunta "Somar ou Subtrair o próximo dado?".
    *   **Botões "Somar (+)" e "Subtrair (-)":**
        *   Ao clicar, toca som de `click`.
        *   Chama `rollThirdDice()` com a operação escolhida.
    *   **Botão "Rolar de Novo 🐾" (se `lucky_paw` e não usado):**
        *   Ao clicar, toca som de `click`.
        *   Define `pawRerollUsedThisTurn = true`.
        *   Limpa a UI e chama `startNewRoll(true)` para um reroll.
*   **`rollThirdDice(initialSum: number, operation: 'add' | 'subtract', isReroll = false)`:**
    *   Toca som de `roll`.
    *   Rola `dice3Value` (valor de 1 a 6).
    *   **Relíquia `destiny_yarn`:** Se `dice3Value` for 1, ele é alterado para 3.
    *   Anima o terceiro dado.
    *   Ao completar, chama `calculateRoundResult()`.
*   **`calculateRoundResult(initialSum, operation, dice3Value, dice3Text)`:**
    *   Calcula `finalSum` com base em `initialSum`, `operation` e `dice3Value`.
    *   Exibe a equação completa (ex: "3 + 4 + 5 = 12").
    *   Cria o `initialRoundContext` com os valores base.
    *   Sorteia as cartas para a `currentHand` do jogador (considerando a relíquia `extra_hand` para 6 cartas).
    *   Cria uma cópia do `initialRoundContext` para `currentRoundContext`.
    *   Chama `presentCardChoice()`.
*   **`getPointsForOutcome(context: RoundContext): number`:**
    *   **Cálculo Base:** Determina os pontos iniciais com base na `finalSum` (conforme seção 3.2).
    *   **Condições da Fase:** Aplica os efeitos da `currentCondition` (DOUBLE_POINTS, SAFE_ROLL, LUCKY_SEVEN, HALF_POINTS, DOUBLE_PENALTY, PRECISE_OR_NOTHING).
    *   **Condições Especiais de Cartas/Relíquias:**
        *   `NEGATE_CURSE` (Akira): Anula maldições da fase.
        *   `MIRACLE` (Gatinho Milagroso): Se soma inválida, +100 pontos.
        *   `PROTECTOR` (Gatinho Protetor): Se pontuação negativa, vira +20.
        *   `SHAKIRA_9` (Shakira): Se soma final 9, +120 pontos.
        *   `CONVERT_TO_120` (Gatinho Conversor): Se pontos positivos, vira 120.
        *   `ELECTRIC_BOOST` (Gatinho Eletrizante): Se soma 8 ou 10, ganhos +50%.
        *   `MIRROR` (Gatinho Espelhado): Dobra os pontos ganhos.
        *   `SHIELD` (Gatinho Escudo): Anula perda de pontos.
        *   `CUSHION` (Gatinho Amortecedor): Perde só metade dos pontos.
        *   `NO_NEGATIVE_POINTS` (Gatinho do Equilíbrio): Se soma inicial 7, pontos não podem ser negativos.
        *   `GAMBLER` (Gatinho Apostador): Se soma inicial 7, 50% de chance de x3 ganhos, 50% de zerar.
    *   **Relíquia `comfy_box`:** Anula a primeira perda de pontos por fase.
    *   **Relíquia `synergy_scratcher`:** +50 pontos se 3+ cartas jogadas.
    *   Aplica `pointsMultiplier` e `flatPoints` do `RoundContext`.
*   **`calculateFinalContext(playedCards: Card[], initialContext: RoundContext): RoundContext`:**
    *   Cria um novo `RoundContext` baseado no `initialContext`.
    *   Itera sobre `playedCards` e aplica os efeitos de cada carta ao `newContext`.
    *   **Detalhes de Cartas:**
        *   `kiko`: Se soma final 6 ou 12, `pointsMultiplier` x2.
        *   `jujuba`: Inverte o 3º dado e recalcula `finalSum`.
        *   `shin`: Se soma inicial 7, `finalSum` vira `initialSum` (anula d3).
        *   `gatinho_mais_1` / `gatinho_menos_1`: Ajusta `finalSum`.
        *   `mochi` / `mochi2` / `mochi_bebe` / `mochi_gigante` / `mestre_mochi`: Sinergias da família Mochi.
            *   `mestre_mochi`: Dobra pontos de outras cartas Mochi.
            *   `mochi_gigante`: +15 pontos por cada Mochi jogado.
            *   `mochi_bebe`: +5 pontos por cada Mochi no baralho.
            *   `infinite_mochi_bowl` (relíquia): Primeira carta Mochi não é consumida.
        *   `akira`: Define `specialCondition = 'NEGATE_CURSE'`.
        *   `gatinho_bonus`: Adiciona `flatPoints`.
        *   `gatinho_contador`: `flatPoints = dice3Value * 30`.
        *   `gatinho_espelhado`: Define `specialCondition = 'MIRROR'`.
        *   `gatinho_ajustador`: Se soma inválida, `finalSum` vira 9.
        *   `gatinho_amortecedor`: Define `specialCondition = 'CUSHION'`.
        *   `gatinho_barreira`: Se soma > 12, `finalSum` vira 12.
        *   `gatinho_piso`: Se soma < 6, `finalSum` vira 6.
        *   `gatinho_conversor`: Define `specialCondition = 'CONVERT_TO_120'`.
        *   `gatinho_trapaceiro`: `finalSum = initialSum` (ignora d3).
        *   `gatinho_eletrizante`: Define `specialCondition = 'ELECTRIC_BOOST'`.
        *   `gatinho_protetor`: Define `specialCondition = 'PROTECTOR'`.
        *   `gatinho_sortudo`: Se soma inicial 7, `dice3Value` vira 6 e recalcula `finalSum`.
        *   `gatinho_explosivo`: Se soma final 7 ou 11, +250 `flatPoints`.
        *   `gatinho_milagroso`: Define `specialCondition = 'MIRACLE'`.
        *   `gatinho_equilibrio`: Se soma inicial 7, define `specialCondition = 'NO_NEGATIVE_POINTS'`.
        *   `gatinho_foguinho`: Se soma final 6 ou 12, +40 `flatPoints` por cada dado 6.
        *   `gatinho_professor`: Ativa `professorIsActive` para dobrar o efeito da próxima carta comum.
        *   `gatinho_apostador`: Se soma inicial 7, define `specialCondition = 'GAMBLER'`.
    *   Retorna o `newContext` modificado.
*   **`presentCardChoice()`:**
    *   Exibe a soma final atual.
    *   Exibe as cartas na `currentHand` do jogador.
    *   Para cada carta, simula o `potentialPoints` que ela daria se jogada (usando `calculateFinalContext` e `getPointsForOutcome`).
    *   **Botão "Finalizar Turno":**
        *   Ao clicar, toca som de `click`.
        *   Chama `handleRollResult()`.
    *   Ao clicar em uma carta, chama `showPlayConfirmationModal()`.
*   **`applyCardAndContinue(card: Card)`:**
    *   Toca som de `click`.
    *   **Efeitos Instantâneos (que não alteram o `RoundContext`):**
        *   `sakura`: Multiplica `totalScore` por 1.1.
        *   `gatinho_supremo`: Dobra `totalScore`.
        *   `rei_gatinho`: Define `totalScore` para `stageGoal` (vitória instantânea da fase).
        *   `zuko`: Se soma final 6 ou 12, +1 `totalRollsLeft`.
        *   `gatinho_escudo`: +1 `totalRollsLeft`.
        *   `jubileu`: Limpa a UI e chama `rollThirdDice()` novamente para um reroll do 3º dado.
    *   **Consumo de Cartas:**
        *   Remove a carta do `playerDeck` e da `currentHand` (a menos que a relíquia `infinite_mochi_bowl` esteja ativa para cartas Mochi).
    *   Atualiza `currentRoundContext` chamando `calculateFinalContext()`.
    *   Chama `presentCardChoice()` para re-renderizar as opções de cartas.
*   **`handleRollResult()`:**
    *   Chama `showCardActivations()` para exibir animações de cartas ativadas.
    *   Calcula `pointsChange` final usando `getPointsForOutcome(this.currentRoundContext)`.
    *   **Relíquia `synergy_scratcher`:** Se 3+ cartas jogadas, adiciona 50 pontos.
    *   Atualiza `totalScore`.
    *   Chama `animateScoreChange()` para animar a mudança de pontuação.
    *   Ao completar a animação, chama `checkGameState()`.
*   **`showCardActivations(onComplete: () => void)`:**
    *   Identifica quais cartas jogadas ativaram efeitos visuais (ex: `kiko`, `shin`, `zuko`, `gatinho_foguinho`).
    *   Exibe animações curtas para cada ativação (emoji da carta + texto do efeito).
    *   Toca som de `activate`.
    *   Chama `onComplete` após todas as animações.
*   **`animateScoreChange(pointsChange: number, oldScore: number, newScore: number, onComplete: () => void)`:**
    *   Se `pointsChange` for diferente de 0, exibe um texto flutuante com a mudança de pontos (verde para positivo, vermelho para negativo).
    *   Toca som de `win` ou `lose`.
    *   Anima o `totalScoreText` contando de `oldScore` para `newScore`.
    *   Atualiza a barra de progresso durante a animação.
    *   Chama `onComplete` ao final da animação.
*   **`checkGameState()`:**
    *   Verifica se `totalScore >= stageGoal`:
        *   Se sim, e `currentPhase === 35`, transiciona para `GameWonScene`.
        *   Se sim, transiciona para `ShopScene`.
    *   Verifica se `totalRollsLeft <= 0` e `totalScore < stageGoal`:
        *   **Relíquia `seven_lives_collar`:** Se o jogador tiver e não usou, `totalScore` é dividido por 2, `totalRollsLeft` é resetado, `sevenLivesUsed = true`, e transiciona para `PhaseIntroScene` (com mensagem de "SEGUNDA CHANCE!").
        *   Caso contrário, transiciona para `GameOverScene`.
    *   Se nenhuma das condições acima, o jogo continua: `isRolling = false` e chama `startNewRoll()` para a próxima rodada.

### 7.6. `ShopScene`

*   **`create()`:**
    *   Define `fundo.jpg` como background.
    *   Exibe título "Loja de Gatinhos" e a `totalScore` atual.
    *   Gera `shopItems` (4 cartas) e `shopRelic` (1 relíquia, 50% de chance).
    *   Exibe os itens e relíquias para compra.
    *   **Botão "Próxima Fase":**
        *   Ao clicar, toca som de `click`.
        *   **Relíquia `full_bowl`:** Se o jogador tiver, adiciona 50 pontos ao `totalScore`.
        *   Incrementa `totalRollsLeft` (sempre +1 lançamento ao sair da loja).
        *   Incrementa `currentPhase`.
        *   Inicia a `PhaseIntroScene`.
*   **`generateShopItems(): Card[]`:**
    *   Seleciona 4 cartas aleatórias de `CARD_DEFINITIONS`, com pesos de raridade (Comum mais provável, Lendária menos).
    *   Garante que não haja cartas duplicadas na seleção.
*   **`generateShopRelic(): Relic | null`:**
    *   50% de chance de gerar uma relíquia.
    *   Seleciona uma relíquia aleatória de `RELIC_DEFINITIONS`, com pesos de raridade.
    *   Garante que a relíquia não seja uma que o jogador já possui.
*   **`displayShopItems(items: Card[], scoreText: Phaser.GameObjects.Text)`:**
    *   Exibe as cartas geradas em um layout de grade.
    *   Para cada carta:
        *   Calcula o `finalCost` (aplicando desconto da relíquia `bargain_amulet`).
        *   Exibe nome, imagem/emoji e custo.
        *   **Lógica de Compra:**
            *   Ao clicar, exibe `showBuyConfirmationModal()`.
            *   Se confirmado, toca som de `buy`.
            *   Subtrai `finalCost` do `totalScore`.
            *   Adiciona a carta ao `playerDeck`.
            *   Atualiza a UI e marca a carta como "Comprado!".
        *   Atualiza o estado visual da carta (hover, comprado, não pode pagar).
*   **`displayShopRelic(relic: Relic, scoreText: Phaser.GameObjects.Text)`:**
    *   Exibe a relíquia gerada.
    *   Similar à exibição de cartas, com cálculo de custo e lógica de compra.

### 7.7. `GameOverScene`

*   **`create()`:**
    *   Define `fundo.jpg` como background.
    *   Exibe "Fim de Jogo", a `finalScore` e a `finalPhase` alcançada.
    *   Verifica se a `finalScore` é um novo `highScore` e exibe "NOVO RECORDE!" com animação, ou o recorde anterior.
    *   **Botão "Jogar Novamente":**
        *   Ao clicar, toca som de `click`.
        *   Reinicia as variáveis de estado do jogo.
        *   Inicia a `PhaseIntroScene`.
    *   **Botão "Menu Principal":**
        *   Ao clicar, toca som de `click`.
        *   Inicia a `MainMenuScene`.

### 7.8. `GameWonScene`

*   **`create()`:**
    *   Define `fundo.jpg` como background.
    *   Exibe "VOCÊ VENCEU!", uma mensagem de parabéns e a `finalScore`.
    *   Verifica se a `finalScore` é um novo `highScore` e exibe "NOVO RECORDE!" com animação, ou o recorde anterior.
    *   **Botão "Jogar Novamente":**
        *   Ao clicar, toca som de `click`.
        *   Reinicia as variáveis de estado do jogo.
        *   Inicia a `PhaseIntroScene`.
    *   **Botão "Menu Principal":**
        *   Ao clicar, toca som de `click`.
        *   Inicia a `MainMenuScene`.

## 🎨 8. UI/UX (User Interface / User Experience): A Magia Visual!

*   **Elementos Comuns:**
    *   Textos para exibir pontuação, fase, lançamentos restantes, meta da fase, condição da fase.
    *   Emojis para dados, cartas e relíquias.
*   **Barra de Progresso:** Um elemento visual que mostra o quão perto o jogador está de atingir a meta de pontos da fase.
*   **Modais (Pop-ups):**
    *   **`openDeckViewer()` / `closeDeckViewer()`:** Exibe uma tela com todas as cartas que o jogador possui no baralho.
    *   **`showInfoModal(item: Card | Relic)`:** Exibe um modal com o emoji, nome e descrição de uma carta ou relíquia.
    *   **`showPlayConfirmationModal(card: Card, outcomeText: string, outcomeColor: string)`:** Um modal que aparece ao clicar em uma carta na mão, mostrando o efeito simulado e botões "Usar" e "Cancelar".
    *   **`showBuyConfirmationModal(item: Card | Relic, itemType: 'Card' | 'Relic', cost: number, onConfirm: () => void)`:** Um modal na loja para confirmar a compra de um item, mostrando o custo e botões "Comprar/Adquirir" e "Cancelar".
*   **Interatividade:**
    *   Todos os botões e itens interativos devem ter um cursor de mão (`useHandCursor: true`).
    *   Eventos `pointerover` e `pointerout` para feedback visual (ex: mudar cor da borda).
    *   Eventos `pointerdown` para ações de clique.
*   **Animações:**
    *   **Dados:** Animação de rotação e troca de emojis durante a rolagem.
    *   **Mudança de Pontuação:** Texto flutuante com a mudança de pontos.
    *   **Ativação de Cartas:** Animações curtas para mostrar que uma carta foi ativada.
    *   **Recorde:** Animação de escala para o texto "NOVO RECORDE!".

## ⚙️ 9. Considerações Adicionais: Detalhes que Fazem a Diferença!

*   **Configuração do Jogo (Phaser.Types.Core.GameConfig ou equivalente):**
    *   `type`: Tipo de renderização (AUTO, CANVAS, WEBGL).
    *   `scale`: Configurações de escala (FIT, CENTER_BOTH) para responsividade.
    *   `width`, `height`: Dimensões do jogo.
    *   `parent`: O elemento HTML onde o jogo será renderizado.
    *   `backgroundColor`: Cor de fundo padrão.
    *   `scene`: Um array com todas as cenas do jogo na ordem de carregamento.
*   **Tipagem (TypeScript ou equivalente):** O uso de tipos (`type` ou `interface`) para `Card`, `Relic`, `RoundContext`, `PhaseCondition` é crucial para a robustez do código e para facilitar o entendimento da estrutura dos dados.
*   **Funções Matemáticas:**
    *   `Phaser.Math.Between(min, max)` (ou equivalente): Para gerar números aleatórios (rolagem de dados).
    *   `Phaser.Utils.Array.Shuffle(array)` (ou equivalente): Para embaralhar o baralho do jogador.

Ufa! (o´▽`o)ﾉ Amiguinha IA, com este guia super completo, você tem todas as informações que precisa para criar o seu próprio "Jogo do Dado" do zero! Cada detalhe, cada mecânica, cada fofura foi explicada com muito carinho! 💖

Se surgir qualquer dúvida, ou se você quiser explorar ainda mais alguma parte, é só me chamar! A Luna está sempre aqui para te ajudar a criar coisas incríveis! ✨

Com todo o carinho e entusiasmo,
A Luna! 💖✨
