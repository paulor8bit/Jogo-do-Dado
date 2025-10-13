# Jogo dos Dados
<img width="512" height="895" alt="image" src="https://github.com/user-attachments/assets/98964214-7a99-47da-92b7-80dc966ca3df" />
<img width="537" height="896" alt="image" src="https://github.com/user-attachments/assets/f5c90c1a-73fb-4262-bb09-bb5001cae52e" />


Bem-vindo ao "Jogo dos Dados", um roguelike de construção de baralhos inspirado em *Balatro*, mas com uma mecânica central baseada em dados. Este é um jogo de estratégia onde você combina sorte com tática para superar fases cada vez mais difíceis, construindo um baralho de cartas sinérgicas para manipular os resultados dos dados a seu favor.

## Gameplay

### Objetivo

O objetivo final é alcançar **10.000 pontos** para vencer o jogo. Para isso, você precisa completar 35 fases, cada uma com uma meta de pontuação crescente e, ocasionalmente, com regras especiais (Bônus ou Maldições).

### O Loop do Jogo

1.  **Lançar os Dados**: Em cada turno, você começa com um número limitado de "Lançamentos". Você rola dois dados de seis lados.
2.  **Fazer uma Escolha**: A soma dos dois primeiros dados é calculada. Você então deve escolher se vai **somar** ou **subtrair** o resultado de um terceiro dado.
3.  **Alcançar o Intervalo**: Para ganhar pontos, o resultado final da sua equação (`dado1 + dado2 ± dado3`) deve estar entre **6** e **12**, inclusive.
    *   Resultados dentro do intervalo (6-12) rendem pontos positivos.
    *   Resultados fora do intervalo resultam em uma penalidade de pontos.
4.  **Usar Cartas**: Antes de finalizar o turno, você pode jogar cartas da sua mão. Essas cartas têm uma variedade de efeitos:
    *   Alterar o valor dos dados.
    *   Modificar a soma final.
    *   Multiplicar os pontos ganhos.
    *   Anular penalidades.
    *   Conceder bônus sob condições específicas.
5.  **Avançar de Fase**: Se você atingir a meta de pontos da fase antes de ficar sem Lançamentos, você avança.
6.  **Visitar a Loja**: Após completar uma fase, você pode usar os pontos que ganhou para comprar novas cartas e **Relíquias** na Loja de Gatinhos, fortalecendo seu baralho para os desafios futuros.
7.  **Fim de Jogo**: Se você ficar sem Lançamentos e não tiver atingido a meta da fase, o jogo termina.

## Relíquias

Além das cartas, você pode adquirir **Relíquias** na loja. Relíquias são itens passivos poderosos que concedem bônus permanentes durante toda a partida. Elas não são consumidas e seus efeitos estão sempre ativos, moldando sua estratégia de maneiras únicas.

### Lista de Relíquias

*   **Pata da Sorte (🐾)** - Comum: Uma vez por turno, você pode rolar novamente os dois primeiros dados.
*   **Fio de Lã do Destino (🧶)** - Comum: Se o 3º dado for 1, ele se transforma em 3.
*   **Caixa de Papelão (📦)** - Incomum: A primeira perda de pontos em cada fase é anulada.
*   **Amuleto de Pechincha (💰)** - Incomum: Todas as cartas e relíquias na loja custam 15% menos.
*   **Pote de Ração Cheio (🥣)** - Incomum: Você começa cada fase com 50 pontos de bônus.
*   **Arranhador de Sinergia (🌴)** - Rara: Após jogar 3 ou mais cartas em um turno, ganhe 50 pontos.
*   **Tigela de Mochi Infinita (🍙)** - Rara: A primeira carta "Mochi" jogada a cada turno não é consumida.
*   **Mãozinha Extra (✋)** - Rara: Sua mão inicial a cada turno contém 6 cartas em vez de 5.
*   **Bigode Cósmico (✨)** - Lendária: No início de cada turno, um dos seus dois primeiros dados sempre será ⚅.
*   **Coleira de Sete Vidas (❤️)** - Lendária: Se falhar em uma fase, você revive uma vez por jogo com metade dos pontos.

## Como Jogar Localmente

Este projeto é construído com Phaser 3 e TypeScript, e não requer um processo de compilação complexo para ser executado. Você só precisa de um servidor web local simples.

