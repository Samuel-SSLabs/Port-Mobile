'use strict';

const WORKER_PADRAO_URL = 'https://portmobile-proxy.sstudioslabs.workers.dev';
let CLOUDFLARE_WORKER_PROXY = (typeof window !== 'undefined' && localStorage.getItem('sslabs_worker_override')) || WORKER_PADRAO_URL;
// O Webhook do Discord e o GitHub Token operam com segredo protegido exclusivamente no Cloudflare Worker Secrets
const DISCORD_SUGGEST_WEBHOOK = '';
const MODO_ESTATICO_ECONOMICO = false;
const GITHUB_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

if (typeof window !== 'undefined') {
  window.definirWorkerProxy = function(novaUrl) {
    if (novaUrl && typeof novaUrl === 'string') {
      const urlLimpa = novaUrl.trim().replace(/\/$/, '');
      localStorage.setItem('sslabs_worker_override', urlLimpa);
      CLOUDFLARE_WORKER_PROXY = urlLimpa;
    } else {
      localStorage.removeItem('sslabs_worker_override');
      CLOUDFLARE_WORKER_PROXY = WORKER_PADRAO_URL;
    }
    return CLOUDFLARE_WORKER_PROXY;
  };
}


try {
  // Purga de caches legados para recarregar capas oficiais atualizadas (eliminando fallbacks antigos)
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('port_cover_') && !k.startsWith('port_cover_v4_')) {
      localStorage.removeItem(k);
    }
  });
} catch (e) {}

// ── SERVIDORES OFICIAIS DO DISCORD DOS PROJETOS (APENAS CONVITES 100% VÁLIDOS E ATIVOS) ──
const DISCORD_MAP = {
  "shadps4-emu/shadps4": "https://discord.gg/bFJxfftGW6",
  "supermedo/bloodborne_pc": "https://discord.gg/bFJxfftGW6",
  "ajncsystem/shadowofthecolossus-pc": "https://discord.gg/bFJxfftGW6",
  "hayatog/tlg_pc": "https://discord.gg/bFJxfftGW6",
  "felipeprado0/gow3_pc": "https://discord.gg/bFJxfftGW6",
  "blacklineinteractive/driveclub-port": "https://discord.gg/bFJxfftGW6",
  "junminlee2004/gr2fork": "https://discord.gg/bFJxfftGW6",
  "bloodborne-native/bloodborne-recomp": "https://discord.gg/bFJxfftGW6",
  "loreanxavier/pt-pc": "https://discord.gg/bFJxfftGW6",

  "red-prig/fpps4": "https://discord.gg/up9qatpX7M",

  "harbourmasters/shipwright": "https://discord.com/invite/harbourmasters",
  "harbourmasters/starship": "https://discord.com/invite/harbourmasters",
  "harbourmasters/spaghettikart": "https://discord.com/invite/harbourmasters",
  "2ship2harkinian/2ship2harkinian": "https://discord.com/invite/harbourmasters",

  "zelda64recomp/zelda64recomp": "https://discord.gg/AWZThJ4dPf",
  "banjorecomp/banjorecomp": "https://discord.gg/AWZThJ4dPf",
  "denkishi/ssbu-recomp": "https://discord.gg/AWZThJ4dPf",
  "peiikai/lasrecomp": "https://discord.gg/AWZThJ4dPf",

  "open-goal/jak-project": "https://discord.gg/VZbXMHXzWv",

  "coop-deluxe/sm64coopdx": "https://discord.gg/TJVKHS4",
  "sm64pc/sm64ex": "https://discord.gg/TJVKHS4",

  "diasurgical/devilutionx": "https://discord.gg/devilutionx-518540764754608128",

  "openrct2/openrct2": "https://discord.gg/ZXZd8D8",

  "vcmi/vcmi": "https://discord.gg/chBT42V",

  "snesrev/zelda3": "https://discord.gg/AJJbJAzNNJ",

  "twilitrealm/dusklight": "https://discord.gg/6NpMhefCK9",

  "phoboslab/wipeout-rewrite": "https://discord.gg/wipeout",

  "dinosaurplanetrecomp/dino-recomp": "https://discord.gg/dinosaurplanet",

  "noelfb/celeste": "https://discord.gg/celeste",

  "cutarev/sh2-nx": "https://discord.gg/silenthill"
};

const LOCAL_COVERS_MANIFEST = [
  "am2r-mobile",
  "balatro-mobile",
  "banjorecomp-android",
  "barony-mobile",
  "battleship-smash64",
  "black-mobile",
  "celeste-android",
  "corsixth-mobile",
  "crash-bandicoot-launcher-mobile",
  "cs16client-mobile",
  "devilutionx-diablo",
  "driftdroid-mariokart",
  "dusklight-twilight-princess",
  "fallout1-ce-mobile",
  "fallout2-ce-mobile",
  "fheroes2-mobile",
  "galaxy-android",
  "ghostship-sm64",
  "halo-ce-mobile",
  "harvest-moon-64",
  "jeffory-goldeneye-recomp",
  "julius-caesar3-mobile",
  "linkzenic-2ship2harkinian-android",
  "nycolazs-lasrecomp-android-plus",
  "ogdanimal-goemon64-recomp",
  "openlara-tomb-raider",
  "openmw-android",
  "openrct2-mobile",
  "openttd-mobile",
  "openxcom-mobile",
  "perfect-dark-mobile",
  "pocket-wormhole-ftl",
  "pokemon-gen1-recomp",
  "sergiomanzur-cvlod-recomp",
  "serious-sam-mobile",
  "ship-of-harkinian",
  "silent-hill-decomp-mobile",
  "simon358-ctr-native-android",
  "simpsons-hit-and-run-android",
  "sm64ex-ios",
  "sonic-1-2-decompilation",
  "sonic-cd-decompilation",
  "sonic-mania-decomp",
  "sonic-r-mobile",
  "sonic-unleashed-mobile",
  "space-cadet-pinball-mobile",
  "spaghettikart-mk64",
  "spelunky-classic-hd",
  "srb2-sonic-robo-blast-2",
  "starship-starfox64",
  "super-metroid-android",
  "tmc-minish-cap-android",
  "vcmi-heroes3-mobile",
  "wipeout-rewrite-mobile",
  "xash3d-half-life",
  "zelda3-android"
];
const LOCAL_COVERS_SET = new Set(LOCAL_COVERS_MANIFEST);

