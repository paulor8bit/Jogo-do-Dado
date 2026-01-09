import Phaser from 'phaser';

// --- Sound Manager (uses Web Audio API, no assets needed) ---
const SoundManager = {
    context: new (window.AudioContext || (window as any).webkitAudioContext)(),
    music: new Audio('assets/gamemusic.mp3'),
    isMusicPlaying: false,
    play: function (type: 'click' | 'roll' | 'buy' | 'win' | 'lose' | 'activate') {
        try {
            if (!this.context) return;
            if (this.context.state === 'suspended') {
                this.context.resume();
            }
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);

            let freq = 440;
            let duration = 0.1;
            let waveType: OscillatorType = 'sine';
            gainNode.gain.setValueAtTime(0.25, this.context.currentTime);

            switch (type) {
                case 'click': freq = 800; duration = 0.05; waveType = 'triangle'; break;
                case 'roll': freq = 200; duration = 0.3; waveType = 'sawtooth'; gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration); break;
                case 'buy': freq = 1200; duration = 0.1; waveType = 'sine'; break;
                case 'win': freq = 660; duration = 0.2; waveType = 'sine'; break;
                case 'lose': freq = 164; duration = 0.3; waveType = 'square'; break;
                case 'activate': freq = 1000; duration = 0.15; waveType = 'triangle'; break;
            }

            oscillator.type = waveType;
            oscillator.frequency.setValueAtTime(freq, this.context.currentTime);
            if (type === 'roll') {
                oscillator.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + duration);
            }

            gainNode.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + duration);
        } catch (e) {
            console.error("Could not play sound", e);
        }
    },
    playMusic: function () {
        if (!this.isMusicPlaying) {
            this.music.loop = true;
            this.music.volume = 0.3;
            this.music.play().then(() => {
                this.isMusicPlaying = true;
            }).catch(e => console.error("Error playing music:", e));
        }
    },
    pauseMusic: function () {
        if (this.isMusicPlaying) {
            this.music.pause();
            this.isMusicPlaying = false;
        }
    },
    toggleMusic: function () {
        if (this.isMusicPlaying) {
            this.pauseMusic();
        } else {
            this.playMusic();
        }
    }
};

// Resume audio context on first user interaction
document.body.addEventListener('pointerdown', () => {
    if (SoundManager.context && SoundManager.context.state === 'suspended') {
        SoundManager.context.resume();
    }
    SoundManager.playMusic(); // Inicia a música aqui
}, { once: true });


const DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const HIGH_SCORE_KEY = 'diceGameHighScore';

const COLORS = {
    pastelPink: 0xFFD1DC,
    pastelBlue: 0xAEC6CF,
    pastelYellow: 0xFDFD96,
    pastelCream: 0xFDF5E6,
    deepBrown: 0x5D4037,
    popBlue: 0x4FC3F7,
    popPink: 0xF06292,
    popGold: 0xFFD700,
    popPurple: 0xAB47BC,
    white: 0xFFFFFF,
    black: 0x000000,
    // Luck Cats Palette
    creamBg: 0xFFFBE6,
    headerPink: 0xFFC0CB,
    statsBlue: 0xB2EBF2,
    progressYellow: 0xFFE082,
    btnGreen: 0xA5D6A7,
    btnRed: 0xEF9A9A,
    cardsPink: 0xFFCDD2,
    textBrown: 0x5D4037,
    // Phase 5 Palette
    gameDot: 0xF0E6D2,
    gameTitle: 0xFF9F7A,
    gameBrown: 0x8B5A3C,
    gameBrownDark: 0x5D3A24,
    gameCardBg: 0xFDF5E6,
    gameBorderBlue: 0xAED6F1,
    gameTealStart: 0x7DD1B6,
    gameTealEnd: 0x4FB89D,
    gameTealShadow: 0x3B8C78
};

// --- Game Structure Constants ---
const STARTING_ROLLS = 6;

// --- Card Definitions ---
type Card = {
    id: string;
    name: string;
    emoji: string;
    description: string;
    rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
    cost: number;
    image?: string;
};

// --- Relic Definitions ---
type Relic = {
    id: string;
    name: string;
    emoji: string;
    description: string;
    rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
    cost: number;
};

const RELIC_DEFINITIONS: Record<string, Relic> = {
    'lucky_paw': { id: 'lucky_paw', name: 'Pata da Sorte', emoji: '🐾', description: 'Uma vez por turno, você pode rolar novamente os dois primeiros dados.', rarity: 'Common', cost: 150 },
    'destiny_yarn': { id: 'destiny_yarn', name: 'Fio de Lã do Destino', emoji: '🧶', description: 'Se o 3º dado for 1, ele se transforma em 3.', rarity: 'Common', cost: 120 },
    'comfy_box': { id: 'comfy_box', name: 'Caixa de Papelão', emoji: '📦', description: 'A primeira perda de pontos em cada fase é anulada.', rarity: 'Uncommon', cost: 220 },
    'bargain_amulet': { id: 'bargain_amulet', name: 'Amuleto de Pechincha', emoji: '💰', description: 'Todas as cartas e relíquias na loja custam 15% menos.', rarity: 'Uncommon', cost: 200 },
    'full_bowl': { id: 'full_bowl', name: 'Pote de Ração Cheio', emoji: '🥣', description: 'Você começa cada fase com 50 pontos de bônus.', rarity: 'Uncommon', cost: 180 },
    'synergy_scratcher': { id: 'synergy_scratcher', name: 'Arranhador de Sinergia', emoji: '🌴', description: 'Após jogar 3 ou mais cartas em um turno, ganhe 50 pontos.', rarity: 'Rare', cost: 300 },
    'infinite_mochi_bowl': { id: 'infinite_mochi_bowl', name: 'Tigela de Mochi Infinita', emoji: '🍙', description: 'A primeira carta "Mochi" jogada a cada turno não é consumida.', rarity: 'Rare', cost: 350 },
    'extra_hand': { id: 'extra_hand', name: 'Mãozinha Extra', emoji: '✋', description: 'Sua mão inicial a cada turno contém 6 cartas em vez de 5.', rarity: 'Rare', cost: 400 },
    'cosmic_whisker': { id: 'cosmic_whisker', name: 'Bigode Cósmico', emoji: '✨', description: 'No início de cada turno, um dos seus dois primeiros dados sempre será ⚅.', rarity: 'Legendary', cost: 600 },
    'seven_lives_collar': { id: 'seven_lives_collar', name: 'Coleira de Sete Vidas', emoji: '❤️', description: 'Se falhar em uma fase, você revive uma vez por jogo com metade dos pontos.', rarity: 'Legendary', cost: 500 },
};

const CARD_DEFINITIONS: Record<string, Card> = {
    // Starter Deck & Common Cards
    'kiko': { id: 'kiko', name: 'Jubileu, o Ágil', emoji: '👟', description: 'Ativa com: Soma 6 ou 12\nEfeito: Ganhos x2', rarity: 'Common', cost: 20, image: 'Kiko o Agil.png' },
    'jujuba': { id: 'jujuba', name: 'Jujuba, o Sortudo', emoji: '😼', description: 'Efeito: Inverte o 3º dado\n(1↔6, 2↔5, ...)', rarity: 'Common', cost: 25, image: 'Jujuba o Sortudo.png' },
    'shin': { id: 'shin', name: 'Shin, o Silencioso', emoji: '🤫', description: 'Ativa com: Soma inicial 7\nEfeito: Anula o 3º dado', rarity: 'Uncommon', cost: 30, image: 'Shin o Silencioso.png' },
    'gatinho_mais_1': { id: 'gatinho_mais_1', name: 'Gatinho +1', emoji: '➕', description: 'Efeito: Soma final +1', rarity: 'Common', cost: 13, image: 'Gatinho +1.png' },
    'gatinho_escudo': { id: 'gatinho_escudo', name: 'Gatinho Escudo', emoji: '🛡️', description: 'Efeito: Anula qualquer\nperda de pontos e\n+1 Lançamento', rarity: 'Common', cost: 38, image: 'Gatinho Escudo.png' },

    // Deck fillers
    'sakura': { id: 'sakura', name: 'Sakura, a Charmosa', emoji: '🌸', description: 'Efeito: +10% na sua\npontuação total', rarity: 'Uncommon', cost: 38, image: 'Sakura a Charmosa.png' },
    'shakira': { id: 'shakira', name: 'Shakira, a Pequena', emoji: '🍂', description: 'Ativa com: Soma final 9\nEfeito: +120 pontos', rarity: 'Uncommon', cost: 28, image: 'Shakira a Pequena.png' },
    'zuko': { id: 'zuko', name: 'Zuko, o Explosivo', emoji: '🔥', description: 'Ativa com: Soma final 6 ou 12\nEfeito: +1 Lançamento', rarity: 'Rare', cost: 50, image: 'Zuko o Explosivo.png' },
    'mochi': { id: 'mochi', name: 'Mochi, o Fofinho', emoji: '🍡', description: 'Efeito: +20 pontos fixos', rarity: 'Common', cost: 10, image: 'Mochi o fofinho.png' },
    'mochi2': { id: 'mochi2', name: 'Mochi-2, o Irmão', emoji: '🍡', description: 'Ativa com: Soma final 9\nEfeito: +40 pontos', rarity: 'Common', cost: 15, image: 'Mochi-2 o irmão.png' },
    'akira': { id: 'akira', name: 'Akira, o Aventureiro', emoji: '🧭', description: 'Efeito: Anula Maldições\nnesta rodada', rarity: 'Rare', cost: 45, image: 'Akira o Aventureiro.png' },
    'gatinho_bonus': { id: 'gatinho_bonus', name: 'Gatinho Bônus', emoji: '🎁', description: 'Efeito: +80 pontos extras', rarity: 'Common', cost: 25, image: 'Gatinho Bonus.png' },
    'gatinho_contador': { id: 'gatinho_contador', name: 'Gatinho Contador', emoji: '🔢', description: 'Efeito: Pontos = (3º dado) x 30', rarity: 'Uncommon', cost: 33, image: 'Gatinho Contador.png' },
    'gatinho_espelhado': { id: 'gatinho_espelhado', name: 'Gatinho Espelhado', emoji: '🪞', description: 'Efeito: Copia os pontos\nganhos nesta jogada', rarity: 'Rare', cost: 55, image: 'Gatinho Espelhado.png' },
    'gatinho_menos_1': { id: 'gatinho_menos_1', name: 'Gatinho -1', emoji: '➖', description: 'Efeito: Soma final -1', rarity: 'Common', cost: 13, image: 'Gatinho -1.png' },
    'gatinho_ajustador': { id: 'gatinho_ajustador', name: 'Gatinho Ajustador', emoji: '⚖️', description: 'Se resultado inválido (<6, >12)\nEfeito: Soma final vira 9', rarity: 'Uncommon', cost: 35, image: 'Gatinho Ajustador.png' },
    'gatinho_amortecedor': { id: 'gatinho_amortecedor', name: 'Gatinho Amortecedor', emoji: '🧸', description: 'Se for perder pontos\nEfeito: Perde só metade', rarity: 'Common', cost: 18, image: 'Gatinho Amortecedor.png' },
    'gatinho_barreira': { id: 'gatinho_barreira', name: 'Gatinho Barreira', emoji: '🚧', description: 'Se resultado > 12\nEfeito: Soma final vira 12', rarity: 'Common', cost: 15, image: 'Gatinho Barreira.png' },
    'gatinho_piso': { id: 'gatinho_piso', name: 'Gatinho Piso', emoji: '🪨', description: 'Se resultado < 6\nEfeito: Soma final vira 6', rarity: 'Common', cost: 15, image: 'Gatinho Piso.png' },
    'gatinho_conversor': { id: 'gatinho_conversor', name: 'Gatinho Conversor', emoji: '🔮', description: 'Se resultado for positivo\nEfeito: Vira 120 pontos', rarity: 'Rare', cost: 63 },
    'gatinho_trapaceiro': { id: 'gatinho_trapaceiro', name: 'Gatinho Trapaceiro', emoji: '😼', description: 'Efeito: Ignora o 3º dado', rarity: 'Uncommon', cost: 40, image: 'Gatinho Trapaceiro.png' },
    'gatinho_eletrizante': { id: 'gatinho_eletrizante', name: 'Gatinho Eletrizante', emoji: '⚡', description: 'Ativa com: Soma 8 ou 10\nEfeito: Ganhos +50%', rarity: 'Uncommon', cost: 35, image: 'Gatinho Eletrizante.png' },
    'gatinho_protetor': { id: 'gatinho_protetor', name: 'Gatinho Protetor', emoji: '🐾', description: 'Se a pontuação for negativa\nEfeito: Vira +20 pontos', rarity: 'Uncommon', cost: 38, image: 'Gatinho Protetor.png' },
    'gatinho_sortudo': { id: 'gatinho_sortudo', name: 'Gatinho Sortudo', emoji: '🍀', description: 'Ativa com: Soma inicial 7\nEfeito: 3º dado vira 6', rarity: 'Rare', cost: 48, image: 'Gatinho Sortudo.png' },

    // --- NEW SYNERGY CARDS ---

    // Mochi Family
    'mestre_mochi': { id: 'mestre_mochi', name: 'Mestre Mochi', emoji: '🥋', description: 'Efeito: Dobra os pontos de\noutras cartas "Mochi" nesta rodada.', rarity: 'Rare', cost: 60, image: 'Mestre Mochi.png' },
    'mochi_gigante': { id: 'mochi_gigante', name: 'Mochi Gigante', emoji: '🍙', description: 'Efeito: +15 pontos para cada\ncarta "Mochi" nesta rodada.', rarity: 'Uncommon', cost: 35, image: 'Mochi Gigante.png' },
    'mochi_bebe': { id: 'mochi_bebe', name: 'Mochi Bebê', emoji: '🙏', description: 'Efeito: +5 pontos por cada\n"Mochi" no seu baralho.', rarity: 'Common', cost: 15, image: 'Mochi Bebe.png' },

    // Seven Strategy
    'gatinho_equilibrio': { id: 'gatinho_equilibrio', name: 'Gatinho do Equilíbrio', emoji: '☯️', description: 'Ativa com: Soma inicial 7\nEfeito: Pontos não podem ser negativos.', rarity: 'Uncommon', cost: 40, image: 'Gatinho do Equilíbrio.png' },
    'gatinho_apostador': { id: 'gatinho_apostador', name: 'Gatinho Apostador', emoji: '🎰', description: 'Ativa com: Soma inicial 7\n50% x3 ganhos, 50% zera.', rarity: 'Rare', cost: 45, image: 'Gatinho Apostador.png' },

    // Elemental Chain
    'gatinho_foguinho': { id: 'gatinho_foguinho', name: 'Gatinho Foguinho', emoji: '🔥', description: 'Ativa com: Soma 6 ou 12\n+40 pts por cada dado ⚅.', rarity: 'Uncommon', cost: 38, image: 'Gatinho Foguinho.png' },

    // Toolbox
    'gatinho_professor': { id: 'gatinho_professor', name: 'Gatinho Professor', emoji: '🧑‍🏫', description: 'Efeito: Dobra o efeito da\npróxima carta Comum.', rarity: 'Uncommon', cost: 30, image: 'Gatinho Professor.png' },

    // Rares
    'jubileu': { id: 'jubileu', name: 'Kiko, o Sábio', emoji: '👑', description: 'Efeito: Rola o 3º dado\nnovamente', rarity: 'Rare', cost: 45, image: 'Jubileu o Sabio.png' },
    'gatinho_explosivo': { id: 'gatinho_explosivo', name: 'Gatinho Explosivo', emoji: '💥', description: 'Ativa com: Soma 7 ou 11\nEfeito: +250 pontos', rarity: 'Rare', cost: 55, image: 'Gatinho Explosivo.png' },
    'gatinho_milagroso': { id: 'gatinho_milagroso', name: 'Gatinho Milagroso', emoji: '🕊️', description: 'Se resultado inválido (<6, >12)\nEfeito: +100 pontos', rarity: 'Rare', cost: 50, image: 'Gatinho Milagroso.png' },

    // Legendaries
    'gatinho_supremo': { id: 'gatinho_supremo', name: 'Gatinho Supremo', emoji: '🌌', description: 'Efeito: Dobra sua\npontuação total', rarity: 'Legendary', cost: 125, image: 'Gatinho Supremo.png' },
    'rei_gatinho': { id: 'rei_gatinho', name: 'Rei Gatinho dos Dados', emoji: '👑🎲', description: 'Efeito: Vitória instantânea\nda fase', rarity: 'Legendary', cost: 200, image: 'Rei Gatinho dos Dados.png' },
};