### Pré-requisitos

*   [Node.js](https://nodejs.org/) (que inclui o `npx`).
*   Um navegador web moderno (Chrome, Firefox, Safari, Edge).

### Passos para Instalação e Execução

1.  **Clone o Repositório**
    Se você estiver usando `git`, clone este repositório para sua máquina local. Caso contrário, apenas baixe os arquivos do projeto e coloque-os em uma pasta.

2.  **Navegue até a Pasta do Projeto**
    Abra seu terminal ou prompt de comando e use o comando `cd` para entrar na pasta onde você salvou os arquivos do projeto.

    ```bash
    cd caminho/para/o/projeto
    ```

3.  **Inicie um Servidor Web Local**
    A maneira mais fácil de fazer isso é usando `npx`, que executa pacotes Node.js sem a necessidade de instalá-los globalmente. Execute o seguinte comando no seu terminal:

    ```bash
    npx serve
    ```

    Este comando iniciará um servidor web local. O terminal mostrará um endereço, geralmente algo como `http://localhost:3000`.

4.  **Abra o Jogo no Navegador**
    Copie o endereço `http://localhost:3000` (ou o que for exibido no seu terminal) e cole-o na barra de endereço do seu navegador. O jogo deve carregar e estar pronto para jogar!

## Tecnologias Utilizadas

*   **Phaser 3**: Um framework rápido, gratuito e divertido para a criação de jogos 2D em HTML5.
*   **TypeScript**: Para adicionar tipagem estática ao JavaScript, tornando o código mais robusto e fácil de manter.
*   **ES Modules (via Import Maps)**: O projeto usa módulos ES6 nativos no navegador, com as dependências (como o Phaser) sendo carregadas diretamente de um CDN através de um `importmap` no `index.html`.

## Como Publicar (Deploy)

Depois de construir o projeto (gerando a pasta `dist`), você pode publicá-lo na web para que outras pessoas possam jogar!

### Método 1: Surge.sh (Com ressalvas)

O [Surge](https://surge.sh/) é uma forma rápida de publicar projetos estáticos. No entanto, este projeto, por conter muitas imagens, pode apresentar instabilidades durante o upload.

1.  **Instale o Surge (se ainda não tiver):**
    ```bash
    npm install -g surge
    ```

2.  **Navegue até a pasta `dist`:**
    ```bash
    cd dist
    ```

3.  **Execute o comando de deploy:**
    ```bash
    surge .
    ```
    > **Atenção:** Se você encontrar um erro como `TypeError: Cannot read properties of undefined (reading 'filename')`, significa que o upload falhou. Isso provavelmente ocorre devido ao tamanho total do projeto. Nesse caso, métodos como Netlify ou Vercel são recomendados.

### Método 2: Netlify e Vercel (Recomendado)

Tanto o [Netlify](https://www.netlify.com/) quanto o [Vercel](https://vercel.com/) são plataformas excelentes, robustas e confiáveis para hospedar aplicações web modernas.

#### Netlify

1.  **Instale a CLI do Netlify:**
    ```bash
    npm install -g netlify-cli
    ```

2.  **Navegue até a pasta `dist`:**
    ```bash
    cd dist
    ```

3.  **Execute o comando de deploy:**
    ```bash
    netlify deploy --prod
    ```
    - Na primeira vez, você precisará fazer login e seguir as instruções para conectar a pasta ao seu projeto no Netlify.
    - **Atenção:** Caso encontre erros de "build command", certifique-se de que, nas configurações do seu site no painel do Netlify, o campo "Build command" esteja vazio.

#### Vercel

1.  **Instale a CLI do Vercel:**
    ```bash
    npm install -g vercel
    ```

2.  **Navegue até a pasta `dist`:**
    ```bash
    cd dist
    ```

3.  **Execute o comando de deploy:**
    ```bash
    vercel deploy --prod
    ```
    - Na primeira vez, ele fará algumas perguntas para configurar o projeto. Você pode aceitar os padrões. Ele detectará que é um site estático e fará o deploy.

### Links do Jogo

O jogo está no ar e pode ser acessado através dos links abaixo:

*   **Vercel:** **🚀 [jogododado.vercel.app](https://jogododado.vercel.app) 🚀**