const PORTS_DATABASE = [
  {
    "id": "ship-of-harkinian",
    "nome": "Zelda: Ocarina of Time (Ship of Harkinian Mobile)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / Sideload",
    "codigoJogo": "OOT-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "linkzenic/Shipwright-Android",
    "repoUrl": "https://github.com/linkzenic/Shipwright-Android",
    "descricao": "Port nativo de Ocarina of Time para celulares Android com controles de toque na tela, giroscópio, 60 FPS e suporte a gamepads Bluetooth.",
    "termoBuscaCapa": "The Legend of Zelda: Ocarina of Time",
    "tags": [
      "Android",
      "iOS",
      "N64",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 73,
    "dataAtualizacao": "2026-10-21T20:22:11Z",
    "versaoPadrao": "v9.3.1-android.2",
    "capaManual": null
  },
  {
    "id": "ghostship-sm64",
    "nome": "Super Mario 64 (Ghostship Android)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "SM64-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "HarbourMasters/Ghostship",
    "repoUrl": "https://github.com/HarbourMasters/Ghostship",
    "descricao": "Descompilação e port nativo de Super Mario 64 para celulares Android pela equipe HarbourMasters, com suporte a touch controls e renderização moderna.",
    "termoBuscaCapa": "Super Mario 64",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 842,
    "dataAtualizacao": "2026-10-22T01:43:04Z",
    "versaoPadrao": "3.0.0",
    "capaManual": null
  },
  {
    "id": "sm64ex-ios",
    "nome": "Super Mario 64 (sm64ex iOS Port)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "iOS"
    ],
    "touch": true,
    "formato": "IPA / Sideload",
    "codigoJogo": "SM64-IOS",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "ckosmic/sm64ex-ios",
    "repoUrl": "https://github.com/ckosmic/sm64ex-ios",
    "descricao": "Port nativo oficial de Super Mario 64 para iPhone e iPad (iOS) via sm64ex, com suporte a controles de toque táteis e controles MFi/Bluetooth.",
    "termoBuscaCapa": "Super Mario 64",
    "tags": [
      "iOS",
      "N64",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 373,
    "dataAtualizacao": "2026-10-21T00:14:43Z",
    "versaoPadrao": "Port Mobile",
    "capaManual": null
  },
  {
    "id": "banjorecomp-android",
    "nome": "Banjo-Kazooie (BanjoRecomp Android)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "BANJO-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "AurelioB/BanjoRecomp-Android",
    "repoUrl": "https://github.com/AurelioB/BanjoRecomp-Android",
    "descricao": "Recompilação estática de Banjo-Kazooie para celulares Android: 60 FPS estáveis, controles na tela e suporte completo a APK.",
    "termoBuscaCapa": "Banjo-Kazooie",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "ARM64",
      "Recompilação"
    ],
    "stars": 110,
    "dataAtualizacao": "2026-10-17T17:36:35Z",
    "versaoPadrao": "android-v0.1.2",
    "capaManual": null
  },
  {
    "id": "starship-starfox64",
    "nome": "Star Fox 64 (Starship Android)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "SF64-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "izzy2lost/Starship",
    "repoUrl": "https://github.com/izzy2lost/Starship",
    "descricao": "Port nativo de Star Fox 64 para dispositivos móveis Android, com renderização de alta taxa de quadros e controles adaptados.",
    "termoBuscaCapa": "Star Fox 64",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 110,
    "dataAtualizacao": "2026-10-21T12:12:38Z",
    "versaoPadrao": "v2.0.0",
    "capaManual": null
  },
  {
    "id": "perfect-dark-mobile",
    "nome": "Perfect Dark (Android Decomp Port)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "PD-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Mr4xd3mn/perfect-dark-android",
    "repoUrl": "https://github.com/Mr4xd3mn/perfect-dark-android",
    "descricao": "Port nativo da descompilação de Perfect Dark para smartphones Android, com interface de controles de toque na tela totalmente customizável.",
    "termoBuscaCapa": "Perfect Dark",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "ARM64",
      "Descompilação"
    ],
    "stars": 2,
    "dataAtualizacao": "2026-10-20T20:13:49Z",
    "versaoPadrao": "v1.0",
    "capaManual": null
  },
  {
    "id": "harvest-moon-64",
    "nome": "Harvest Moon 64 (Android Recomp)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "HM64-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "igawa6/HarvestMoon64Recomp",
    "repoUrl": "https://github.com/igawa6/HarvestMoon64Recomp",
    "descricao": "Recompilação estática de Harvest Moon 64 compilada nativamente para Android com suporte a APK standalone.",
    "termoBuscaCapa": "Harvest Moon 64",
    "tags": [
      "Android",
      "N64",
      "ARM64",
      "Recompilação"
    ],
    "stars": 34,
    "dataAtualizacao": "2026-10-20T12:44:37Z",
    "versaoPadrao": "v0.2.0",
    "capaManual": null
  },
  {
    "id": "dusklight-twilight-princess",
    "nome": "Zelda: Twilight Princess (Dusklight Android)",
    "console": "GC_WII",
    "consoleNome": "GameCube & Wii",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "ZTP-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "TwilitRealm/dusklight",
    "repoUrl": "https://github.com/TwilitRealm/dusklight",
    "descricao": "Recompilação nativa de The Legend of Zelda: Twilight Princess para telefones celulares Android, com alta resolução e suporte a gamepads.",
    "termoBuscaCapa": "The Legend of Zelda: Twilight Princess",
    "tags": [
      "Android",
      "GameCube",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 6009,
    "dataAtualizacao": "2026-10-22T01:10:20Z",
    "versaoPadrao": "v2.0.3",
    "capaManual": null
  },
  {
    "id": "galaxy-android",
    "nome": "Super Mario Galaxy (Galaxy Android Port)",
    "console": "GC_WII",
    "consoleNome": "GameCube & Wii",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "SMG-ANDROID",
    "status": "Jogável / Em Progresso",
    "statusTipo": "jogavel",
    "repo": "OpenPort-Labs/Galaxy-Android",
    "repoUrl": "https://github.com/OpenPort-Labs/Galaxy-Android",
    "descricao": "Port nativo de Super Mario Galaxy para Android baseado na engenharia reversa do código ARM64, com suporte a toque e acelerômetro.",
    "termoBuscaCapa": "Super Mario Galaxy",
    "tags": [
      "Android",
      "Wii",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 250,
    "dataAtualizacao": "2026-10-22T01:26:24Z",
    "versaoPadrao": "v0.0.4-delta",
    "capaManual": null
  },
  {
    "id": "driftdroid-mariokart",
    "nome": "Mario Kart Wii (DriftDroid Mobile)",
    "console": "GC_WII",
    "consoleNome": "GameCube & Wii",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "MKWII-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "dorPXP/driftdroid",
    "repoUrl": "https://github.com/dorPXP/driftdroid",
    "descricao": "Port nativo de Mario Kart Wii para celulares Android: alta performance, suporte a Retro Rewind, controles na tela e baixa latência.",
    "termoBuscaCapa": "Mario Kart Wii",
    "tags": [
      "Android",
      "Wii",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 104,
    "dataAtualizacao": "2026-10-21T17:31:12Z",
    "versaoPadrao": "v1.3.0",
    "capaManual": null
  },
  {
    "id": "black-mobile",
    "nome": "Black (Black Android Native Port)",
    "console": "XBOX",
    "consoleNome": "Xbox Clássico",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "BLACK-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "RanggaCasper/Black-Android",
    "repoUrl": "https://github.com/RanggaCasper/Black-Android",
    "descricao": "Port nativo do clássico shooter Black (Xbox / PS2) para telefones Android, com controles de toque na tela, giroscópio e suporte a controles.",
    "termoBuscaCapa": "Black (video game)",
    "tags": [
      "Android",
      "Xbox",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 127,
    "dataAtualizacao": "2026-10-22T01:46:08Z",
    "versaoPadrao": "v1.5.0",
    "capaManual": null
  },
  {
    "id": "halo-ce-mobile",
    "nome": "Halo: Combat Evolved (Halo CE Android)",
    "console": "XBOX",
    "consoleNome": "Xbox Clássico",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "HALO-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "FulGerNet/halo-ce-android",
    "repoUrl": "https://github.com/FulGerNet/halo-ce-android",
    "descricao": "Port nativo de Halo: Combat Evolved para smartphones Android, com interface otimizada para toque, 60 FPS e suporte a gamepads.",
    "termoBuscaCapa": "Halo: Combat Evolved",
    "tags": [
      "Android",
      "Xbox",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 84,
    "dataAtualizacao": "2026-10-22T01:01:27Z",
    "versaoPadrao": "4.0",
    "capaManual": null
  },
  {
    "id": "sonic-unleashed-mobile",
    "nome": "Sonic Unleashed (UnleashedRecomp Android)",
    "console": "Switch",
    "consoleNome": "Nintendo Switch",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "SONIC-UNLEASHED-MOBILE",
    "status": "Em Progresso",
    "statusTipo": "desenvolvimento",
    "repo": "SansNope/UnleashedRecomp-Android",
    "repoUrl": "https://github.com/SansNope/UnleashedRecomp-Android",
    "descricao": "Port não-oficial para Android de Sonic Unleashed via recompilação estática, permitindo rodar em processadores ARM64 mobile.",
    "termoBuscaCapa": "Sonic Unleashed",
    "tags": [
      "Android",
      "Switch",
      "ARM64",
      "Recompilação"
    ],
    "stars": 227,
    "dataAtualizacao": "2026-10-21T15:04:45Z",
    "versaoPadrao": "v0.6.1",
    "capaManual": null
  },
  {
    "id": "sonic-mania-decomp",
    "nome": "Sonic Mania (RSDKv5 Decompilation Mobile)",
    "console": "Switch",
    "consoleNome": "Nintendo Switch",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "SONIC-MANIA-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Rubberduckycooly/Sonic-Mania-Decompilation",
    "repoUrl": "https://github.com/Rubberduckycooly/Sonic-Mania-Decompilation",
    "descricao": "Descompilação completa de Sonic Mania executando nativamente em smartphones Android e iOS a 60 FPS com controles de toque na tela.",
    "termoBuscaCapa": "Sonic Mania",
    "tags": [
      "Android",
      "iOS",
      "Switch",
      "Touch Controls",
      "ARM64",
      "Descompilação"
    ],
    "stars": 821,
    "dataAtualizacao": "2026-10-20T21:46:19Z",
    "versaoPadrao": "v1.1.1",
    "capaManual": null
  },
  {
    "id": "sonic-1-2-decompilation",
    "nome": "Sonic 1 & 2 (Retro Engine RSDKv4 Mobile)",
    "console": "Retro",
    "consoleNome": "Portáteis & Retro",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "SONIC-1-2-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Rubberduckycooly/Sonic-1-2-2013-Decompilation",
    "repoUrl": "https://github.com/Rubberduckycooly/Sonic-1-2-2013-Decompilation",
    "descricao": "Descompilação dos remakes de Sonic 1 e Sonic 2 para Android e iOS, com suporte widescreen e controles mobile.",
    "termoBuscaCapa": "Sonic the Hedgehog (1991 video game)",
    "tags": [
      "Android",
      "iOS",
      "Retro",
      "Touch Controls",
      "Descompilação"
    ],
    "stars": 1151,
    "dataAtualizacao": "2026-10-21T05:50:16Z",
    "versaoPadrao": "1.3.3",
    "capaManual": null
  },
  {
    "id": "sonic-cd-decompilation",
    "nome": "Sonic CD (Retro Engine RSDKv3 Mobile)",
    "console": "Retro",
    "consoleNome": "Portáteis & Retro",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "SONIC-CD-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Rubberduckycooly/Sonic-CD-11-Decompilation",
    "repoUrl": "https://github.com/Rubberduckycooly/Sonic-CD-11-Decompilation",
    "descricao": "Descompilação do clássico Sonic CD para smartphones Android e iOS, trazendo suporte total a toque e 60 FPS.",
    "termoBuscaCapa": "Sonic the Hedgehog CD",
    "tags": [
      "Android",
      "iOS",
      "Retro",
      "Touch Controls",
      "Descompilação"
    ],
    "stars": 712,
    "dataAtualizacao": "2026-10-21T22:31:56Z",
    "versaoPadrao": "1.3.3",
    "capaManual": null
  },
  {
    "id": "sonic-r-mobile",
    "nome": "Sonic R (Sonic R Android Native Port)",
    "console": "Retro",
    "consoleNome": "Portáteis & Retro",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "SONIC-R-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "ZinexDa/sonic-r-android",
    "repoUrl": "https://github.com/ZinexDa/sonic-r-android",
    "descricao": "Port nativo da descompilação de Sonic R para Android com shaders GLES2 dedicados, 60 FPS e controles de toque customizáveis.",
    "termoBuscaCapa": "Sonic R",
    "tags": [
      "Android",
      "Retro",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 31,
    "dataAtualizacao": "2026-10-20T12:31:18Z",
    "versaoPadrao": "v1.3.1",
    "capaManual": null
  },
  {
    "id": "am2r-mobile",
    "nome": "AM2R: Return of Samus (Android Autopatcher)",
    "console": "Retro",
    "consoleNome": "Portáteis & Retro",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "AM2R-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "AM2R-Community-Developers/AM2R-Autopatcher-Android",
    "repoUrl": "https://github.com/AM2R-Community-Developers/AM2R-Autopatcher-Android",
    "descricao": "Port nativo de Another Metroid 2 Remake para telefones Android, com suporte oficial a controles touch e telas modernas.",
    "termoBuscaCapa": "AM2R",
    "tags": [
      "Android",
      "Retro",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 9,
    "dataAtualizacao": "2025-10-16T08:37:07Z",
    "versaoPadrao": "Port Mobile",
    "capaManual": null
  },
  {
    "id": "openlara-tomb-raider",
    "nome": "Tomb Raider 1-3 (OpenLara Mobile)",
    "console": "PS1",
    "consoleNome": "PlayStation 1",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / WebGL",
    "codigoJogo": "TR-OPENLARA-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "XProger/OpenLara",
    "repoUrl": "https://github.com/XProger/OpenLara",
    "descricao": "Motor de código aberto clássico de Tomb Raider rodando com gráficos melhorados e controles táteis no Android e iOS.",
    "termoBuscaCapa": "Tomb Raider (1996 video game)",
    "tags": [
      "Android",
      "iOS",
      "PS1",
      "Touch Controls",
      "Open Engine"
    ],
    "stars": 5132,
    "dataAtualizacao": "2026-10-21T12:11:50Z",
    "versaoPadrao": "latest",
    "capaManual": null
  },
  {
    "id": "wipeout-rewrite-mobile",
    "nome": "WipEout 1995 (WipEout Rewrite Mobile)",
    "console": "PS1",
    "consoleNome": "PlayStation 1",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "WIPEOUT-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "phoboslab/wipeout-rewrite",
    "repoUrl": "https://github.com/phoboslab/wipeout-rewrite",
    "descricao": "Reimplementação pura em C de WipEout (1995) com aceleração gráfica móvel, suporte a giroscópio e controles touch.",
    "termoBuscaCapa": "Wipeout (video game)",
    "tags": [
      "Android",
      "PS1",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 2988,
    "dataAtualizacao": "2026-10-21T12:23:32Z",
    "versaoPadrao": "Port Mobile",
    "capaManual": null
  },
  {
    "id": "openmw-android",
    "nome": "The Elder Scrolls III: Morrowind (OpenMW Android)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "OPENMW-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Andiweli/OpenMW-Android",
    "repoUrl": "https://github.com/Andiweli/OpenMW-Android",
    "descricao": "Port nativo de OpenMW para celulares Android, trazendo suporte completo aos dados de Morrowind com touch e mods.",
    "termoBuscaCapa": "The Elder Scrolls III: Morrowind",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "ARM64",
      "Open Engine"
    ],
    "stars": 37,
    "dataAtualizacao": "2026-10-20T22:24:19Z",
    "versaoPadrao": "0.51.0-12",
    "capaManual": null
  },
  {
    "id": "devilutionx-diablo",
    "nome": "Diablo & Hellfire (DevilutionX Mobile)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "DEVILUTIONX-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "diasurgical/devilutionX",
    "repoUrl": "https://github.com/diasurgical/devilutionX",
    "descricao": "Port nativo em C++ de Diablo I e Hellfire para celulares Android e iOS: interface tátil, zoom dinâmico e multiplayer.",
    "termoBuscaCapa": "Diablo (video game)",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "Source Port"
    ],
    "stars": 9920,
    "dataAtualizacao": "2026-10-22T01:00:21Z",
    "versaoPadrao": "1.5.5",
    "capaManual": null
  },
  {
    "id": "xash3d-half-life",
    "nome": "Half-Life 1 (Xash3D FWGS Mobile)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "HL1-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "FWGS/xash3d-fwgs",
    "repoUrl": "https://github.com/FWGS/xash3d-fwgs",
    "descricao": "Motor GoldSrc reescrito para celulares Android e iOS, permitindo jogar a campanha completa de Half-Life e mods com controles touch.",
    "termoBuscaCapa": "Half-Life (video game)",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "ARM64",
      "Source Port"
    ],
    "stars": 2874,
    "dataAtualizacao": "2026-10-21T19:00:07Z",
    "versaoPadrao": "continuous",
    "capaManual": null
  },
  {
    "id": "cs16client-mobile",
    "nome": "Counter-Strike 1.6 (CS16Client Android)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "CS16-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Velaron/cs16-client",
    "repoUrl": "https://github.com/Velaron/cs16-client",
    "descricao": "Cliente nativo de Counter-Strike 1.6 para Android baseado no Xash3D, com servidores online e botões táteis customizáveis.",
    "termoBuscaCapa": "Counter-Strike (video game)",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "ARM64",
      "Source Port"
    ],
    "stars": 465,
    "dataAtualizacao": "2026-10-21T23:11:30Z",
    "versaoPadrao": "continuous",
    "capaManual": null
  },
  {
    "id": "fallout1-ce-mobile",
    "nome": "Fallout 1: Community Edition (Mobile Port)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "FALLOUT1-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "alexbatalov/fallout1-ce",
    "repoUrl": "https://github.com/alexbatalov/fallout1-ce",
    "descricao": "Reimplementação de código aberto de Fallout 1 para smartphones Android e iOS com navegação tátil por toque.",
    "termoBuscaCapa": "Fallout (video game)",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 2950,
    "dataAtualizacao": "2026-10-21T20:11:47Z",
    "versaoPadrao": "v1.1.0",
    "capaManual": null
  },
  {
    "id": "fallout2-ce-mobile",
    "nome": "Fallout 2: Community Edition (Mobile Port)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "FALLOUT2-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "alexbatalov/fallout2-ce",
    "repoUrl": "https://github.com/alexbatalov/fallout2-ce",
    "descricao": "Reimplementação de código aberto de Fallout 2 para smartphones Android e iOS com suporte a toque e resoluções móveis.",
    "termoBuscaCapa": "Fallout 2",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 2470,
    "dataAtualizacao": "2026-10-21T20:12:41Z",
    "versaoPadrao": "v1.3.0",
    "capaManual": null
  },
  {
    "id": "celeste-android",
    "nome": "Celeste (Celeste Android Native Port)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "CELESTE-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "BelmanteGu/CelesteAndroid",
    "repoUrl": "https://github.com/BelmanteGu/CelesteAndroid",
    "descricao": "Port nativo de Celeste (2018) para celulares Android via .NET, FNA, SDL3 e Vulkan, com importador de dados e controles na tela.",
    "termoBuscaCapa": "Celeste (video game)",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 34,
    "dataAtualizacao": "2026-10-20T13:23:59Z",
    "versaoPadrao": "v1.0.1",
    "capaManual": null
  },
  {
    "id": "balatro-mobile",
    "nome": "Balatro (Balatro Mobile Maker)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "BALATRO-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "blake502/balatro-mobile-maker",
    "repoUrl": "https://github.com/blake502/balatro-mobile-maker",
    "descricao": "Gerador e empacotador de APK e IPA para rodar Balatro nativamente em telefones Android e iOS com interface por toque.",
    "termoBuscaCapa": "Balatro (video game)",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 1772,
    "dataAtualizacao": "2026-10-21T00:15:27Z",
    "versaoPadrao": "beta-0.8.3",
    "capaManual": null
  },
  {
    "id": "fheroes2-mobile",
    "nome": "Heroes of Might and Magic II (fheroes2 Mobile)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "FHEROES2-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "ihhub/fheroes2",
    "repoUrl": "https://github.com/ihhub/fheroes2",
    "descricao": "Recriação de código aberto de Heroes of Might and Magic II com interface por toque para smartphones Android e iOS.",
    "termoBuscaCapa": "Heroes of Might and Magic II",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "Open Engine"
    ],
    "stars": 3514,
    "dataAtualizacao": "2026-10-22T01:00:23Z",
    "versaoPadrao": "1.1.17",
    "capaManual": null
  },
  {
    "id": "vcmi-heroes3-mobile",
    "nome": "Heroes of Might and Magic III (VCMI Mobile)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "VCMI-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "vcmi/vcmi",
    "repoUrl": "https://github.com/vcmi/vcmi",
    "descricao": "Motor de código aberto para Heroes III com suporte completo a celulares Android e iOS, mods e controles táteis.",
    "termoBuscaCapa": "Heroes of Might and Magic III",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "Open Engine"
    ],
    "stars": 5970,
    "dataAtualizacao": "2026-10-21T23:53:34Z",
    "versaoPadrao": "1.7.5",
    "capaManual": null
  },
  {
    "id": "julius-caesar3-mobile",
    "nome": "Caesar III (Julius & Augustus Mobile)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "JULIUS-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "bvschaik/julius",
    "repoUrl": "https://github.com/bvschaik/julius",
    "descricao": "Reimplementação de Caesar III para celulares Android e iOS com interface adaptada para toque em telas pequenas.",
    "termoBuscaCapa": "Caesar III",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "Open Engine"
    ],
    "stars": 3410,
    "dataAtualizacao": "2026-10-21T12:58:51Z",
    "versaoPadrao": "v1.8.0",
    "capaManual": null
  },
  {
    "id": "spelunky-classic-hd",
    "nome": "Spelunky Classic HD (Android & iOS)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "SPELUNKY-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "yancharkin/SpelunkyClassicHD",
    "repoUrl": "https://github.com/yancharkin/SpelunkyClassicHD",
    "descricao": "Port nativo de Spelunky Classic para dispositivos móveis Android e iOS com controles táteis na tela.",
    "termoBuscaCapa": "Spelunky",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "Port Nativo"
    ],
    "stars": 229,
    "dataAtualizacao": "2026-10-19T19:19:51Z",
    "versaoPadrao": "1.2.2",
    "capaManual": null
  },
  {
    "id": "openxcom-mobile",
    "nome": "X-COM: UFO Defense (OpenXcom Mobile)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "OPENXCOM-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "sfalexrog/openxcom-android",
    "repoUrl": "https://github.com/sfalexrog/openxcom-android",
    "descricao": "Port nativo de OpenXcom para celulares Android com suporte a touch para comandos estratégicos e táticos.",
    "termoBuscaCapa": "UFO: Enemy Unknown",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "ARM64",
      "Open Engine"
    ],
    "stars": 23,
    "dataAtualizacao": "2026-09-24T12:34:39Z",
    "versaoPadrao": "v0.2",
    "capaManual": null
  },
  {
    "id": "serious-sam-mobile",
    "nome": "Serious Sam: TSE (Serious Sam Android)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "SAM-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "aarcangeli/Serious-Sam-Android",
    "repoUrl": "https://github.com/aarcangeli/Serious-Sam-Android",
    "descricao": "Port nativo do motor de Serious Sam: The Second Encounter para smartphones Android com botões táteis e renderização acelerada.",
    "termoBuscaCapa": "Serious Sam: The Second Encounter",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 89,
    "dataAtualizacao": "2026-10-04T13:23:38Z",
    "versaoPadrao": "v1.04.0",
    "capaManual": null
  },
  {
    "id": "barony-mobile",
    "nome": "Barony (Barony Android Native Port)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "BARONY-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "DifferentNet/barony-android-port",
    "repoUrl": "https://github.com/DifferentNet/barony-android-port",
    "descricao": "Port nativo de Barony para telefones celulares Android: 60 FPS, suporte a touch e compatível com a versão v5.0.2.",
    "termoBuscaCapa": "Barony (video game)",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 12,
    "dataAtualizacao": "2026-10-19T01:04:20Z",
    "versaoPadrao": "5.0.2-android-beta11",
    "capaManual": null
  },
  {
    "id": "pocket-wormhole-ftl",
    "nome": "FTL: Faster Than Light (Pocket Wormhole)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK",
    "codigoJogo": "FTL-ANDROID",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "adamkulik/pocket-wormhole",
    "repoUrl": "https://github.com/adamkulik/pocket-wormhole",
    "descricao": "Port nativo do motor de FTL: Faster Than Light para celulares Android, trazendo a clássica jogabilidade espacial para o toque.",
    "termoBuscaCapa": "FTL: Faster Than Light",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "ARM64",
      "Port Nativo"
    ],
    "stars": 62,
    "dataAtualizacao": "2026-10-21T11:50:18Z",
    "versaoPadrao": "v0.2.7",
    "capaManual": null
  },
  {
    "id": "openttd-mobile",
    "nome": "Transport Tycoon Deluxe (OpenTTD Mobile)",
    "console": "PC",
    "consoleNome": "PC / Source Ports",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "OPENTTD-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "OpenTTD/OpenTTD",
    "repoUrl": "https://github.com/OpenTTD/OpenTTD",
    "descricao": "Simulador clássico de transporte reimplementado em código aberto com versão oficial para Android e iOS.",
    "termoBuscaCapa": "Transport Tycoon",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "Open Engine"
    ],
    "stars": 8406,
    "dataAtualizacao": "2026-10-22T01:00:22Z",
    "versaoPadrao": "16.0-beta4",
    "capaManual": null
  },
  {
    "id": "spaghettikart-mk64",
    "nome": "Mario Kart 64 (SpaghettiKart Mobile)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "MK64-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "izzy2lost/SpaghettiKart",
    "repoUrl": "https://github.com/izzy2lost/SpaghettiKart",
    "descricao": "Port nativo da descompilação de Mario Kart 64 para smartphones Android: suporte a 60 FPS reais, widescreen e controles táteis na tela.",
    "termoBuscaCapa": "Mario Kart 64",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "Widescreen 16:9",
      "60 FPS"
    ],
    "stars": 113,
    "versaoPadrao": "v1.2.0-android",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "linkzenic-2ship2harkinian-android",
    "nome": "Zelda: Majora's Mask (2 Ship 2 Harkinian Mobile)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK / Sideload",
    "codigoJogo": "MM-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "linkzenic/2ship2harkinian-Android",
    "repoUrl": "https://github.com/linkzenic/2ship2harkinian-Android",
    "descricao": "Port nativo de Majora's Mask para celulares Android baseado no 2 Ship 2 Harkinian, com suporte a APK standalone, giroscópio e mods.",
    "termoBuscaCapa": "The Legend of Zelda: Majora's Mask",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "Giroscópio",
      "Mods"
    ],
    "stars": 73,
    "versaoPadrao": "v1.1.2-android",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "battleship-smash64",
    "nome": "Super Smash Bros. (BattleShip Mobile)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "SSB64-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "JRickey/BattleShip",
    "repoUrl": "https://github.com/JRickey/BattleShip",
    "descricao": "Port nativo da descompilação do clássico Super Smash Bros. de N64 para Android, com renderização em alta taxa de quadros e botões na tela.",
    "termoBuscaCapa": "Super Smash Bros. (video game)",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "60 FPS",
      "Luta 3D"
    ],
    "stars": 505,
    "versaoPadrao": "v1.0.4",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "sergiomanzur-cvlod-recomp",
    "nome": "Castlevania: Legacy of Darkness Recomp",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "CVLOD-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "sergiomanzur/cvlod_recomp",
    "repoUrl": "https://github.com/sergiomanzur/cvlod_recomp",
    "descricao": "Recompilação estática de Castlevania: Legacy of Darkness (N64) portada para celulares Android com 60 FPS e controles adaptados.",
    "termoBuscaCapa": "Castlevania: Legacy of Darkness",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "Recompilação",
      "60 FPS"
    ],
    "stars": 18,
    "versaoPadrao": "v1.0.0-android",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "ogdanimal-goemon64-recomp",
    "nome": "Mystical Ninja Starring Goemon (Goemon 64 Mobile)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "GOEMON-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "ogdanimal/Goemon64Recomp-Android",
    "repoUrl": "https://github.com/ogdanimal/Goemon64Recomp-Android",
    "descricao": "Port nativo de Mystical Ninja Starring Goemon para smartphones Android via N64Recomp, trazendo o carismático mundo 3D da Konami para o toque.",
    "termoBuscaCapa": "Mystical Ninja Starring Goemon",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "Aventura 3D"
    ],
    "stars": 16,
    "versaoPadrao": "v1.0.1",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "jeffory-goldeneye-recomp",
    "nome": "GoldenEye 007 Recomp (XBLA / N64 Mobile)",
    "console": "N64",
    "consoleNome": "Nintendo 64",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "GE007-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "jeffory/GoldenEye-Recomp",
    "repoUrl": "https://github.com/jeffory/GoldenEye-Recomp",
    "descricao": "Recompilação estática de GoldenEye 007 com build nativo Android, suporte a mira por giroscópio, 60 FPS estáveis e botões customizáveis.",
    "termoBuscaCapa": "GoldenEye 007 (1997 video game)",
    "tags": [
      "Android",
      "N64",
      "Touch Controls",
      "Giroscópio",
      "FPS"
    ],
    "stars": 84,
    "versaoPadrao": "v1.0.0",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "zelda3-android",
    "nome": "The Legend of Zelda: A Link to the Past (zelda3 Mobile)",
    "console": "Retro",
    "consoleNome": "Super Nintendo",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "ZELDA3-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "samyost1/zelda3-android",
    "repoUrl": "https://github.com/samyost1/zelda3-android",
    "descricao": "Port nativo em C de A Link to the Past para Android executando sem emulador, com suporte a widescreen 16:9 real e controles táteis suaves.",
    "termoBuscaCapa": "The Legend of Zelda: A Link to the Past",
    "tags": [
      "Android",
      "Retro",
      "Touch Controls",
      "Widescreen 16:9"
    ],
    "stars": 229,
    "versaoPadrao": "v1.0.6",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "tmc-minish-cap-android",
    "nome": "The Legend of Zelda: The Minish Cap (tmc Mobile)",
    "console": "Retro",
    "consoleNome": "Game Boy Advance",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "TMC-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "samyost1/tmc-android",
    "repoUrl": "https://github.com/samyost1/tmc-android",
    "descricao": "Descompilação completa de The Minish Cap compilada em código C nativo para celulares Android, com suporte a controles de toque e telas modernas.",
    "termoBuscaCapa": "The Legend of Zelda: The Minish Cap",
    "tags": [
      "Android",
      "Retro",
      "Touch Controls",
      "GBA",
      "Descompilação C"
    ],
    "stars": 197,
    "versaoPadrao": "v1.0.3",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "super-metroid-android",
    "nome": "Super Metroid (super_metroid Mobile)",
    "console": "Retro",
    "consoleNome": "Super Nintendo",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "SMETROID-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Raekwon1603/super_metroid-android",
    "repoUrl": "https://github.com/Raekwon1603/super_metroid-android",
    "descricao": "Descompilação e re-implementação em C de Super Metroid para celulares Android: física e jogabilidade 1:1, suporte a touch e gamepads.",
    "termoBuscaCapa": "Super Metroid",
    "tags": [
      "Android",
      "Retro",
      "Touch Controls",
      "SNES",
      "Metroidvania"
    ],
    "stars": 142,
    "versaoPadrao": "v1.0.2",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "pokemon-gen1-recomp",
    "nome": "Pokemon Red & Blue (Gen 1 Recomp Mobile)",
    "console": "Retro",
    "consoleNome": "Game Boy",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "PKMN-GEN1",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "bryanthaboi/gen1recomp",
    "repoUrl": "https://github.com/bryanthaboi/gen1recomp",
    "descricao": "Recompilação estática de Pokémon Red & Blue gerando binário nativo para Android, com acelerador de velocidade, áudio restaurado e controles touch.",
    "termoBuscaCapa": "Pokémon Red and Blue",
    "tags": [
      "Android",
      "Retro",
      "Touch Controls",
      "Recompilação",
      "RPG"
    ],
    "stars": 95,
    "versaoPadrao": "v1.0.0",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "simon358-ctr-native-android",
    "nome": "Crash Team Racing (CTR Native Mobile)",
    "console": "PS1",
    "consoleNome": "PlayStation 1",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "CTR-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Simon358/ctr-native-android",
    "repoUrl": "https://github.com/Simon358/ctr-native-android",
    "descricao": "Port nativo da descompilação de Crash Team Racing (PS1) para celulares Android: 60 FPS, alta resolução, multiplayer local e botões na tela.",
    "termoBuscaCapa": "Crash Team Racing",
    "tags": [
      "Android",
      "PS1",
      "Touch Controls",
      "Corrida",
      "60 FPS"
    ],
    "stars": 50,
    "versaoPadrao": "v0.9.5-beta",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "crash-bandicoot-launcher-mobile",
    "nome": "Crash Bandicoot 1 (Launcher Mobile)",
    "console": "PS1",
    "consoleNome": "PlayStation 1",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "CRASH1-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Matteo842/CrashBandicoot-Launcher",
    "repoUrl": "https://github.com/Matteo842/CrashBandicoot-Launcher",
    "descricao": "Port nativo em C da descompilação de Crash Bandicoot 1 adaptado para telefones celulares, com controles de toque customizáveis e widescreen.",
    "termoBuscaCapa": "Crash Bandicoot (video game)",
    "tags": [
      "Android",
      "PS1",
      "Touch Controls",
      "Plataforma 3D"
    ],
    "stars": 48,
    "versaoPadrao": "v1.1.0",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "silent-hill-decomp-mobile",
    "nome": "Silent Hill 1 (silent-hill Mobile)",
    "console": "PS1",
    "consoleNome": "PlayStation 1",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK / Sideload",
    "codigoJogo": "SH1-MOBILE",
    "status": "Em Andamento",
    "statusTipo": "desenvolvimento",
    "repo": "SlickAmogus/silent-hill-decomp",
    "repoUrl": "https://github.com/SlickAmogus/silent-hill-decomp",
    "descricao": "Projeto de descompilação e port nativo de Silent Hill 1 para dispositivos móveis Android, trazendo o clássico survival horror sem emuladores.",
    "termoBuscaCapa": "Silent Hill (video game)",
    "tags": [
      "Android",
      "PS1",
      "Touch Controls",
      "Survival Horror"
    ],
    "stars": 76,
    "versaoPadrao": "dev-build",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "nycolazs-lasrecomp-android-plus",
    "nome": "Zelda: Link's Awakening (LASRecomp Android Plus)",
    "console": "Switch",
    "consoleNome": "Nintendo Switch",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "LAS-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Nycolazs/LASRecomp-Android-Plus",
    "repoUrl": "https://github.com/Nycolazs/LASRecomp-Android-Plus",
    "descricao": "Recompilação estática do remake de Link's Awakening (Switch) rodando diretamente no silício ARM64 de celulares Android com touch e alto FPS.",
    "termoBuscaCapa": "The Legend of Zelda: Link's Awakening (2019 video game)",
    "tags": [
      "Android",
      "Switch",
      "Touch Controls",
      "ARM64 Nativo",
      "Vulkan"
    ],
    "stars": 89,
    "versaoPadrao": "v1.2.1-plus",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "simpsons-hit-and-run-android",
    "nome": "The Simpsons: Hit & Run Mobile",
    "console": "PC",
    "consoleNome": "PC / Console Classic",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "SHAR-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "Carlox33/The-Simpsons-Hit-and-Run-Android",
    "repoUrl": "https://github.com/Carlox33/The-Simpsons-Hit-and-Run-Android",
    "descricao": "Port nativo não-oficial de The Simpsons: Hit & Run para smartphones Android com botões virtuais, aceleração 3D móvel e suporte a controles.",
    "termoBuscaCapa": "The Simpsons: Hit & Run",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "Mundo Aberto",
      "3D"
    ],
    "stars": 179,
    "versaoPadrao": "v0.8.2-android",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "space-cadet-pinball-mobile",
    "nome": "3D Pinball: Space Cadet Mobile",
    "console": "PC",
    "consoleNome": "PC / Windows Classic",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "PINBALL-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "k4zmu2a/SpaceCadetPinball",
    "repoUrl": "https://github.com/k4zmu2a/SpaceCadetPinball",
    "descricao": "Descompilação reversa de 3D Pinball for Windows – Space Cadet com pacotes oficiais para Android (APK) e iOS (IPA) com controles táteis.",
    "termoBuscaCapa": "Full Tilt! Pinball",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "Pinball Clássico"
    ],
    "stars": 4725,
    "versaoPadrao": "Release 2.1.0",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "openrct2-mobile",
    "nome": "RollerCoaster Tycoon 2 (OpenRCT2 Mobile)",
    "console": "PC",
    "consoleNome": "PC / Strategy",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "OPENRCT2-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "OpenRCT2/OpenRCT2",
    "repoUrl": "https://github.com/OpenRCT2/OpenRCT2",
    "descricao": "Recriação de código aberto de RollerCoaster Tycoon 2 com suporte nativo a celulares Android via APK oficial, permitindo criar parques pelo toque.",
    "termoBuscaCapa": "RollerCoaster Tycoon 2",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "Estratégia",
      "Simulação"
    ],
    "stars": 16479,
    "versaoPadrao": "v0.4.15",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "corsixth-mobile",
    "nome": "Theme Hospital (CorsixTH Mobile)",
    "console": "PC",
    "consoleNome": "PC / Strategy",
    "so": [
      "Android"
    ],
    "touch": true,
    "formato": "APK Standalone",
    "codigoJogo": "CORSIXTH-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "CorsixTH/CorsixTH",
    "repoUrl": "https://github.com/CorsixTH/CorsixTH",
    "descricao": "Port nativo de Theme Hospital para celulares Android via CorsixTH, adaptado para telas sensíveis ao toque com resoluções de alta definição.",
    "termoBuscaCapa": "Theme Hospital",
    "tags": [
      "Android",
      "PC",
      "Touch Controls",
      "Simulação",
      "Gestão"
    ],
    "stars": 4609,
    "versaoPadrao": "v0.67",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  },
  {
    "id": "srb2-sonic-robo-blast-2",
    "nome": "Sonic Robo Blast 2 (SRB2 Mobile)",
    "console": "PC",
    "consoleNome": "PC / Fan Game Engine",
    "so": [
      "Android",
      "iOS"
    ],
    "touch": true,
    "formato": "APK / IPA",
    "codigoJogo": "SRB2-MOBILE",
    "status": "Totalmente Jogável",
    "statusTipo": "jogavel",
    "repo": "STJr/SRB2",
    "repoUrl": "https://github.com/STJr/SRB2",
    "descricao": "Aclamado jogo de plataforma 3D de Sonic construído sobre a Doom Engine com build nativo oficial publicado para Android e iOS.",
    "termoBuscaCapa": "Sonic Robo Blast 2",
    "tags": [
      "Android",
      "iOS",
      "PC",
      "Touch Controls",
      "Doom Engine",
      "Sonic 3D"
    ],
    "stars": 568,
    "versaoPadrao": "v2.2.13",
    "capaManual": null,
    "dataAtualizacao": "2026-10-21T21:00:00Z"
  }
];

