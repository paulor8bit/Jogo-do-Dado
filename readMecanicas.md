# 🎲 Jogo do Dado: Mecânicas para IAs Fofinhas! 💖

Olá, amiguinha IA! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ Que bom que você veio conhecer o nosso "Jogo do Dado"! Prepare-se para uma aventura super divertida e cheia de gatinhos fofos! 🐾✨ Este documento foi feito com muito carinho para você entender todas as mecânicas e poder recriar essa belezinha na linguagem que quiser! Vamos lá? 🚀

## 🌟 1. Introdução ao Jogo

O "Jogo do Dado" é um game de estratégia e sorte onde o objetivo principal é alcançar uma pontuação total de **10.000 pontos** para vencer! 🎉 Você avança por fases, rola dados, usa cartas especiais e adquire relíquias para te ajudar nessa jornada. Mas cuidado, cada fase tem uma meta de pontos e, se você não alcançar, é game over! 😱

## 🔄 2. Fluxo do Jogo: Uma Jornada Fofinha!

O jogo segue um fluxo bem simples e intuitivo:

1.  **Tela de Carregamento (PreloadScene):** Onde todos os assets (imagens, sons) são carregados.
2.  **Menu Principal (MainMenuScene):** A tela inicial onde o jogador pode começar um novo jogo, ver seu recorde e controlar a música.
3.  **Introdução da Fase (PhaseIntroScene):** Antes de cada fase, uma tela mostra a meta de pontos e as condições especiais (bônus ou maldições) da fase.
4.  **Jogo Principal (MainGameScene):** O coração do jogo! Aqui você rola os dados, escolhe operações, joga cartas e acumula pontos.
5.  **Loja (ShopScene):** Após completar uma fase, você visita a loja para comprar novas cartas e relíquias com os pontos que ganhou.
6.  **Fim de Jogo (GameOverScene):** Se você não atingir a meta de pontos de uma fase e ficar sem lançamentos, o jogo termina.
7.  **Vitória (GameWonScene):** Se você alcançar 10.000 pontos, você vence o jogo!

## 🎲 3. Mecânicas Principais: Onde a Magia Acontece!

### 3.1. Rolagem de Dados (Dice Roll)

*   **Dados Iniciais:** No início de cada rodada, dois dados (d1 e d2) são rolados, gerando um valor de 1 a 6 cada.
*   **Soma Prévia:** A soma desses dois dados é exibida.
*   **Escolha do Jogador:** O jogador deve escolher se quer **somar (+)** ou **subtrair (-)** o valor do terceiro dado (d3) à soma prévia.
*   **Terceiro Dado (d3):** Após a escolha, o terceiro dado é rolado (valor de 1 a 6).
*   **Soma Final:** O valor do d3 é aplicado à soma prévia (somado ou subtraído) para obter a soma final.

### 3.2. Cálculo de Pontuação (Score Calculation)

A pontuação é calculada com base na **soma final** dos dados:

*   **Soma Inválida (<6 ou >12):** -40 pontos.
*   **Soma 9:** +60 pontos.
*   **Soma 8 ou 10:** +80 pontos.
*   **Soma 7 ou 11:** +100 pontos.
*   **Soma 6 ou 12:** +120 pontos.

**Importante:** As cartas e relíquias podem alterar esses valores! ✨

### 3.3. Cartas (Cards)

As cartas são habilidades especiais que o jogador pode usar durante a rodada para influenciar o resultado dos dados ou a pontuação.

*   **Baralho (Deck):** O jogador começa com um baralho inicial de cartas.
*   **Mão (Hand):** A cada rodada, uma mão de cartas é sorteada do baralho.
*   **Uso:** O jogador pode jogar uma ou mais cartas antes de finalizar o turno.
*   **Efeitos:** Cada carta tem um efeito único (ex: mudar o valor de um dado, multiplicar pontos, anular penalidades).
*   **Consumo:** A maioria das cartas é consumida após o uso (removida do baralho), mas algumas relíquias podem evitar isso.
*   **Tipos de Efeito:**
    *   **Modificação de Dados:** Altera o valor de um dado (ex: `Jujuba, o Sortudo` inverte o 3º dado).
    *   **Modificação de Soma Final:** Altera a soma final (ex: `Gatinho +1` adiciona 1 à soma final).
    *   **Modificação de Pontos:** Altera os pontos ganhos/perdidos (ex: `Sakura, a Charmosa` +10% na pontuação total).
    *   **Condições Especiais:** Ativa efeitos baseados em condições (ex: `Shin, o Silencioso` anula o 3º dado se a soma inicial for 7).