const STARTING_DECK_IDS = ['kiko', 'jujuba', 'shin', 'gatinho_mais_1', 'gatinho_escudo'];


// --- Types and Constants for Phase Conditions ---
type BonusCondition = 'DOUBLE_POINTS' | 'SAFE_ROLL' | 'LUCKY_SEVEN';
type CurseCondition = 'HALF_POINTS' | 'DOUBLE_PENALTY' | 'PRECISE_OR_NOTHING';
type PhaseCondition = BonusCondition | CurseCondition | 'NONE';

const BONUS_CONDITIONS: BonusCondition[] = ['DOUBLE_POINTS', 'SAFE_ROLL', 'LUCKY_SEVEN'];
const CURSE_CONDITIONS: CurseCondition[] = ['HALF_POINTS', 'DOUBLE_PENALTY', 'PRECISE_OR_NOTHING'];

const CONDITION_DESCRIPTIONS: Record<PhaseCondition, string> = {
    // Bonus
    'DOUBLE_POINTS': 'Bônus: Pontos em dobro nesta fase!',
    'SAFE_ROLL': 'Bônus: Sem penalidade por erro nesta fase.',
    'LUCKY_SEVEN': 'Bônus: Se a soma for 7, ganha 200 pontos!',
    // Curse
    'HALF_POINTS': 'Maldição: Ganhos de pontos valem a metade.',
    'DOUBLE_PENALTY': 'Maldição: Penalidade por erro é dobrada.',
    'PRECISE_OR_NOTHING': 'Maldição: Só ganha pontos se a soma for 6 ou 12.',
    // Neutral
    'NONE': '',
};

// --- Utility Functions ---
const getHighScore = (): number => {
    const score = localStorage.getItem(HIGH_SCORE_KEY);
    return score ? parseInt(score, 10) : 0;
};

const setHighScore = (score: number) => {
    localStorage.setItem(HIGH_SCORE_KEY, score.toString());
};

const getGoalForPhase = (phase: number): number => {
    if (phase === 35) return 10000;
    if (phase <= 0) return 0;

    let goal = 0;
    for (let p = 1; p <= phase; p++) {
        if (p === 1) {
            goal = 100;
            continue;
        }

        // Increment increases by 50 every 4 phases
        const cycle = Math.floor((p - 1) / 4); // 0 for phases 1-4, 1 for 5-8, etc.
        const increment = 100 + cycle * 50;
        goal += increment;
    }
    return goal;
};

// --- Scene Classes ---

class PreloadScene extends Phaser.Scene {
    // FIX: Declare Phaser properties to resolve TypeScript errors.
    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
    load!: Phaser.Loader.LoaderPlugin;
    registry!: Phaser.Data.DataManager;
    scene!: Phaser.Scenes.ScenePlugin;

    constructor() { super('PreloadScene'); }
    preload() {
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Carregando...', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
        this.load.image('jubijujuba', 'assets/jubijujuba.jpg');
        this.load.image('fundo', 'assets/fundo.jpg');
        this.load.image('fundo_fase', 'tela/fase/background.png');
        this.load.image('fundo_loja', 'tela/shop/background.png');
        this.load.image('btn_proxima', 'tela/shop/proxima.png');
        this.load.image('menu_full', 'assets/menu_full.png');
        this.load.image('gato_meta', 'tela/meta/gatinho.png');
        this.load.image('patinha_meta', 'tela/meta/patinha.png');
        this.load.image('btn_baralho', 'tela/fase/baralho.png');
        this.load.audio('gamemusic', 'assets/gamemusic.mp3');

        // Load card images
        for (const card of Object.values(CARD_DEFINITIONS)) {
            if (card.image) {
                this.load.image(card.id, `assets/${card.image}`);
            }
        }
    }
    create() {
        this.registry.set('highScore', getHighScore());
        this.scene.start('MainMenuScene');
    }
}

class MainMenuScene extends Phaser.Scene {
    // FIX: Declare Phaser properties to resolve TypeScript errors.
    add!: Phaser.GameObjects.GameObjectFactory;
    registry!: Phaser.Data.DataManager;
    scene!: Phaser.Scenes.ScenePlugin;
    tweens!: Phaser.Tweens.TweenManager;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;

    constructor() { super('MainMenuScene'); }
    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;

        // Background (The full design image)
        this.add.image(centerX, height / 2, 'menu_full').setDisplaySize(width, height);

        // --- Interactive Play Button ---
        // Coordinates estimated from the provided image (pill shape)
        const playBtnArea = this.add.rectangle(centerX, 475, 300, 85, 0xffffff, 0);
        playBtnArea.setInteractive({ useHandCursor: true });

        playBtnArea.on('pointerdown', () => {
            SoundManager.play('click');
            this.registry.set('totalScore', 0);
            this.registry.set('currentPhase', 1);
            this.registry.set('totalRollsLeft', STARTING_ROLLS);
            const startingDeck = STARTING_DECK_IDS.map(id => CARD_DEFINITIONS[id]);
            this.registry.set('playerDeck', startingDeck);
            this.registry.set('playerRelics', []);
            this.registry.set('sevenLivesUsed', false);
            this.scene.start('PhaseIntroScene');
        });

        // Effect on hover
        playBtnArea.on('pointerover', () => {
            this.tweens.add({ targets: playBtnArea, scale: 1.05, duration: 100 });
        });
        playBtnArea.on('pointerout', () => {
            this.tweens.add({ targets: playBtnArea, scale: 1, duration: 100 });
        });

        // --- Music Toggle Section ---
        const musicY = 550;
        const musicToggleArea = this.add.rectangle(centerX, musicY, 230, 50, 0xffffff, 0);
        musicToggleArea.setInteractive({ useHandCursor: true });

        // Visual indicator for ON/OFF
        const toggleIndicator = this.add.circle(SoundManager.isMusicPlaying ? centerX + -40 : centerX - -40, musicY, 15, 0xffffff);
        toggleIndicator.setStrokeStyle(2, 0x5D4037, 0.5);

        musicToggleArea.on('pointerdown', () => {
            SoundManager.toggleMusic();
            SoundManager.play('click');

            // Animate toggle
            this.tweens.add({
                targets: toggleIndicator,
                x: SoundManager.isMusicPlaying ? centerX + 35 : centerX - 35,
                duration: 200,
                ease: 'Back.easeOut'
            });
        });

        // --- Record Banner Section ---
        const recordY = 640; // Adjusted to fit the blank banner area
        const highScore = this.registry.get('highScore');

        // Always show the record area with the actual player score
        const recordText = this.add.text(centerX + 15, recordY, ` Recorde: ${highScore} Pontos`, {
            fontFamily: '"Fredoka One"',
            fontSize: '18px',
            color: '#8B4513'
        }).setOrigin(0.5);

        // Add a small pulsing effect to the record icon part
        const crownIcon = this.add.text(centerX - 120, recordY, '', { fontSize: '24px' }).setOrigin(0.5);
        this.tweens.add({
            targets: crownIcon,
            scale: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // --- Goal Message Section (Blinking) ---
        const goalMessage = this.add.text(centerX, 480, 'Chegue a 10.000 pontos para vencer!', {
            fontFamily: '"Fredoka One"',
            fontSize: '14px',
            color: '#8B4513'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: goalMessage,
            alpha: 0,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Cubic.easeInOut'
        });
    }
}

class PhaseIntroScene extends Phaser.Scene {
    // FIX: Declare Phaser properties to resolve TypeScript errors.
    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
    registry!: Phaser.Data.DataManager;
    scene!: Phaser.Scenes.ScenePlugin;

    constructor() { super('PhaseIntroScene'); }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // --- Background Section ---
        // Base background image loaded previously
        this.add.image(centerX, height / 2, 'fundo').setDisplaySize(width, height);

        // Polka dot pattern overlay
        const dots = this.add.graphics();
        dots.fillStyle(COLORS.gameDot || 0xF0E6D2, 0.4);
        for (let x = 0; x < width; x += 40) {
            for (let y = 0; y < height; y += 40) {
                dots.fillCircle(x, y, 2);
                dots.fillCircle(x + 20, y + 20, 2);
            }
        }

        const phase = this.registry.get('currentPhase');
        const goal = getGoalForPhase(phase);
        const previousGoal = getGoalForPhase(phase - 1);

        this.registry.set('stageGoal', goal);
        this.registry.set('previousGoal', previousGoal);
        this.registry.set('cartonBoxUsedThisPhase', false);

        let condition: PhaseCondition = 'NONE';
        if ([5, 17, 29].includes(phase)) condition = 'SAFE_ROLL';
        if ([9, 21, 33].includes(phase)) condition = 'LUCKY_SEVEN';
        if ([13, 25].includes(phase)) condition = 'DOUBLE_POINTS';
        if ([4, 16, 28].includes(phase)) condition = 'HALF_POINTS';
        if ([8, 20, 32].includes(phase)) condition = 'DOUBLE_PENALTY';
        if ([12, 24, 35].includes(phase)) condition = 'PRECISE_OR_NOTHING';

        this.registry.set('currentCondition', condition);

        // --- Title Section ---
        const titleText = phase === 35 ? 'Fase Final' : `Fase ${phase}`;
        const titleShadow = this.add.text(centerX, 126, titleText, {
            fontFamily: '"Fredoka One"',
            fontSize: '64px',
            color: '#F0D0B6'
        }).setOrigin(0.5);

        const titleMain = this.add.text(centerX, 120, titleText, {
            fontFamily: '"Fredoka One"',
            fontSize: '64px',
            color: '#FF9F7A',
            stroke: '#ffffff',
            strokeThickness: 12
        }).setOrigin(0.5);

        // --- Main Game Card ---
        const cardWidth = 320;
        const cardHeight = 360;
        const cardY = 380;

        // Card Border/Shadow
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x000000, 0.1);
        cardBg.fillRoundedRect(centerX - cardWidth / 2 + 5, cardY - cardHeight / 2 + 5, cardWidth, cardHeight, 25);

        cardBg.lineStyle(4, COLORS.textBrown || 0x8B5A3C, 1);
        cardBg.fillStyle(0xffffff, 1);
        cardBg.fillRoundedRect(centerX - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight, 25);
        cardBg.strokeRoundedRect(centerX - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight, 25);

        // Card Header (Stats/Goal)
        const headerHeight = 70;
        const cardHeader = this.add.graphics();
        cardHeader.fillStyle(COLORS.pastelCream || 0xFDF5E6, 1);
        cardHeader.fillRoundedRect(centerX - cardWidth / 2, cardY - cardHeight / 2, cardWidth, headerHeight, { tl: 25, tr: 25, bl: 0, br: 0 });
        cardHeader.lineStyle(2, 0xAED6F1, 1);
        cardHeader.moveTo(centerX - cardWidth / 2, cardY - cardHeight / 2 + headerHeight);
        cardHeader.lineTo(centerX + cardWidth / 2, cardY - cardHeight / 2 + headerHeight);
        cardHeader.strokePath();

        // Cat Avatar placeholder
        this.add.image(centerX - cardWidth / 2 + 40, cardY - cardHeight / 2 + headerHeight / 2, 'gato_meta').setDisplaySize(60, 60);

        this.add.text(centerX + 60, cardY - cardHeight / 2 + 25, 'META DA FASE', {
            fontFamily: '"Fredoka One"',
            fontSize: '12px',
            color: '#8B5A3C'
        }).setOrigin(0.5);

        this.add.text(centerX + 60, cardY - cardHeight / 2 + 48, `${goal} Pontos`, {
            fontFamily: '"Fredoka One"',
            fontSize: '22px',
            color: '#5D3A24'
        }).setOrigin(0.5);

        // Card Body: Bonus Info
        const glow = this.add.graphics();
        glow.fillGradientStyle(0xFFDF00, 0xFFDF00, 0xFFDF00, 0xFFDF00, 0.3, 0.3, 0, 0);
        glow.fillCircle(centerX, cardY + 20, 80);
        glow.setAlpha(0.4);