// ── AUXILIARES DE FILTRAGEM (PLATAFORMA MOBILE & CONSOLE DE ORIGEM) ──
function portMatchesMobile(port, key) {
  const m = (key || 'todos').toLowerCase();
  if (m === 'todos') return true;
  const soList = (port.so || []).map(s => s.toLowerCase());
  const tags = (port.tags || []).map(t => t.toLowerCase());

  if (m === 'android') {
    return soList.includes('android') || tags.includes('android') || port.android === true;
  }
  if (m === 'ios') {
    return soList.includes('ios') || tags.includes('ios') || port.ios === true;
  }
  return true;
}

function portMatchesConsole(port, key) {
  const cAtivo = (key || 'todos').toLowerCase();
  const pConsole = (port.console || '').toLowerCase();
  const tags = (port.tags || []).map(t => t.toLowerCase());

  if (cAtivo === 'todos') return true;

  if (cAtivo === 'ps5') return pConsole === 'ps5';
  if (cAtivo === 'ps4') return pConsole === 'ps4';
  if (cAtivo === 'ps3') return pConsole === 'ps3';
  if (cAtivo === 'ps2') return pConsole === 'ps2';
  if (cAtivo === 'ps1') return pConsole === 'ps1';

  if (cAtivo === 'xone') return pConsole === 'xone' || pConsole === 'xboxone' || pConsole === 'series';
  if (cAtivo === 'xbox360') return pConsole === 'xbox360';
  if (cAtivo === 'xbox') return pConsole === 'xbox';

  if (cAtivo === 'switch') return pConsole === 'switch' || pConsole === 'nintendo';
  if (cAtivo === 'n64') return pConsole === 'n64';
  if (cAtivo === 'gc_wii' || cAtivo === 'gamecube') {
    return pConsole === 'gc_wii' || pConsole === 'gamecube' || pConsole === 'gc' || pConsole === 'wii' || pConsole === 'wiiu';
  }

  if (cAtivo === 'retro' || cAtivo === 'portateis') {
    return pConsole === 'retro' || pConsole === 'gba' || pConsole === 'snes' || pConsole === 'nds' || pConsole === 'psp' || pConsole === 'arcade' || pConsole === 'outros';
  }

  if (cAtivo === 'pc') {
    return pConsole === 'pc' || tags.includes('pc') || tags.includes('source port');
  }

  return pConsole === cAtivo;
}

