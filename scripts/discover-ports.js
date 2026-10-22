#!/usr/bin/env node

/**
 * PORTMOBILE — DISCOVER PORTS SCRIPT (SSLABS ECOSYSTEM) - V4
 * 
 * Script autônomo e de alta precisão para descoberta de PORTS NATIVOS DE JOGOS PARA CELULARES (ANDROID E IOS).
 * 
 * Filtros de Qualidade:
 *  1. [Jogos] Apenas Jogos: Rejeita toolchains e compiladores base (PS2Recomp, N64Recomp, XenonRecomp, ReXGlue, etc.).
 *  2. [Emuladores] Bloqueio de Emuladores: Rejeita PPSSPP, RPCS3, PCSX2, etc.
 *  3. [Destino Mobile] O jogo DEVE ter como alvo Celular (Android, iOS).
 *  4. [Não-Jogos] Bloqueio de Não-Jogos: Descarta utilitários genéricos, descompiladores, etc.
 *  5. [Linguagens] Linguagens Nativas: Aceita apenas C, C++, Rust, C#, Zig, Kotlin ou Assembly.
 *  6. [Releases] Regra Híbrida de Releases:
 *     - Release com executáveis/instaladores (.apk, .ipa, .zip) = Aceita com apenas 10 estrelas.
 *     - Release apenas com código-fonte = Exige 25+ estrelas.
 *  7. Exclusão imediata de Forks, Repositórios Arquivados e Listas ("awesome-", etc.).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const WORKER_PROXY = 'https://sslabs-port-proxy-alt.l55941616.workers.dev';
const APP_JS_PATH = path.resolve(__dirname, '../app.js');
const OUTPUT_FILE = path.resolve(__dirname, '../novos_ports_sugeridos.json');

const MIN_STARS_COM_EXECUTAVEL = 10;
const MIN_STARS_SEM_EXECUTAVEL = 25;

// Queries abrangentes para encontrar ports de jogos de todas as eras
const SEARCH_QUERIES = [
  '"native pc port"',
  '"native windows port"',
  'topic:pc-port',
  'topic:recomp',
  'topic:decomp',
  '"recompiled" "pc" in:description',
  '"pc port" in:name',
  '"n64recomp" in:description',
  '"xenonrecomp" in:description',
  '"ps2recomp" in:description',
  '"ps1recomp" in:description',
  '"rexglue" in:description',
  '"ps4" "pc port"',
  '"ps5" "pc port"',
  '"ps3" "pc port"',
  '"playstation 3" "pc port"',
  '"ps3recomp" in:description',
  'topic:ps3-port',
  '"xbox one" "pc port"',
  '"xbox series" "pc port"',
  '"azimuth" "forza"',
  '"azimuth" "pc port"'
];

// Nomes de repositórios que são compiladores/ferramentas base, NÃO jogos específicos
const REJECT_EXACT_NAMES = new Set([
  'ps2recomp',
  'xenonrecomp',
  'n64recomp',
  'ps1recomp',
  'rexglue',
  'wiicompiled',
  'anyps5',
  'the-forge',
  'the_forge',
  'libretro',
  'retroarch',
  'gamecuberecompiled',
  'gcrecomp',
  'gcrecompilation',
  'ps3recomp',
  'recompfrontend',
  'recomp-frontend'
]);

// Termos que indicam homebrew em console, emuladores, IA, ferramentas ou listas
const REJECT_KEYWORDS = [
  // Listas e agregadores
  'awesome',
  'curated',
  'collection of',
  // Emuladores puros
  'emulator',
  'ppsspp',
  'rpcs3',
  'pcsx2',
  'yuzu',
  'ryujinx',
  'xenia',
  'cemu',
  'dolphin',
  // Homebrew rodando NO console (não no PC)
  'for ps5',
  'for the ps5',
  'on ps5',
  'on the ps5',
  'jailbroken ps5',
  'ps5 homebrew',
  'ps5 app store',
  'for nintendo switch',
  'switch homebrew',
  'atmosphere',
  // Ferramentas, IA e utilitários não-jogos
  'decomp.wtf',
  'ai agent',
  'llama.cpp',
  'gguf',
  'scraper',
  'crawler',
  'tutorial',
  'guide',
  'boilerplate',
  'framework',
  'sdk',
  'spring boot',
  'download manager',
  'adaptive triggers',
  'recompilation tool',
  'static recompilation tool',
  'static recompiler for',
  'recompiler tool',
  // IA / Modelos de linguagem / Inference engines
  'inference engine',
  'rtx 5090',
  'qwen',
  'llm',
  'language model',
  'deep learning',
  'neural network',
  'ninfer',
  'ai model',
  // Aplicativos de produtividade / Documentos / Utilitários de desktop
  'document viewer',
  'pdf viewer',
  'comic books, and tiffs',
  'gnome papers',
  'reader for pdf',
  'office suite',
  // Servidores, backend de rede e emuladores de servidor
  'online services',
  'server emulator',
  'server backend',
  'multiplayer backend',
  'companion server',
  // Mobile / Outros
  'android port',
  'android only',
  'ios port'
];

// Palavras que indicam que o jogo roda em computador ou usa motores nativos de PC
const PC_TARGET_KEYWORDS = [
  'pc',
  'windows',
  'win32',
  'win64',
  'linux',
  'steam deck',
  'steamdeck',
  'x86',
  'x64',
  'crossplatform',
  'multiplatform',
  'rexglue',
  'xenonrecomp',
  'n64recomp',
  'ps2recomp',
  'ps1recomp'
];

// Linguagens nativas de jogos compilados
const ALLOWED_LANGUAGES = new Set(['C', 'C++', 'Rust', 'C#', 'Zig', 'Assembly']);

async function fetchFromGithub(endpoint) {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'User-Agent': 'Port-Mobile-Scanner',
    'Accept': 'application/vnd.github.v3+json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = token 
    ? `https://api.github.com${endpoint}`
    : `${WORKER_PROXY}/api${endpoint}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        console.warn(`[Aviso] Limite de requisições atingido (${res.status}).`);
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Erro de Rede] ${err.message}`);
    return null;
  }
}

function carregarReposCadastrados() {
  try {
    const content = fs.readFileSync(APP_JS_PATH, 'utf8');
    const match = content.match(/const PORTS_DATABASE = (\[[\s\S]*?\n\];)/);
    if (!match) return new Set();
    const list = new Function(`return ${match[1]}`)();
    return new Set(list.map(p => (p.repo || '').toLowerCase()));
  } catch (e) {
    return new Set();
  }
}

function adivinharConsole(repoData) {
  const text = `${repoData.name} ${repoData.description || ''} ${(repoData.topics || []).join(' ')}`.toLowerCase();

  // Consoles específicos por ordem de precedência (evitando que 'xbox' genérico capture outros consoles)
  if (/\b(ps5|playstation\s*5)\b/i.test(text)) return { code: 'PS5', name: 'PlayStation 5' };
  if (/\b(ps4|playstation\s*4|nathan drake collection)\b/i.test(text)) return { code: 'PS4', name: 'PlayStation 4' };
  if (/\b(ps3|playstation\s*3|ps3recomp)\b/i.test(text)) return { code: 'PS3', name: 'PlayStation 3' };
  if (/\b(ps2|playstation\s*2|ps2recomp)\b/i.test(text)) return { code: 'PS2', name: 'PlayStation 2' };
  if (/\b(ps1|playstation\s*1|psx|ps1recomp|crash team racing)\b/i.test(text)) return { code: 'PS1', name: 'PlayStation 1' };
  if (/\b(psp|playstation portable)\b/i.test(text)) return { code: 'PSP', name: 'PlayStation Portable' };
  if (/\b(gamecube|game cube|wii|super mario sunshine)\b/i.test(text)) return { code: 'GC', name: 'GameCube' };
  if (/\b(n64|nintendo\s*64|n64recomp|banjo[-\s]tooie)\b/i.test(text)) return { code: 'N64', name: 'Nintendo 64' };
  if (/\b(gba|game\s*boy\s*advance|gameboy\s*advance)\b/i.test(text)) return { code: 'GBA', name: 'Game Boy Advance' };
  if (/\b(3ds|nintendo\s*3ds)\b/i.test(text)) return { code: '3DS', name: 'Nintendo 3DS' };
  if (/\b(nds|nintendo\s*ds)\b/i.test(text)) return { code: 'NDS', name: 'Nintendo DS' };
  if (/\b(switch|nintendo\s*switch)\b/i.test(text)) return { code: 'Switch', name: 'Nintendo Switch' };
  if (/\b(xbox\s*series|series\s*[xs]|xsx)\b/i.test(text)) return { code: 'XONE', name: 'Xbox Series X/S' };
  if (/\b(xbox\s*one|xone|xb1|azimuth)\b/i.test(text)) return { code: 'XONE', name: 'Xbox One' };
  if (/\b(xbox\s*360|x360|xenon|xenonrecomp|rexglue)\b/i.test(text)) return { code: 'XBOX360', name: 'Xbox 360' };
  if (/\b(xbox)\b/i.test(text)) return { code: 'XBOX', name: 'Xbox Clássico' };
  if (/\b(dreamcast)\b/i.test(text)) return { code: 'DC', name: 'Dreamcast' };
  if (/\b(saturn|sega\s*saturn)\b/i.test(text)) return { code: 'SAT', name: 'Sega Saturn' };
  if (/\b(genesis|mega\s*drive)\b/i.test(text)) return { code: 'MD', name: 'Mega Drive' };

  return { code: 'PC', name: 'PC Nativo' };
}

const MAP_OVERRIDE_JOGOS = {
  'Matteo842/CrashBandicoot-Launcher': {
    codigoJogo: 'SCUS-94900',
    nome: 'Crash Bandicoot',
    console: 'PS1',
    consoleNome: 'PlayStation 1',
    termoBuscaCapa: 'Crash_Bandicoot_(video_game)',
    descricao: 'Port nativo para PC de Crash Bandicoot baseado na descompilação de PS1 com launcher configurável e suporte a 60 FPS e widescreen.',
    tags: ['PS1', 'AutoDiscover', 'Binário Disponível', 'C#', 'Naughty Dog']
  },
  'chasem-dev/sms-pc-port': {
    codigoJogo: 'GMSE01',
    nome: 'Super Mario Sunshine',
    console: 'GC',
    consoleNome: 'GameCube',
    termoBuscaCapa: 'Super_Mario_Sunshine',
    descricao: 'Port nativo para PC de Super Mario Sunshine com suporte a cutscenes em alta definição via IA, widescreen e taxas de quadros desbloqueadas.',
    tags: ['GC', 'AutoDiscover', 'Binário Disponível', 'C++', 'Nintendo']
  },
  'khasinski/rage-racer-pc': {
    codigoJogo: 'SLUS-00401',
    nome: 'Rage Racer',
    console: 'PS1',
    consoleNome: 'PlayStation 1',
    termoBuscaCapa: 'Rage_Racer',
    descricao: 'Port nativo para PC do clássico de corrida Rage Racer (PS1) da Namco, rodando nativamente em sistemas modernos.',
    tags: ['PS1', 'AutoDiscover', 'Binário Disponível', 'C++', 'Namco']
  },
  'saulob/dragons-crown-pro-pc': {
    codigoJogo: 'CUSA10454',
    nome: "Dragon's Crown Pro",
    console: 'PS4',
    consoleNome: 'PlayStation 4',
    termoBuscaCapa: "Dragon's_Crown",
    descricao: 'Port nativo e recompilador do aclamado RPG de ação 2D Dragon\'s Crown Pro para PC.',
    tags: ['PS4', 'AutoDiscover', 'Binário Disponível', 'C++', 'Vanillaware', 'Atlus']
  },
  'danielgomesvieira2000/burnout3-pc': {
    codigoJogo: 'SLUS-21050',
    nome: 'Burnout 3: Takedown',
    console: 'PS2',
    consoleNome: 'PlayStation 2',
    termoBuscaCapa: 'Burnout_3:_Takedown',
    descricao: 'Port nativo para PC de Burnout 3: Takedown baseado na recompilação de PlayStation 2.',
    tags: ['PS2', 'AutoDiscover', 'Binário Disponível', 'C++', 'Criterion Games', 'EA']
  },
  'jedijosh920/SWROTS-PC': {
    codigoJogo: '4C41000C',
    nome: 'Star Wars: Episode III – Revenge of the Sith',
    console: 'XBOX',
    consoleNome: 'Xbox Clássico',
    termoBuscaCapa: 'Star_Wars:_Episode_III_–_Revenge_of_the_Sith_(video_game)',
    descricao: 'Port nativo e conversão moderna para PC do clássico jogo de combate de Star Wars: Episódio III do Xbox original.',
    tags: ['XBOX', 'AutoDiscover', 'Binário Disponível', 'C++', 'LucasArts']
  },
  'raulzrrs/letsgo-recomp': {
    codigoJogo: '0100187003A36000',
    nome: "Pokémon: Let's Go, Eevee! & Pikachu!",
    console: 'Switch',
    consoleNome: 'Nintendo Switch',
    termoBuscaCapa: "Pokémon:_Let's_Go,_Pikachu!_and_Let's_Go,_Eevee!",
    descricao: 'Recompilação nativa para PC de Pokémon: Let\'s Go, Eevee! & Pikachu! do Nintendo Switch.',
    tags: ['Switch', 'AutoDiscover', 'Binário Disponível', 'C++', 'Game Freak', 'Nintendo']
  },
  'NoRain211/doa3-re': {
    codigoJogo: '4B560005',
    nome: 'Dead or Alive 3',
    console: 'XBOX',
    consoleNome: 'Xbox Clássico',
    termoBuscaCapa: 'Dead_or_Alive_3',
    descricao: 'Engenharia reversa e port nativo de Dead or Alive 3 do Xbox original para PC.',
    tags: ['XBOX', 'AutoDiscover', 'Binário Disponível', 'C++', 'Team Ninja', 'Tecmo']
  },
  'SlickAmogus/silent-hill-decomp': {
    codigoJogo: 'SLUS-00707',
    nome: 'Silent Hill',
    console: 'PS1',
    consoleNome: 'PlayStation 1',
    termoBuscaCapa: 'Silent_Hill_(video_game)',
    descricao: 'Descompilação completa e port nativo de Silent Hill (PS1) para PC com melhorias gráficas e suporte a controles modernos.',
    tags: ['PS1', 'AutoDiscover', 'Binário Disponível', 'C', 'Konami', 'Team Silent']
  },
  'psxrestore/Condemned2Recomp': {
    codigoJogo: '534507E2',
    nome: 'Condemned 2: Bloodshot',
    console: 'XBOX360',
    consoleNome: 'Xbox 360',
    termoBuscaCapa: 'Condemned_2:_Bloodshot',
    descricao: 'Recompilação estática nativa para PC do survival horror cult Condemned 2: Bloodshot de Xbox 360.',
    tags: ['XBOX360', 'AutoDiscover', 'Binário Disponível', 'C++', 'Monolith Productions', 'Sega']
  },
  'some-scurvy-dog/banjo-tooie-scurvy-dog-port': {
    codigoJogo: 'NUS-NB7E-USA',
    nome: 'Banjo-Tooie',
    console: 'N64',
    consoleNome: 'Nintendo 64',
    termoBuscaCapa: 'Banjo-Tooie',
    descricao: 'Port nativo para PC de Banjo-Tooie com suporte a 60 FPS, widescreen, renderizador DirectX/OpenGL moderno e melhorias de qualidade de vida.',
    tags: ['N64', 'AutoDiscover', 'Binário Disponível', 'C', 'Rare', 'Nintendo']
  },
  'GiZcesi/OpenTricky': {
    codigoJogo: 'SLUS-20326',
    nome: 'SSX Tricky',
    console: 'PS2',
    consoleNome: 'PlayStation 2',
    termoBuscaCapa: 'SSX_Tricky',
    descricao: 'Recriação e port nativo de motor para PC de SSX Tricky, trazendo de volta o clássico snowboarding em alta fidelidade.',
    tags: ['PS2', 'AutoDiscover', 'Binário Disponível', 'C++', 'EA Sports BIG']
  },
  'invinceble55-wq/Estacado-The-Darkness-Recomp': {
    codigoJogo: '545407EC',
    nome: 'The Darkness',
    console: 'XBOX360',
    consoleNome: 'Xbox 360',
    termoBuscaCapa: 'The_Darkness_(video_game)',
    descricao: 'Recompilação nativa para PC (Estacado) do clássico shooter sobrenatural The Darkness da Starbreeze Studios (Xbox 360).',
    tags: ['XBOX360', 'AutoDiscover', 'Binário Disponível', 'C++', 'Starbreeze', '2K']
  },
  'pablocpas/OpenCMR2': {
    codigoJogo: 'SLES-02605',
    nome: 'Colin McRae Rally 2.0',
    console: 'PS1',
    consoleNome: 'PlayStation 1',
    termoBuscaCapa: 'Colin_McRae_Rally_2.0',
    descricao: 'Reimplementação e port nativo de Colin McRae Rally 2.0 para PC com suporte a resoluções ultrawide e volante moderno.',
    tags: ['PS1', 'AutoDiscover', 'Binário Disponível', 'C++', 'Codemasters']
  },
  'CaiusCodes/GoldenEye-007-XBLA-PC-Recomp': {
    codigoJogo: '584109C4',
    nome: 'GoldenEye 007 (XBLA Recomp)',
    console: 'XBOX360',
    consoleNome: 'Xbox 360',
    termoBuscaCapa: 'GoldenEye_007_(1997_video_game)',
    descricao: 'Recompilação nativa para PC da remasterização cancelada de GoldenEye 007 para Xbox Live Arcade (XBLA).',
    tags: ['XBOX360', 'AutoDiscover', 'Binário Disponível', 'C++', 'Rare']
  },
  'saulob/crackdown-xbox360-recompiled': {
    codigoJogo: '4D5307DC',
    nome: 'Crackdown',
    console: 'XBOX360',
    consoleNome: 'Xbox 360',
    termoBuscaCapa: 'Crackdown_(video_game)',
    descricao: 'Recompilação estática para PC do clássico de mundo aberto de super-agentes Crackdown de Xbox 360.',
    tags: ['XBOX360', 'AutoDiscover', 'Binário Disponível', 'C++', 'Realtime Worlds', 'Microsoft']
  },
  'Lordingard/SacredStonesRecomp': {
    codigoJogo: 'AGB-BE8E-USA',
    nome: 'Fire Emblem: The Sacred Stones',
    console: 'GBA',
    consoleNome: 'Game Boy Advance',
    termoBuscaCapa: 'Fire_Emblem:_The_Sacred_Stones',
    descricao: 'Recompilação nativa para PC de Fire Emblem: The Sacred Stones (GBA) com alta taxa de quadros e gráficos nítidos.',
    tags: ['GBA', 'AutoDiscover', 'Binário Disponível', 'C++', 'Intelligent Systems', 'Nintendo']
  },
  'DCxDemo/THPS2-Cumulative-Patch': {
    codigoJogo: 'SLUS-01066',
    nome: "Tony Hawk's Pro Skater 2",
    console: 'PS1',
    consoleNome: 'PlayStation 1',
    termoBuscaCapa: "Tony_Hawk's_Pro_Skater_2",
    descricao: 'Port nativo e patch cumulativo definitivo para PC de Tony Hawk\'s Pro Skater 2 com resolução moderna e suporte a novos controles.',
    tags: ['PS1', 'AutoDiscover', 'Binário Disponível', 'C++', 'Neversoft', 'Activision']
  },
  'danielgomesvieira2000/pilotwings-64-recomp': {
    codigoJogo: 'NUS-NPWE-USA',
    nome: 'Pilotwings 64',
    console: 'N64',
    consoleNome: 'Nintendo 64',
    termoBuscaCapa: 'Pilotwings_64',
    descricao: 'Port nativo de Pilotwings 64 para PC via recompilação estática com suporte a altas resoluções e framerate fluido.',
    tags: ['N64', 'AutoDiscover', 'Binário Disponível', 'C++', 'Nintendo', 'Paradigm Entertainment']
  },
  'florinp93/xmd-recompiled': {
    codigoJogo: '415608C4',
    nome: 'X-Men Destiny',
    console: 'XBOX360',
    consoleNome: 'Xbox 360',
    termoBuscaCapa: 'X-Men:_Destiny',
    descricao: 'Recompilação estática para PC do RPG de ação X-Men Destiny de Xbox 360.',
    tags: ['XBOX360', 'AutoDiscover', 'Binário Disponível', 'C++', 'Silicon Knights', 'Activision']
  },
  'nlwstein/skullburglar': {
    codigoJogo: '54510829',
    nome: '50 Cent: Blood on the Sand',
    console: 'XBOX360',
    consoleNome: 'Xbox 360',
    termoBuscaCapa: '50_Cent:_Blood_on_the_Sand',
    descricao: 'Recompilação nativa para PC do shooter cult em terceira pessoa 50 Cent: Blood on the Sand de Xbox 360.',
    tags: ['XBOX360', 'AutoDiscover', 'Binário Disponível', 'C++', 'Swordfish Studios', 'THQ']
  },
  'danielgomesvieira2000/body-harvest-recomp': {
    codigoJogo: 'NUS-NBHE-USA',
    nome: 'Body Harvest',
    console: 'N64',
    consoleNome: 'Nintendo 64',
    termoBuscaCapa: 'Body_Harvest',
    descricao: 'Port nativo para PC de Body Harvest (N64), o lendário precursor 3D de GTA criado pela DMA Design (Rockstar North).',
    tags: ['N64', 'AutoDiscover', 'Binário Disponível', 'C++', 'DMA Design', 'Rockstar']
  },
  'danielgomesvieira2000/hybrid-heaven-recomp': {
    codigoJogo: 'NUS-NHYE-USA',
    nome: 'Hybrid Heaven',
    console: 'N64',
    consoleNome: 'Nintendo 64',
    termoBuscaCapa: 'Hybrid_Heaven',
    descricao: 'Port nativo para PC de Hybrid Heaven (N64) da Konami, misturando RPG tático e ação em terceira pessoa.',
    tags: ['N64', 'AutoDiscover', 'Binário Disponível', 'C++', 'Konami']
  },
  'ArtfulRascal8/rage-wars-recompiled': {
    codigoJogo: 'NUS-NRWE-USA',
    nome: 'Turok: Rage Wars',
    console: 'N64',
    consoleNome: 'Nintendo 64',
    termoBuscaCapa: 'Turok:_Rage_Wars',
    descricao: 'Port nativo para PC de Turok: Rage Wars via recompilação estática com suporte a multiplayer e renderização moderna.',
    tags: ['N64', 'AutoDiscover', 'Binário Disponível', 'C++', 'Iguana Entertainment', 'Acclaim']
  },
  'flyngmt/ACGC-PC-Port': {
    codigoJogo: 'GAFE01',
    nome: 'Animal Crossing',
    console: 'GC',
    consoleNome: 'GameCube',
    termoBuscaCapa: 'Animal_Crossing_(video_game)',
    descricao: 'Port nativo para PC de Animal Crossing de GameCube com áudio em alta fidelidade e opções de qualidade de vida.',
    tags: ['GC', 'AutoDiscover', 'Binário Disponível', 'C++', 'Nintendo']
  },
  'samuelit0davila/fifa-street-pc-port': {
    codigoJogo: '4541099E',
    nome: 'FIFA Street (2012)',
    console: 'XBOX360',
    consoleNome: 'Xbox 360',
    termoBuscaCapa: 'FIFA_Street_(2012_video_game)',
    descricao: 'Port nativo para PC do aclamado reboot de FIFA Street (2012) de Xbox 360.',
    tags: ['XBOX360', 'AutoDiscover', 'Binário Disponível', 'C++', 'EA Sports']
  },
  'bc160201983/Uncharted-The-Nathan-Drake-Collection-PC-port': {
    codigoJogo: 'CUSA02320',
    nome: 'Uncharted: The Nathan Drake Collection',
    console: 'PS4',
    consoleNome: 'PlayStation 4',
    termoBuscaCapa: 'Uncharted:_The_Nathan_Drake_Collection',
    descricao: 'Port nativo para PC da trilogia remasterizada Uncharted: The Nathan Drake Collection (PS4).',
    tags: ['PS4', 'AutoDiscover', 'Binário Disponível', 'C++', 'Naughty Dog', 'Bluepoint']
  },
  'Madxbio97/SF-pc-port': {
    codigoJogo: 'SNS-FO-USA',
    nome: 'Star Fox',
    console: 'Retro',
    consoleNome: 'Super Nintendo (SNES)',
    termoBuscaCapa: 'Star_Fox_(1993_video_game)',
    descricao: 'Port nativo para PC do lendário Star Fox de SNES com chip Super FX recriado para alto desempenho em computadores modernos.',
    tags: ['Retro', 'SNES', 'AutoDiscover', 'Binário Disponível', 'C++', 'Nintendo']
  },
  'shadowartist201/TKA-PC-Port': {
    codigoJogo: '585507E7',
    nome: 'Techno Kitten Adventure',
    console: 'XBOX360',
    consoleNome: 'Xbox 360',
    termoBuscaCapa: 'Techno_Kitten_Adventure',
    descricao: 'Port nativo para PC do frenético clássico indie Techno Kitten Adventure (XBLIG / Xbox 360).',
    tags: ['XBOX360', 'AutoDiscover', 'Binário Disponível', 'C++', 'Indie']
  },
  'bc160201983/medievil_2019_pc_port': {
    codigoJogo: 'CUSA12981',
    nome: 'MediEvil (2019)',
    console: 'PS4',
    consoleNome: 'PlayStation 4',
    termoBuscaCapa: 'MediEvil_(2019_video_game)',
    descricao: 'Port nativo para PC do remake de 2019 de MediEvil (PS4) com Sir Daniel Fortesque.',
    tags: ['PS4', 'AutoDiscover', 'Binário Disponível', 'C++', 'Other Ocean', 'Sony']
  },
  'moshferatu/zombies-ate-my-neighbors-pc-port': {
    codigoJogo: 'SNS-ZA-USA',
    nome: 'Zombies Ate My Neighbors',
    console: 'Retro',
    consoleNome: 'Super Nintendo / Mega Drive',
    termoBuscaCapa: 'Zombies_Ate_My_Neighbors',
    descricao: 'Port nativo para PC do clássico cooperativo cult Zombies Ate My Neighbors da LucasArts.',
    tags: ['Retro', 'SNES', 'AutoDiscover', 'Binário Disponível', 'C++', 'LucasArts', 'Konami']
  },
  'NyperYuhgard/CTR-PC-Port': {
    codigoJogo: 'SCUS-94426',
    nome: 'Crash Team Racing',
    console: 'PS1',
    consoleNome: 'PlayStation 1',
    termoBuscaCapa: 'Crash_Team_Racing',
    descricao: 'Port nativo para PC de Crash Team Racing (PS1) com suporte a 60 FPS, tela panorâmica widescreen e controles modernos.',
    tags: ['PS1', 'AutoDiscover', 'Binário Disponível', 'C', 'Naughty Dog', 'Sony']
  },
  'LaytonLostMedia/LaytonMotdmPcPort': {
    codigoJogo: 'L5-MOTDM',
    nome: 'Professor Layton and the Mansion of the Deathly Mirror',
    console: 'Retro',
    consoleNome: 'Retro / Celular',
    termoBuscaCapa: 'Professor_Layton_and_the_Curious_Village',
    descricao: 'Port nativo e restauração para PC do jogo perdido Professor Layton and the Mansion of the Deathly Mirror.',
    tags: ['Retro', 'AutoDiscover', 'Binário Disponível', 'C#', 'Level-5']
  },
  'TheGh0stShip/BattleTanx-Global-Assault-PC-Port': {
    codigoJogo: 'NUS-NBGE-USA',
    nome: 'BattleTanx: Global Assault',
    console: 'N64',
    consoleNome: 'Nintendo 64',
    termoBuscaCapa: 'BattleTanx:_Global_Assault',
    descricao: 'Port nativo para PC do frenético jogo de combate de tanques BattleTanx: Global Assault de Nintendo 64.',
    tags: ['N64', 'AutoDiscover', 'Binário Disponível', 'C++', '3DO']
  },
  'IgorAugustoHH/The-Order-1886-PC-Port': {
    codigoJogo: 'CUSA00763',
    nome: 'The Order: 1886',
    console: 'PS4',
    consoleNome: 'PlayStation 4',
    termoBuscaCapa: 'The_Order:_1886',
    descricao: 'Port nativo para PC do jogo de ação cinematográfico em terceira pessoa The Order: 1886 (PS4).',
    tags: ['PS4', 'AutoDiscover', 'Binário Disponível', 'C++', 'Ready at Dawn', 'Sony']
  },
  'fliperama86/cvlod_recomp': {
    codigoJogo: 'NUS-NCLE-USA',
    nome: 'Castlevania: Legacy of Darkness',
    console: 'N64',
    consoleNome: 'Nintendo 64',
    termoBuscaCapa: 'Castlevania:_Legacy_of_Darkness',
    descricao: 'Port nativo para PC de Castlevania: Legacy of Darkness (N64) via recompilação estática com gráficos aprimorados e taxa de quadros suave.',
    tags: ['N64', 'AutoDiscover', 'Binário Disponível', 'C++', 'Konami']
  },
  'PauloUbirajara/asuras-wrath-recomp': {
    codigoJogo: '4343081F',
    nome: "Asura's Wrath",
    console: 'XBOX360',
    consoleNome: 'Xbox 360',
    termoBuscaCapa: "Asura's_Wrath",
    descricao: 'Recompilação nativa para PC de Asura\'s Wrath de Xbox 360, rodando o espetáculo épico da Capcom a altas resoluções e framerate nativo.',
    tags: ['XBOX360', 'AutoDiscover', 'Binário Disponível', 'C++', 'CyberConnect2', 'Capcom']
  },
  'HayatoG/gr2_pc': {
    codigoJogo: 'CUSA03694',
    nome: 'Gravity Rush 2',
    console: 'PS4',
    consoleNome: 'PlayStation 4',
    termoBuscaCapa: 'Gravity_Rush_2',
    descricao: 'Port nativo para PC das aventuras gravitacionais de Kat em Gravity Rush 2 (PS4).',
    tags: ['PS4', 'AutoDiscover', 'Binário Disponível', 'C++', 'Japan Studio', 'Sony']
  }
};

const SIGLAS_JOGOS = {
  'sms': 'Super Mario Sunshine',
  'cvlod': 'Castlevania: Legacy of Darkness',
  'gr2': 'Gravity Rush 2',
  'xmd': 'X-Men Destiny',
  'swrots': 'Star Wars: Episode III - Revenge of the Sith',
  'acgc': 'Animal Crossing (GameCube)',
  'ctr': 'Crash Team Racing',
  'tka': 'Techno Kitten Adventure',
  'doa3': 'Dead or Alive 3',
  'sf': 'Star Fox'
};


function extrairSerialPorConsole(texto, consoleCode) {
  if (!texto) return null;

  if (['PS1', 'PS2', 'PSP'].includes(consoleCode)) {
    const m = texto.match(/\b(SLUS|SLES|SCUS|SCES|SLPM|SCCS|ULUS|ULES|UCUS|UCES)[-_ ]?(\d{5})\b/i);
    if (m) return `${m[1].toUpperCase()}-${m[2]}`;
  }
  if (consoleCode === 'PS3') {
    const m = texto.match(/\b(BLUS|BLES|BCUS|BCES|BLJM|BLJS|NPUB|NPEB)[-_ ]?(\d{5})\b/i);
    if (m) return `${m[1].toUpperCase()}-${m[2]}`;
  }
  if (['PS4', 'PS5'].includes(consoleCode)) {
    const m = texto.match(/\b(CUSA|PPSA)\s*(\d{5})\b/i);
    if (m) return `${m[1].toUpperCase()}${m[2]}`;
  }
  if (consoleCode === 'N64') {
    const m = texto.match(/\b(NUS[-_][A-Z0-9]{4}(?:[-_][A-Z]{3})?)\b/i);
    if (m) return m[1].toUpperCase().replace(/_/g, '-');
  }
  if (['GC', 'WII'].includes(consoleCode)) {
    const m = texto.match(/\b([GDRS][A-Z0-9]{3}[0-9A-Z]{2})\b/);
    if (m) return m[1].toUpperCase();
  }
  if (consoleCode === 'Switch') {
    const m1 = texto.match(/\b(0100[0-9A-Fa-f]{12})\b/);
    if (m1) return m1[1].toUpperCase();
    const m2 = texto.match(/\b(HAC[-_]P[-_][A-Z0-9]{4,5})\b/i);
    if (m2) return m2[1].toUpperCase().replace(/_/g, '-');
  }
  if (consoleCode === 'XBOX360' || consoleCode === 'XBOX') {
    const m = texto.match(/(?:title\s*id|titleid)[:= ]\s*([0-9A-Fa-f]{8})/i) || texto.match(/\b(4[0-9A-Fa-f]{7}|5841[0-9A-Fa-f]{4})\b/);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

async function buscarCodigoJogo(item, plataforma) {
  const override = MAP_OVERRIDE_JOGOS[item.full_name];
  if (override && override.codigoJogo) {
    return override.codigoJogo;
  }

  // 1. Tenta extrair da descrição ou nome do repositório
  const textoDesc = `${item.name} ${item.description || ''} ${(item.topics || []).join(' ')}`;
  const codigoDesc = extrairSerialPorConsole(textoDesc, plataforma.code);
  if (codigoDesc) return codigoDesc;

  // 2. Busca o README do repositório no GitHub para ler os requisitos de disco/ROM
  try {
    const readmeData = await fetchFromGithub(`/repos/${item.full_name}/readme`);
    if (readmeData && readmeData.content && readmeData.encoding === 'base64') {
      const readmeTexto = Buffer.from(readmeData.content, 'base64').toString('utf8');
      const codigoReadme = extrairSerialPorConsole(readmeTexto, plataforma.code);
      if (codigoReadme) {
        console.log(`    [Serial] Código identificado no README: ${codigoReadme}`);
        return codigoReadme;
      }
    }
  } catch (e) {
    // Silencioso em caso de limitação de rede
  }

  // 3. Fallback limpo padronizado em vez de 'AUTODISCOVER'
  const siglaLimpa = item.name
    .replace(/[-_]/g, '')
    .replace(/\b(pc|port|recomp|recompiled|standalone|decomp)\b/gi, '')
    .trim()
    .slice(0, 10)
    .toUpperCase() || 'PORT';

  return `${plataforma.code}-${siglaLimpa}`;
}

function formatarNomeAmigavel(nome, desc = '') {
  const baseLimpa = nome
    .replace(/[-_]/g, ' ')
    .replace(/\b(pc|port|recomp|recompiled|standalone|decomp)\b/gi, '')
    .trim()
    .toLowerCase();

  if (SIGLAS_JOGOS[baseLimpa]) {
    return SIGLAS_JOGOS[baseLimpa];
  }

  // Tenta extrair o título real da descrição se disponível
  if (desc) {
    const match = desc.match(/(?:native\s+(?:windows|pc)\s+port\s+of|unofficial\s+(?:windows|pc)\s+port\s+of|recompilation\s+of)\s+([^,.:;()]+?)(?:\s+(?:for|using|with|by|done|\(|based|built|\.|$))/i);
    if (match && match[1]) {
      const extraido = match[1].replace(/^(a|an|the)\s+/i, '').trim();
      if (extraido.length >= 3 && extraido.length <= 40 && !extraido.toLowerCase().includes('engine') && !extraido.toLowerCase().includes('decompilation')) {
        return extraido.replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  }

  return nome
    .replace(/[-_]/g, ' ')
    .replace(/\b(pc|port|recomp|recompiled|standalone|decomp)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

async function descobrirNovosPorts() {
  console.log('=====================================================');
  console.log('   PORTMOBILE — DISCOVER PORTS V5 (JOGOS MOBILE)   ');
  console.log('   Filtro Rígido: Apenas Games Nativos para Celular (Android e iOS)');
  console.log('=====================================================\n');

  const reposJaCadastrados = carregarReposCadastrados();
  console.log(`Repositórios já catalogados: ${reposJaCadastrados.size}\n`);

  const candidatos = new Map();

  for (const query of SEARCH_QUERIES) {
    console.log(`Buscando por: "${query}"...`);
    const searchResult = await fetchFromGithub(`/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=25`);
    
    if (searchResult && Array.isArray(searchResult.items)) {
      for (const item of searchResult.items) {
        const fullRepo = item.full_name.toLowerCase();
        const nomeLower = item.name.toLowerCase();
        const descLower = (item.description || '').toLowerCase();
        const combinedText = `${nomeLower} ${descLower} ${(item.topics || []).join(' ')}`.toLowerCase();
        const repoShort = fullRepo.split('/')[1] || '';

        // 1. Já catalogado?
        if (reposJaCadastrados.has(fullRepo) || candidatos.has(fullRepo)) {
          continue;
        }

        // 2. É fork ou arquivado?
        if (item.fork || item.archived) {
          continue;
        }

        // 3. É a ferramenta/compilador em si (PS2Recomp, N64Recomp, etc.) em vez de um jogo?
        if (REJECT_EXACT_NAMES.has(nomeLower) || REJECT_EXACT_NAMES.has(repoShort)) {
          continue;
        }

        // 4. Estrelas preliminares (mínimo 10 ⭐)
        if (item.stargazers_count < MIN_STARS_COM_EXECUTAVEL) {
          continue;
        }

        // 5. Linguagem permitida (C, C++, Rust, C#, Zig, Assembly)
        if (item.language && !ALLOWED_LANGUAGES.has(item.language)) {
          continue;
        }

        // 6. Termos proibidos (emuladores, homebrew em console, IA, utilitários)
        const temTermoRejeitado = REJECT_KEYWORDS.some(keyword => combinedText.includes(keyword));
        if (temTermoRejeitado) {
          continue;
        }

        // 7. Descarta repositórios explicitamente focados em Android ou iOS
        if (fullRepo.includes('-android') || fullRepo.includes('_android') || fullRepo.endsWith('android') || fullRepo.includes('-ios')) {
          continue;
        }

        // 8. O projeto DEVE ser voltado para PC (Windows / Linux / Steam Deck)
        const ehParaPC = PC_TARGET_KEYWORDS.some(pcWord => combinedText.includes(pcWord));
        if (!ehParaPC) {
          continue;
        }

        candidatos.set(fullRepo, item);
      }
    }
  }

  console.log(`\nCandidatos preliminares válidos: ${candidatos.size}`);
  console.log('Inspecionando Releases oficiais no GitHub...\n');

  const novosAprovados = [];

  for (const [fullRepo, item] of candidatos.entries()) {
    const releases = await fetchFromGithub(`/repos/${item.full_name}/releases`);

    // 9. OBRIGATÓRIO: Ter pelo menos uma release oficial
    if (!releases || !Array.isArray(releases) || releases.length === 0) {
      console.log(`  [Descartado] ${item.full_name} (${item.stargazers_count} estrelas) — Sem releases.`);
      continue;
    }

    const latestRelease = releases[0];
    const assets = latestRelease.assets || [];
    const hasDownloadableBinaries = assets.some(a => {
      const aName = (a.name || '').toLowerCase();
      return aName.endsWith('.zip') || aName.endsWith('.7z') || aName.endsWith('.exe') || aName.endsWith('.tar.gz') || aName.endsWith('.rar');
    });

    // 10. Regra Híbrida: Sem executáveis para download exige >= 25 estrelas
    if (!hasDownloadableBinaries && item.stargazers_count < MIN_STARS_SEM_EXECUTAVEL) {
      console.log(`  [Descartado] ${item.full_name} (${item.stargazers_count} estrelas) — Sem executável anexado (exige >= ${MIN_STARS_SEM_EXECUTAVEL} estrelas).`);
      continue;
    }

    const versaoDetectada = latestRelease.tag_name || latestRelease.name || 'v1.0.0';
    const dataRelease = latestRelease.published_at || item.updated_at;
    const isPreRelease = latestRelease.prerelease === true;

    const override = MAP_OVERRIDE_JOGOS[item.full_name];
    const plataforma = override ? { code: override.console, name: override.consoleNome } : adivinharConsole(item);

    const tagsList = override ? [...override.tags] : [plataforma.code, 'AutoDiscover'];
    if (!override && hasDownloadableBinaries) tagsList.push('Binário Disponível');
    if (!override && item.language) tagsList.push(item.language);

    const codigoResolvido = await buscarCodigoJogo(item, plataforma);

    const portAprovado = {
      id: item.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-') + '-pc',
      nome: override ? override.nome : (formatarNomeAmigavel(item.name, item.description) || item.name),
      console: plataforma.code,
      consoleNome: plataforma.name,
      codigoJogo: codigoResolvido,
      status: isPreRelease ? 'Em Desenvolvimento Ativo' : (hasDownloadableBinaries ? 'Totalmente Jogável' : 'Jogável (Source Port)'),
      statusTipo: isPreRelease ? 'wip' : 'jogavel',
      repo: item.full_name,
      repoUrl: item.html_url,
      descricao: override ? override.descricao : (item.description || 'Port nativo para PC com compilações oficiais disponíveis no GitHub.'),
      termoBuscaCapa: override ? override.termoBuscaCapa : (formatarNomeAmigavel(item.name, item.description) || item.name),
      capaManual: null,
      dataAtualizacao: dataRelease,
      stars: item.stargazers_count,
      versaoPadrao: versaoDetectada,
      tags: tagsList
    };

    const seloExecutavel = hasDownloadableBinaries ? '[Binário/Instalador detectado]' : '[Código-Fonte]';
    console.log(`  [APROVADO] ${portAprovado.nome} (${portAprovado.console}) — Estrelas: ${portAprovado.stars} | Release: ${versaoDetectada} ${seloExecutavel}`);
    novosAprovados.push(portAprovado);
  }

  console.log(`\n=====================================================`);
  console.log(`Total de jogos aprovados: ${novosAprovados.length}`);
  console.log(`=====================================================\n`);

  if (novosAprovados.length > 0) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(novosAprovados, null, 2), 'utf8');
    console.log(`Lista salva com sucesso em: novos_ports_sugeridos.json`);

    const deveAdicionar = process.argv.includes('--append');
    if (deveAdicionar) {
      console.log('\nAdicionando novos ports aprovados ao app.js...');
      let appCode = fs.readFileSync(APP_JS_PATH, 'utf8');
      const match = appCode.match(/const PORTS_DATABASE = (\[[\s\S]*?\n\];)/);
      if (match) {
        const atual = new Function(`return ${match[1]}`)();
        const combinado = [...novosAprovados, ...atual];
        const novoDb = 'const PORTS_DATABASE = ' + JSON.stringify(combinado, null, 2) + ';';
        appCode = appCode.replace(/const PORTS_DATABASE = \[[\s\S]*?\n\];/, novoDb);
        fs.writeFileSync(APP_JS_PATH, appCode, 'utf8');
        console.log(`app.js atualizado com sucesso! Total no banco agora: ${combinado.length}`);
      }
    } else {
      console.log('\nPara incluir esses ports automaticamente no site, execute:');
      console.log('  node scripts/discover-ports.js --append\n');
    }
  } else {
    if (fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
    }
    console.log('Nenhum novo port atendeu a todos os critérios de qualidade hoje.');
  }
}


async function enriquecerCodigosExistentes() {
  console.log('=====================================================');
  console.log('   PORTMOBILE — ENRIQUECIMENTO DE CÓDIGOS            ');
  console.log('=====================================================\n');

  let appCode = fs.readFileSync(APP_JS_PATH, 'utf8');
  const match = appCode.match(/const PORTS_DATABASE = (\[[\s\S]*?\n\];)/);
  if (!match) {
    console.error('PORTS_DATABASE não encontrado em app.js!');
    return;
  }

  const database = new Function(`return ${match[1]}`)();
  let atualizados = 0;

  for (const port of database) {
    if (!port.codigoJogo || port.codigoJogo === 'AUTODISCOVER' || port.codigoJogo.startsWith('AUTODISCOVER')) {
      const plataforma = { code: port.console, name: port.consoleNome };
      const itemFalso = {
        name: port.id.replace(/-pc$/, ''),
        full_name: port.repo,
        description: port.descricao,
        topics: port.tags || []
      };
      console.log(`Buscando código para: ${port.nome} (${port.repo})...`);
      const novoCodigo = await buscarCodigoJogo(itemFalso, plataforma);
      if (novoCodigo && novoCodigo !== 'AUTODISCOVER') {
        port.codigoJogo = novoCodigo;
        atualizados++;
        console.log(`  -> Definido: ${novoCodigo}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (atualizados > 0) {
    const novoDb = 'const PORTS_DATABASE = ' + JSON.stringify(database, null, 2) + ';';
    appCode = appCode.replace(/const PORTS_DATABASE = \[[\s\S]*?\n\];/, novoDb);
    fs.writeFileSync(APP_JS_PATH, appCode, 'utf8');
    console.log(`\n[OK] ${atualizados} ports tiveram seus códigos atualizados em app.js!`);
  } else {
    console.log('\nTodos os ports já possuem códigos válidos atribuídos.');
  }
}


async function sincronizarMetadadosExistentes() {
  console.log('=====================================================');
  console.log('   PORTMOBILE — SINCRONIZAÇÃO DE METADADOS           ');
  console.log('      (Atualização de Estrelas, Versões e Releases)  ');
  console.log('=====================================================\n');

  let appCode = fs.readFileSync(APP_JS_PATH, 'utf8');
  const match = appCode.match(/const PORTS_DATABASE = (\[[\s\S]*?\n\];)/);
  if (!match) {
    console.error('PORTS_DATABASE não encontrado em app.js!');
    return;
  }

  const database = new Function(`return ${match[1]}`)();
  console.log(`Total de ports a verificar: ${database.length}\n`);

  let atualizados = 0;

  for (let i = 0; i < database.length; i++) {
    const port = database[i];
    if (!port.repo || !port.repo.includes('/')) continue;

    try {
      // 1. Consulta dados do repositório (estrelas)
      const repoInfo = await fetchFromGithub(`/repos/${port.repo}`);
      if (repoInfo && typeof repoInfo.stargazers_count === 'number') {
        if (port.stars !== repoInfo.stargazers_count) {
          console.log(`  [Estrelas] [${port.nome}]: ${port.stars} -> ${repoInfo.stargazers_count}`);
          port.stars = repoInfo.stargazers_count;
          atualizados++;
        }
        if (repoInfo.updated_at && !port.dataAtualizacao) {
          port.dataAtualizacao = repoInfo.updated_at;
        }
      }

      // 2. Consulta releases mais recentes
      const releases = await fetchFromGithub(`/repos/${port.repo}/releases`);
      if (Array.isArray(releases) && releases.length > 0) {
        const latest = releases[0];
        const latestVersion = latest.tag_name || latest.name;
        if (latestVersion && port.versaoPadrao !== latestVersion) {
          console.log(`  [Release] [${port.nome}] Nova Release detectada: ${port.versaoPadrao || 'N/A'} -> ${latestVersion}`);
          port.versaoPadrao = latestVersion;
          if (latest.published_at) {
            port.dataAtualizacao = latest.published_at;
          }
          atualizados++;
        }
      }

      // Pausa leve para respeitar os limites
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.warn(`  [Aviso] Falha ao atualizar ${port.repo}: ${e.message}`);
    }
  }

  if (atualizados > 0) {
    const novoDb = 'const PORTS_DATABASE = ' + JSON.stringify(database, null, 2) + ';';
    appCode = appCode.replace(/const PORTS_DATABASE = \[\s\S]*?\n\];/, novoDb);
    fs.writeFileSync(APP_JS_PATH, appCode, 'utf8');
    console.log(`\n[OK] Sucesso! ${atualizados} metadados atualizados com sucesso em app.js.`);
  } else {
    console.log('\nTodos os metadados já estavam 100% atualizados.');
  }
}

if (process.argv.includes('--sync-meta')) {
  sincronizarMetadadosExistentes();
} else if (process.argv.includes('--enrich-codes')) {
  enriquecerCodigosExistentes();
} else {
  descobrirNovosPorts();
}