        if (condition === 'NONE') {
            this.add.image(centerX, cardY + 10, 'patinha_meta').setDisplaySize(120, 120);
        } else {
            this.add.text(centerX, cardY + 10,
                BONUS_CONDITIONS.includes(condition as any) ? '🌟' : '💀', {
                fontSize: '100px'
            }).setOrigin(0.5);
        }

        const conditionName = condition === 'NONE' ? 'Fase Neutra' : 'Bônus';
        this.add.text(centerX, cardY + 90, conditionName, {
            fontFamily: '"Fredoka One"',
            fontSize: '24px',
            color: '#8B5A3C'
        }).setOrigin(0.5);

        const conditionDesc = condition === 'NONE' ? 'Nenhuma condição especial.' : CONDITION_DESCRIPTIONS[condition];
        this.add.text(centerX, cardY + 120, conditionDesc, {
            fontFamily: '"Fredoka One"',
            fontSize: '14px',
            color: '#5D3A24',
            align: 'center',
            wordWrap: { width: 260 }
        }).setOrigin(0.5);

        // --- Action Area ---
        const btnY = height - 100;
        const btnWidth = 240;
        const btnHeight = 60;

        const btnContainer = this.add.container(centerX, btnY);

        const btnShadow = this.add.graphics();
        btnShadow.fillStyle(0x3B8C78, 1);
        btnShadow.fillRoundedRect(-btnWidth / 2, -btnHeight / 2 + 8, btnWidth, btnHeight, 30);