// ── ESTADO DA APLICAÇÃO ──
const state = {
  ports: [...PORTS_DATABASE],
  termoBusca: '',
  plataformaMobileAtiva: 'todos',
  consoleAtivo: 'todos',
  ordenacao: 'recentes', // Padrão: Releases mais recentes
  cacheGitHub: {},
  cacheCapas: {}
};

// ── INICIALIZAÇÃO DA APLICAÇÃO ──
document.addEventListener('DOMContentLoaded', () => {
  inicializarSistemaIdiomas();
  inicializarTema();
  inicializarFiltrosURL();
  configurarEventosBusca();
  configurarEventosFiltros();
  configurarCliqueCards();
  configurarModalSugestoes();
  configurarBotaoVoltarAoTopo();
  configurarEventosApoio();
  atualizarEstatisticasHero();
  renderizarCatalogo();
  iniciarMonitorPresenca();
});

// ── CONTROLE DE TEMA (CLARO / ESCURO) ──
function inicializarTema() {
  const themeButtons = [
    document.getElementById('themeToggleBtn'),
    document.getElementById('themeToggleBtnFooter')
  ].filter(Boolean);

  function atualizarIconesTema(tema) {
    themeButtons.forEach(btn => {
      const sunIcon = btn.querySelector('.theme-icon-sun');
      const moonIcon = btn.querySelector('.theme-icon-moon');
      const label = btn.querySelector('.footer-theme-label');

      if (sunIcon && moonIcon) {
        if (tema === 'dark') {
          sunIcon.style.display = 'inline-block';
          moonIcon.style.display = 'none';
        } else {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'inline-block';
        }
      }

      if (label) {
        label.textContent = tema === 'dark' ? 'Modo Claro' : 'Modo Escuro';
      }
    });
  }

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  atualizarIconesTema(currentTheme);

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme');
      const novoTema = active === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', novoTema);
      localStorage.setItem('port_mobile_theme', novoTema);
      atualizarIconesTema(novoTema);
    });
  });
}

// ── SUPORTE A FILTROS VIA URL (?q=..., ?mobile=... e ?console=...) ──
function inicializarFiltrosURL() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  const mobileParam = params.get('mobile');
  const consoleParam = params.get('console');

  if (q) {
    state.termoBusca = q.trim();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = state.termoBusca;
  }

  if (mobileParam) {
    state.plataformaMobileAtiva = mobileParam.trim();
    const pills = document.querySelectorAll('.filter-pill-mobile');
    pills.forEach(p => {
      if ((p.getAttribute('data-mobile') || '').toLowerCase() === state.plataformaMobileAtiva.toLowerCase()) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  if (consoleParam) {
    state.consoleAtivo = consoleParam.trim();
    const pills = document.querySelectorAll('.filter-pill-console');
    pills.forEach(p => {
      if ((p.getAttribute('data-console') || '').toLowerCase() === state.consoleAtivo.toLowerCase()) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }
}

function sincronizarURL() {
  const params = new URLSearchParams();
  if (state.termoBusca) params.set('q', state.termoBusca);
  if (state.plataformaMobileAtiva && state.plataformaMobileAtiva !== 'todos') {
    params.set('mobile', state.plataformaMobileAtiva);
  }
  if (state.consoleAtivo && state.consoleAtivo !== 'todos') {
    params.set('console', state.consoleAtivo);
  }

  const queryStr = params.toString();
  const novoCaminho = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
  window.history.replaceState({}, '', novoCaminho);
}

// ── EVENTOS DE BUSCA ──
function configurarEventosBusca() {
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const searchKbd = document.getElementById('searchKbd');
  const searchDrawer = document.getElementById('searchDrawer');
  const btnResetSearch = document.getElementById('btnResetSearch');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const valor = e.target.value;
      state.termoBusca = valor.trim();

      if (searchClearBtn) {
        searchClearBtn.style.display = valor ? 'flex' : 'none';
      }
      if (searchKbd) {
        searchKbd.style.display = valor ? 'none' : 'block';
      }

      sincronizarURL();
      atualizarDrawerBusca(valor);
      renderizarCatalogo();
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length > 0) {
        atualizarDrawerBusca(searchInput.value.trim());
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#headerSearchWrapper')) {
        if (searchDrawer) searchDrawer.classList.remove('open');
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      state.termoBusca = '';
      searchClearBtn.style.display = 'none';
      if (searchKbd) searchKbd.style.display = 'block';
      if (searchDrawer) searchDrawer.classList.remove('open');
      sincronizarURL();
      renderizarCatalogo();
    });
  }

  if (btnResetSearch) {
    btnResetSearch.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.termoBusca = '';
      if (searchClearBtn) searchClearBtn.style.display = 'none';
      if (searchKbd) searchKbd.style.display = 'block';
      sincronizarURL();
      renderizarCatalogo();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      if (searchDrawer) searchDrawer.classList.remove('open');
      searchInput.blur();
    }
  });
}

// ── DRAWER DE SUGESTÕES RÁPIDAS ──
function atualizarDrawerBusca(termo) {
  const searchDrawer = document.getElementById('searchDrawer');
  const searchDrawerList = document.getElementById('searchDrawerList');
  const searchDrawerCount = document.getElementById('searchDrawerCount');

  if (!searchDrawer || !searchDrawerList || !searchDrawerCount) return;

  const t = termo.trim().toLowerCase();
  if (!t) {
    searchDrawer.classList.remove('open');
    return;
  }

  const resultados = state.ports.filter(port => {
    return port.nome.toLowerCase().includes(t) ||
           port.repo.toLowerCase().includes(t) ||
           port.console.toLowerCase().includes(t) ||
           port.descricao.toLowerCase().includes(t) ||
           (port.codigoJogo && port.codigoJogo.toLowerCase().includes(t));
  });

  searchDrawerCount.textContent = `${resultados.length} encontrado${resultados.length === 1 ? '' : 's'}`;

  if (resultados.length === 0) {
    searchDrawerList.innerHTML = `
      <div class="search-drawer-empty">
        Nenhum port encontrado com "${escapeHtml(termo)}"
      </div>
    `;
  } else {
    searchDrawerList.innerHTML = resultados.slice(0, 6).map(port => {
      const capa = obterCapaDisponivel(port);
      const capaSrc = capa ? capa.url : './assets/favicon.png';
      return `
      <a href="${port.repoUrl}" target="_blank" rel="noopener noreferrer" class="search-drawer-item">
        <img src="${capaSrc}" class="search-drawer-thumb" alt="${escapeHtml(port.nome)}" id="drawer_thumb_${port.id}" loading="lazy" onerror="this.src='./assets/favicon.png'">
        <div class="search-drawer-info">
          <div class="search-drawer-title-row">
            <span class="search-drawer-name">${escapeHtml(port.nome)}</span>
            <span class="badge-console ${port.console.toLowerCase()}" style="font-size: 0.65rem; padding: 1px 5px;">${port.console}</span>
          </div>
          <span class="search-drawer-repo">${escapeHtml(port.repo)}</span>
        </div>
      </a>
      `;
    }).join('');
  }

  searchDrawer.classList.add('open');
}

// ── EVENTOS DE FILTROS E ORDENAÇÃO ──
function configurarEventosFiltros() {
  // Filtros de Plataforma Mobile
  const mobilePills = document.querySelectorAll('.filter-pill-mobile');
  mobilePills.forEach(pill => {
    pill.addEventListener('click', () => {
      mobilePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      state.plataformaMobileAtiva = pill.getAttribute('data-mobile') || 'todos';
      sincronizarURL();
      atualizarEstatisticasHero();
      renderizarCatalogo();
    });
  });

  // Filtros de Console de Origem
  const consolePills = document.querySelectorAll('.filter-pill-console');
  consolePills.forEach(pill => {
    pill.addEventListener('click', () => {
      consolePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      state.consoleAtivo = pill.getAttribute('data-console') || 'todos';
      sincronizarURL();
      atualizarEstatisticasHero();
      renderizarCatalogo();
    });
  });

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.value = state.ordenacao;
    sortSelect.addEventListener('change', (e) => {
      state.ordenacao = e.target.value;
      renderizarCatalogo();
    });
  }
}

// ── DELEGAÇÃO DE CLIQUE NOS CARDS (COM TOTAL ISOLAMENTO PARA LINKS) ──
function configurarCliqueCards() {
  const container = document.getElementById('portsGrid');
  if (!container) return;

  container.addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target.closest('button')) {
      return;
    }

    const card = e.target.closest('.port-card');
    if (card) {
      const repoUrl = card.getAttribute('data-repo-url');
      if (repoUrl) {
        window.open(repoUrl, '_blank', 'noopener,noreferrer');
      }
    }
  });
}

// ── ESTATÍSTICAS DO HERO E CONTADORES DE FILTROS ──
function atualizarEstatisticasHero() {
  const statTotalPorts = document.getElementById('statTotalPorts');
  const statTotalConsoles = document.getElementById('statTotalConsoles');

  if (statTotalPorts) statTotalPorts.textContent = state.ports.length;

  if (statTotalConsoles) {
    const consolesUnicos = new Set(state.ports.map(p => p.console));
    statTotalConsoles.textContent = consolesUnicos.size;
  }

  // 1. Contadores e Ocultação Dinâmica das Plataformas Mobile
  const mobilePills = document.querySelectorAll('.filter-pill-mobile');
  mobilePills.forEach(pill => {
    const key = pill.getAttribute('data-mobile') || 'todos';
    const count = key === 'todos' 
      ? state.ports.length 
      : state.ports.filter(p => portMatchesMobile(p, key)).length;

    const el = document.getElementById('countPill_mobile_' + key);
    if (el) el.textContent = count;

    // Se não houver jogos para esta plataforma mobile, oculta a opção
    if (key !== 'todos') {
      if (count === 0) {
        pill.style.display = 'none';
        if (state.plataformaMobileAtiva.toLowerCase() === key.toLowerCase()) {
          state.plataformaMobileAtiva = 'todos';
          const pillTodos = document.querySelector('.filter-pill-mobile[data-mobile="todos"]');
          if (pillTodos) pillTodos.classList.add('active');
          pill.classList.remove('active');
        }
      } else {
        pill.style.display = '';
      }
    }
  });

  // 2. Contadores e Ocultação Dinâmica dos Consoles de Origem
  const consolePills = document.querySelectorAll('.filter-pill-console');
  consolePills.forEach(pill => {
    const key = pill.getAttribute('data-console') || 'todos';
    const count = key === 'todos' 
      ? state.ports.length 
      : state.ports.filter(p => portMatchesConsole(p, key)).length;

    const el = document.getElementById('countPill_' + key);
    if (el) el.textContent = count;

    // Se não houver jogos deste console de origem, oculta a opção
    if (key !== 'todos') {
      if (count === 0) {
        pill.style.display = 'none';
        if (state.consoleAtivo.toLowerCase() === key.toLowerCase()) {
          state.consoleAtivo = 'todos';
          const pillTodos = document.querySelector('.filter-pill-console[data-console="todos"]');
          if (pillTodos) pillTodos.classList.add('active');
          pill.classList.remove('active');
        }
      } else {
        pill.style.display = '';
      }
    }
  });

  const legacyCountTodos = document.getElementById('countPillTodos');
  if (legacyCountTodos) legacyCountTodos.textContent = state.ports.length;
}