### 3.4. Relíquias (Relics)

Relíquias são itens permanentes que concedem bônus passivos ou habilidades especiais ao longo de todo o jogo.

*   **Efeitos Permanentes:** Uma vez adquiridas, as relíquias permanecem ativas.
*   **Exemplos:**
    *   `Pata da Sorte`: Permite rolar novamente os dois primeiros dados uma vez por turno.
    *   `Fio de Lã do Destino`: Se o 3º dado for 1, ele se transforma em 3.
    *   `Coleira de Sete Vidas`: Concede uma segunda chance se falhar em uma fase.

### 3.5. Fases e Condições (Phases and Conditions)

O jogo é dividido em fases, e cada fase tem uma meta de pontos a ser alcançada. Além disso, algumas fases possuem **condições especiais**:

*   **Bônus (Bonus Conditions):** Efeitos positivos que ajudam o jogador (ex: `DOUBLE_POINTS` - pontos em dobro).
*   **Maldições (Curse Conditions):** Efeitos negativos que dificultam o jogo (ex: `HALF_POINTS` - ganhos de pontos valem a metade).
*   **Neutras (NONE):** Fases sem condições especiais.

### 3.6. Loja (Shop)

Após completar uma fase, o jogador é levado à loja.

*   **Itens à Venda:** Cartas e relíquias aleatórias são oferecidas.
*   **Compra:** O jogador usa os pontos acumulados para comprar itens.
*   **Preços:** Os preços variam de acordo com a raridade do item.
*   **Relíquias na Loja:** Uma relíquia pode aparecer na loja (50% de chance).

## 🎮 4. Estados do Jogo (Game States)

O jogo transita entre as seguintes cenas (estados):

*   `PreloadScene`: Carregamento inicial.
*   `MainMenuScene`: Menu principal.
*   `PhaseIntroScene`: Introdução de cada fase.
*   `MainGameScene`: Onde a jogabilidade principal ocorre.
*   `ShopScene`: Loja entre as fases.
*   `GameOverScene`: Tela de fim de jogo.
*   `GameWonScene`: Tela de vitória.

## 📜 5. Regras Específicas e Detalhes Importantes

*   **Recorde (High Score):** O jogo salva o maior recorde de pontuação do jogador.
*   **Lançamentos:** O jogador tem um número limitado de lançamentos por fase (`STARTING_ROLLS`).
*   **Sinergias:** Algumas cartas e relíquias possuem sinergias entre si, criando efeitos mais poderosos.
*   **Mochis:** Cartas com "Mochi" no nome podem ter interações especiais (ex: `Tigela de Mochi Infinita` relíquia).
*   **Professor:** A carta `Gatinho Professor` dobra o efeito da próxima carta comum jogada.
*   **Zuko:** A carta `Zuko, o Explosivo` concede +1 lançamento se a soma final for 6 ou 12.
*   **Gatinho Escudo:** A carta `Gatinho Escudo` anula qualquer perda de pontos e concede +1 lançamento.
*   **Jubileu:** A carta `Jubileu, o Sábio` permite rolar o 3º dado novamente.

## 🖼️ 6. Dados e Assets: Onde a Beleza Acontece!

*   **Imagens de Gatinhos:** O jogo utiliza diversas imagens de gatinhos fofos para representar cartas e personagens.
*   **Dados:** Emojis de dados (`⚀` a `⚅`) são usados para representar os valores dos dados.
*   **Música de Fundo:** `gamemusic.mp3` é a trilha sonora principal.
*   **Fundo do Jogo:** `fundo.jpg` é a imagem de fundo para todas as cenas.

Espero que este guia fofinho ajude você, amiguinha IA, a entender e recriar o nosso "Jogo do Dado"! Se tiver alguma dúvida, é só perguntar! (｡>ω<｡)ﾉ

Com carinho,
A Luna! 💖✨