        const btnMain = this.add.graphics();
        btnMain.fillGradientStyle(0x7DD1B6, 0x7DD1B6, 0x4FB89D, 0x4FB89D, 1);
        btnMain.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 30);

        const btnText = this.add.text(0, 0, 'Começar Fase', {
            fontFamily: '"Fredoka One"',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#2E8B57',
            strokeThickness: 2
        }).setOrigin(0.5);

        btnContainer.add([btnShadow, btnMain, btnText]);
        btnContainer.setSize(btnWidth, btnHeight).setInteractive({ useHandCursor: true });

        btnContainer.on('pointerdown', () => {
            SoundManager.play('click');
            btnMain.y = 4;
            btnText.y = 4;
            this.time.delayedCall(100, () => {
                this.scene.start('MainGameScene');
            });
        });

        // Floating stars effect
        const star1 = this.add.text(70, btnY - 50, '⭐', { fontSize: '32px' }).setAlpha(0.6);
        const star2 = this.add.text(width - 70, btnY - 70, '✨', { fontSize: '24px' }).setAlpha(0.6);

        this.tweens.add({
            targets: [star1, star2],
            y: '-=10',
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}

type RoundContext = {
    initialSum: number;
    operation: 'add' | 'subtract';
    dice3Value: number;
    finalSum: number;
    pointsMultiplier: number;
    flatPoints: number;
    specialCondition: string;
};

class MainGameScene extends Phaser.Scene {
    dice1Value!: number;
    dice2Value!: number;
    dice1Text!: Phaser.GameObjects.Text;
    dice2Text!: Phaser.GameObjects.Text;
    choiceUiGroup!: Phaser.GameObjects.Group;
    cardUiGroup!: Phaser.GameObjects.Group;
    isRolling!: boolean;
    dice3Value!: number;
    currentHand: Card[] = [];

    initialRoundContext!: RoundContext;
    currentRoundContext!: RoundContext;
    playedCardsThisRound: Card[] = [];

    // Modal properties
    deckViewerGroup!: Phaser.GameObjects.Group;
    modalGroup!: Phaser.GameObjects.Group;
    isModalOpen = false;

    // Relic properties
    relicsDisplayGroup!: Phaser.GameObjects.Group;
    firstMochiPlayedThisTurn!: boolean;
    pawRerollUsedThisTurn!: boolean;

    // UI elements
    phaseText!: Phaser.GameObjects.Text;
    rollsText!: Phaser.GameObjects.Text;
    goalText!: Phaser.GameObjects.Text;
    totalScoreText!: Phaser.GameObjects.Text;
    conditionText!: Phaser.GameObjects.Text;
    progressBarFill!: Phaser.GameObjects.Graphics;
    progressBarTrack!: Phaser.GameObjects.Graphics;
    progressPercentageText!: Phaser.GameObjects.Text;
    catTargetIcon!: Phaser.GameObjects.Image;
    deckText!: Phaser.GameObjects.Text;
    isChoiceActive = false;
    teamCardsGroup!: Phaser.GameObjects.Group;
    tooltipGroup!: Phaser.GameObjects.Group;

    // FIX: Declare Phaser properties to resolve TypeScript errors.
    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
    children!: Phaser.GameObjects.DisplayList;
    registry!: Phaser.Data.DataManager;
    scene!: Phaser.Scenes.ScenePlugin;
    time!: Phaser.Time.Clock;
    tweens!: Phaser.Tweens.TweenManager;
    textures!: Phaser.Textures.TextureManager;

    constructor() { super('MainGameScene'); }

    hasRelic(relicId: string): boolean {
        const relics: Relic[] = this.registry.get('playerRelics') || [];
        return relics.some(r => r.id === relicId);
    }

    init() {
        this.isRolling = false;
        this.playedCardsThisRound = [];
        this.isModalOpen = false;
        this.firstMochiPlayedThisTurn = false;
        this.pawRerollUsedThisTurn = false;
    }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;

        // Background - Using the new fase background
        this.add.image(centerX, height / 2, 'fundo_fase').setDisplaySize(width, height);

        this.choiceUiGroup = this.add.group();
        this.cardUiGroup = this.add.group();
        this.deckViewerGroup = this.add.group();
        this.relicsDisplayGroup = this.add.group();
        this.teamCardsGroup = this.add.group();
        this.tooltipGroup = this.add.group();
        this.modalGroup = this.add.group();
        this.deckViewerGroup.setVisible(false);
        this.modalGroup.setVisible(false);

        this.createUI();
        this.startNewRoll();
    }

    createUI() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;

        // --- Header Section ---
        const headerTop = this.add.graphics();
        headerTop.fillStyle(COLORS.headerPink, 1);
        headerTop.fillRoundedRect(0, -20, width, 140, { tl: 0, tr: 0, bl: 40, br: 40 });
        headerTop.depth = 10;

        const phase = this.registry.get('currentPhase');
        this.phaseText = this.add.text(centerX, 45, `🐾 Fase ${phase}: Gatos Sortudos 🐾`, {
            fontFamily: '"Fredoka One"',
            fontSize: '22px',
            color: '#5D4037'
        }).setOrigin(0.5).setDepth(11);

        // Stats Pill
        const pillWidth = 260;
        const pillHeight = 40;
        const pillY = 95;

        const statsPillBg = this.add.graphics();
        statsPillBg.fillStyle(0xffffff, 0.5);
        statsPillBg.fillRoundedRect(centerX - pillWidth / 2, pillY - pillHeight / 2, pillWidth, pillHeight, 20);
        statsPillBg.lineStyle(2, 0xffffff, 0.8);
        statsPillBg.strokeRoundedRect(centerX - pillWidth / 2, pillY - pillHeight / 2, pillWidth, pillHeight, 20);
        statsPillBg.depth = 11;

        const statsContainer = this.add.container(centerX, pillY).setDepth(12);
        this.rollsText = this.add.text(-60, 0, 'Rolagens: 0', {
            fontFamily: '"Fredoka One"',
            fontSize: '14px',
            color: '#5D4037'
        }).setOrigin(0.5);

        const divider = this.add.rectangle(0, 0, 1, 15, 0x5D4037, 0.3);

        this.totalScoreText = this.add.text(70, 0, '0 / 10.000', {
            fontFamily: '"Fredoka One"',
            fontSize: '14px',
            color: '#5D4037'
        }).setOrigin(0.5);

        statsContainer.add([this.rollsText, divider, this.totalScoreText]);

        // --- Progress Section ---
        const progressY = 175;
        const barWidth = 300;
        const barHeight = 32;

        this.progressBarTrack = this.add.graphics();
        this.progressBarTrack.fillStyle(COLORS.statsBlue, 1);
        this.progressBarTrack.fillRoundedRect(centerX - barWidth / 2, progressY - barHeight / 2, barWidth, barHeight, 16);
        this.progressBarTrack.lineStyle(4, 0xffffff, 1);
        this.progressBarTrack.strokeRoundedRect(centerX - barWidth / 2, progressY - barHeight / 2, barWidth, barHeight, 16);

        this.progressBarFill = this.add.graphics();
        this.progressBarFill.setDepth(1);

        this.progressPercentageText = this.add.text(centerX, progressY, '0%', {
            fontFamily: '"Fredoka One"',
            fontSize: '12px',
            color: '#5D4037'
        }).setOrigin(0.5).setDepth(2);

        this.catTargetIcon = this.add.image(centerX + barWidth / 2 + 5, progressY, 'gato_meta').setDisplaySize(40, 40).setDepth(3);

        this.goalText = this.add.text(centerX, progressY + 30, 'Meta do Estágio: 0 Pontos', {
            fontFamily: '"Fredoka One"',
            fontSize: '12px',
            color: '#5D4037'
        }).setOrigin(0.5).setAlpha(0.7);

        // --- Dice Section (Visual Placement) ---
        const diceY = 280;
        this.dice1Text = this.add.text(centerX - 80, diceY + 20, '⚀', { fontSize: '96px', color: '#000000' }).setOrigin(0.5).setAngle(-15).setVisible(false);
        this.dice2Text = this.add.text(centerX + 80, diceY + 20, '⚀', { fontSize: '96px', color: '#000000' }).setOrigin(0.5).setAngle(15).setVisible(false);

        // --- Control Section (Buttons) ---
        const controlY = 440;
        const addBtn = this.add.container(centerX - 80, controlY);
        const addBg = this.add.circle(0, 0, 40, COLORS.btnGreen).setStrokeStyle(4, 0xffffff);
        const addLabel = this.add.text(0, -5, '+', { fontFamily: '"Fredoka One"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
        const addTextShort = this.add.text(0, 50, 'Adicionar', { fontFamily: '"Fredoka One"', fontSize: '14px', color: '#166534' }).setOrigin(0.5);
        addBtn.add([addBg, addLabel, addTextShort]);
        addBtn.setSize(80, 80).setInteractive({ useHandCursor: true });
        addBtn.on('pointerdown', () => this.handleChoice('add'));

        const subBtn = this.add.container(centerX + 80, controlY);
        const subBg = this.add.circle(0, 0, 40, COLORS.btnRed).setStrokeStyle(4, 0xffffff);
        const subLabel = this.add.text(0, -5, '-', { fontFamily: '"Fredoka One"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
        const subTextShort = this.add.text(0, 50, 'Subtrair', { fontFamily: '"Fredoka One"', fontSize: '14px', color: '#991b1b' }).setOrigin(0.5);
        subBtn.add([subBg, subLabel, subTextShort]);
        subBtn.setSize(80, 80).setInteractive({ useHandCursor: true });
        subBtn.on('pointerdown', () => this.handleChoice('subtract'));

        this.choiceUiGroup.add(addBtn);
        this.choiceUiGroup.add(subBtn);
        this.choiceUiGroup.getChildren().forEach(c => (c as any).setVisible?.(false));

        // --- Team Section (Cards at bottom) ---
        const teamY = 580;
        const teamBgSection = this.add.graphics();
        teamBgSection.fillStyle(COLORS.cardsPink, 1);
        teamBgSection.fillRoundedRect(-20, teamY - 20, width + 40, 150, { tl: 30, tr: 30, bl: 0, br: 0 });
        this.add.text(centerX, teamY, 'Seu Time', { fontFamily: '"Fredoka One"', fontSize: '16px', color: '#9f1239' }).setOrigin(0.5);

        // --- Deck Button ---
        const deckBtn = this.add.container(width - 50, height - 50);
        const deckImg = this.add.image(0, 0, 'btn_baralho').setDisplaySize(55, 40);

        deckBtn.add([deckImg]);
        deckBtn.setSize(55, 40).setInteractive({ useHandCursor: true });
        deckBtn.setDepth(15);
        deckBtn.on('pointerdown', () => {
            SoundManager.play('click');
            this.openDeckViewer();
        });

        this.updateUI();
    }

    updateRelicsUI() {
        this.relicsDisplayGroup.clear(true, true);
        const relics: Relic[] = this.registry.get('playerRelics') || [];
        if (relics.length === 0) return;

        const { width, height } = this.cameras.main;
        const startX = 30;
        const startY = 675; // Near the bottom edge
        const relicStyle = { fontSize: '20px' };

        relics.forEach((relic, index) => {
            const relicEmoji = this.add.text(startX + (index * 35), startY, relic.emoji, relicStyle).setInteractive({ useHandCursor: true }).setDepth(20);

            relicEmoji.on('pointerdown', () => {
                if (this.isModalOpen) return;
                SoundManager.play('click');
                this.showInfoModal(relic);
            });

            this.relicsDisplayGroup.add(relicEmoji);
        });
    }

    updateUI() {
        const currentScore = this.registry.get('totalScore');
        const goal = this.registry.get('stageGoal');
        const rollsLeft = this.registry.get('totalRollsLeft');
        const phase = this.registry.get('currentPhase');

        if (this.rollsText) this.rollsText.setText(`Rolagens: ${rollsLeft}`);
        if (this.totalScoreText) this.totalScoreText.setText(`${currentScore} / ${goal}`);
        if (this.goalText) this.goalText.setText(`Meta do Estágio: ${goal} Pontos`);

        this.updateProgressBar();
        this.updateTeamUI();
    }

    updateTeamUI() {
        if (!this.teamCardsGroup) return;
        this.teamCardsGroup.clear(true, true);
        const deck: Card[] = this.registry.get('playerDeck') || [];
        const { width } = this.cameras.main;
        const teamY = 600;

        const cardWidth = 75;
        const cardHeight = 105;
        const spacing = 12;

        // Align to the left to avoid button on the right
        const startX = 35;

        deck.forEach((card, index) => {
            const x = startX + index * (cardWidth + spacing) + cardWidth / 2;
            const cardImg = this.add.container(x, teamY + 45);

            const bg = this.add.graphics();
            bg.fillStyle(0xffffff, 1);
            bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
            bg.lineStyle(2, 0x000000, 0.2);
            bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);

            let icon;
            if (card.image && this.textures.exists(card.id)) {
                icon = this.add.image(0, 0, card.id).setDisplaySize(cardWidth * 0.85, cardWidth * 0.85);
            } else {
                icon = this.add.text(0, 0, card.emoji, { fontSize: '36px' }).setOrigin(0.5);
            }

            cardImg.add([bg, icon]);
            cardImg.setSize(cardWidth, cardHeight);
            cardImg.setInteractive({ useHandCursor: true });

            cardImg.on('pointerdown', () => {
                this.hideCardTooltip();
                this.showInfoModal(card);
            });

            cardImg.on('pointerover', () => this.showCardTooltip(x, teamY - 10, card));
            cardImg.on('pointerout', () => this.hideCardTooltip());

            this.teamCardsGroup.add(cardImg);
        });
    }

    showCardTooltip(x: number, y: number, card: Card | Relic) {
        this.hideCardTooltip();
        const tooltipBg = this.add.graphics();
        tooltipBg.fillStyle(0x000000, 0.85);

        const padding = 10;
        const textStyle = { fontFamily: 'Nunito', fontSize: '12px', color: '#ffffff', wordWrap: { width: 180 } };
        const nameText = this.add.text(0, 0, card.name, { ...textStyle, fontStyle: 'bold', color: '#ffcf33' }).setOrigin(0.5);
        const descText = this.add.text(0, 20, card.description, textStyle).setOrigin(0.5);

        const width = Math.max(nameText.width, descText.width) + padding * 2;
        const height = nameText.height + descText.height + padding * 3;

        tooltipBg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        tooltipBg.lineStyle(1, 0xffffff, 0.3).strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

        const container = this.add.container(x, y - height / 2);
        container.add([tooltipBg, nameText, descText]);
        container.setDepth(100);
        this.tooltipGroup.add(container);
    }

    hideCardTooltip() {
        this.tooltipGroup.clear(true, true);
    }

    updateProgressBar() {
        const currentScore = this.registry.get('totalScore');
        const goal = this.registry.get('stageGoal');
        const previousGoal = this.registry.get('previousGoal');

        let progress = (currentScore - previousGoal) / (goal - previousGoal);
        progress = Phaser.Math.Clamp(progress, 0, 1);

        const barWidth = 300;
        const barHeight = 32;
        const centerX = this.cameras.main.width / 2;
        const progressY = 175;

        if (this.progressBarFill) {
            this.progressBarFill.clear();
            this.progressBarFill.fillStyle(COLORS.progressYellow, 1);
            if (progress > 0) {
                this.progressBarFill.fillRoundedRect(centerX - barWidth / 2 + 4, progressY - barHeight / 2 + 4, (barWidth - 8) * progress, barHeight - 8, 12);
            }
        }

        if (this.progressPercentageText) {
            this.progressPercentageText.setText(`${Math.floor(progress * 100)}%`);
        }
    }

    startNewRoll(isReroll = false) {
        if (this.isRolling || this.isModalOpen) return;
        this.isRolling = true;
        if (!isReroll) {
            this.pawRerollUsedThisTurn = false;
        }

        // Hide choice buttons instead of clearing the group
        this.choiceUiGroup.getChildren().forEach(c => (c as any).setVisible?.(false));
        this.cardUiGroup.clear(true, true);
        this.children.list.filter(c => c.getData('isCardUI')).forEach(c => c.destroy());
        this.playedCardsThisRound = [];
        this.firstMochiPlayedThisTurn = false;
        this.isChoiceActive = false;

        if (!isReroll) this.registry.set('totalRollsLeft', this.registry.get('totalRollsLeft') - 1);
        this.updateUI();

        this.dice1Value = Phaser.Math.Between(1, 6);
        this.dice2Value = Phaser.Math.Between(1, 6);

        if (this.hasRelic('cosmic_whisker')) {
            this.dice1Value = 6;
        }

        this.dice1Text.setVisible(true).setText(DICE_EMOJIS[this.dice1Value - 1]);
        this.dice2Text.setVisible(true).setText(DICE_EMOJIS[this.dice2Value - 1]);

        this.rollAnimation();
    }

    rollAnimation() {
        SoundManager.play('roll');
        this.tweens.add({
            targets: [this.dice1Text, this.dice2Text],
            angle: 360, duration: 1000, ease: 'Cubic.easeOut',
            onUpdate: () => {
                this.dice1Text.setText(DICE_EMOJIS[Phaser.Math.Between(0, 5)]);
                this.dice2Text.setText(DICE_EMOJIS[Phaser.Math.Between(0, 5)]);
            },
            onComplete: () => {
                this.dice1Text.setAngle(0).setText(DICE_EMOJIS[this.dice1Value - 1]);
                this.dice2Text.setAngle(0).setText(DICE_EMOJIS[this.dice2Value - 1]);
                this.showChoiceUI();
            }
        });
    }

    showChoiceUI() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const preliminarySum = this.dice1Value + this.dice2Value;

        const sumText = this.add.text(centerX, 230, `Soma: ${preliminarySum}`, {
            fontFamily: '"Fredoka One"',
            fontSize: '24px',
            color: '#5D4037'
        }).setOrigin(0.5);

        const instruction = this.add.text(centerX, 260, 'Somar ou Subtrair o próximo dado?', {
            fontFamily: '"Fredoka One"',
            fontSize: '16px',
            color: '#5D4037',
            align: 'center',
            wordWrap: { width: 300 }
        }).setOrigin(0.5);

        if (this.hasRelic('lucky_paw') && !this.pawRerollUsedThisTurn) {
            const rerollBtn = this.add.container(centerX, 200);
            const rerollBg = this.add.graphics();
            rerollBg.fillStyle(0x4f46e5, 1);
            rerollBg.fillRoundedRect(-80, -15, 160, 30, 15);
            const rerollText = this.add.text(0, 0, 'Rolar de Novo 🐾', {
                fontFamily: '"Fredoka One"',
                fontSize: '14px',
                color: '#ffffff'
            }).setOrigin(0.5);
            rerollBtn.add([rerollBg, rerollText]);
            rerollBtn.setSize(160, 30).setInteractive({ useHandCursor: true });

            rerollBtn.on('pointerdown', () => {
                if (this.isModalOpen) return;
                SoundManager.play('click');
                this.pawRerollUsedThisTurn = true;
                this.choiceUiGroup.getChildren().forEach(c => (c as any).setVisible?.(false));
                this.dice1Text.setVisible(false);
                this.dice2Text.setVisible(false);
                this.startNewRoll(true);
            });
            this.choiceUiGroup.add(rerollBtn);
        }

        this.choiceUiGroup.add(sumText);
        this.choiceUiGroup.add(instruction);

        // Show the pre-created buttons from createUI
        this.choiceUiGroup.getChildren().forEach(c => (c as any).setVisible?.(true));
        this.isChoiceActive = true;
    }

    private handleChoice(operation: 'add' | 'subtract') {
        if (this.isModalOpen || !this.isChoiceActive) return;
        SoundManager.play('click');
        this.isChoiceActive = false;

        // Hide only the choice buttons
        this.choiceUiGroup.getChildren().forEach(c => (c as any).setVisible?.(false));
        // Destroy only the temp texts (Soma and Instruction)
        this.choiceUiGroup.getChildren().filter(c => c.type === 'Text').forEach(t => t.destroy());

        const preliminarySum = this.dice1Value + this.dice2Value;
        this.initialRoundContext = { initialSum: preliminarySum, operation, dice3Value: 0, finalSum: preliminarySum, pointsMultiplier: 1, flatPoints: 0, specialCondition: '' };
        this.rollThirdDice(preliminarySum, operation);
    }

    rollThirdDice(initialSum: number, operation: 'add' | 'subtract', isReroll = false) {
        if (this.isModalOpen) return;
        SoundManager.play('roll');
        const centerX = this.cameras.main.width / 2;
        const diceY = 280;

        this.dice3Value = Math.floor(Math.random() * 6) + 1;
        if (this.hasRelic('destiny_yarn') && this.dice3Value === 1) {
            this.dice3Value = 3;
        }

        const dice3Text = this.add.text(centerX, diceY - 20, DICE_EMOJIS[0], {
            fontSize: '112px',
            color: '#000000'
        }).setOrigin(0.5).setDepth(20).setScale(0);

        this.tweens.add({
            targets: dice3Text,
            scale: 1,
            angle: 360,
            duration: 800,
            ease: 'Back.easeOut',
            onUpdate: () => {
                dice3Text.setText(DICE_EMOJIS[Math.floor(Math.random() * 6)]);
            },
            onComplete: () => {
                dice3Text.setAngle(0);
                dice3Text.setText(DICE_EMOJIS[this.dice3Value - 1]);
                this.time.delayedCall(500, () => {
                    this.calculateRoundResult(initialSum, operation, this.dice3Value, dice3Text);
                });
            }
        });
    }

    calculateRoundResult(initialSum: number, operation: 'add' | 'subtract', dice3Value: number, dice3Text: Phaser.GameObjects.Text) {
        const centerX = this.cameras.main.width / 2;
        const finalSum = operation === 'add' ? initialSum + dice3Value : initialSum - dice3Value;
        const operator = operation === 'add' ? '+' : '-';
        const isWin = finalSum >= 6 && finalSum <= 12;

        const resultEquationText = this.add.text(centerX, 480,
            `${this.dice1Value} + ${this.dice2Value} ${operator} ${dice3Value} = ${finalSum}`,
            { fontSize: '36px', color: isWin ? '#34d399' : '#f87171', fontStyle: 'bold' }
        ).setOrigin(0.5);

        this.time.delayedCall(1500, () => {
            resultEquationText.destroy();
            dice3Text.destroy();

            this.initialRoundContext = {
                initialSum, operation, dice3Value, finalSum,
                pointsMultiplier: 1, flatPoints: 0, specialCondition: 'NONE'
            };

            const deck: Card[] = this.registry.get('playerDeck');
            const handSize = this.hasRelic('extra_hand') ? 6 : 5;
            this.currentHand = deck.length > 0 ? Phaser.Utils.Array.Shuffle([...deck]).slice(0, handSize) : [];
            this.currentRoundContext = JSON.parse(JSON.stringify(this.initialRoundContext));
            this.presentCardChoice();
        }, [], this);
    }

    formatPoints(points: number): { text: string, color: string } {
        if (points === 0) {
            return { text: `±0 Pontos`, color: '#9ca3af' };
        }
        const sign = points > 0 ? '+' : '';
        const color = points > 0 ? '#34d399' : '#f87171';
        return { text: `${sign}${points} Pontos`, color };
    }

    getPointsForOutcome(context: RoundContext): number {
        const { finalSum, pointsMultiplier, flatPoints, specialCondition, initialSum } = context;
        const phaseCondition = this.registry.get('currentCondition') as PhaseCondition;

        let pointsChange = 0;
        if (finalSum < 6 || finalSum > 12) { pointsChange = -40; }
        else if (finalSum === 9) { pointsChange = 60; }
        else if (finalSum === 8 || finalSum === 10) { pointsChange = 80; }
        else if (finalSum === 7 || finalSum === 11) { pointsChange = 100; }
        else if (finalSum === 6 || finalSum === 12) { pointsChange = 120; }

        let effectiveCondition = phaseCondition;
        if (specialCondition === 'NEGATE_CURSE' && CURSE_CONDITIONS.includes(phaseCondition as CurseCondition)) {
            effectiveCondition = 'NONE';
        }

        switch (effectiveCondition) {
            case 'DOUBLE_POINTS': if (pointsChange > 0) pointsChange *= 2; break;
            case 'SAFE_ROLL': if (pointsChange < 0) pointsChange = 0; break;
            case 'LUCKY_SEVEN': if (finalSum === 7 && pointsChange > 0) pointsChange = 200; break;
            case 'HALF_POINTS': if (pointsChange > 0) pointsChange = Math.floor(pointsChange / 2); break;
            case 'DOUBLE_PENALTY': if (pointsChange < 0) pointsChange *= 2; break;
            case 'PRECISE_OR_NOTHING': if (finalSum !== 6 && finalSum !== 12 && pointsChange > 0) pointsChange = 0; break;
        }

        // Apply card effects
        if (specialCondition === 'MIRACLE' && pointsChange < 0) { pointsChange = 100; }
        if (specialCondition === 'PROTECTOR' && pointsChange < 0) { pointsChange = 20; }
        if (specialCondition === 'SHAKIRA_9' && finalSum === 9) { pointsChange = 120; }
        if (specialCondition === 'CONVERT_TO_120' && pointsChange > 0) { pointsChange = 120; }

        if (specialCondition === 'ELECTRIC_BOOST' && pointsChange > 0) {
            pointsChange = Math.floor(pointsChange * 1.5);
        }

        pointsChange *= pointsMultiplier;
        if (specialCondition === 'MIRROR' && pointsChange > 0) { pointsChange *= 2; }

        if (pointsChange < 0) {
            if (this.hasRelic('comfy_box') && !this.registry.get('cartonBoxUsedThisPhase')) {
                pointsChange = 0;
                this.registry.set('cartonBoxUsedThisPhase', true);
            }
            if (specialCondition === 'SHIELD') pointsChange = 0;
            if (specialCondition === 'CUSHION') pointsChange = Math.floor(pointsChange / 2);
            if (specialCondition === 'NO_NEGATIVE_POINTS' && initialSum === 7) pointsChange = 0;
        }

        pointsChange += flatPoints;

        // Final check for gambler
        if (specialCondition === 'GAMBLER' && initialSum === 7) {
            if (pointsChange > 0) {
                return Phaser.Math.Between(0, 1) === 0 ? pointsChange * 3 : 0;
            }
        }

        return pointsChange;
    }

    calculateFinalContext(playedCards: Card[], initialContext: RoundContext): RoundContext {
        let newContext = JSON.parse(JSON.stringify(initialContext));
        if (playedCards.length === 0) return newContext;

        const playedIds = playedCards.map(c => c.id);
        const hasMestreMochi = playedIds.includes('mestre_mochi');
        let professorIsActive = false;

        for (const card of playedCards) {
            let effectMultiplier = 1;
            if (professorIsActive && card.rarity === 'Common') {
                effectMultiplier = 2;
                professorIsActive = false;
            }

            switch (card.id) {
                case 'kiko': if (newContext.finalSum === 6 || newContext.finalSum === 12) newContext.pointsMultiplier *= (2 * effectMultiplier); break; // Simplified for now
                case 'jujuba': {
                    const invertedDice3 = 7 - initialContext.dice3Value;
                    newContext.finalSum = newContext.operation === 'add' ? initialContext.initialSum + invertedDice3 : initialContext.initialSum - invertedDice3;
                    break;
                }
                case 'shin': if (initialContext.initialSum === 7) newContext.finalSum = initialContext.initialSum; break;
                case 'gatinho_mais_1': newContext.finalSum += (1 * effectMultiplier); break;
                case 'gatinho_menos_1': newContext.finalSum -= (1 * effectMultiplier); break;
                case 'gatinho_escudo': newContext.specialCondition = 'SHIELD'; break;
                case 'shakira': if (newContext.finalSum === 9) newContext.specialCondition = 'SHAKIRA_9'; break;
                case 'mochi': newContext.flatPoints += (hasMestreMochi ? 40 : 20) * effectMultiplier; break;
                case 'mochi2': if (newContext.finalSum === 9) newContext.flatPoints += (hasMestreMochi ? 80 : 40) * effectMultiplier; break;
                case 'mochi_bebe': {
                    const deck = this.registry.get('playerDeck') as Card[];
                    const mochisInDeck = deck.filter(c => c.name.toLowerCase().includes('mochi')).length;
                    let points = (mochisInDeck * 5);
                    if (hasMestreMochi) points *= 2;
                    newContext.flatPoints += points * effectMultiplier;
                    break;
                }
                case 'akira': newContext.specialCondition = 'NEGATE_CURSE'; break;
                case 'gatinho_bonus': newContext.flatPoints += 80 * effectMultiplier; break;
                case 'gatinho_contador': newContext.flatPoints += newContext.dice3Value * 30; break;
                case 'gatinho_espelhado': newContext.specialCondition = 'MIRROR'; break;
                case 'gatinho_ajustador': if (initialContext.finalSum < 6 || initialContext.finalSum > 12) newContext.finalSum = 9; break;
                case 'gatinho_amortecedor': newContext.specialCondition = 'CUSHION'; break;
                case 'gatinho_barreira': if (initialContext.finalSum > 12) newContext.finalSum = 12; break;
                case 'gatinho_piso': if (initialContext.finalSum < 6) newContext.finalSum = 6; break;
                case 'gatinho_conversor': newContext.specialCondition = 'CONVERT_TO_120'; break;
                case 'gatinho_trapaceiro': newContext.finalSum = initialContext.initialSum; break;
                case 'gatinho_eletrizante': if (newContext.finalSum === 8 || newContext.finalSum === 10) newContext.specialCondition = 'ELECTRIC_BOOST'; break;
                case 'gatinho_protetor': newContext.specialCondition = 'PROTECTOR'; break;
                case 'gatinho_sortudo':
                    if (initialContext.initialSum === 7) {
                        newContext.dice3Value = 6;
                        newContext.finalSum = newContext.operation === 'add' ? initialContext.initialSum + 6 : initialContext.initialSum - 6;
                    }
                    break;
                case 'gatinho_explosivo': if (newContext.finalSum === 7 || newContext.finalSum === 11) newContext.flatPoints += 250; break;
                case 'gatinho_milagroso': if (initialContext.finalSum < 6 || initialContext.finalSum > 12) newContext.specialCondition = 'MIRACLE'; break;
                case 'gatinho_equilibrio': if (initialContext.initialSum === 7) newContext.specialCondition = 'NO_NEGATIVE_POINTS'; break;
                case 'gatinho_foguinho':
                    if (newContext.finalSum === 6 || newContext.finalSum === 12) {
                        let sixes = 0;
                        if (this.dice1Value === 6) sixes++;
                        if (this.dice2Value === 6) sixes++;
                        if (newContext.dice3Value === 6) sixes++;
                        newContext.flatPoints += sixes * 40;
                    }
                    break;
                case 'gatinho_professor': professorIsActive = true; break;
            }
        }

        // Post-loop synergies
        const mochiCardsPlayed = playedCards.filter(c => c.name.toLowerCase().includes('mochi'));
        if (playedIds.includes('mochi_gigante')) {
            newContext.flatPoints += mochiCardsPlayed.length * 15;
        }
        if (playedIds.includes('gatinho_apostador') && newContext.initialSum === 7) {
            newContext.specialCondition = 'GAMBLER';
        }

        return newContext;
    }

    presentCardChoice() {
        if (this.isModalOpen) return;
        this.cardUiGroup.clear(true, true);
        this.children.list.filter(c => c.getData('isCardUI')).forEach(c => c.destroy());
        this.dice1Text.setVisible(false);
        this.dice2Text.setVisible(false);

        const centerX = this.cameras.main.width / 2;

        const { operation, finalSum } = this.currentRoundContext;
        const operator = operation === 'add' ? '+' : '-';
        const isWin = finalSum >= 6 && finalSum <= 12;

        this.add.text(centerX, 180,
            `${this.dice1Value} + ${this.dice2Value} ${operator} ${this.currentRoundContext.dice3Value} = ${finalSum}`,
            { fontSize: '32px', color: isWin ? '#34d399' : '#f87171', fontStyle: 'bold' }
        ).setOrigin(0.5).setData('isCardUI', true);

        if (this.currentHand.length === 0) {
            this.add.text(centerX, 220, 'Sem mais cartas para jogar.', { fontSize: '20px', color: '#9ca3af' }).setOrigin(0.5).setData('isCardUI', true);
        } else {
            this.add.text(centerX, 220, 'Escolha uma carta para jogar.', { fontSize: '20px', color: '#e0e7ff' }).setOrigin(0.5).setData('isCardUI', true);
        }

        const cardWidth = 110;
        const cardHeight = 160;
        const cardsPerRow = 3;
        const cardSpacing = 10;
        const totalRowWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * cardSpacing;
        const startX = centerX - totalRowWidth / 2;
        const startY = 260;

        this.currentHand.forEach((card, index) => {
            if (this.isModalOpen) return;
            const row = Math.floor(index / cardsPerRow);
            const col = index % cardsPerRow;
            const cardX = startX + col * (cardWidth + cardSpacing);
            const cardY = startY + row * (cardHeight + cardSpacing);

            const cardContainer = this.add.container(cardX, cardY);
            this.cardUiGroup.add(cardContainer);

            const cardBg = this.add.graphics();
            cardBg.fillStyle(0x374151, 1);
            cardBg.fillRoundedRect(0, 0, cardWidth, cardHeight, 10);
            cardBg.lineStyle(2, 0x4f46e5, 1);
            cardBg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 10);

            // TODO: IA - Substituir este emojiText por uma imagem da carta quando a arte estiver disponível.
            // A imagem deve ser adicionada ao cardContainer e centralizada.
            let cardContent;
            const nameText = this.add.text(cardWidth / 2, 12, card.name, { fontSize: '12px', color: '#ffffff', align: 'center', wordWrap: { width: cardWidth - 10 } }).setOrigin(0.5);
            if (card.image && this.textures.exists(card.id)) {
                cardContent = this.add.image(cardWidth / 2, cardHeight / 2, card.id)
                cardContent.setDisplaySize(cardWidth * 0.9, cardWidth * 0.9)
            } else {
                cardContent = this.add.text(cardWidth / 2, cardHeight / 2, card.emoji, { fontSize: '48px' }).setOrigin(0.5);
            }

            // --- SIMULATION LOGIC START ---
            let specialText: { text: string, color: string } | null = null;
            const currentTotalScore = this.registry.get('totalScore');

            if (card.id === 'jubileu') {
                specialText = { text: 'Rolar 3º Dado', color: '#fcd34d' };
            } else if (card.id === 'sakura') {
                const sakuraPoints = Math.floor(currentTotalScore * 0.1);
                specialText = { text: `+${sakuraPoints} Total`, color: this.formatPoints(sakuraPoints).color };
            } else if (card.id === 'gatinho_supremo') {
                const supremoPoints = currentTotalScore;
                specialText = { text: `+${supremoPoints} Total`, color: this.formatPoints(supremoPoints).color };
            } else if (card.id === 'rei_gatinho') {
                const reiPoints = this.registry.get('stageGoal') - currentTotalScore;
                specialText = { text: `VITÓRIA!`, color: '#fcd34d' };
                if (reiPoints > 0) specialText.text = `+${reiPoints} & Vitória`;
            } else if (card.id === 'zuko') {
                const simContext = this.calculateFinalContext([...this.playedCardsThisRound, card], this.initialRoundContext);
                if (simContext.finalSum === 6 || simContext.finalSum === 12) {
                    specialText = { text: '+1 Lançamento', color: '#818cf8' };
                }
            }


            let pointsTextDisplay: Phaser.GameObjects.Text;
            if (specialText) {
                pointsTextDisplay = this.add.text(cardWidth / 2, cardHeight - 15, specialText.text, { fontSize: '12px', color: specialText.color, fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
            } else {
                const simPlayedCards = [...this.playedCardsThisRound, card];
                const simContext = this.calculateFinalContext(simPlayedCards, this.initialRoundContext);
                const potentialPoints = this.getPointsForOutcome(simContext);
                const formatted = this.formatPoints(potentialPoints);
                pointsTextDisplay = this.add.text(cardWidth / 2, cardHeight - 15, formatted.text, { fontSize: '12px', color: formatted.color, fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
            }
            // --- SIMULATION LOGIC END ---

            cardContainer.add([cardBg, nameText, cardContent, pointsTextDisplay]);
            cardContainer.setSize(cardWidth, cardHeight).setInteractive({ useHandCursor: true });

            cardContainer.on('pointerover', () => {
                this.showCardTooltip(cardX + cardWidth / 2, cardY - 20, card);
                cardBg.lineStyle(3, 0x818cf8, 1).strokeRoundedRect(0, 0, cardWidth, cardHeight, 10);
            });
            cardContainer.on('pointerout', () => {
                this.hideCardTooltip();
                cardBg.lineStyle(2, 0x4f46e5, 1).strokeRoundedRect(0, 0, cardWidth, cardHeight, 10);
            });

            cardContainer.on('pointerdown', () => {
                this.hideCardTooltip();
                this.showPlayConfirmationModal(card, pointsTextDisplay.text, pointsTextDisplay.style.color as string);
            });
        });

        const finishButtonY = 620;
        const finishButton = this.add.text(centerX, finishButtonY, 'Finalizar Turno', { fontSize: '28px', color: '#ffffff', backgroundColor: '#6b7280', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.cardUiGroup.add(finishButton);

        const currentPoints = this.getPointsForOutcome(this.currentRoundContext);
        const finishFormatted = this.formatPoints(currentPoints);
        const finishPointsText = this.add.text(centerX, finishButtonY + 45, finishFormatted.text, { fontSize: '18px', color: finishFormatted.color, fontStyle: 'bold' }).setOrigin(0.5);
        this.cardUiGroup.add(finishPointsText);

        finishButton.on('pointerdown', () => {
            if (this.isModalOpen) return;
            SoundManager.play('click');
            this.cardUiGroup.clear(true, true);
            this.children.list.filter(c => c.getData('isCardUI')).forEach(c => c.destroy());
            this.handleRollResult();
        });
    }

    applyCardAndContinue(card: Card) {
        if (this.isModalOpen) return;
        SoundManager.play('click');
        // Handle instant effects that don't fit the recalculation model
        switch (card.id) {
            case 'sakura': this.registry.set('totalScore', Math.floor(this.registry.get('totalScore') * 1.1)); break;
            case 'gatinho_supremo': this.registry.set('totalScore', this.registry.get('totalScore') * 2); break;
            case 'rei_gatinho': this.registry.set('totalScore', this.registry.get('stageGoal')); break;
            case 'zuko':
                const tempContext = this.calculateFinalContext([...this.playedCardsThisRound, card], this.initialRoundContext);
                if (tempContext.finalSum === 6 || tempContext.finalSum === 12) {
                    this.registry.set('totalRollsLeft', this.registry.get('totalRollsLeft') + 1);
                }
                break;
            case 'gatinho_escudo':
                this.registry.set('totalRollsLeft', this.registry.get('totalRollsLeft') + 1);
                break; case 'jubileu':
                this.cardUiGroup.clear(true, true);
                this.children.list.filter(c => c.getData('isCardUI')).forEach(c => c.destroy());
                // Reroll logic - keep dice1 and dice2 visible
                this.dice1Text.setVisible(true);
                this.dice2Text.setVisible(true);
                this.rollThirdDice(this.initialRoundContext.initialSum, this.initialRoundContext.operation, true);
                return;
        }

        const isMochiCard = card.name.toLowerCase().includes('mochi');
        let consumeCard = true;
        if (this.hasRelic('infinite_mochi_bowl') && isMochiCard && !this.firstMochiPlayedThisTurn) {
            this.firstMochiPlayedThisTurn = true;
            consumeCard = false;
        }

        if (consumeCard) {
            let deck: Card[] = this.registry.get('playerDeck');
            const cardIndexInDeck = deck.findIndex(c => c.id === card.id);
            if (cardIndexInDeck > -1) {
                deck.splice(cardIndexInDeck, 1);
                this.registry.set('playerDeck', deck);
            }
        }

        // Remove card from current hand
        const cardIndexInHand = this.currentHand.findIndex(c => c.id === card.id);
        if (cardIndexInHand > -1) {
            this.currentHand.splice(cardIndexInHand, 1);
        }

        this.playedCardsThisRound.push(card);
        this.currentRoundContext = this.calculateFinalContext(this.playedCardsThisRound, this.initialRoundContext);

        // After applying effect, re-render card choices
        this.presentCardChoice();
    }

    handleRollResult() {
        this.showCardActivations(() => {
            const oldScore = this.registry.get('totalScore');
            let pointsChange = this.getPointsForOutcome(this.currentRoundContext);

            if (this.hasRelic('synergy_scratcher') && this.playedCardsThisRound.length >= 3) {
                pointsChange += 50;
            }

            const newScore = Math.max(0, oldScore + pointsChange);
            this.registry.set('totalScore', newScore);

            this.animateScoreChange(pointsChange, oldScore, newScore, () => {
                this.updateUI();
                this.checkGameState();
            });
        });
    }

    showCardActivations(onComplete: () => void) {
        const activeCards: { card: Card, text: string }[] = [];
        const context = this.currentRoundContext;

        this.playedCardsThisRound.forEach(card => {
            switch (card.id) {
                case 'kiko': if (context.finalSum === 6 || context.finalSum === 12) activeCards.push({ card, text: 'Ganhos x2!' }); break;
                case 'shin': if (context.initialSum === 7) activeCards.push({ card, text: '3º Dado Anulado!' }); break;
                case 'zuko': if (context.finalSum === 6 || context.finalSum === 12) activeCards.push({ card, text: '+1 Lançamento!' }); break;
                case 'gatinho_foguinho': if (context.finalSum === 6 || context.finalSum === 12) activeCards.push({ card, text: 'Foguinho Ativado!' }); break;
                // Add more activation checks here
            }
        });

        if (activeCards.length === 0) {
            onComplete();
            return;
        }

        let delay = 0;
        activeCards.forEach(({ card, text }, index) => {
            this.time.delayedCall(delay, () => {
                SoundManager.play('activate');
                const centerX = this.cameras.main.width / 2;
                const centerY = this.cameras.main.height / 2;

                const container = this.add.container(centerX, centerY).setAlpha(0);
                const emoji = this.add.text(0, 0, card.emoji, { fontSize: '64px' }).setOrigin(0.5);
                const label = this.add.text(0, 50, text, { fontSize: '24px', color: '#fcd34d', fontStyle: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 8, y: 4 } }).setOrigin(0.5);
                container.add([emoji, label]);

                this.tweens.add({
                    targets: container,
                    alpha: 1,
                    scale: { from: 0.5, to: 1.1 },
                    yoyo: true,
                    duration: 400,
                    ease: 'Cubic.easeInOut',
                    onComplete: () => {
                        container.destroy();
                        if (index === activeCards.length - 1) {
                            this.time.delayedCall(200, onComplete);
                        }
                    }
                });
            });
            delay += 600;
        });
    }

    animateScoreChange(pointsChange: number, oldScore: number, newScore: number, onComplete: () => void) {
        if (pointsChange !== 0) {
            SoundManager.play(pointsChange > 0 ? 'win' : 'lose');
            const { text, color } = this.formatPoints(pointsChange);
            const scoreChangeText = this.add.text(this.totalScoreText.x, this.totalScoreText.y, text.replace(' Pontos', ''), {
                fontSize: '24px',
                color,
                fontStyle: 'bold',
            });

            this.tweens.add({
                targets: scoreChangeText,
                y: scoreChangeText.y - 50,
                alpha: 0,
                duration: 1500,
                ease: 'Power1',
                onComplete: () => scoreChangeText.destroy()
            });
        }

        // Animate the total score text counting up/down
        this.tweens.add({
            targets: { score: oldScore },
            score: newScore,
            duration: 500,
            ease: 'Power1',
            onUpdate: (tween) => {
                this.totalScoreText.setText(Math.floor((tween.targets[0] as any).score).toString());
                this.updateProgressBar(); // Update progress bar smoothly
            },
            onComplete: () => {
                this.totalScoreText.setText(newScore.toString());
                this.updateProgressBar();
                onComplete();
            }
        });
    }

    checkGameState() {
        const totalScore = this.registry.get('totalScore');
        const goal = this.registry.get('stageGoal');
        const totalRollsLeft = this.registry.get('totalRollsLeft');
        const phase = this.registry.get('currentPhase');
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        if (totalScore >= goal) {
            if (phase === 35) {
                this.isRolling = true;
                this.cameras.main.flash(500, 255, 215, 0); // Gold flash
                this.add.text(centerX, centerY, 'VITÓRIA!', { fontSize: '64px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
                this.time.delayedCall(2500, () => this.scene.start('GameWonScene'));
                return;
            }

            this.isRolling = true; // Block further actions
            this.cameras.main.flash(500, 50, 200, 50);
            this.add.text(centerX, centerY, 'META ATINGIDA!', { fontSize: '48px', color: '#34d399', fontStyle: 'bold' }).setOrigin(0.5);

            this.time.delayedCall(2500, () => this.scene.start('ShopScene'));
        } else if (totalRollsLeft <= 0) { // Game over if no rolls left and goal not met
            if (this.hasRelic('seven_lives_collar') && !this.registry.get('sevenLivesUsed')) {
                this.registry.set('sevenLivesUsed', true);
                const currentScore = this.registry.get('totalScore');
                this.registry.set('totalScore', Math.floor(currentScore / 2));
                this.registry.set('totalRollsLeft', STARTING_ROLLS);

                this.isRolling = true;
                this.cameras.main.flash(500, 255, 255, 255);
                this.add.text(centerX, centerY, 'SEGUNDA CHANCE! ❤️', { fontSize: '48px', color: '#f87171', fontStyle: 'bold' }).setOrigin(0.5);
                this.time.delayedCall(2500, () => {
                    this.scene.start('PhaseIntroScene');
                });
                return;
            }

            this.isRolling = true; // Block further actions
            this.cameras.main.flash(500, 200, 50, 50);
            this.add.text(centerX, centerY, 'FALHOU!', { fontSize: '48px', color: '#f87171', fontStyle: 'bold' }).setOrigin(0.5);

            this.time.delayedCall(2000, () => this.scene.start('GameOverScene'));
        } else {
            this.isRolling = false;
            this.startNewRoll();
        }
    }

    openDeckViewer() {
        if (this.isModalOpen) return;
        SoundManager.play('click');
        this.isModalOpen = true;
        this.deckViewerGroup.clear(true, true);

        const { width, height } = this.cameras.main;
        const blocker = this.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, width, height).setDepth(10);
        blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains); // Block clicks

        const modalBg = this.add.graphics().fillStyle(0x1f2937, 0.95).fillRoundedRect(20, 50, width - 40, height - 100, 15).setDepth(11);
        modalBg.lineStyle(2, 0x4f46e5).strokeRoundedRect(20, 50, width - 40, height - 100, 15);

        const title = this.add.text(width / 2, 80, 'Seu Baralho', { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(12);

        const closeButton = this.add.text(width / 2, height - 80, 'Fechar', { fontSize: '24px', color: '#fff', backgroundColor: '#dc2626', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(12);
        closeButton.on('pointerdown', () => this.closeDeckViewer());

        this.deckViewerGroup.addMultiple([blocker, modalBg, title, closeButton]);

        const deck: Card[] = this.registry.get('playerDeck');
        const cardWidth = 75;
        const cardHeight = 105;
        const columns = 4;
        const cardSpacing = 10;
        const startX = width / 2 - (columns * (cardWidth + cardSpacing) - cardSpacing) / 2;
        let currentY = 130;

        // --- Cards Section ---
        const cardsTitle = this.add.text(width / 2, currentY - 20, 'Gatinhos', { fontSize: '20px', color: COLORS.popPink, fontStyle: 'bold' }).setOrigin(0.5).setDepth(12);
        this.deckViewerGroup.add(cardsTitle);

        deck.forEach((card, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const cardX = startX + col * (cardWidth + cardSpacing);
            const cardY = currentY + row * (cardHeight + cardSpacing);

            const container = this.add.container(cardX, cardY).setDepth(12);
            const bg = this.add.graphics().fillStyle(0x374151).fillRoundedRect(0, 0, cardWidth, cardHeight, 8);
            bg.lineStyle(2, COLORS.popPink, 0.5).strokeRoundedRect(0, 0, cardWidth, cardHeight, 8);

            let cardContent;
            if (card.image && this.textures.exists(card.id)) {
                cardContent = this.add.image(cardWidth / 2, cardHeight / 2 - 10, card.id);
                cardContent.setDisplaySize(cardWidth * 0.8, cardWidth * 0.8);
            } else {
                cardContent = this.add.text(cardWidth / 2, cardHeight / 2, card.emoji, { fontSize: '32px' }).setOrigin(0.5);
            }
            const nameText = this.add.text(cardWidth / 2, cardHeight - 15, card.name, { fontSize: '10px', color: '#fff', align: 'center', wordWrap: { width: cardWidth - 5 } }).setOrigin(0.5);
            container.add([bg, cardContent, nameText]);
            container.setSize(cardWidth, cardHeight).setInteractive({ useHandCursor: true });
            container.on('pointerdown', () => this.showInfoModal(card));
            this.deckViewerGroup.add(container);
        });

        // Update currentY for Relics
        const numRows = Math.ceil(deck.length / columns);
        currentY += numRows * (cardHeight + cardSpacing) + 40;

        // --- Relics Section ---
        const relics: Relic[] = this.registry.get('playerRelics');
        if (relics && relics.length > 0) {
            const relicsTitle = this.add.text(width / 2, currentY - 20, 'Relíquias', { fontSize: '20px', color: COLORS.popPurple, fontStyle: 'bold' }).setOrigin(0.5).setDepth(12);
            this.deckViewerGroup.add(relicsTitle);

            const relicWidth = 60;
            const relicHeight = 60;
            const relicColumns = 5;
            const relicSpacing = 10;
            const rStartX = width / 2 - (relicColumns * (relicWidth + relicSpacing) - relicSpacing) / 2;

            relics.forEach((relic, index) => {
                const row = Math.floor(index / relicColumns);
                const col = index % relicColumns;
                const rX = rStartX + col * (relicWidth + relicSpacing);
                const rY = currentY + row * (relicHeight + relicSpacing);

                const rContainer = this.add.container(rX, rY).setDepth(12);
                const rBg = this.add.graphics().fillStyle(0x374151).fillCircle(relicWidth / 2, relicHeight / 2, relicWidth / 2);
                rBg.lineStyle(2, COLORS.popPurple, 0.5).strokeCircle(relicWidth / 2, relicHeight / 2, relicWidth / 2);

                const rEmoji = this.add.text(relicWidth / 2, relicHeight / 2, relic.emoji, { fontSize: '32px' }).setOrigin(0.5);

                rContainer.add([rBg, rEmoji]);
                rContainer.setSize(relicWidth, relicHeight).setInteractive({ useHandCursor: true });
                rContainer.on('pointerdown', () => this.showInfoModal(relic));

                // Tooltip simple indication
                rContainer.on('pointerover', () => rEmoji.setScale(1.2));
                rContainer.on('pointerout', () => rEmoji.setScale(1));

                this.deckViewerGroup.add(rContainer);
            });
        }

        this.deckViewerGroup.setVisible(true);
    }

    closeDeckViewer() {
        SoundManager.play('click');
        this.isModalOpen = false;
        this.deckViewerGroup.clear(true, true);
        this.deckViewerGroup.setVisible(false);
    }

    // --- Modal Methods ---
    closeModal() {
        SoundManager.play('click');
        this.modalGroup.clear(true, true);
        this.modalGroup.setVisible(false);
        this.isModalOpen = false;
    }

    showInfoModal(item: Card | Relic) {
        this.isModalOpen = true;
        this.modalGroup.clear(true, true).setDepth(20);

        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        const blocker = this.add.graphics().fillStyle(0x000000, 0.8).fillRect(0, 0, width, height);
        blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

        const modalY = centerY - 50;
        const modalWidth = 320;
        const modalHeight = 460;

        // Modal Shadow
        const shadow = this.add.graphics().fillStyle(0x000000, 0.3).fillRoundedRect(centerX - modalWidth / 2 + 8, modalY - modalHeight / 2 + 8, modalWidth, modalHeight, 25);

        // Modal Body
        const modalBg = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(centerX - modalWidth / 2, modalY - modalHeight / 2, modalWidth, modalHeight, 25);
        modalBg.lineStyle(6, COLORS.textBrown, 1).strokeRoundedRect(centerX - modalWidth / 2, modalY - modalHeight / 2, modalWidth, modalHeight, 25);

        // Header
        const headerH = 60;
        const header = this.add.graphics().fillStyle(COLORS.pastelCream, 1).fillRoundedRect(centerX - modalWidth / 2, modalY - modalHeight / 2, modalWidth, headerH, { tl: 25, tr: 25, bl: 0, br: 0 });
        header.lineStyle(2, 0xd1d5db, 1).moveTo(centerX - modalWidth / 2, modalY - modalHeight / 2 + headerH).lineTo(centerX + modalWidth / 2, modalY - modalHeight / 2 + headerH).strokePath();

        const title = this.add.text(centerX, modalY - modalHeight / 2 + headerH / 2, item.name, {
            fontFamily: 'Fredoka One',
            fontSize: '22px',
            color: COLORS.textBrown
        }).setOrigin(0.5);

        // Card Art Focus
        let art;
        const artSize = 240;
        if ((item as Card).image && this.textures.exists(item.id)) {
            art = this.add.image(centerX, modalY - 50, item.id).setDisplaySize(artSize, artSize);
        } else {
            art = this.add.text(centerX, modalY - 50, item.emoji, { fontSize: '120px' }).setOrigin(0.5);
        }

        // Description Section
        const descBg = this.add.graphics().fillStyle(COLORS.creamBg, 0.5).fillRoundedRect(centerX - 140, modalY + 90, 280, 80, 15);
        const desc = this.add.text(centerX, modalY + 130, item.description, {
            fontFamily: 'Nunito',
            fontSize: '16px',
            color: COLORS.textBrown,
            align: 'center',
            wordWrap: { width: 250 }
        }).setOrigin(0.5);

        const closeBtn = this.add.container(centerX, modalY + 220);
        const btnBg = this.add.graphics().fillStyle(COLORS.btnRed, 1).fillRoundedRect(-80, -20, 160, 40, 20);
        const btnTxt = this.add.text(0, 0, 'Voltar', { fontFamily: 'Fredoka One', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        closeBtn.add([btnBg, btnTxt]);
        closeBtn.setSize(160, 40).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.closeModal());

        this.modalGroup.addMultiple([blocker, shadow, modalBg, header, title, art, descBg, desc, closeBtn]);
        this.modalGroup.setVisible(true);
    }

    showPlayConfirmationModal(card: Card, outcomeText: string, outcomeColor: string) {
        if (this.isModalOpen) return;
        this.isModalOpen = true;
        this.modalGroup.clear(true, true).setDepth(20);

        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        const blocker = this.add.graphics().fillStyle(COLORS.black, 0.8).fillRect(0, 0, width, height);
        blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

        const modalY = centerY - 50;
        const modalWidth = 320;
        const modalHeight = 480;

        // Modal Shadow
        const shadow = this.add.graphics().fillStyle(0x000000, 0.3).fillRoundedRect(centerX - modalWidth / 2 + 8, modalY - modalHeight / 2 + 8, modalWidth, modalHeight, 25);

        // Modal Body
        const modalBg = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(centerX - modalWidth / 2, modalY - modalHeight / 2, modalWidth, modalHeight, 25);
        modalBg.lineStyle(6, COLORS.textBrown, 1).strokeRoundedRect(centerX - modalWidth / 2, modalY - modalHeight / 2, modalWidth, modalHeight, 25);

        // Header
        const headerH = 60;
        const header = this.add.graphics().fillStyle(COLORS.pastelCream, 1).fillRoundedRect(centerX - modalWidth / 2, modalY - modalHeight / 2, modalWidth, headerH, { tl: 25, tr: 25, bl: 0, br: 0 });
        header.lineStyle(2, 0xd1d5db, 1).moveTo(centerX - modalWidth / 2, modalY - modalHeight / 2 + headerH).lineTo(centerX + modalWidth / 2, modalY - modalHeight / 2 + headerH).strokePath();

        const title = this.add.text(centerX, modalY - modalHeight / 2 + headerH / 2, card.name, {
            fontFamily: 'Fredoka One',
            fontSize: '22px',
            color: COLORS.textBrown
        }).setOrigin(0.5);

        // Card Art Focus
        let art;
        const artSize = 240;
        if (card.image && this.textures.exists(card.id)) {
            art = this.add.image(centerX, modalY - 50, card.id).setDisplaySize(artSize, artSize);
        } else {
            art = this.add.text(centerX, modalY - 50, card.emoji, { fontSize: '120px' }).setOrigin(0.5);
        }

        // Info Section
        const infoBg = this.add.graphics().fillStyle(COLORS.creamBg, 0.5).fillRoundedRect(centerX - 140, modalY + 90, 280, 100, 15);
        const desc = this.add.text(centerX, modalY + 125, card.description, {
            fontFamily: 'Nunito',
            fontSize: '14px',
            color: COLORS.textBrown,
            align: 'center',
            wordWrap: { width: 260 }
        }).setOrigin(0.5);

        const outcome = this.add.text(centerX, modalY + 165, `Resultado: ${outcomeText}`, {
            fontFamily: 'Fredoka One',
            fontSize: '16px',
            color: outcomeColor
        }).setOrigin(0.5);

        // Buttons
        const btnY = modalY + 230;
        const confirmBtn = this.add.container(centerX - 75, btnY);
        const cBg = this.add.graphics().fillStyle(0x16a34a, 1).fillRoundedRect(-65, -20, 130, 40, 20);
        const cTxt = this.add.text(0, 0, 'Usar', { fontFamily: 'Fredoka One', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        confirmBtn.add([cBg, cTxt]);
        confirmBtn.setSize(130, 40).setInteractive({ useHandCursor: true });
        confirmBtn.on('pointerdown', () => {
            this.closeModal();
            this.applyCardAndContinue(card);
        });

        const cancelBtn = this.add.container(centerX + 75, btnY);
        const rBg = this.add.graphics().fillStyle(COLORS.btnRed, 1).fillRoundedRect(-65, -20, 130, 40, 20);
        const rTxt = this.add.text(0, 0, 'Voltar', { fontFamily: 'Fredoka One', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        cancelBtn.add([rBg, rTxt]);
        cancelBtn.setSize(130, 40).setInteractive({ useHandCursor: true });
        cancelBtn.on('pointerdown', () => this.closeModal());

        this.modalGroup.addMultiple([blocker, shadow, modalBg, header, title, art, infoBg, desc, outcome, confirmBtn, cancelBtn]);
        this.modalGroup.setVisible(true);
    }
}

class ShopScene extends Phaser.Scene {
    modalGroup!: Phaser.GameObjects.Group;
    isModalOpen = false;

    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
    registry!: Phaser.Data.DataManager;
    scene!: Phaser.Scenes.ScenePlugin;
    time!: Phaser.Time.Clock;
    textures!: Phaser.Textures.TextureManager;

    constructor() { super('ShopScene'); }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;

        // Background with overlay
        this.add.image(centerX, height / 2, 'fundo_loja').setDisplaySize(width, height);
        this.add.graphics().fillStyle(0xffffff, 0.4).fillRect(0, 0, width, height);

        this.isModalOpen = false;
        this.modalGroup = this.add.group();
        this.modalGroup.setVisible(false);

        // --- Header Section ---
        // Title Banner (Sticker effect)
        const bannerContainer = this.add.container(centerX, 70);
        const bannerBg = this.add.graphics();
        bannerBg.fillStyle(COLORS.popBlue, 1);
        bannerBg.lineStyle(5, COLORS.white, 1);
        bannerBg.fillRoundedRect(-140, -30, 280, 60, 20);
        bannerBg.strokeRoundedRect(-140, -30, 280, 60, 20);

        // Shadow for banner
        const bannerShadow = this.add.graphics();
        bannerShadow.fillStyle(0x000000, 0.2);
        bannerShadow.fillRoundedRect(-140, -24, 280, 60, 20);

        const bannerText = this.add.text(0, 0, 'Loja de Gatinhos', {
            fontFamily: '"Fredoka One"',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#ffffff',
            strokeThickness: 1
        }).setOrigin(0.5);

        bannerContainer.add([bannerShadow, bannerBg, bannerText]);
        bannerContainer.setAngle(-2);

        // Currency Badge
        const currencyY = 130;
        const currentScore = this.registry.get('totalScore');

        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(COLORS.white, 1);
        badgeBg.lineStyle(2, COLORS.deepBrown, 0.2);
        badgeBg.fillRoundedRect(centerX - 120, currencyY - 20, 240, 40, 20);
        badgeBg.strokeRoundedRect(centerX - 120, currencyY - 20, 240, 40, 20);

        const coinIcon = this.add.circle(centerX - 100, currencyY, 12, 0xfacc15);
        coinIcon.setStrokeStyle(2, 0xca8a04);
        const coinSymbol = this.add.text(centerX - 100, currencyY, '$', { fontSize: '12px', color: '#713f12', fontStyle: 'bold' }).setOrigin(0.5);

        const scoreText = this.add.text(centerX + 10, currencyY, `Pontos Totais: ${currentScore}`, {
            fontFamily: '"Nunito"',
            fontSize: '18px',
            color: '#5D4037',
            fontStyle: '800'
        }).setOrigin(0.5);

        // --- Grid Section ---
        const shopItems = this.generateShopItems();
        this.displayShopItems(shopItems, scoreText);

        const shopRelic = this.generateShopRelic();
        if (shopRelic) {
            this.displayShopRelic(shopRelic, scoreText);
        }

        // --- Footer Section ---
        const footerY = 670;
        const btnWidth = 160;
        const btnHeight = 60;

        const btnContainer = this.add.container(centerX, footerY);
        const btnImg = this.add.image(0, 0, 'btn_proxima').setDisplaySize(btnWidth, btnHeight);

        btnContainer.add([btnImg]);
        btnContainer.setSize(btnWidth, btnHeight).setInteractive({ useHandCursor: true });

        btnContainer.on('pointerover', () => {
            this.tweens.add({ targets: btnContainer, scale: 1.05, duration: 100 });
        });

        btnContainer.on('pointerout', () => {
            this.tweens.add({ targets: btnContainer, scale: 1, duration: 100 });
        });

        btnContainer.on('pointerdown', () => {
            if (this.isModalOpen) return;
            SoundManager.play('click');
            btnImg.setScale(0.95);

            this.time.delayedCall(100, () => {
                btnImg.setScale(1);
                const relics: Relic[] = this.registry.get('playerRelics');
                if (relics.some(r => r.id === 'full_bowl')) {
                    const score = this.registry.get('totalScore');
                    this.registry.set('totalScore', score + 50);
                }

                let rolls = this.registry.get('totalRollsLeft');
                this.registry.set('totalRollsLeft', rolls + 1);

                const phase = this.registry.get('currentPhase');
                this.registry.set('currentPhase', phase + 1);
                this.scene.start('PhaseIntroScene');
            });
        });
    }

    generateShopItems(): Card[] {
        const allCards = Object.values(CARD_DEFINITIONS);
        const weightedPool: Card[] = [];
        allCards.forEach(card => {
            const weight = card.rarity === 'Common' ? 10 : (card.rarity === 'Uncommon' ? 5 : (card.rarity === 'Rare' ? 2 : 1));
            for (let i = 0; i < weight; i++) weightedPool.push(card);
        });

        const selection: Card[] = [];
        const usedIds = new Set();
        while (selection.length < 4 && weightedPool.length > 0) {
            const randomIndex = Phaser.Math.Between(0, weightedPool.length - 1);
            const randomCard = weightedPool[randomIndex];
            if (!usedIds.has(randomCard.id)) {
                selection.push(randomCard);
                usedIds.add(randomCard.id);
            }
        }
        return selection;
    }

    generateShopRelic(): Relic | null {
        if (Math.random() < 0.5) return null;
        const allRelics = Object.values(RELIC_DEFINITIONS);
        const playerRelics: Relic[] = this.registry.get('playerRelics');
        const playerRelicIds = new Set(playerRelics.map(r => r.id));
        const availableRelics = allRelics.filter(r => !playerRelicIds.has(r.id));
        if (availableRelics.length === 0) return null;

        const weightedPool: Relic[] = [];
        availableRelics.forEach(relic => {
            const weight = relic.rarity === 'Common' ? 10 : (relic.rarity === 'Uncommon' ? 5 : (relic.rarity === 'Rare' ? 2 : 1));
            for (let i = 0; i < weight; i++) weightedPool.push(relic);
        });
        return weightedPool[Phaser.Math.Between(0, weightedPool.length - 1)];
    }

    displayShopItems(items: Card[], scoreText: Phaser.GameObjects.Text) {
        const { width } = this.cameras.main;
        const centerX = width / 2;
        const cardWidth = 145;
        const cardHeight = 160;
        const spacing = 15;
        const startX = centerX - cardWidth - spacing / 2 + cardWidth / 2;
        const startY = 250;

        items.forEach((card, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = centerX - (cardWidth + spacing) / 2 + (col * (cardWidth + spacing));
            const y = startY + (row * (cardHeight + spacing));

            const cardContainer = this.add.container(x, y);
            const isBlue = index % 2 !== 0;
            const themeColor = isBlue ? COLORS.popBlue : COLORS.popPink;

            // Cartoon Shadow
            const shadow = this.add.graphics();
            shadow.fillStyle(0x000000, 0.15);
            shadow.fillRoundedRect(-cardWidth / 2, -cardHeight / 2 + 6, cardWidth, cardHeight, 25);

            // Card Bg
            const bg = this.add.graphics();
            bg.fillStyle(COLORS.pastelCream, 1);
            bg.lineStyle(5, themeColor, 1);
            bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 25);
            bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 25);

            // Inner Image Holder
            const imgBg = this.add.graphics();
            imgBg.fillStyle(0xffffff, 1);
            imgBg.lineStyle(2, themeColor, 0.2);
            imgBg.fillRoundedRect(-cardWidth / 2 + 10, -cardHeight / 2 + 10, cardWidth - 20, cardWidth - 45, 15);
            imgBg.strokeRoundedRect(-cardWidth / 2 + 10, -cardHeight / 2 + 10, cardWidth - 20, cardWidth - 45, 15);

            // Promo Badge for some cards
            let promoBadge;
            if (index === 1 || index === 3) {
                const badgeCont = this.add.container(cardWidth / 2 - 15, cardHeight / 2 - 45);
                const b = this.add.graphics();
                b.fillStyle(0xdc2626, 1);
                b.fillRoundedRect(-30, -8, 60, 16, 4);
                const t = this.add.text(0, 0, 'PROMOÇÃO!', { fontSize: '8px', fontFamily: '"Fredoka One"', color: '#fff' }).setOrigin(0.5);
                badgeCont.add([b, t]).setAngle(-10);
                promoBadge = badgeCont;
            }

            // Image
            let cardImage;
            if (card.image && this.textures.exists(card.id)) {
                cardImage = this.add.image(0, -25, card.id).setDisplaySize(90, 90);
            } else {
                cardImage = this.add.text(0, -25, card.emoji, { fontSize: '48px' }).setOrigin(0.5);
            }

            const name = this.add.text(0, 30, card.name, {
                fontFamily: '"Fredoka One"',
                fontSize: '14px',
                color: Phaser.Display.Color.IntegerToColor(themeColor).rgba,
                align: 'center',
                wordWrap: { width: cardWidth - 20 }
            }).setOrigin(0.5, 0);

            // Cost Button Style
            const relics: Relic[] = this.registry.get('playerRelics') || [];
            const hasBargainAmulet = relics.some(r => r.id === 'bargain_amulet');
            const finalCost = hasBargainAmulet ? Math.floor(card.cost * 0.85) : card.cost;

            const costGroup = this.add.container(0, cardHeight / 2 - 20);
            const costBg = this.add.graphics();
            costBg.fillStyle(0xF5E6D3, 1);
            costBg.fillRoundedRect(-cardWidth / 2 + 10, -12, cardWidth - 20, 24, 12);
            const costT = this.add.text(0, 0, `${finalCost} Pontos 🧶`, {
                fontFamily: '"Nunito"',
                fontSize: '12px',
                color: '#5D4037',
                fontStyle: '800'
            }).setOrigin(0.5);
            costGroup.add([costBg, costT]);

            cardContainer.add([shadow, bg, imgBg, cardImage, name, costGroup]);
            if (promoBadge) cardContainer.add(promoBadge);

            cardContainer.setSize(cardWidth, cardHeight).setInteractive({ useHandCursor: true });

            cardContainer.on('pointerover', () => {
                this.tweens.add({ targets: cardContainer, scale: 1.05, duration: 100 });
            });
            cardContainer.on('pointerout', () => {
                this.tweens.add({ targets: cardContainer, scale: 1, duration: 100 });
            });
            cardContainer.on('pointerdown', () => {
                if (this.isModalOpen || this.registry.get('totalScore') < finalCost) return;
                this.showBuyConfirmationModal(card, 'Card', finalCost, () => {
                    SoundManager.play('buy');
                    this.closeModal();
                    let score = this.registry.get('totalScore');
                    score -= finalCost;
                    this.registry.set('totalScore', score);
                    const deck = this.registry.get('playerDeck');
                    deck.push(card);
                    this.registry.set('playerDeck', deck);
                    scoreText.setText(`Pontos Totais: ${score}`);

                    bg.setAlpha(0.5);
                    cardImage.setAlpha(0.5);
                    name.setText('COMPRADO!');
                    costGroup.setVisible(false);
                    cardContainer.disableInteractive();
                });
            });
        });
    }

    displayShopRelic(relic: Relic, scoreText: Phaser.GameObjects.Text) {
        const { width } = this.cameras.main;
        const centerX = width / 2;
        const cardWidth = 330;
        const cardHeight = 100;
        const y = 570;

        const container = this.add.container(centerX, y);

        // Shadow and Base
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.1);
        shadow.fillRoundedRect(-cardWidth / 2, -cardHeight / 2 + 5, cardWidth, cardHeight, 25);

        const bg = this.add.graphics();
        bg.fillStyle(COLORS.white, 1);
        bg.lineStyle(4, COLORS.popPurple, 0.5);
        bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 25);
        bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 25);

        // Special Glow for Relic
        const innerGlow = this.add.graphics();
        innerGlow.fillStyle(COLORS.popPurple, 0.1);
        innerGlow.fillRoundedRect(-cardWidth / 2 + 4, -cardHeight / 2 + 4, cardWidth - 8, cardHeight - 8, 20);

        // Badge
        const badgeCont = this.add.container(0, -cardHeight / 2);
        const bBg = this.add.graphics();
        bBg.fillStyle(COLORS.popGold, 1);
        bBg.lineStyle(2, COLORS.white, 1);
        bBg.fillRoundedRect(-60, -12, 120, 24, 12);
        bBg.strokeRoundedRect(-60, -12, 120, 24, 12);
        const bText = this.add.text(0, 0, '★ LENDÁRIO ★', { fontFamily: '"Fredoka One"', fontSize: '10px', color: '#5D4037' }).setOrigin(0.5);
        badgeCont.add([bBg, bText]);

        // Content
        const imgHolder = this.add.graphics();
        imgHolder.fillStyle(COLORS.popPurple, 0.15);
        imgHolder.fillRoundedRect(-cardWidth / 2 + 15, -35, 70, 70, 15);

        const emoji = this.add.text(-cardWidth / 2 + 50, 0, relic.emoji, { fontSize: '40px' }).setOrigin(0.5);
        const name = this.add.text(-cardWidth / 2 + 100, -25, relic.name, { fontFamily: '"Fredoka One"', fontSize: '18px', color: '#AB47BC' }).setOrigin(0, 0.5);

        const relicsInInv: Relic[] = this.registry.get('playerRelics') || [];
        const hasBargainAmulet = relicsInInv.some(r => r.id === 'bargain_amulet');
        const finalCost = hasBargainAmulet ? Math.floor(relic.cost * 0.85) : relic.cost;

        const costCont = this.add.container(-cardWidth / 2 + 100, 20);
        const costBg = this.add.graphics();
        costBg.fillStyle(COLORS.popPurple, 1);
        costBg.fillRoundedRect(0, -15, 120, 30, 15);
        const costT = this.add.text(60, 0, `${finalCost} Pontos 🧶`, { fontFamily: '"Nunito"', fontSize: '14px', color: '#ffffff', fontStyle: '800' }).setOrigin(0.5);
        costCont.add([costBg, costT]);

        container.add([shadow, bg, innerGlow, badgeCont, imgHolder, emoji, name, costCont]);
        container.setSize(cardWidth, cardHeight).setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            if (this.isModalOpen || this.registry.get('totalScore') < finalCost) return;
            this.showBuyConfirmationModal(relic, 'Relic', finalCost, () => {
                SoundManager.play('buy');
                this.closeModal();
                let score = this.registry.get('totalScore');
                score -= finalCost;
                this.registry.set('totalScore', score);
                const playerRelics = this.registry.get('playerRelics');
                playerRelics.push(relic);
                this.registry.set('playerRelics', playerRelics);
                scoreText.setText(`Pontos Totais: ${score}`);

                bg.setAlpha(0.5);
                emoji.setAlpha(0.5);
                name.setText('ADQUIRIDO!');
                costCont.setVisible(false);
                container.disableInteractive();
            });
        });
    }

    closeModal() {
        SoundManager.play('click');
        this.modalGroup.clear(true, true);
        this.modalGroup.setVisible(false);
        this.isModalOpen = false;
    }

    showBuyConfirmationModal(item: Card | Relic, itemType: 'Card' | 'Relic', cost: number, onConfirm: () => void) {
        this.isModalOpen = true;
        this.modalGroup.clear(true, true).setDepth(20);

        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        const blocker = this.add.graphics().fillStyle(COLORS.black, 0.8).fillRect(0, 0, width, height);
        blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

        const modalY = centerY - 50;
        const modalWidth = 320;
        const modalHeight = 500;

        // Modal Shadow
        const shadow = this.add.graphics().fillStyle(0x000000, 0.3).fillRoundedRect(centerX - modalWidth / 2 + 8, modalY - modalHeight / 2 + 8, modalWidth, modalHeight, 25);

        // Modal Body
        const modalBg = this.add.graphics().fillStyle(COLORS.white, 1).fillRoundedRect(centerX - modalWidth / 2, modalY - modalHeight / 2, modalWidth, modalHeight, 25);
        modalBg.lineStyle(6, COLORS.popPurple, 1).strokeRoundedRect(centerX - modalWidth / 2, modalY - modalHeight / 2, modalWidth, modalHeight, 25);

        // Header
        const headerH = 60;
        const header = this.add.graphics().fillStyle(COLORS.pastelCream, 1).fillRoundedRect(centerX - modalWidth / 2, modalY - modalHeight / 2, modalWidth, headerH, { tl: 25, tr: 25, bl: 0, br: 0 });
        header.lineStyle(2, 0xd1d5db, 1).moveTo(centerX - modalWidth / 2, modalY - modalHeight / 2 + headerH).lineTo(centerX + modalWidth / 2, modalY - modalHeight / 2 + headerH).strokePath();

        const title = this.add.text(centerX, modalY - modalHeight / 2 + headerH / 2, item.name, {
            fontFamily: 'Fredoka One',
            fontSize: '22px',
            color: COLORS.deepBrown
        }).setOrigin(0.5);

        // Art Focus
        let art;
        const artSize = 220;
        if ((item as Card).image && this.textures.exists(item.id)) {
            art = this.add.image(centerX, modalY - 40, item.id).setDisplaySize(artSize, artSize);
        } else {
            art = this.add.text(centerX, modalY - 40, item.emoji, { fontSize: '120px' }).setOrigin(0.5);
        }

        // Info Section
        const infoBg = this.add.graphics().fillStyle(0xF5E6D3, 0.5).fillRoundedRect(centerX - 140, modalY + 95, 280, 110, 15);
        const desc = this.add.text(centerX, modalY + 130, item.description, {
            fontFamily: 'Nunito',
            fontSize: '14px',
            color: COLORS.deepBrown,
            align: 'center',
            wordWrap: { width: 260 },
            fontStyle: '600'
        }).setOrigin(0.5);

        const costText = this.add.text(centerX, modalY + 185, `Custo: ${cost} Pontos 🧶`, {
            fontFamily: 'Fredoka One',
            fontSize: '18px',
            color: '#AB47BC'
        }).setOrigin(0.5);

        // Buttons
        const btnY = modalY + 260;
        const confirmBtn = this.add.container(centerX - 75, btnY);
        const confirmLabel = itemType === 'Card' ? 'Comprar' : 'Adquirir';
        const cBg = this.add.graphics().fillStyle(0x16a34a, 1).fillRoundedRect(-65, -20, 130, 40, 20);
        const cTxt = this.add.text(0, 0, confirmLabel, { fontFamily: 'Fredoka One', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        confirmBtn.add([cBg, cTxt]);
        confirmBtn.setSize(130, 40).setInteractive({ useHandCursor: true });
        confirmBtn.on('pointerdown', onConfirm);

        const cancelBtn = this.add.container(centerX + 75, btnY);
        const rBg = this.add.graphics().fillStyle(COLORS.btnRed, 1).fillRoundedRect(-65, -20, 130, 40, 20);
        const rTxt = this.add.text(0, 0, 'Voltar', { fontFamily: 'Fredoka One', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        cancelBtn.add([rBg, rTxt]);
        cancelBtn.setSize(130, 40).setInteractive({ useHandCursor: true });
        cancelBtn.on('pointerdown', () => this.closeModal());

        this.modalGroup.addMultiple([blocker, shadow, modalBg, header, title, art, infoBg, desc, costText, confirmBtn, cancelBtn]);
        this.modalGroup.setVisible(true);
    }
}

class GameOverScene extends Phaser.Scene {
    // FIX: Declare Phaser properties to resolve TypeScript errors.
    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
    registry!: Phaser.Data.DataManager;
    scene!: Phaser.Scenes.ScenePlugin;
    tweens!: Phaser.Tweens.TweenManager;

    constructor() { super('GameOverScene'); }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        this.add.image(centerX, height / 2, 'fundo_fase').setDisplaySize(width, height);
        const finalScore = this.registry.get('totalScore');
        const finalPhase = this.registry.get('currentPhase');
        const highScore = this.registry.get('highScore');
        let newHighScore = false;

        if (finalScore > highScore) {
            setHighScore(finalScore);
            this.registry.set('highScore', finalScore);
            newHighScore = true;
        }

        this.add.text(centerX, 150, 'Fim de Jogo', { fontSize: '56px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(centerX, 230, `Você chegou até a Fase ${finalPhase}`, { fontSize: '22px', color: '#fecaca' }).setOrigin(0.5);
        this.add.text(centerX, 270, `Pontuação Final: ${finalScore}`, { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);

        if (newHighScore) {
            const hsText = this.add.text(centerX, 330, 'NOVO RECORDE!', { fontSize: '36px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
            this.tweens.add({ targets: hsText, scale: 1.1, duration: 300, yoyo: true, repeat: -1 });
        } else {
            this.add.text(centerX, 330, `Recorde: ${highScore}`, { fontSize: '22px', color: '#fcd34d' }).setOrigin(0.5);
        }

        const restartButton = this.add.text(centerX, 480, 'Jogar Novamente', { fontSize: '28px', color: '#ffffff', backgroundColor: '#b91c1c', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        restartButton.on('pointerdown', () => {
            SoundManager.play('click');
            this.registry.set('totalScore', 0);
            this.registry.set('currentPhase', 1);
            this.registry.set('totalRollsLeft', STARTING_ROLLS);
            const startingDeck = STARTING_DECK_IDS.map(id => CARD_DEFINITIONS[id]);
            this.registry.set('playerDeck', startingDeck);
            this.scene.start('PhaseIntroScene');
        });

        const menuButton = this.add.text(centerX, 560, 'Menu Principal', { fontSize: '28px', color: '#ffffff', backgroundColor: '#4a5568', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuButton.on('pointerdown', () => {
            SoundManager.play('click');
            this.scene.start('MainMenuScene');
        });
    }
}

class GameWonScene extends Phaser.Scene {
    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
    registry!: Phaser.Data.DataManager;
    scene!: Phaser.Scenes.ScenePlugin;
    tweens!: Phaser.Tweens.TweenManager;

    constructor() { super('GameWonScene'); }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        this.add.image(centerX, height / 2, 'fundo_fase').setDisplaySize(width, height);
        const finalScore = this.registry.get('totalScore');
        const highScore = this.registry.get('highScore');
        let newHighScore = false;

        if (finalScore > highScore) {
            setHighScore(finalScore);
            this.registry.set('highScore', finalScore);
            newHighScore = true;
        }

        this.add.text(centerX, 150, 'VOCÊ VENCEU!', { fontSize: '56px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(centerX, 230, `Você zerou o Jogo dos Dados!`, { fontSize: '22px', color: '#dcfce7' }).setOrigin(0.5);
        this.add.text(centerX, 270, `Pontuação Final: ${finalScore}`, { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);

        if (newHighScore) {
            const hsText = this.add.text(centerX, 330, 'NOVO RECORDE!', { fontSize: '36px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
            this.tweens.add({ targets: hsText, scale: 1.1, duration: 300, yoyo: true, repeat: -1 });
        } else {
            this.add.text(centerX, 330, `Recorde: ${highScore}`, { fontSize: '22px', color: '#fcd34d' }).setOrigin(0.5);
        }

        const restartButton = this.add.text(centerX, 480, 'Jogar Novamente', { fontSize: '28px', color: '#ffffff', backgroundColor: '#166534', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        restartButton.on('pointerdown', () => {
            SoundManager.play('click');
            this.registry.set('totalScore', 0);
            this.registry.set('currentPhase', 1);
            this.registry.set('totalRollsLeft', STARTING_ROLLS);
            const startingDeck = STARTING_DECK_IDS.map(id => CARD_DEFINITIONS[id]);
            this.registry.set('playerDeck', startingDeck);
            this.scene.start('PhaseIntroScene');
        });

        const menuButton = this.add.text(centerX, 560, 'Menu Principal', { fontSize: '28px', color: '#ffffff', backgroundColor: '#4a5568', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuButton.on('pointerdown', () => {
            SoundManager.play('click');
            this.scene.start('MainMenuScene');
        });
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 400,
        height: 700,
    },
    parent: document.body,
    backgroundColor: '#111827',
    scene: [PreloadScene, MainMenuScene, PhaseIntroScene, MainGameScene, ShopScene, GameOverScene, GameWonScene],
};

const game = new Phaser.Game(config);