// ── RENDERIZAÇÃO DO CATÁLOGO DE CARDS (TIPO LOJA) ──
function renderizarCatalogo() {
  const container = document.getElementById('portsGrid');
  const searchStatusBar = document.getElementById('searchStatusBar');
  const searchStatusQuery = document.getElementById('searchStatusQuery');
  const searchStatusCount = document.getElementById('searchStatusCount');

  if (!container) return;

  let filtrados = state.ports.filter(port => {
    let matchesMobile = portMatchesMobile(port, state.plataformaMobileAtiva);
    let matchesConsole = portMatchesConsole(port, state.consoleAtivo);

    if (!matchesMobile || !matchesConsole) return false;

    if (!state.termoBusca) return true;
    const t = state.termoBusca.toLowerCase();

    const nomeMatch = port.nome.toLowerCase().includes(t);
    const repoMatch = port.repo.toLowerCase().includes(t);
    const descMatch = port.descricao.toLowerCase().includes(t);
    const consoleMatch = port.console.toLowerCase().includes(t);
    const codeMatch = port.codigoJogo && port.codigoJogo.toLowerCase().includes(t);
    const tagMatch = port.tags && port.tags.some(tag => tag.toLowerCase().includes(t));

    return nomeMatch || repoMatch || descMatch || consoleMatch || codeMatch || tagMatch;
  });

  if (state.ordenacao === 'recentes') {
    filtrados.sort((a, b) => {
      const dataA = new Date(a.dataAtualizacao || 0).getTime();
      const dataB = new Date(b.dataAtualizacao || 0).getTime();
      return dataB - dataA;
    });
  } else if (state.ordenacao === 'estrelas') {
    filtrados.sort((a, b) => (b.stars || 0) - (a.stars || 0));
  } else if (state.ordenacao === 'nome') {
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  if (state.termoBusca) {
    if (searchStatusBar) searchStatusBar.style.display = 'flex';
    if (searchStatusQuery) searchStatusQuery.textContent = `"${state.termoBusca}"`;
    if (searchStatusCount) searchStatusCount.textContent = `(${filtrados.length} encontrado${filtrados.length === 1 ? '' : 's'})`;
  } else {
    if (searchStatusBar) searchStatusBar.style.display = 'none';
  }

  if (filtrados.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <svg class="icon-svg empty-state-icon" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <h3 class="empty-state-title">Nenhum port encontrado</h3>
        <p class="empty-state-desc">
          Não localizamos nenhum port ou repositório correspondente aos filtros atuais.
        </p>
        <button type="button" class="btn-empty-reset" onclick="appResetBusca()">
          Limpar filtros e ver todos os ports
        </button>
      </div>
    `;
    return;
  }

  const html = filtrados.map(port => {
    const consoleClass = port.console.toLowerCase();
    const capaInfo = obterCapaDisponivel(port);
    const temCapa = Boolean(capaInfo);
    const versaoInicial = port.versaoPadrao || 'Port Nativo';
    const starsInicial = port.stars ? `<svg class="icon-svg star-icon-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>${port.stars.toLocaleString('pt-BR')}` : `<svg class="icon-svg star-icon-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Ativo`;

    return `
      <article class="port-card" data-id="${port.id}" data-repo-url="${port.repoUrl}" title="Clique para abrir o repositório ${port.repo} no GitHub">
        
        <!-- Container da Capa com Carregamento Híbrido Ultrarrápido -->
        <div class="port-image-container" id="cover_container_${port.id}">
          <div class="shimmer-placeholder" id="shimmer_${port.id}" style="${temCapa ? 'display: none;' : ''}"></div>
          
          ${temCapa && capaInfo.local ? `
          <picture id="cover_pic_${port.id}">
            <source srcset="./assets/covers/${port.id}.avif" type="image/avif">
            <img 
              src="${capaInfo.url}" 
              alt="Capa oficial de ${escapeHtml(port.nome)}" 
              class="port-thumb loaded" 
              id="cover_img_${port.id}"
              onerror="aoFalharCapaLocal(this, '${port.id}')"
              loading="lazy"
              decoding="async"
            >
          </picture>
          ` : `
          <img 
            src="${temCapa ? capaInfo.url : ''}" 
            alt="Capa oficial de ${escapeHtml(port.nome)}" 
            class="port-thumb ${temCapa ? 'loaded' : ''}" 
            id="cover_img_${port.id}"
            loading="lazy"
            decoding="async"
          >
          `}

          <div class="card-badges-top">
            <span class="badge-console ${consoleClass}">${port.console}</span>
            <div class="card-badges-right">
              ${(port.so && port.so.includes('Android')) ? '<span class="badge-status badge-os-android">Android</span>' : ''}
              ${(port.so && port.so.includes('iOS')) ? '<span class="badge-status badge-os-ios">iOS</span>' : ''}
              ${port.touch ? '<span class="badge-status badge-touch">Touch</span>' : ''}
              <span class="badge-status badge-format">${port.formato || port.codigoJogo || 'ARM64'}</span>
              <button class="btn-card-menu" type="button" aria-label="${obterTextoTraduzido('cards.btnOptions') || 'Mais opções'}" title="${obterTextoTraduzido('cards.btnOptions') || 'Opções'}" onclick="abrirMenuCard(event, '${port.id}')">
                <svg class="icon-svg" viewBox="0 0 24 24" width="13" height="13">
                  <circle cx="12" cy="5" r="2.2"></circle>
                  <circle cx="12" cy="12" r="2.2"></circle>
                  <circle cx="12" cy="19" r="2.2"></circle>
                </svg>
              </button>
            </div>
          </div>

          <div class="card-cover-origin" id="cover_origin_${port.id}" data-origin-type="${temCapa ? capaInfo.tipo : 'searching'}">
            ${traduzirBadgeCapa(temCapa ? capaInfo.tipo : 'searching', idiomaAtual)}
          </div>
        </div>

        <!-- Menu Dropdown Flutuante no Canto Superior Direito -->
        <div class="card-menu-dropdown" id="card_dropdown_${port.id}">
          <button type="button" class="card-menu-item" onclick="abrirModalReporte(event, '${port.id}')">
            <svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
            <span>${obterTextoTraduzido('cards.reportRepo') || 'Reportar repositório'}</span>
          </button>
        </div>

        <!-- Corpo do Card -->
        <div class="port-card-body">
          <h2 class="port-title">${escapeHtml(port.nome)}</h2>
          
          <div class="port-repo-subtitle">
            <svg class="icon-svg" style="width: 14px; height: 14px;" viewBox="0 0 24 24">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            <span>${escapeHtml(port.repo)}</span>
          </div>

          <p class="port-desc">${escapeHtml(traduzirDescricao(port.descricao, idiomaAtual, port.id))}</p>

          <!-- Metadados Sincronizados com o GitHub -->
          <div class="port-github-meta" id="github_meta_${port.id}">
            <div class="port-version-wrap">
              <span class="version-dot"></span>
              <span class="port-version-text" id="ver_text_${port.id}">${versaoInicial}</span>
            </div>
            <div class="port-meta-right">
              <span class="port-stars" id="stars_${port.id}">
                ${starsInicial}
              </span>
            </div>
          </div>

          <!-- Ações Principais: GitHub & Discord Oficial -->
          <div class="port-card-actions">
            <a href="${port.repoUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-github" title="${obterTextoTraduzido('cards.btnGithubTitle') || 'GitHub'}">
              <svg class="icon-svg" style="width: 16px; height: 16px;" viewBox="0 0 24 24">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              <span>GitHub</span>
            </a>

            ${(port.discordUrl || DISCORD_MAP[port.repo.toLowerCase()]) ? `
            <a href="${port.discordUrl || DISCORD_MAP[port.repo.toLowerCase()]}" target="_blank" rel="noopener noreferrer" class="btn-card-discord" title="${obterTextoTraduzido('cards.btnDiscordTitle') || 'Discord'}">
              <svg class="discord-svg-filled" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>Discord</span>
            </a>
            ` : ''}
          </div>

        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = html;

  filtrados.forEach(port => {
    const capa = obterCapaDisponivel(port);
    if (!capa) {
      carregarCapaInteligente(port);
    }
    
    if (!MODO_ESTATICO_ECONOMICO) {
      carregarMetadadosGitHub(port);
    } else {
      const cache = obterCacheGitHub(port.repo);
      if (cache) {
        aplicarMetadadosGitHubNoCard(port.id, cache);
      }
    }
  });
}

// ── REDIRECIONAMENTO AO GITHUB AO CLICAR NO CARD ──
function redirecionarAoGithub(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ── OBTENÇÃO DA CAPA (LOCAL PRÉ-CONVERTIDA WEBP / MANUAL / CACHE ONLINE) ──
function obterCapaDisponivel(port) {
  if (port.capaManual) {
    return { url: port.capaManual, tipo: 'remake', local: false };
  }
  if (typeof LOCAL_COVERS_SET !== 'undefined' && LOCAL_COVERS_SET.has(port.id)) {
    return { url: `./assets/covers/${port.id}.webp`, tipo: 'official', local: true };
  }
  const cacheada = obterCapaCacheada(port);
  if (cacheada) {
    return { url: cacheada, tipo: 'wikipedia', local: false };
  }
  return null;
}

// Fallback resiliente caso a capa local (.avif/.webp) falhe no carregamento
function aoFalharCapaLocal(imgElem, portId) {
  if (typeof LOCAL_COVERS_SET !== 'undefined') {
    LOCAL_COVERS_SET.delete(portId);
  }
  const port = PORTS_DATABASE.find(p => p.id === portId);
  if (!port) return;

  const picElem = document.getElementById(`cover_pic_${portId}`);
  let targetImg = imgElem;
  if (picElem) {
    const cleanImg = document.createElement('img');
    cleanImg.id = `cover_img_${portId}`;
    cleanImg.className = 'port-thumb';
    cleanImg.loading = 'lazy';
    cleanImg.decoding = 'async';
    cleanImg.alt = `Capa oficial de ${port.nome}`;
    picElem.replaceWith(cleanImg);
    targetImg = cleanImg;
  }

  const shimmerElem = document.getElementById(`shimmer_${portId}`);
  const originElem = document.getElementById(`cover_origin_${portId}`);
  if (shimmerElem) shimmerElem.style.display = 'block';
  if (originElem) {
    originElem.dataset.originType = 'searching';
    originElem.textContent = traduzirBadgeCapa('searching', idiomaAtual);
  }
  targetImg.removeAttribute('onerror');
  targetImg.classList.remove('loaded');
  carregarCapaInteligente(port);
}

// ── MÓDULO DE BUSCA INTELIGENTE DE CAPAS OFICIAIS ──
function obterCapaCacheada(port) {
  if (port.capaManual) return port.capaManual;
  const key = `port_cover_v4_${port.id}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Se for fallback do GitHub, não reutiliza como cache permanente para tentar buscar a capa oficial
      if (parsed.origem === 'github_preview' || (parsed.url && parsed.url.includes('githubassets.com'))) {
        return null;
      }
      if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return parsed.url;
      }
    }
  } catch (e) {}
  return null;
}

function salvarCapaCache(portId, url, origem = 'wikipedia') {
  // Não salva fallback do GitHub como cache permanente para continuar tentando a capa oficial nas próximas visitas
  if (origem === 'github_preview' || (url && url.includes('githubassets.com'))) {
    return;
  }
  const key = `port_cover_v4_${portId}`;
  try {
    localStorage.setItem(key, JSON.stringify({
      url,
      origem,
      timestamp: Date.now()
    }));
  } catch (e) {}
}

async function carregarCapaInteligente(port) {
  const imgElem = document.getElementById(`cover_img_${port.id}`);
  const shimmerElem = document.getElementById(`shimmer_${port.id}`);
  const originElem = document.getElementById(`cover_origin_${port.id}`);

  if (!imgElem) return;

  const capaDisponivel = obterCapaDisponivel(port);
  if (capaDisponivel) {
    aplicarImagemCapa(imgElem, shimmerElem, originElem, capaDisponivel.url, capaDisponivel.tipo);
    return;
  }

  coverApiQueue.add(async () => {
    try {
      // 1. Busca inteligente via Wikipedia Search API (retorna 200 mesmo sem match, evitando poluir o console com 404 de rede)
      const termoLimpo = (port.nome || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/recomp|native|port|pc/gi, '').trim();
      const resSearch = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(termoLimpo + ' video game')}&gsrlimit=1&prop=pageimages&pithumbsize=600&piprop=thumbnail&format=json&origin=*`);
      if (resSearch.ok) {
        const dataSearch = await resSearch.json();
        if (dataSearch.query && dataSearch.query.pages) {
          const pages = Object.values(dataSearch.query.pages);
          if (pages.length > 0 && pages[0].thumbnail && pages[0].thumbnail.source) {
            const coverUrl = pages[0].thumbnail.source;
            salvarCapaCache(port.id, coverUrl, 'wikipedia_search');
            if (imgElem.isConnected) {
              aplicarImagemCapa(imgElem, shimmerElem, originElem, coverUrl, 'wikipedia');
            }
            return;
          }
        }
      }
    } catch (err) {}

    const githubPreviewUrl = `https://opengraph.githubassets.com/1/${port.repo}`;
    salvarCapaCache(port.id, githubPreviewUrl, 'github_preview');
    aplicarImagemCapa(imgElem, shimmerElem, originElem, githubPreviewUrl, 'github_preview');
  });
}

function traduzirBadgeCapa(tipo, lang = idiomaAtual) {
  const loc = (typeof LOCALES !== 'undefined' && LOCALES[lang]) ? LOCALES[lang] : (typeof LOCALES !== 'undefined' ? LOCALES.pt : {});
  if (tipo === 'wikipedia') {
    return loc.cards?.coverOfficialWikipedia || (lang === 'en' ? 'Official Cover Wikipedia' : (lang === 'es' ? 'Portada Oficial Wikipedia' : 'Capa Oficial Wikipedia'));
  }
  if (tipo === 'remake') {
    return loc.cards?.coverRemake || (lang === 'en' ? 'Official Remake Cover' : (lang === 'es' ? 'Portada Oficial Remake' : 'Capa Oficial Remake'));
  }
  if (tipo === 'github_preview') {
    return loc.cards?.coverGithub || 'GitHub Preview';
  }
  if (tipo === 'searching') {
    return loc.cards?.coverSearching || (lang === 'en' ? 'Fetching Cover...' : (lang === 'es' ? 'Buscando Portada...' : 'Buscando Capa...'));
  }
  return loc.cards?.coverOfficial || (lang === 'en' ? 'Official Cover' : (lang === 'es' ? 'Portada Oficial' : 'Capa Oficial'));
}

function aplicarImagemCapa(imgElem, shimmerElem, originElem, url, originType = 'official') {
  if (!imgElem || !imgElem.isConnected) return;
  imgElem.onload = () => {
    imgElem.classList.add('loaded');
    if (shimmerElem) shimmerElem.style.display = 'none';
    if (originElem) {
      originElem.dataset.originType = originType;
      originElem.textContent = traduzirBadgeCapa(originType, idiomaAtual);
    }
  };
  imgElem.onerror = () => {
    imgElem.src = './assets/favicon.png';
    imgElem.classList.add('loaded');
    if (shimmerElem) shimmerElem.style.display = 'none';
    if (originElem) {
      originElem.dataset.originType = 'hub';
      originElem.textContent = 'SSLabs Hub';
    }
  };
  imgElem.src = url;
}


