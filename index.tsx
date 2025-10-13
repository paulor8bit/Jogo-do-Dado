import Phaser from 'phaser';

// --- Sound Manager (uses Web Audio API, no assets needed) ---
const SoundManager = {
    context: new (window.AudioContext || (window as any).webkitAudioContext)(),
    play: function(type: 'click' | 'roll' | 'buy' | 'win' | 'lose' | 'activate') {
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
            if(type === 'roll') {
                 oscillator.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + duration);
            }
            
            gainNode.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + duration);
        } catch (e) {
            console.error("Could not play sound", e);
        }
    }
};

// Resume audio context on first user interaction
document.body.addEventListener('pointerdown', () => {
    if (SoundManager.context && SoundManager.context.state === 'suspended') {
        SoundManager.context.resume();
    }
}, { once: true });


const DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const HIGH_SCORE_KEY = 'diceGameHighScore';

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
        const centerX = this.cameras.main.width / 2;
        const catImage = this.add.image(centerX, 560, 'jubijujuba').setOrigin(0.5);
        catImage.setScale(0.5);
        this.tweens.add({
            targets: catImage,
            alpha: { from: 0, to: 1 },
            duration: 1500,
            ease: 'Sine.easeInOut'
        });

        this.add.text(centerX, 150, 'Jogo dos Dados', { fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(centerX, 220, 'Chegue a 10.000 pontos para vencer!', { fontSize: '18px', color: '#c7d2fe', align: 'center', wordWrap: {width: 380} }).setOrigin(0.5);
        
        const highScore = this.registry.get('highScore');
        if (highScore > 0) {
            this.add.text(centerX, 260, `Seu Recorde: ${highScore}`, { fontSize: '20px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
        }

        const startButton = this.add.text(centerX, 350, 'Começar a Jogar', { fontSize: '28px', color: '#ffffff', backgroundColor: '#4f46e5', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        startButton.on('pointerover', () => startButton.setBackgroundColor('#6366f1'));
        startButton.on('pointerout', () => startButton.setBackgroundColor('#4f46e5'));
        startButton.on('pointerdown', () => {
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
        this.cameras.main.setBackgroundColor('#111827');
        const centerX = this.cameras.main.width / 2;
        const phase = this.registry.get('currentPhase');
        const goal = getGoalForPhase(phase);
        const previousGoal = getGoalForPhase(phase - 1);
        
        this.registry.set('stageGoal', goal);
        this.registry.set('previousGoal', previousGoal);
        this.registry.set('cartonBoxUsedThisPhase', false);
        
        let condition: PhaseCondition = 'NONE';

        // Bonus Phases (cycle: SAFE_ROLL -> LUCKY_SEVEN -> DOUBLE_POINTS)
        if ([5, 17, 29].includes(phase)) condition = 'SAFE_ROLL';
        if ([9, 21, 33].includes(phase)) condition = 'LUCKY_SEVEN';
        if ([13, 25].includes(phase)) condition = 'DOUBLE_POINTS';
        
        // Curse Phases (cycle: HALF_POINTS -> DOUBLE_PENALTY -> PRECISE_OR_NOTHING)
        if ([4, 16, 28].includes(phase)) condition = 'HALF_POINTS';
        if ([8, 20, 32].includes(phase)) condition = 'DOUBLE_PENALTY';
        if ([12, 24].includes(phase)) condition = 'PRECISE_OR_NOTHING';

        // Final Phase
        if (phase === 35) {
            condition = 'PRECISE_OR_NOTHING';
        }
        
        this.registry.set('currentCondition', condition);

        if (phase === 35) {
            this.add.text(centerX, 150, `Fase Final`, { fontSize: '56px', color: '#f87171', fontStyle: 'bold' }).setOrigin(0.5);
            this.add.text(centerX, 230, `Meta: ${goal} Pontos`, { fontSize: '28px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
            this.add.text(centerX, 270, 'Vença para zerar o jogo!', { fontSize: '22px', color: '#e0e7ff' }).setOrigin(0.5);
        } else {
            this.add.text(centerX, 150, `Fase ${phase}`, { fontSize: '56px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
            this.add.text(centerX, 230, `Meta: ${goal} Pontos`, { fontSize: '28px', color: '#e0e7ff' }).setOrigin(0.5);
        }

        if (condition !== 'NONE') {
            const conditionText = CONDITION_DESCRIPTIONS[condition];
            const color = BONUS_CONDITIONS.includes(condition as BonusCondition) ? '#34d399' : '#f87171';
            this.add.text(centerX, 380, conditionText, { fontSize: '22px', color, fontStyle: 'italic', align: 'center', wordWrap: { width: 350 } }).setOrigin(0.5);
        } else {
             this.add.text(centerX, 380, 'Fase Neutra', { fontSize: '22px', color: '#9ca3af', fontStyle: 'italic' }).setOrigin(0.5);
        }

        const startButton = this.add.text(centerX, 550, 'Começar Fase', { fontSize: '32px', color: '#ffffff', backgroundColor: '#16a34a', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        startButton.on('pointerover', () => startButton.setBackgroundColor('#22c55e'));
        startButton.on('pointerout', () => startButton.setBackgroundColor('#16a34a'));
        startButton.on('pointerdown', () => {
            SoundManager.play('click');
            this.scene.start('MainGameScene');
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
    progressBar!: Phaser.GameObjects.Graphics;
    deckText!: Phaser.GameObjects.Text;

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
        this.cameras.main.setBackgroundColor('#1f2937');
        this.choiceUiGroup = this.add.group();
        this.cardUiGroup = this.add.group();
        this.deckViewerGroup = this.add.group();
        this.relicsDisplayGroup = this.add.group();
        this.modalGroup = this.add.group();
        this.deckViewerGroup.setVisible(false);
        this.modalGroup.setVisible(false);
        
        this.createUI();
        this.startNewRoll();
    }
    
    createUI() {
        const centerX = this.cameras.main.width / 2;
        const phase = this.registry.get('currentPhase');
        const totalRollsLeft = this.registry.get('totalRollsLeft');
        const goal = this.registry.get('stageGoal');
        const totalScore = this.registry.get('totalScore');
        const condition = this.registry.get('currentCondition') as PhaseCondition;
        const deck: Card[] = this.registry.get('playerDeck');

        const headerStyle = { fontSize: '24px', color: '#e5e7eb', fontStyle: 'bold' };
        
        this.phaseText = this.add.text(20, 20, phase === 35 ? 'Fase Final' : `Fase: ${phase}`, headerStyle);
        this.rollsText = this.add.text(this.cameras.main.width - 20, 20, `Lançamentos: ${totalRollsLeft}`, headerStyle).setOrigin(1, 0);
        
        this.add.text(20, 60, 'Pontuação Total:', {fontSize: '20px', color: '#d1d5db'});
        this.totalScoreText = this.add.text(220, 60, `${totalScore}`, {fontSize: '20px', color: '#fcd34d', fontStyle: 'bold'});
        this.deckText = this.add.text(20, 90, `Cartas no Baralho: ${deck.length}`, { fontSize: '16px', color: '#9ca3af' });
        
        // Deck Viewer Button
        const deckButton = this.add.text(this.cameras.main.width - 20, 90, 'Ver Baralho', { fontSize: '16px', color: '#c7d2fe', backgroundColor: '#374151', padding: { x: 8, y: 4 } }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        deckButton.on('pointerdown', () => {
             if (this.isModalOpen) this.closeDeckViewer(); else this.openDeckViewer();
        });

        // Progress Bar
        this.add.text(centerX, 90, 'Progresso da Fase', { fontSize: '20px', color: '#d1d5db'}).setOrigin(0.5);
        this.goalText = this.add.text(centerX, 120, `${totalScore} / ${goal}`, { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x374151, 1); // bg-gray-700
        progressBox.fillRect(50, 150, 300, 20);
        this.progressBar = this.add.graphics();
        this.updateProgressBar();

        // Bottom Condition Text
        if (condition !== 'NONE') {
            const color = BONUS_CONDITIONS.includes(condition as BonusCondition) ? '#34d399' : '#f87171';
            this.conditionText = this.add.text(centerX, 680, CONDITION_DESCRIPTIONS[condition], { fontSize: '18px', color, fontStyle: 'italic' }).setOrigin(0.5);
        }

        this.updateRelicsUI();
    }
    
    updateRelicsUI() {
        this.relicsDisplayGroup.clear(true, true);
        const relics: Relic[] = this.registry.get('playerRelics') || [];
        if (relics.length === 0) return;

        const startX = 20;
        const startY = 650;
        const relicStyle = { fontSize: '24px' };
        
        relics.forEach((relic, index) => {
            const relicEmoji = this.add.text(startX + (index * 30), startY, relic.emoji, relicStyle).setInteractive({ useHandCursor: true });
            
            relicEmoji.on('pointerdown', () => {
                if(this.isModalOpen) return;
                SoundManager.play('click');
                this.showInfoModal(relic);
            });

            this.relicsDisplayGroup.add(relicEmoji);
        });
    }

    updateUI() {
        const totalScore = this.registry.get('totalScore');
        const deck: Card[] = this.registry.get('playerDeck');
        this.rollsText.setText(`Lançamentos: ${this.registry.get('totalRollsLeft')}`);
        this.totalScoreText.setText(`${totalScore}`);
        this.goalText.setText(`${totalScore} / ${this.registry.get('stageGoal')}`);
        this.deckText.setText(`Cartas no Baralho: ${deck.length}`);
        this.updateProgressBar();
    }

    updateProgressBar() {
        const totalScore = this.registry.get('totalScore');
        const goal = this.registry.get('stageGoal');
        const previousGoal = this.registry.get('previousGoal');

        const pointsInStage = totalScore - previousGoal;
        const pointsNeededForStage = goal - previousGoal;
        const progress = pointsNeededForStage > 0 ? Math.max(0, pointsInStage / pointsNeededForStage) : 1;
        
        this.progressBar.clear();
        this.progressBar.fillStyle(0x34d399, 1); // green-400
        this.progressBar.fillRect(50, 150, 300 * Math.min(1, progress), 20);
    }

    startNewRoll(isReroll = false) {
        if (this.isRolling || this.isModalOpen) return;
        this.isRolling = true;
        this.choiceUiGroup.clear(true, true);
        this.cardUiGroup.clear(true, true);
        this.children.list.filter(c => c.getData('isCardUI')).forEach(c => c.destroy());
        this.playedCardsThisRound = [];
        this.firstMochiPlayedThisTurn = false;
        if (!isReroll) {
            this.pawRerollUsedThisTurn = false;
        }
        
        if(!isReroll) this.registry.set('totalRollsLeft', this.registry.get('totalRollsLeft') - 1);
        this.updateUI();

        this.dice1Value = Phaser.Math.Between(1, 6);
        this.dice2Value = Phaser.Math.Between(1, 6);
        
        if (this.hasRelic('cosmic_whisker')) {
            this.dice1Value = 6;
        }

        const centerX = this.cameras.main.width / 2;
        const diceTextStyle = { fontSize: '96px', color: '#ffffff', fontStyle: 'bold' };

        this.dice1Text = this.add.text(centerX - 80, 300, DICE_EMOJIS[this.dice1Value - 1], diceTextStyle).setOrigin(0.5);
        this.dice2Text = this.add.text(centerX + 80, 300, DICE_EMOJIS[this.dice2Value - 1], diceTextStyle).setOrigin(0.5);
        this.add.text(centerX, 300, '+', { fontSize: '64px', color: '#9ca3af' }).setOrigin(0.5);

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
        const centerX = this.cameras.main.width / 2;
        const preliminarySum = this.dice1Value + this.dice2Value;
        const sumText = this.add.text(centerX, 420, `Soma prévia: ${preliminarySum}`, { fontSize: '28px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
        const instruction = this.add.text(centerX, 460, 'Somar ou Subtrair o próximo dado?', { fontSize: '22px', color: '#e0e7ff', align: 'center', wordWrap: {width: 380} }).setOrigin(0.5);
        const addButton = this.add.text(centerX, 520, 'Somar (+)', { fontSize: '28px', color: '#ffffff', backgroundColor: '#16a34a', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const subtractButton = this.add.text(centerX, 580, 'Subtrair (-)', { fontSize: '28px', color: '#ffffff', backgroundColor: '#dc2626', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        if (this.hasRelic('lucky_paw') && !this.pawRerollUsedThisTurn) {
            const rerollButton = this.add.text(centerX, 370, 'Rolar de Novo 🐾', { fontSize: '20px', color: '#ffffff', backgroundColor: '#4f46e5', padding: { x: 10, y: 5 }}).setOrigin(0.5).setInteractive({ useHandCursor: true });
            this.choiceUiGroup.add(rerollButton);

            rerollButton.on('pointerdown', () => {
                if (this.isModalOpen) return;
                SoundManager.play('click');
                this.pawRerollUsedThisTurn = true;
                this.choiceUiGroup.clear(true, true);
                this.dice1Text.destroy();
                this.dice2Text.destroy();
                this.children.list.find(c => c.type === 'Text' && (c as Phaser.GameObjects.Text).text === '+')?.destroy();
                this.startNewRoll(true);
            });
        }

        this.choiceUiGroup.addMultiple([sumText, instruction, addButton, subtractButton]);

        const handleChoice = (operation: 'add' | 'subtract') => {
            if (this.isModalOpen) return;
            SoundManager.play('click');
            this.choiceUiGroup.clear(true, true);
            this.rollThirdDice(preliminarySum, operation);
        };
        
        addButton.on('pointerdown', () => handleChoice('add'));
        subtractButton.on('pointerdown', () => handleChoice('subtract'));
    }

    rollThirdDice(initialSum: number, operation: 'add' | 'subtract', isReroll = false) {
        if (!isReroll) {
             this.dice1Text.setVisible(true);
             this.dice2Text.setVisible(true);
        }
        SoundManager.play('roll');
        const centerX = this.cameras.main.width / 2;
        let dice3Value = Phaser.Math.Between(1, 6);

        if (this.hasRelic('destiny_yarn') && dice3Value === 1) {
            dice3Value = 3;
        }

        const dice3TextStyle = { fontSize: '96px', color: '#ffffff', fontStyle: 'bold' };
        const dice3Text = this.add.text(centerX, 350, DICE_EMOJIS[0], dice3TextStyle).setOrigin(0.5);

        this.tweens.add({
            targets: dice3Text, angle: 360, duration: 1000, ease: 'Cubic.easeOut',
            onUpdate: () => dice3Text.setText(DICE_EMOJIS[Phaser.Math.Between(0, 5)]),
            onComplete: () => {
                dice3Text.setAngle(0).setText(DICE_EMOJIS[dice3Value - 1]);
                this.calculateRoundResult(initialSum, operation, dice3Value, dice3Text);
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
                specialText = {text: `+${sakuraPoints} Total`, color: this.formatPoints(sakuraPoints).color};
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

            cardContainer.on('pointerdown', () => this.showPlayConfirmationModal(card, pointsTextDisplay.text, pointsTextDisplay.style.color));
            cardContainer.on('pointerover', () => cardBg.lineStyle(3, 0x818cf8, 1).strokeRoundedRect(0, 0, cardWidth, cardHeight, 10));
            cardContainer.on('pointerout', () => cardBg.lineStyle(2, 0x4f46e5, 1).strokeRoundedRect(0, 0, cardWidth, cardHeight, 10));
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
                                break;            case 'jubileu':
                this.cardUiGroup.clear(true, true);
                this.children.list.filter(c => c.getData('isCardUI')).forEach(c => c.destroy());
                this.dice1Text.setVisible(false);
                this.dice2Text.setVisible(false);
                // Reroll logic - re-initializes the context
                this.rollThirdDice(this.initialRoundContext.initialSum, this.initialRoundContext.operation, true);
                return; // Exit to prevent re-rendering card choice
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
                const label = this.add.text(0, 50, text, { fontSize: '24px', color: '#fcd34d', fontStyle: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: {x: 8, y: 4} }).setOrigin(0.5);
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
                this.totalScoreText.setText(Math.floor(tween.targets[0].score).toString());
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
        blocker.setInteractive(new Phaser.Geom.Rectangle(0,0,width,height), Phaser.Geom.Rectangle.Contains); // Block clicks

        const modalBg = this.add.graphics().fillStyle(0x1f2937, 0.95).fillRoundedRect(20, 50, width - 40, height - 100, 15).setDepth(11);
        modalBg.lineStyle(2, 0x4f46e5).strokeRoundedRect(20, 50, width - 40, height - 100, 15);

        const title = this.add.text(width / 2, 80, 'Seu Baralho', { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(12);
        
        const closeButton = this.add.text(width / 2, height - 80, 'Fechar', { fontSize: '24px', color: '#fff', backgroundColor: '#dc2626', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(12);
        closeButton.on('pointerdown', () => this.closeDeckViewer());

        this.deckViewerGroup.addMultiple([blocker, modalBg, title, closeButton]);

        const deck: Card[] = this.registry.get('playerDeck');
        const cardWidth = 90;
        const cardHeight = 130;
        const columns = 3;
        const cardSpacing = 10;
        const startX = width / 2 - (columns * (cardWidth + cardSpacing) - cardSpacing) / 2;
        const startY = 130;

        deck.forEach((card, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const cardX = startX + col * (cardWidth + cardSpacing);
            const cardY = startY + row * (cardHeight + cardSpacing);

            const container = this.add.container(cardX, cardY).setDepth(12);
            const bg = this.add.graphics().fillStyle(0x374151).fillRoundedRect(0, 0, cardWidth, cardHeight, 8);
            
            // TODO: IA - Substituir este emoji por uma imagem da carta quando a arte estiver disponível.
            // A imagem deve ser adicionada ao container e centralizada.
            let cardContent;
            if (card.image && this.textures.exists(card.id)) {
                cardContent = this.add.image(cardWidth / 2, cardHeight / 2 - 10, card.id);
                cardContent.setDisplaySize(cardWidth * 0.9, cardWidth * 0.9);
            } else {
                cardContent = this.add.text(cardWidth/2, cardHeight / 2, card.emoji, {fontSize: '36px'}).setOrigin(0.5);
            }
            const name = this.add.text(cardWidth / 2, cardHeight - 15, card.name, { fontSize: '12px', color: '#fff', align: 'center', wordWrap: { width: cardWidth - 5 } }).setOrigin(0.5);
            container.add([bg, cardContent, name]);
            this.deckViewerGroup.add(container);
        });

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
        const blocker = this.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, width, height);
        blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
        
        const modalBg = this.add.graphics().fillStyle(0x1f2937).fillRoundedRect(centerX - 150, 200, 300, 250, 15);
        modalBg.lineStyle(2, 0x4f46e5).strokeRoundedRect(centerX - 150, 200, 300, 250, 15);

        const emoji = this.add.text(centerX, 250, item.emoji, { fontSize: '48px' }).setOrigin(0.5);
        const name = this.add.text(centerX, 300, item.name, { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        const desc = this.add.text(centerX, 350, item.description, { fontSize: '14px', color: '#d1d5db', align: 'center', wordWrap: { width: 280 } }).setOrigin(0.5);
        
        const closeButton = this.add.text(centerX, 420, 'Fechar', { fontSize: '20px', color: '#fff', backgroundColor: '#6b7280', padding: { x: 15, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => this.closeModal());

        this.modalGroup.addMultiple([blocker, modalBg, emoji, name, desc, closeButton]);
        this.modalGroup.setVisible(true);
    }

    showPlayConfirmationModal(card: Card, outcomeText: string, outcomeColor: string) {
        if (this.isModalOpen) return;
        this.isModalOpen = true;
        this.modalGroup.clear(true, true).setDepth(20);

        const { width, height } = this.cameras.main;
        const centerX = width / 2;

        const blocker = this.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, width, height);
        blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

        const modalBg = this.add.graphics().fillStyle(0x1f2937).fillRoundedRect(centerX - 160, 200, 320, 300, 15);
        modalBg.lineStyle(2, 0x4f46e5).strokeRoundedRect(centerX - 160, 200, 320, 300, 15);
        
        const emoji = this.add.text(centerX, 240, card.emoji, { fontSize: '48px' }).setOrigin(0.5);
        const name = this.add.text(centerX, 285, card.name, { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        const desc = this.add.text(centerX, 330, card.description, { fontSize: '14px', color: '#d1d5db', align: 'center', wordWrap: { width: 280 } }).setOrigin(0.5);
        const outcome = this.add.text(centerX, 380, `Resultado: ${outcomeText}`, { fontSize: '16px', color: outcomeColor, fontStyle: 'bold' }).setOrigin(0.5);
        
        const confirmButton = this.add.text(centerX - 70, 450, 'Usar', { fontSize: '20px', color: '#fff', backgroundColor: '#16a34a', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        confirmButton.on('pointerdown', () => {
            this.closeModal();
            this.applyCardAndContinue(card);
        });

        const cancelButton = this.add.text(centerX + 70, 450, 'Cancelar', { fontSize: '20px', color: '#fff', backgroundColor: '#dc2626', padding: { x: 15, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        cancelButton.on('pointerdown', () => this.closeModal());
        
        this.modalGroup.addMultiple([blocker, modalBg, emoji, name, desc, outcome, confirmButton, cancelButton]);
        this.modalGroup.setVisible(true);
    }
}

class ShopScene extends Phaser.Scene {
    // Modal properties
    modalGroup!: Phaser.GameObjects.Group;
    isModalOpen = false;

    // FIX: Declare Phaser properties to resolve TypeScript errors.
    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
    registry!: Phaser.Data.DataManager;
    scene!: Phaser.Scenes.ScenePlugin;
    time!: Phaser.Time.Clock;
    textures!: Phaser.Textures.TextureManager;

    constructor() { super('ShopScene'); }

    create() {
        this.cameras.main.setBackgroundColor('#1e1b4b'); // indigo-950
        const centerX = this.cameras.main.width / 2;
        this.isModalOpen = false;
        this.modalGroup = this.add.group();
        this.modalGroup.setVisible(false);

        this.add.text(centerX, 50, 'Loja de Gatinhos', { fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(centerX, 95, 'Fortaleça seu baralho!', { fontSize: '20px', color: '#c7d2fe' }).setOrigin(0.5);
        
        let currentScore = this.registry.get('totalScore');
        const scoreText = this.add.text(centerX, 130, `Seus Pontos: ${currentScore}`, { fontSize: '28px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
        
        const shopItems = this.generateShopItems();
        this.displayShopItems(shopItems, scoreText);
        
        const shopRelic = this.generateShopRelic();
        if (shopRelic) {
            this.displayShopRelic(shopRelic, scoreText);
        }

        const continueButton = this.add.text(centerX, 660, 'Próxima Fase', { fontSize: '32px', color: '#ffffff', backgroundColor: '#16a34a', padding: { x: 20, y: 10 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        continueButton.on('pointerover', () => continueButton.setBackgroundColor('#22c55e'));
        continueButton.on('pointerout', () => continueButton.setBackgroundColor('#16a34a'));
        continueButton.on('pointerdown', () => {
            if (this.isModalOpen) return;
            SoundManager.play('click');
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
    }

    generateShopItems(): Card[] {
        const allCards = Object.values(CARD_DEFINITIONS);
        const weightedPool: Card[] = [];
        allCards.forEach(card => {
            const weight = card.rarity === 'Common' ? 10 : (card.rarity === 'Uncommon' ? 5 : (card.rarity === 'Rare' ? 2 : 1));
            for (let i = 0; i < weight; i++) {
                weightedPool.push(card);
            }
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
        // Only show a relic 50% of the time
        if (Math.random() < 0.5) return null;

        const allRelics = Object.values(RELIC_DEFINITIONS);
        const playerRelics: Relic[] = this.registry.get('playerRelics');
        const playerRelicIds = new Set(playerRelics.map(r => r.id));

        const availableRelics = allRelics.filter(r => !playerRelicIds.has(r.id));
        if (availableRelics.length === 0) return null;

        const weightedPool: Relic[] = [];
        availableRelics.forEach(relic => {
            const weight = relic.rarity === 'Common' ? 10 : (relic.rarity === 'Uncommon' ? 5 : (relic.rarity === 'Rare' ? 2 : 1));
            for (let i = 0; i < weight; i++) {
                weightedPool.push(relic);
            }
        });

        const randomIndex = Phaser.Math.Between(0, weightedPool.length - 1);
        return weightedPool[randomIndex];
    }

    displayShopRelic(relic: Relic, scoreText: Phaser.GameObjects.Text) {
        const centerX = this.cameras.main.width / 2;
        const cardWidth = 120;
        const cardHeight = 140; // Smaller relic card
        const relicY = 500; // Moved down below cards

        const relicContainer = this.add.container(centerX - cardWidth / 2, relicY);

        const relics: Relic[] = this.registry.get('playerRelics') || [];
        const hasBargainAmulet = relics.some(r => r.id === 'bargain_amulet');
        const finalCost = hasBargainAmulet ? Math.floor(relic.cost * 0.85) : relic.cost;
        
        this.add.text(centerX, relicY - 15, 'Relíquia da Fase', { fontSize: '20px', color: '#e0e7ff', fontStyle: 'bold' }).setOrigin(0.5);

        const cardBg = this.add.graphics();
        const rarityColor = relic.rarity === 'Common' ? 0x9ca3af : (relic.rarity === 'Uncommon' ? 0x3b82f6 : (relic.rarity === 'Rare' ? 0xa855f7 : 0xfbbf24));
        
        const costText = this.add.text(cardWidth / 2, cardHeight - 18, `${finalCost}p`, { fontSize: '16px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
        const emojiText = this.add.text(cardWidth / 2, 30, relic.emoji, { fontSize: '36px' }).setOrigin(0.5);
        const nameText = this.add.text(cardWidth / 2, 65, relic.name, { fontSize: '14px', color: '#ffffff', align: 'center', wordWrap: { width: cardWidth - 10 } }).setOrigin(0.5, 0);
        const descText = this.add.text(cardWidth / 2, 90, relic.description, { fontSize: '12px', color: '#d1d5db', align: 'center', wordWrap: { width: cardWidth - 10 } }).setOrigin(0.5, 0);
        
        const drawRelic = (isHover = false, isPurchased = false, canAfford = true) => {
            cardBg.clear();
            cardBg.fillStyle(isPurchased ? 0x111827 : 0x374151, 1);
            cardBg.fillRoundedRect(0, 0, cardWidth, cardHeight, 15);
            const borderColor = isHover && canAfford && !isPurchased ? 0xffffff : rarityColor;
            cardBg.lineStyle(isHover && canAfford && !isPurchased ? 4 : 3, borderColor, isPurchased ? 0.3 : (canAfford ? 1 : 0.5));
            cardBg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 15);
            const alpha = isPurchased ? 0.3 : (canAfford ? 1 : 0.5);
            [emojiText, nameText, descText, costText].forEach(t => t.setAlpha(alpha));
        };

        let isPurchased = false;
        let canAfford = this.registry.get('totalScore') >= finalCost;
        drawRelic(false, isPurchased, canAfford);
        
        relicContainer.add([cardBg, emojiText, nameText, descText, costText]);
        relicContainer.setSize(cardWidth, cardHeight).setInteractive({ useHandCursor: true });
        
        relicContainer.on('pointerdown', () => {
            if (isPurchased || !canAfford || this.isModalOpen) return;
            
            const onConfirm = () => {
                SoundManager.play('buy');
                this.closeModal();
                isPurchased = true;
                let currentScore = this.registry.get('totalScore');
                currentScore -= finalCost;
                this.registry.set('totalScore', currentScore);

                const playerRelics: Relic[] = this.registry.get('playerRelics');
                playerRelics.push(relic);
                this.registry.set('playerRelics', playerRelics);
                scoreText.setText(`Seus Pontos: ${currentScore}`);
                
                const purchasedText = this.add.text(cardWidth / 2, cardHeight / 2, 'Adquirida!', {fontSize: '18px', color: '#34d399'}).setOrigin(0.5);
                relicContainer.add(purchasedText);
                drawRelic(false, true);
            };

            this.showBuyConfirmationModal(relic, 'Relic', finalCost, onConfirm);
        });

        let isHovered = false;
        relicContainer.on('pointerover', () => {
            isHovered = true;
            if (!isPurchased) {
                drawRelic(true, false, canAfford);
            }
        });
        relicContainer.on('pointerout', () => {
            isHovered = false;
            if (!isPurchased) {
                drawRelic(false, false, canAfford);
            }
        });


        this.time.addEvent({
            delay: 250, loop: true,
            callback: () => {
                canAfford = this.registry.get('totalScore') >= finalCost;
                if (!isPurchased) drawRelic(isHovered, isPurchased, canAfford);
            }
        });
    }

    displayShopItems(items: Card[], scoreText: Phaser.GameObjects.Text) {
        const centerX = this.cameras.main.width / 2;
        const cardWidth = 110;
        const cardHeight = 150;
        const columns = 2;
        const cardSpacing = 15;
        const startX = centerX - (columns * (cardWidth + cardSpacing) - cardSpacing) / 2;
        const startY = 170;

        items.forEach((card, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const cardX = startX + col * (cardWidth + cardSpacing);
            const cardY = startY + row * (cardHeight + cardSpacing);

            const cardContainer = this.add.container(cardX, cardY);
            const cardBg = this.add.graphics();
            const rarityColor = card.rarity === 'Common' ? 0x6b7280 : (card.rarity === 'Uncommon' ? 0x2563eb : (card.rarity === 'Rare' ? 0x9333ea : 0xfbbf24));
            
            const relics: Relic[] = this.registry.get('playerRelics') || [];
            const hasBargainAmulet = relics.some(r => r.id === 'bargain_amulet');
            const finalCost = hasBargainAmulet ? Math.floor(card.cost * 0.85) : card.cost;
            const costText = this.add.text(cardWidth / 2, cardHeight - 15, `${finalCost}p`, { fontSize: '16px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);

            // TODO: IA - Substituir este emojiText por uma imagem da carta quando a arte estiver disponível.
            // A imagem deve ser adicionada ao cardContainer e centralizada.
            let cardContent;
            const nameText = this.add.text(cardWidth / 2, 12, card.name, { fontSize: '12px', color: '#ffffff', align: 'center', wordWrap: { width: cardWidth - 10 } }).setOrigin(0.5);
            if (card.image && this.textures.exists(card.id)) {
                cardContent = this.add.image(cardWidth / 2, cardHeight / 2, card.id);
                cardContent.setDisplaySize(cardWidth * 0.9, cardWidth * 0.9);
            } else {
                cardContent = this.add.text(cardWidth / 2, cardHeight / 2, card.emoji, { fontSize: '48px' }).setOrigin(0.5);
            }
            
            const drawCard = (isHover = false, isPurchased = false, canAfford = true) => {
                cardBg.clear();
                cardBg.fillStyle(isPurchased ? 0x111827 : 0x374151, 1);
                cardBg.fillRoundedRect(0, 0, cardWidth, cardHeight, 10);
                const borderColor = isHover && canAfford && !isPurchased ? 0xffffff : rarityColor;
                cardBg.lineStyle(isHover && canAfford && !isPurchased ? 3 : 2, borderColor, isPurchased ? 0.3 : (canAfford ? 1 : 0.5));
                cardBg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 10);
                
                const alpha = isPurchased ? 0.3 : (canAfford ? 1 : 0.5);
                nameText.setAlpha(alpha);
                cardContent.setAlpha(alpha);
                costText.setAlpha(alpha);
            };
            
            let isPurchased = false;
            let canAfford = this.registry.get('totalScore') >= finalCost;
            drawCard(false, isPurchased, canAfford);
            
            cardContainer.add([cardBg, nameText, cardContent, costText]);
            cardContainer.setSize(cardWidth, cardHeight).setInteractive({ useHandCursor: true });
            
            cardContainer.on('pointerdown', () => {
                if (isPurchased || !canAfford || this.isModalOpen) return;
                
                const onConfirm = () => {
                    SoundManager.play('buy');
                    this.closeModal();
                    isPurchased = true;
                    let currentScore = this.registry.get('totalScore');
                    currentScore -= finalCost;
                    this.registry.set('totalScore', currentScore);

                    let deck: Card[] = this.registry.get('playerDeck');
                    deck.push(card);
                    this.registry.set('playerDeck', deck);

                    scoreText.setText(`Seus Pontos: ${currentScore}`);
                    
                    const purchasedText = this.add.text(cardWidth / 2, cardHeight / 2, 'Comprado!', {fontSize: '16px', color: '#34d399'}).setOrigin(0.5);
                    cardContainer.add(purchasedText);

                    drawCard(false, true);
                };

                this.showBuyConfirmationModal(card, 'Card', finalCost, onConfirm);
            });

            let isHovered = false;
            cardContainer.on('pointerover', () => {
                isHovered = true;
                if (!isPurchased) drawCard(true, false, canAfford);
            });
            cardContainer.on('pointerout', () => {
                isHovered = false;
                if (!isPurchased) drawCard(false, false, canAfford);
            });

            this.time.addEvent({
                delay: 250,
                loop: true,
                callback: () => {
                    canAfford = this.registry.get('totalScore') >= finalCost;
                    if (!isPurchased) drawCard(isHovered, isPurchased, canAfford);
                }
            });
        });
    }

    // --- Modal Methods ---
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

        const blocker = this.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, width, height);
        blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

        const modalBg = this.add.graphics().fillStyle(0x1f2937).fillRoundedRect(centerX - 160, 200, 320, 300, 15);
        modalBg.lineStyle(2, 0x4f46e5).strokeRoundedRect(centerX - 160, 200, 320, 300, 15);

        const emoji = this.add.text(centerX, 240, item.emoji, { fontSize: '48px' }).setOrigin(0.5);
        const name = this.add.text(centerX, 285, item.name, { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        const desc = this.add.text(centerX, 330, item.description, { fontSize: '14px', color: '#d1d5db', align: 'center', wordWrap: { width: 280 } }).setOrigin(0.5);
        const costText = this.add.text(centerX, 380, `Custo: ${cost} Pontos`, { fontSize: '16px', color: '#fcd34d', fontStyle: 'bold' }).setOrigin(0.5);
        
        const confirmText = itemType === 'Card' ? 'Comprar' : 'Adquirir';
        const confirmButton = this.add.text(centerX - 70, 450, confirmText, { fontSize: '20px', color: '#fff', backgroundColor: '#16a34a', padding: { x: 15, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        confirmButton.on('pointerdown', onConfirm);

        const cancelButton = this.add.text(centerX + 70, 450, 'Cancelar', { fontSize: '20px', color: '#fff', backgroundColor: '#dc2626', padding: { x: 15, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        cancelButton.on('pointerdown', () => this.closeModal());
        
        this.modalGroup.addMultiple([blocker, modalBg, emoji, name, desc, costText, confirmButton, cancelButton]);
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
        this.cameras.main.setBackgroundColor('#7f1d1d');
        const centerX = this.cameras.main.width / 2;

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
        this.cameras.main.setBackgroundColor('#052e16'); // Dark green
        const centerX = this.cameras.main.width / 2;

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