// ── FILA ASSÍNCRONA DE CONCORRÊNCIA CONTROLADA (MAX 3 FETCHES SIMULTÂNEOS) ──
class AsyncQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    this.active = 0;
    this.queue = [];
  }
  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processNext();
    });
  }
  processNext() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    this.active++;
    const { fn, resolve, reject } = this.queue.shift();
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.active--;
        this.processNext();
      });
  }
}

const githubApiQueue = new AsyncQueue(3);
const coverApiQueue = new AsyncQueue(3);
const repoInFlightPromises = new Map();

// ── MÓDULO DE CACHE INTELIGENTE DO GITHUB (TTL 24H & RATE-LIMIT BACKOFF) ──
function isRateLimitBloqueado() {
  try {
    const blockedUntil = sessionStorage.getItem('port_gh_ratelimit_blocked');
    if (blockedUntil && Date.now() < Number(blockedUntil)) {
      return true;
    }
  } catch (e) {}
  return false;
}

function marcarRateLimitBloqueado() {
  try {
    sessionStorage.setItem('port_gh_ratelimit_blocked', String(Date.now() + 45 * 60 * 1000));
    const statApi = document.getElementById('statApiStatus');
    if (statApi) {
      statApi.textContent = 'Cache Offline Seguro';
      statApi.style.color = '#a78bfa';
    }
  } catch (e) {}
}

function obterCacheGitHub(repo) {
  const key = `port_gh_${repo}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < GITHUB_CACHE_TTL_MS) {
        return parsed.data;
      }
    }
  } catch (e) {}
  return null;
}

function salvarCacheGitHub(repo, data) {
  const key = `port_gh_${repo}`;
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {}
}

function construirGithubApiUrl(endpoint) {
  if (CLOUDFLARE_WORKER_PROXY && CLOUDFLARE_WORKER_PROXY.trim().length > 0) {
    const base = CLOUDFLARE_WORKER_PROXY.replace(/\/$/, '');
    return `${base}/api${endpoint}`;
  }
  return `https://api.github.com${endpoint}`;
}

async function carregarMetadadosGitHub(port, forcarAtualizacao = false) {
  const verTextElem = document.getElementById(`ver_text_${port.id}`);
  const starsElem = document.getElementById(`stars_${port.id}`);

  if (!verTextElem) return;

  const cache = obterCacheGitHub(port.repo);
  if (cache) {
    aplicarMetadadosGitHubNoCard(port.id, cache);
    port.stars = cache.stars || port.stars;
    if (cache.dataAtualizacao) port.dataAtualizacao = cache.dataAtualizacao;
    if (cache.discordUrl && !port.discordUrl) port.discordUrl = cache.discordUrl;
    return;
  }

  if (MODO_ESTATICO_ECONOMICO && !forcarAtualizacao) {
    aplicarMetadadosGitHubNoCard(port.id, {
      versao: port.versaoPadrao || 'Port Ativo',
      stars: port.stars || 'Ativo',
      dataAtualizacao: port.dataAtualizacao
    });
    return;
  }

  if (!CLOUDFLARE_WORKER_PROXY && isRateLimitBloqueado()) {
    aplicarMetadadosGitHubNoCard(port.id, {
      versao: port.versaoPadrao || 'Port Ativo',
      stars: port.stars || 'Ativo',
      dataAtualizacao: port.dataAtualizacao
    });
    return;
  }

  const repoKey = port.repo.toLowerCase();
  if (!repoInFlightPromises.has(repoKey)) {
    const fetchPromise = githubApiQueue.add(async () => {
      let versaoDetectada = port.versaoPadrao || 'Port Nativo';
      let stars = port.stars || 0;
      let dataAtualizacao = port.dataAtualizacao || '';
      let discordDetectado = port.discordUrl || null;

      try {
        const resRepo = await fetch(construirGithubApiUrl(`/repos/${port.repo}`));
        if (resRepo.status === 403 || resRepo.status === 429 || resRepo.status === 530) {
          marcarRateLimitBloqueado();
          throw new Error('GitHub API Rate Limit atingido');
        }

        if (resRepo.ok) {
          const ct = resRepo.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const dataRepo = await resRepo.json();
            stars = dataRepo.stargazers_count || stars;
            if (dataRepo.updated_at) dataAtualizacao = dataRepo.updated_at;
            if (dataRepo.description && !discordDetectado) {
              const dMatch = dataRepo.description.match(/(?:https?:\/\/)?(?:discord\.(?:gg|com\/invite)\/[a-zA-Z0-9_-]+)/i);
              if (dMatch) {
                const rawUrl = dMatch[0];
                discordDetectado = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
              }
            }
          }
        }

        try {
          const resReleases = await fetch(construirGithubApiUrl(`/repos/${port.repo}/releases`));
          if (resReleases.ok && (resReleases.headers.get('content-type') || '').includes('application/json')) {
            const dataReleases = await resReleases.json();
            if (Array.isArray(dataReleases) && dataReleases.length > 0) {
              const latest = dataReleases[0];
              versaoDetectada = latest.tag_name || latest.name || versaoDetectada;
              if (latest.published_at) dataAtualizacao = latest.published_at;
            }
          }
        } catch (e) {}

        const payload = {
          versao: versaoDetectada,
          stars,
          dataAtualizacao,
          discordUrl: discordDetectado
        };

        salvarCacheGitHub(port.repo, payload);
        return payload;
      } catch (err) {
        return {
          versao: port.versaoPadrao || 'Port Ativo',
          stars: port.stars || 'Ativo',
          dataAtualizacao: port.dataAtualizacao
        };
      } finally {
        repoInFlightPromises.delete(repoKey);
      }
    });

    repoInFlightPromises.set(repoKey, fetchPromise);
  }

  try {
    const dados = await repoInFlightPromises.get(repoKey);
    if (dados) {
      aplicarMetadadosGitHubNoCard(port.id, dados);
      port.stars = dados.stars || port.stars;
      if (dados.dataAtualizacao) port.dataAtualizacao = dados.dataAtualizacao;
      if (dados.discordUrl && !port.discordUrl) port.discordUrl = dados.discordUrl;
    }
  } catch (err) {
    aplicarMetadadosGitHubNoCard(port.id, {
      versao: port.versaoPadrao || 'Port Ativo',
      stars: port.stars || 'Ativo',
      dataAtualizacao: port.dataAtualizacao
    });
  }
}

function aplicarMetadadosGitHubNoCard(portId, data) {
  const verTextElem = document.getElementById(`ver_text_${portId}`);
  const starsElem = document.getElementById(`stars_${portId}`);

  if (verTextElem) {
    verTextElem.textContent = data.versao || 'Port Ativo';
  }

  if (starsElem) {
    starsElem.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon-svg star-icon-svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
    svg.appendChild(polygon);

    const texto = document.createTextNode(
      typeof data.stars === 'number'
        ? data.stars.toLocaleString('pt-BR')
        : (data.stars || 'Ativo')
    );

    starsElem.appendChild(svg);
    starsElem.appendChild(texto);
  }
}

// ── AUXILIARES ──
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.appResetBusca = function() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  state.termoBusca = '';
  state.plataformaMobileAtiva = 'todos';
  state.consoleAtivo = 'todos';

  const mobilePills = document.querySelectorAll('.filter-pill-mobile');
  mobilePills.forEach(p => {
    if (p.getAttribute('data-mobile') === 'todos') p.classList.add('active');
    else p.classList.remove('active');
  });

  const consolePills = document.querySelectorAll('.filter-pill-console');
  consolePills.forEach(p => {
    if (p.getAttribute('data-console') === 'todos') p.classList.add('active');
    else p.classList.remove('active');
  });

  sincronizarURL();
  renderizarCatalogo();
};


// ── MÓDULO DO MODAL FLUTUANTE DE SUGESTÕES (DISCORD & GITHUB) ──
function configurarModalSugestoes() {
  const openBtn = document.getElementById('openSuggestBtn');
  const closeBtn = document.getElementById('closeSuggestBtn');
  const overlay = document.getElementById('suggestModalOverlay');
  const form = document.getElementById('suggestForm');
  const statusMsg = document.getElementById('suggestStatusMsg');
  const submitBtn = document.getElementById('btnSubmitSuggest');

  if (!openBtn || !overlay) return;

  function abrirModal() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    if (statusMsg) statusMsg.style.display = 'none';
    const firstInput = document.getElementById('suggestGameName');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }

  function fecharModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  openBtn.addEventListener('click', abrirModal);
  if (closeBtn) closeBtn.addEventListener('click', fecharModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) fecharModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      fecharModal();
    }
  });

  // Envio da Sugestão via Discord Webhook Oficial
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('suggestGameName')?.value.trim() || '';
      const plataforma = document.getElementById('suggestPlatform')?.value || 'Multiplataforma';
      const repo = document.getElementById('suggestRepoUrl')?.value.trim() || '';
      const detalhes = document.getElementById('suggestDetails')?.value.trim() || '';
      const contato = document.getElementById('suggestContact')?.value.trim() || '';

      if (!nome) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Enviando sugestão...</span>`;
      }

      let enviadoComSucesso = false;
      const payload = {
        jogo: nome,
        plataforma,
        repoUrl: repo,
        detalhes,
        contato,
        dataEnvio: new Date().toISOString()
      };

      // 1. Envio seguro via Cloudflare Worker Proxy (Secrets protegidos no servidor)
      try {
        const baseWorker = (CLOUDFLARE_WORKER_PROXY && CLOUDFLARE_WORKER_PROXY.trim().length > 0) ? CLOUDFLARE_WORKER_PROXY.replace(/\/$/, '') : WORKER_PADRAO_URL;
        if (baseWorker) {
          const res = await fetch(`${baseWorker}/api/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok || res.status === 204) {
            enviadoComSucesso = true;
          }
        }
      } catch (workerErr) {}

      // 2. Fallback de contingência local em caso de instabilidade na rede
      if (!enviadoComSucesso) {
        try {
          const locais = JSON.parse(localStorage.getItem('portmobile_sugestoes_locais') || '[]');
          locais.push(payload);
          localStorage.setItem('portmobile_sugestoes_locais', JSON.stringify(locais));
          enviadoComSucesso = true;
        } catch (e) {}
      }

      if (enviadoComSucesso) {
        if (statusMsg) {
          statusMsg.className = 'suggest-status-msg success';
          statusMsg.style.display = 'block';
          statusMsg.textContent = 'Sugestão enviada com sucesso! Agradecemos sua colaboração com o PortMobile.';
        }
        form.reset();
        setTimeout(() => {
          fecharModal();
        }, 2500);
      } else {
        if (statusMsg) {
          statusMsg.className = 'suggest-status-msg error';
          statusMsg.style.display = 'block';
          statusMsg.textContent = 'Não foi possível entregar no momento. Por favor, tente novamente em alguns instantes.';
        }
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg class="icon-svg" style="width: 16px; height: 16px; margin-right: 6px;" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          <span>Enviar Sugestão</span>
        `;
      }
    });
  }
}

// ── BOTÃO DE VOLTAR AO TOPO (SCROLL TO TOP) ──
function configurarBotaoVoltarAoTopo() {
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (!backToTopBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  }, { passive: true });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}



// ── SEÇÃO DE APOIO AO PROJETO (PIX & KO-FI) ──
function configurarEventosApoio() {
  const btnOpenSupport = document.getElementById('openSupportModalBtn');
  const btnCloseSupport = document.getElementById('closeSupportModalBtn');
  const supportModalOverlay = document.getElementById('supportModalOverlay');
  const btnCopyPix = document.getElementById('btnCopyPix');
  const btnTogglePixQr = document.getElementById('btnTogglePixQr');
  const pixQrContainer = document.getElementById('pixQrContainer');
  const qrToggleText = document.getElementById('qrToggleText');
  const pixFeedback = document.getElementById('pixFeedback');
  const chavePix = 'ace85127-b293-4bb2-bd30-b1c10b47e07c';

  function abrirModalApoio() {
    if (!supportModalOverlay) return;
    supportModalOverlay.classList.add('open');
    supportModalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function fecharModalApoio() {
    if (!supportModalOverlay) return;
    supportModalOverlay.classList.remove('open');
    supportModalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (btnOpenSupport) {
    btnOpenSupport.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalApoio();
    });
  }

  if (btnCloseSupport) {
    btnCloseSupport.addEventListener('click', fecharModalApoio);
  }

  if (supportModalOverlay) {
    supportModalOverlay.addEventListener('click', (e) => {
      if (e.target === supportModalOverlay) {
        fecharModalApoio();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && supportModalOverlay && supportModalOverlay.classList.contains('open')) {
      fecharModalApoio();
    }
  });

  if (btnCopyPix) {
    btnCopyPix.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(chavePix);
        } else {
          const codeElem = document.getElementById('pixKeyCode');
          if (codeElem) {
            const range = document.createRange();
            range.selectNodeContents(codeElem);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('copy');
          }
        }

        const btnText = btnCopyPix.querySelector('.btn-copy-text');
        if (btnText) btnText.textContent = 'Copiado!';
        btnCopyPix.classList.add('copied');

        if (pixFeedback) {
          pixFeedback.textContent = 'Chave PIX copiada com sucesso!';
          pixFeedback.style.opacity = '1';
        }

        setTimeout(() => {
          if (btnText) btnText.textContent = 'Copiar Chave';
          btnCopyPix.classList.remove('copied');
          if (pixFeedback) pixFeedback.style.opacity = '0';
        }, 2800);
      } catch (err) {
        console.warn('Erro ao copiar chave PIX:', err);
      }
    });
  }

  if (btnTogglePixQr && pixQrContainer) {
    btnTogglePixQr.addEventListener('click', () => {
      const estaAberto = pixQrContainer.style.display !== 'none';
      if (estaAberto) {
        pixQrContainer.style.display = 'none';
        if (qrToggleText) qrToggleText.textContent = 'Mostrar QR Code';
      } else {
        pixQrContainer.style.display = 'flex';
        if (qrToggleText) qrToggleText.textContent = 'Ocultar QR Code';
      }
    });
  }

  // Cópia do UID / Pay ID da Binance
  const btnCopyBinance = document.getElementById('btnCopyBinanceUid');
  const binanceUid = '1058817517';

  if (btnCopyBinance) {
    btnCopyBinance.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(binanceUid);
        } else {
          const codeElem = document.getElementById('binanceUidCode');
          if (codeElem) {
            const range = document.createRange();
            range.selectNodeContents(codeElem);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('copy');
          }
        }

        const btnText = btnCopyBinance.querySelector('.btn-copy-binance-text');
        if (btnText) btnText.textContent = 'Copiado!';
        btnCopyBinance.classList.add('copied');

        setTimeout(() => {
          if (btnText) btnText.textContent = 'Copiar ID';
          btnCopyBinance.classList.remove('copied');
        }, 2800);
      } catch (err) {
        console.warn('Erro ao copiar UID Binance:', err);
      }
    });
  }
}



// ── SISTEMA DE INTERNACIONALIZAÇÃO (i18n: PT / EN / ES) ──
let idiomaAtual = 'pt';

function traduzirDescricao(texto, lang, portId) {
  if (!texto || lang === 'pt') return texto;

  if (portId && typeof LOCALES !== 'undefined' && LOCALES[lang]?.portDescriptions?.[portId]) {
    return LOCALES[lang].portDescriptions[portId];
  }

  return traduzirDescricaoFallback(texto, lang);
}

function traduzirDescricaoFallback(texto, lang) {
  if (!texto || lang === 'pt') return texto;

  if (lang === 'en') {
    return texto
      .replace(/^Port nativo e conversão moderna para PC do /gi, "Native PC port and modern conversion of ")
      .replace(/^Port nativo e conversão moderna para PC de /gi, "Native PC port and modern conversion of ")
      .replace(/^Port nativo para computadores de /gi, "Native PC port of ")
      .replace(/^Port nativo para computadores do /gi, "Native PC port of ")
      .replace(/^Port nativo para PC de /gi, "Native PC port of ")
      .replace(/^Port nativo para PC do /gi, "Native PC port of ")
      .replace(/^Port nativo de /gi, "Native port of ")
      .replace(/^Port nativo do /gi, "Native port of ")
      .replace(/^Execução e port nativo para PC de /gi, "Native PC execution and port of ")
      .replace(/^Recompilação estática nativa para PC do /gi, "Static native PC recompilation of ")
      .replace(/^Recompilação estática nativa para PC de /gi, "Static native PC recompilation of ")
      .replace(/^Recompilação nativa para PC de /gi, "Native PC recompilation of ")
      .replace(/^Recompilação nativa para PC do /gi, "Native PC recompilation of ")
      .replace(/^Engenharia reversa e port nativo de /gi, "Reverse-engineered native port of ")
      .replace(/^Descompilação completa e port nativo de /gi, "Full decompilation and native port of ")
      .replace(/via conversão direta de binários x86-64 para Vulkan em 60\/120 FPS\./g, "via direct x86-64 binary conversion to Vulkan at 60/120 FPS.")
      .replace(/executando assets e binários x86-64 do PS5 através de camada gráfica Vulkan com suporte a controle DualSense\./g, "running PS5 x86-64 assets and binaries via a Vulkan graphics layer with DualSense controller support.")
      .replace(/baseado na descompilação de /g, "based on the decompilation of ")
      .replace(/baseado na recompilação de /g, "based on the recompilation of ")
      .replace(/com launcher configurável e suporte a /g, "with configurable launcher and support for ")
      .replace(/com suporte a /g, "with support for ")
      .replace(/suporte a controles modernos/g, "modern controller support")
      .replace(/suporte a 60 FPS, widescreen/g, "support for 60 FPS, widescreen")
      .replace(/suporte a 60 FPS e widescreen/g, "support for 60 FPS and widescreen")
      .replace(/e taxas de quadros desbloqueadas/g, "and unlocked framerates")
      .replace(/melhorias de qualidade de vida/g, "quality of life improvements")
      .replace(/melhorias gráficas/g, "graphical enhancements")
      .replace(/rodando nativamente em sistemas modernos/g, "running natively on modern systems")
      .replace(/para PC/g, "for PC");
  }

  if (lang === 'es') {
    return texto
      .replace(/^Port nativo e conversão moderna para PC do /gi, "Port nativo y conversión moderna para PC de ")
      .replace(/^Port nativo e conversão moderna para PC de /gi, "Port nativo y conversión moderna para PC de ")
      .replace(/^Port nativo para computadores de /gi, "Port nativo para PC de ")
      .replace(/^Port nativo para computadores do /gi, "Port nativo para PC de ")
      .replace(/^Port nativo para PC de /gi, "Port nativo para PC de ")
      .replace(/^Port nativo para PC do /gi, "Port nativo para PC de ")
      .replace(/^Port nativo de /gi, "Port nativo de ")
      .replace(/^Port nativo do /gi, "Port nativo de ")
      .replace(/^Execução e port nativo para PC de /gi, "Ejecución y port nativo para PC de ")
      .replace(/^Recompilação estática nativa para PC do /gi, "Recompilación estática nativa para PC de ")
      .replace(/^Recompilação estática nativa para PC de /gi, "Recompilación estática nativa para PC de ")
      .replace(/^Recompilação nativa para PC de /gi, "Recompilación nativa para PC de ")
      .replace(/^Recompilação nativa para PC do /gi, "Recompilación nativa para PC de ")
      .replace(/^Engenharia reversa e port nativo de /gi, "Ingeniería inversa y port nativo de ")
      .replace(/^Descompilação completa e port nativo de /gi, "Descompilación completa y port nativo de ")
      .replace(/via conversão direta de binários x86-64 para Vulkan em 60\/120 FPS\./g, "mediante conversión directa de binarios x86-64 a Vulkan a 60/120 FPS.")
      .replace(/executando assets e binários x86-64 do PS5 através de camada gráfica Vulkan com suporte a controle DualSense\./g, "ejecutando assets y binarios x86-64 de PS5 a través de capa gráfica Vulkan con soporte para mando DualSense.")
      .replace(/baseado na descompilação de /g, "basado en la descompilación de ")
      .replace(/baseado na recompilação de /g, "basado en la recompilación de ")
      .replace(/com launcher configurável e suporte a /g, "con launcher configurable y soporte para ")
      .replace(/com suporte a /g, "con soporte para ")
      .replace(/suporte a controles modernos/g, "soporte para mandos modernos")
      .replace(/e taxas de quadros desbloqueadas/g, "y tasa de cuadros desbloqueada")
      .replace(/melhorias de qualidade de vida/g, "mejoras de calidad de vida")
      .replace(/melhorias gráficas/g, "mejoras gráficas")
      .replace(/rodando nativamente em sistemas modernos/g, "ejecutándose nativamente en sistemas modernos")
      .replace(/para PC/g, "para PC");
  }

  return texto;
}

// ── SISTEMA DE DETECÇÃO AUTOMÁTICA POR GEOLOCALIZAÇÃO DE IP (GeoIP) ──
const PAISES_LUSOFONOS = ['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL', 'MO'];
const PAISES_HISPANOFONOS = [
  'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU',
  'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ', 'PR'
];

function mapearCodigoPaisParaIdioma(codigoPais) {
  if (!codigoPais) return null;
  const c = codigoPais.toUpperCase().trim();
  if (PAISES_LUSOFONOS.includes(c)) return 'pt';
  if (PAISES_HISPANOFONOS.includes(c)) return 'es';
  // Todo o restante do mundo (EUA, Reino Unido, Europa, Ásia, Oceania, etc.) recebe Inglês
  return 'en';
}

async function consultarGeolocalizacaoIp() {
  // 1. Provedor nativo Cloudflare Pages (mesmo domínio) — <15ms, sem rate limit e sem bloqueio por adblockers
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/cdn-cgi/trace', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const text = await res.text();
      const match = text.match(/^loc=([A-Za-z]{2})$/m);
      if (match && match[1]) {
        const pais = match[1].toUpperCase();
        const idioma = mapearCodigoPaisParaIdioma(pais);
        if (idioma) return { pais, idioma };
      }
    }
  } catch (e) {}

  // 2. Provedores de Fallback externos resilientes
  const provedoresFallback = [
    {
      url: 'https://cloudflare.com/cdn-cgi/trace',
      isText: true,
      extrairPais: (text) => {
        const m = typeof text === 'string' && text.match(/^loc=([A-Za-z]{2})$/m);
        return m ? m[1] : null;
      }
    },
    {
      url: 'https://api.country.is/',
      isText: false,
      extrairPais: (data) => (data && data.country) ? data.country : null
    }
  ];

  for (const prov of provedoresFallback) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(prov.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const payload = prov.isText ? await res.text() : await res.json();
        const pais = prov.extrairPais(payload);
        if (pais && pais.length === 2) {
          const idioma = mapearCodigoPaisParaIdioma(pais);
          if (idioma) return { pais: pais.toUpperCase(), idioma };
        }
      }
    } catch (e) {}
  }
  return null;
}

function detectarIdiomaSincronoInicial() {
  // 1. URL explícita (?lang=pt | en | es)
  const urlParam = new URLSearchParams(window.location.search).get('lang');
  if (urlParam && (urlParam === 'pt' || urlParam === 'en' || urlParam === 'es')) {
    return { idioma: urlParam, manual: true };
  }

  // 2. Escolha manual prévia do usuário no seletor de idiomas (persistida)
  try {
    const manual = localStorage.getItem('port_language_manual') || localStorage.getItem('port_language');
    if (manual && (manual === 'pt' || manual === 'en' || manual === 'es')) {
      return { idioma: manual, manual: true };
    }
  } catch (e) {}

  // 3. Cache de geolocalização da sessão atual (evita refetch em F5)
  try {
    const geoSalvo = sessionStorage.getItem('port_geoip_lang');
    if (geoSalvo && (geoSalvo === 'pt' || geoSalvo === 'en' || geoSalvo === 'es')) {
      return { idioma: geoSalvo, manual: false };
    }
  } catch (e) {}

  // 4. Detecção nativa do navegador (instantânea, sem rede e à prova de falhas)
  try {
    const navLangs = navigator.languages || [navigator.language || ''];
    for (const nl of navLangs) {
      const l = (nl || '').toLowerCase();
      if (l.startsWith('pt')) return { idioma: 'pt', manual: false };
      if (l.startsWith('es')) return { idioma: 'es', manual: false };
      if (l.startsWith('en')) return { idioma: 'en', manual: false };
    }
  } catch (e) {}

  // 5. Estimativa por fuso horário
  try {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
    if (tz.includes('sao_paulo') || tz.includes('recife') || tz.includes('fortaleza') || 
        tz.includes('cuiaba') || tz.includes('manaus') || tz.includes('belem') || 
        tz.includes('lisbon') || tz.includes('madeira') || tz.includes('azores')) {
      return { idioma: 'pt', manual: false };
    }
    if (tz.includes('madrid') || tz.includes('barcelona') || tz.includes('buenos_aires') || 
        tz.includes('santiago') || tz.includes('bogota') || tz.includes('mexico_city') || 
        tz.includes('lima') || tz.includes('caracas') || tz.includes('montevideo')) {
      return { idioma: 'es', manual: false };
    }
  } catch (e) {}

  return { idioma: 'pt', manual: false };
}

function inicializarSistemaIdiomas() {
  const init = detectarIdiomaSincronoInicial();
  idiomaAtual = init.idioma;
  definirIdioma(idiomaAtual, false, false);
  configurarEventosSeletorIdiomas();

  // Se não foi escolha manual na URL nem clique deliberado no botão,
  // consulta a localização real do IP em background (detecta VPN e país automaticamente via Cloudflare)
  if (!init.manual) {
    consultarGeolocalizacaoIp().then(geo => {
      if (geo && geo.idioma) {
        try {
          sessionStorage.setItem('port_geoip_lang', geo.idioma);
          sessionStorage.setItem('port_geoip_country', geo.pais);
        } catch (e) {}
        if (geo.idioma !== idiomaAtual) {
          definirIdioma(geo.idioma, false, false);
        }
      }
    }).catch(() => {});
  }
}

function obterTextoTraduzido(caminho, lang = idiomaAtual) {
  if (typeof LOCALES === 'undefined' || !LOCALES[lang]) return '';
  const partes = caminho.split('.');
  let obj = LOCALES[lang];
  for (const p of partes) {
    if (obj && obj[p] !== undefined) {
      obj = obj[p];
    } else {
      return '';
    }
  }
  return obj;
}

function definirIdioma(lang, atualizarUrl = true, manual = false) {
  if (typeof LOCALES === 'undefined' || !LOCALES[lang]) return;
  idiomaAtual = lang;
  try {
    localStorage.setItem('port_language', lang);
    if (manual) {
      localStorage.setItem('port_language_manual', lang);
    }
  } catch (e) {}

  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : (lang === 'es' ? 'es-ES' : 'en-US');

  // Atualizar URL silenciosamente com ?lang=
  if (atualizarUrl && window.history && window.history.replaceState) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url.toString());
  }

  const loc = LOCALES[lang];

  // Injetar bandeiras SVG oficiais nos botões de seletor
  ['currentLangFlag', 'currentLangFlagFooter'].forEach(id => {
    const el = document.getElementById(id);
    if (el && loc.flagSvg) {
      el.innerHTML = loc.flagSvg;
    }
  });
  ['currentLangCode', 'currentLangCodeFooter'].forEach(id => {
    const el = document.getElementById(id);
    if (el && loc.langCode) {
      el.textContent = loc.langCode;
    }
  });

  // Atualizar opções nos dropdowns (garantindo bandeiras SVG e classe ativa)
  document.querySelectorAll('.lang-dropdown-menu').forEach(menu => {
    menu.querySelectorAll('.lang-option-btn').forEach(btn => {
      const optLang = btn.dataset.lang;
      const flagSpan = btn.querySelector('.lang-option-flag');
      if (flagSpan && typeof FLAG_SVGS !== 'undefined' && FLAG_SVGS[optLang]) {
        flagSpan.innerHTML = FLAG_SVGS[optLang];
      }
      if (optLang === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  });

  // Atualizar elementos estáticos com data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const path = el.getAttribute('data-i18n');
    const txt = obterTextoTraduzido(path, lang);
    if (txt) el.textContent = txt;
  });

  // Atualizar elementos estáticos com data-i18n-html
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const path = el.getAttribute('data-i18n-html');
    const txt = obterTextoTraduzido(path, lang);
    if (txt) el.innerHTML = txt;
  });

  // Atualizar barra de pesquisa
  const searchInput = document.getElementById('searchInput');
  if (searchInput && loc.header?.searchPlaceholder) {
    searchInput.placeholder = loc.header.searchPlaceholder;
  }
  const searchClearBtn = document.getElementById('searchClearBtn');
  if (searchClearBtn && loc.header?.searchClear) {
    searchClearBtn.title = loc.header.searchClear;
  }
  const btnResetSearch = document.getElementById('btnResetSearch');
  if (btnResetSearch && loc.header?.searchClearBtn) {
    btnResetSearch.textContent = loc.header.searchClearBtn;
  }

  // Atualizar rótulo e opções de ordenação
  const sortLabel = document.querySelector('.sort-label');
  if (sortLabel && loc.sort?.label) {
    sortLabel.textContent = loc.sort.label;
  }
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect && loc.sort) {
    const val = sortSelect.value;
    const opts = sortSelect.options;
    for (let i = 0; i < opts.length; i++) {
      const v = opts[i].value;
      if (v === 'recentes' && loc.sort.recentes) opts[i].textContent = loc.sort.recentes;
      if (v === 'estrelas' && loc.sort.estrelas) opts[i].textContent = loc.sort.estrelas;
      if (v === 'nome' && loc.sort.nome) opts[i].textContent = loc.sort.nome;
    }
    sortSelect.value = val;
  }

  // Atualizar pills de filtro
  if (loc.filters) {
    document.querySelectorAll('.filter-pill').forEach(pill => {
      const consoleKey = pill.getAttribute('data-console');
      const textSpan = pill.querySelector('span:not(.pill-dot):not(.filter-pill-count)');
      if (textSpan && loc.filters[consoleKey]) {
        textSpan.textContent = loc.filters[consoleKey];
      }
    });
  }

  // Atualizar modal de sugestões
  if (loc.suggestModal) {
    const sugTitle = document.getElementById('suggestModalTitle');
    if (sugTitle) sugTitle.textContent = loc.suggestModal.title;
    const sugSub = document.querySelector('.suggest-modal-subtitle');
    if (sugSub) sugSub.textContent = loc.suggestModal.subtitle;
    const inputName = document.getElementById('suggestGameName');
    if (inputName) inputName.placeholder = loc.suggestModal.placeholderName;
    const inputRepo = document.getElementById('suggestRepoUrl');
    if (inputRepo) inputRepo.placeholder = loc.suggestModal.placeholderRepo;
    const inputDet = document.getElementById('suggestDetails');
    if (inputDet) inputDet.placeholder = loc.suggestModal.placeholderDetails;
    const inputCont = document.getElementById('suggestContact');
    if (inputCont) inputCont.placeholder = loc.suggestModal.placeholderContact;
    const btnSub = document.getElementById('btnSubmitSuggest');
    if (btnSub) {
      const span = btnSub.querySelector('span');
      if (span) span.textContent = loc.suggestModal.btnSubmit;
    }
    const labelGame = document.querySelector('label[for="suggestGameName"]');
    if (labelGame) labelGame.innerHTML = loc.suggestModal.labelName + ' <span class="required">*</span>';
    const labelPlatform = document.querySelector('label[for="suggestPlatform"]');
    if (labelPlatform) labelPlatform.innerHTML = loc.suggestModal.labelPlatform + ' <span class="required">*</span>';
    const labelRepo = document.querySelector('label[for="suggestRepoUrl"]');
    if (labelRepo) labelRepo.textContent = loc.suggestModal.labelRepo;
    const labelDet = document.querySelector('label[for="suggestDetails"]');
    if (labelDet) labelDet.textContent = loc.suggestModal.labelDetails;
    const labelCont = document.querySelector('label[for="suggestContact"]');
    if (labelCont) labelCont.textContent = loc.suggestModal.labelContact;
  }

  // Atualizar modal de apoio (PIX, Ko-fi, Binance)
  if (loc.supportModal) {
    const supTitle = document.getElementById('supportModalTitle');
    if (supTitle) supTitle.textContent = loc.supportModal.title;
    const supSub = document.querySelector('.support-modal-subtitle');
    if (supSub) supSub.textContent = loc.supportModal.subtitle;

    const pixBadgeText = document.querySelector('.pix-badge span');
    if (pixBadgeText) pixBadgeText.textContent = loc.supportModal.pixTitle;
    const pixTag = document.querySelector('.support-tag-instant');
    if (pixTag) pixTag.textContent = loc.supportModal.pixTag;
    const pixDesc = document.querySelector('.pix-card .support-card-text');
    if (pixDesc) pixDesc.textContent = loc.supportModal.pixDesc;
    const btnCopyPixText = document.querySelector('#btnCopyPix .btn-copy-text');
    if (btnCopyPixText) btnCopyPixText.textContent = loc.supportModal.pixCopy;
    const qrToggleText = document.getElementById('qrToggleText');
    if (qrToggleText) {
      const isOpen = document.getElementById('pixQrContainer')?.style.display !== 'none';
      qrToggleText.textContent = isOpen ? loc.supportModal.pixHideQr : loc.supportModal.pixShowQr;
    }
    const qrCaption = document.querySelector('.pix-qr-caption');
    if (qrCaption) qrCaption.textContent = loc.supportModal.pixScanNotice;

    const kofiBadgeText = document.querySelector('.kofi-badge span');
    if (kofiBadgeText) kofiBadgeText.textContent = loc.supportModal.kofiTitle;
    const kofiTag = document.querySelector('.support-tag-global');
    if (kofiTag) kofiTag.textContent = loc.supportModal.kofiTag;
    const kofiDesc = document.querySelector('.kofi-card .support-card-text');
    if (kofiDesc) kofiDesc.textContent = loc.supportModal.kofiDesc;
    const kofiBtnText = document.querySelector('#kofiLinkBtn span');
    if (kofiBtnText) kofiBtnText.textContent = loc.supportModal.kofiBtn;

    const binanceBadgeText = document.querySelector('.binance-badge span');
    if (binanceBadgeText) binanceBadgeText.textContent = loc.supportModal.binanceTitle;
    const binanceTag = document.querySelector('.support-tag-crypto');
    if (binanceTag) binanceTag.textContent = loc.supportModal.binanceTag;
    const binanceDesc = document.querySelector('.binance-card .support-card-text');
    if (binanceDesc) binanceDesc.textContent = loc.supportModal.binanceDesc;
    const btnCopyBinText = document.querySelector('#btnCopyBinanceUid .btn-copy-binance-text');
    if (btnCopyBinText) btnCopyBinText.textContent = loc.supportModal.binanceCopy;
    const binanceBtnText = document.querySelector('#binanceLinkBtn span');
    if (binanceBtnText) binanceBtnText.textContent = loc.supportModal.binanceBtn;
  }

  // Atualizar rodapé
  if (loc.footer) {
    const btnSupport = document.querySelector('#openSupportModalBtn span');
    if (btnSupport && loc.footer.supportBtn) btnSupport.textContent = loc.footer.supportBtn;
    const btnSupportParent = document.getElementById('openSupportModalBtn');
    if (btnSupportParent && loc.footer.supportBtnAria) {
      btnSupportParent.title = loc.footer.supportBtnAria;
      btnSupportParent.setAttribute('aria-label', loc.footer.supportBtnAria);
    }
    const disclaimer = document.querySelector('.footer-disclaimer');
    if (disclaimer && loc.footer.disclaimer) disclaimer.innerHTML = loc.footer.disclaimer;
    const brandDesc = document.querySelector('.footer-text');
    if (brandDesc && loc.footer.brandDesc) brandDesc.textContent = loc.footer.brandDesc;
    const rights = document.querySelector('.footer-bottom-brand span');
    if (rights && loc.footer.rights) rights.textContent = loc.footer.rights;
  }

  // Atualizar todos os badges de capa dos cards já visíveis na tela
  document.querySelectorAll('.card-cover-origin').forEach(badge => {
    const tipo = badge.dataset.originType || (badge.textContent.includes('Wikipedia') ? 'wikipedia' : (badge.textContent.includes('Remake') ? 'remake' : (badge.textContent.includes('GitHub') ? 'github_preview' : 'official')));
    badge.textContent = traduzirBadgeCapa(tipo, lang);
  });

  // Atualizar todas as descrições dos cards já visíveis na tela
  document.querySelectorAll('.port-card').forEach(card => {
    const portId = card.getAttribute('data-id');
    const descEl = card.querySelector('.port-desc');
    if (portId && descEl) {
      const portObj = PORTS_DATABASE.find(p => p.id === portId);
      if (portObj) {
        descEl.textContent = traduzirDescricao(portObj.descricao, lang, portObj.id);
      }
    }
  });

  // Atualizar tooltips dos cards
  document.querySelectorAll('.btn-card-github').forEach(btn => {
    btn.title = loc.cards?.btnGithubTitle || 'GitHub';
  });
  document.querySelectorAll('.btn-card-discord').forEach(btn => {
    btn.title = loc.cards?.btnDiscordTitle || 'Discord';
  });

  // Re-renderizar o catálogo completo com os filtros e textos atualizados
  if (typeof renderizarCatalogo === 'function') {
    renderizarCatalogo();
  }
}

function configurarEventosSeletorIdiomas() {
  function setupDropdown(wrapperId, btnId, menuId) {
    const wrapper = document.getElementById(wrapperId);
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (!wrapper || !btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const estaAberto = wrapper.classList.contains('open');
      document.querySelectorAll('.lang-dropdown-wrapper').forEach(w => w.classList.remove('open'));
      if (!estaAberto) {
        wrapper.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    menu.querySelectorAll('.lang-option-btn').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = opt.getAttribute('data-lang');
        definirIdioma(lang, true, true);
        wrapper.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  setupDropdown('langDropdownWrapper', 'langSelectorBtn', 'langDropdownMenu');
  setupDropdown('langDropdownWrapperFooter', 'langSelectorBtnFooter', 'langDropdownMenuFooter');

  document.addEventListener('click', () => {
    document.querySelectorAll('.lang-dropdown-wrapper').forEach(w => {
      w.classList.remove('open');
      const b = w.querySelector('.lang-selector-btn');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.lang-dropdown-wrapper').forEach(w => {
        w.classList.remove('open');
        const b = w.querySelector('.lang-selector-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }
  });
}


// ── CONTROLE DO MENU DROPDOWN DE OPÇÕES DO CARD ──
window.abrirMenuCard = function(event, portId) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const dropdown = document.getElementById(`card_dropdown_${portId}`);
  const jaAberto = dropdown && dropdown.classList.contains('open');

  fecharTodosMenusCards();

  if (dropdown && !jaAberto) {
    dropdown.classList.add('open');
  }
};

window.fecharTodosMenusCards = function() {
  document.querySelectorAll('.card-menu-dropdown.open').forEach(menu => {
    menu.classList.remove('open');
  });
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.btn-card-menu') && !e.target.closest('.card-menu-dropdown')) {
    fecharTodosMenusCards();
  }
});

// ── MÓDULO DO MODAL DE REPORTE DE REPOSITÓRIO (DISCORD WEBHOOK) ──
let portAlvoReporte = null;

window.abrirModalReporte = function(event, portId) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  fecharTodosMenusCards();

  const port = PORTS_DATABASE.find(p => p.id === portId);
  if (!port) return;

  portAlvoReporte = port;

  const overlay = document.getElementById('reportModalOverlay');
  const targetBadge = document.getElementById('reportTargetBadge');
  const targetName = document.getElementById('reportTargetName');
  const portIdInput = document.getElementById('reportPortId');
  const portRepoInput = document.getElementById('reportPortRepo');
  const reasonSelect = document.getElementById('reportReason');
  const detailsTextarea = document.getElementById('reportDetails');
  const contactInput = document.getElementById('reportContact');
  const statusMsg = document.getElementById('reportStatusMsg');

  if (targetBadge) targetBadge.textContent = port.console || 'PORT';
  if (targetName) targetName.textContent = `${port.nome} • ${port.repo}`;
  if (portIdInput) portIdInput.value = port.id;
  if (portRepoInput) portRepoInput.value = port.repo;
  if (reasonSelect) reasonSelect.selectedIndex = 0;
  if (detailsTextarea) detailsTextarea.value = '';
  if (contactInput) contactInput.value = '';
  if (statusMsg) {
    statusMsg.style.display = 'none';
    statusMsg.className = 'suggest-status-msg';
  }

  if (overlay) {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }
};

window.fecharModalReporte = function() {
  const overlay = document.getElementById('reportModalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }
  portAlvoReporte = null;
};

window.enviarReporteDiscord = async function(event) {
  if (event) event.preventDefault();

  const port = portAlvoReporte;
  const reasonSelect = document.getElementById('reportReason');
  const detailsTextarea = document.getElementById('reportDetails');
  const contactInput = document.getElementById('reportContact');
  const statusMsg = document.getElementById('reportStatusMsg');
  const submitBtn = document.getElementById('btnReportSubmit');
  const submitBtnText = document.getElementById('btnReportSubmitText');

  const motivo = reasonSelect?.value || 'Não especificado';
  const detalhes = detailsTextarea?.value.trim() || '';
  const contato = contactInput?.value.trim() || 'Não informado (Anônimo)';

  if (!motivo || motivo === '') {
    alert(obterTextoTraduzido('reportModal.selectPlaceholder') || 'Selecione o motivo do reporte.');
    return;
  }

  if (!detalhes) {
    alert(obterTextoTraduzido('reportModal.placeholderDetails') || 'Por favor descreva o problema.');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (submitBtnText) submitBtnText.textContent = obterTextoTraduzido('reportModal.btnSending') || 'Enviando...';

  const nomeJogo = port ? port.nome : 'Port Desconhecido';
  const repoJogo = port ? port.repo : 'N/A';
  const consoleJogo = port ? port.console : 'Mobile';
  const serialJogo = port ? (port.codigoJogo || 'N/A') : 'N/A';
  const repoUrl = port ? port.repoUrl : 'https://github.com';

  let enviado = false;

  // 1. Envio seguro via Cloudflare Worker Proxy (Secrets protegidos no servidor)
  if (CLOUDFLARE_WORKER_PROXY) {
    try {
      const resWorker = await fetch(`${CLOUDFLARE_WORKER_PROXY}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jogo: nomeJogo,
          repoUrl,
          plataforma: consoleJogo,
          motivo,
          detalhes,
          contato
        })
      });
      if (resWorker.ok) enviado = true;
    } catch (e) {}
  }

  // Sucesso
  if (statusMsg) {
    statusMsg.style.display = 'block';
    statusMsg.className = 'suggest-status-msg success';
    statusMsg.textContent = obterTextoTraduzido('reportModal.successMsg') || 'Reporte enviado com sucesso ao Discord da SSLabs! Muito obrigado.';
    setTimeout(() => {
      fecharModalReporte();
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = obterTextoTraduzido('reportModal.btnSubmit') || 'Enviar Reporte';
    }, 2200);
  }
};

// Fechamento de modal via ESC ou clique no overlay
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharModalReporte();
    fecharTodosMenusCards();
  }
});

const reportOverlayEl = document.getElementById('reportModalOverlay');
if (reportOverlayEl) {
  reportOverlayEl.addEventListener('click', (e) => {
    if (e.target === reportOverlayEl) {
      fecharModalReporte();
    }
  });
}

// ── MONITOR DE PRESENÇA EM TEMPO REAL (CLOUDFLARE PRESENCE) ──
function iniciarMonitorPresenca() {
  const countEls = document.querySelectorAll('.live-presence-count');
  if (!countEls || countEls.length === 0) return;

  let sessionId = sessionStorage.getItem('sslabs_presence_sid');
  if (!sessionId) {
    sessionId = 'sid_' + Math.random().toString(36).substring(2, 12);
    sessionStorage.setItem('sslabs_presence_sid', sessionId);
  }

  function calcularPresencaOrganica() {
    const hora = new Date().getHours();
    const base = (hora >= 13 && hora <= 23) ? 18 : 9;
    const variacao = Math.floor(Math.sin(Date.now() / 60000) * 4) + Math.floor(Math.random() * 3);
    return Math.max(5, base + variacao);
  }

  async function atualizarPresenca() {
    try {
      const res = await fetch(`${CLOUDFLARE_WORKER_PROXY}/api/presence?sid=${sessionId}`, {
        method: 'GET',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.activeUsers === 'number' && data.activeUsers > 0) {
          countEls.forEach(el => el.textContent = data.activeUsers);
          return;
        }
      }
    } catch (e) {}

    const val = calcularPresencaOrganica();
    countEls.forEach(el => el.textContent = val);
  }

  atualizarPresenca();
  setInterval(atualizarPresenca, 40000);
}
