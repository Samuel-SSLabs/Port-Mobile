#!/usr/bin/env node

/**
 * ============================================================================
 * ADICIONADOR INTELIGENTE DE PORTS — SSLABS PORTMOBILE
 * ============================================================================
 * Adiciona um jogo sugerido de forma 100% automatizada a partir do repositório:
 *  1. Busca metadados oficiais no GitHub (nome, estrelas, release, descrição)
 *  2. Detecta a plataforma/console original e código serial oficial
 *  3. Baixa e converte a capa em alta definição para WebP e AVIF
 *  4. Insere no PORTS_DATABASE (app.js) e atualiza o manifesto de capas
 *  5. Registra traduções em locales.js
 * 
 * Uso:
 *   node scripts/adicionar-port.js "https://github.com/usuario/repo"
 *   node scripts/adicionar-port.js "usuario/repo"
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const APP_JS_PATH = path.join(ROOT_DIR, 'app.js');
const LOCALES_JS_PATH = path.join(ROOT_DIR, 'locales.js');
const COVERS_DIR = path.join(ROOT_DIR, 'assets', 'covers');
const MANIFEST_PATH = path.join(COVERS_DIR, 'manifest.json');

function extrairOwnerRepo(input) {
  if (!input) return null;
  const limpo = input.trim().replace(/\/$/, '');
  const match = limpo.match(/(?:github\.com\/)?([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  return null;
}

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'SSLabs-Port-Adder/1.0',
        ...headers
      },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, headers));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} ao acessar ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout ao acessar ${url}`));
    });
  });
}

async function fetchJson(url, headers = {}) {
  const buf = await fetchUrl(url, headers);
  return JSON.parse(buf.toString('utf8'));
}

async function fetchGitHubApi(endpoint) {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetchJson(`https://api.github.com${endpoint}`, headers);
}

function adivinharConsole(name, desc = '', topics = []) {
  const t = `${name} ${desc} ${topics.join(' ')}`.toLowerCase();
  if (/\b(ps5|playstation\s*5)\b/i.test(t)) return { code: 'PS5', name: 'PlayStation 5' };
  if (/\b(ps4|playstation\s*4)\b/i.test(t)) return { code: 'PS4', name: 'PlayStation 4' };
  if (/\b(ps3|playstation\s*3|ps3recomp)\b/i.test(t)) return { code: 'PS3', name: 'PlayStation 3' };
  if (/\b(ps2|playstation\s*2|ps2recomp)\b/i.test(t)) return { code: 'PS2', name: 'PlayStation 2' };
  if (/\b(ps1|playstation\s*1|psx|ps1recomp)\b/i.test(t)) return { code: 'PS1', name: 'PlayStation 1' };
  if (/\b(psp|playstation portable)\b/i.test(t)) return { code: 'PSP', name: 'PlayStation Portable' };
  if (/\b(gamecube|game cube|wii)\b/i.test(t)) return { code: 'GC', name: 'GameCube' };
  if (/\b(n64|nintendo\s*64|n64recomp)\b/i.test(t)) return { code: 'N64', name: 'Nintendo 64' };
  if (/\b(switch|nintendo\s*switch)\b/i.test(t)) return { code: 'Switch', name: 'Nintendo Switch' };
  if (/\b(xbox\s*360|x360|xenon|xenonrecomp)\b/i.test(t)) return { code: 'XBOX360', name: 'Xbox 360' };
  if (/\b(xbox\s*one|xone|xbox series)\b/i.test(t)) return { code: 'XONE', name: 'Xbox One' };
  if (/\b(xbox)\b/i.test(t)) return { code: 'XBOX', name: 'Xbox Clássico' };
  return { code: 'PC', name: 'PC Nativo' };
}

const ACRONYMS_MAP = {
  gow: 'God of War',
  mgs: 'Metal Gear Solid',
  rdr: 'Red Dead Redemption',
  gta: 'Grand Theft Auto',
  re: 'Resident Evil',
  sh: 'Silent Hill',
  ff: 'Final Fantasy',
  dmc: 'Devil May Cry',
  nfsu: 'Need for Speed Underground',
  nfs: 'Need for Speed'
};

function formatarNomeJogo(repoName, repoDesc = '') {
  // Limpar prefixos e sufixos comuns do nome do repositório
  let n = repoName
    .replace(/[-_]pc$/i, '')
    .replace(/[-_]recomp$/i, '')
    .replace(/[-_]port$/i, '')
    .replace(/[-_]decomp$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();

  // Substituir siglas comuns no início (gow -> God of War, etc.)
  const words = n.split(/\s+/);
  if (words.length > 0 && ACRONYMS_MAP[words[0].toLowerCase()]) {
    words[0] = ACRONYMS_MAP[words[0].toLowerCase()];
    return words.join(' ');
  }

  // Capitalizar palavras
  return words
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function getMagickCommand() {
  try {
    execSync('magick -version', { stdio: 'ignore' });
    return 'magick';
  } catch (e) {
    try {
      execSync('convert -version', { stdio: 'ignore' });
      return 'convert';
    } catch (e2) {
      return null;
    }
  }
}

async function baixarCapaWikipedia(nomeJogo, idJogo, repoSlug = null) {
  const webpPath = path.join(COVERS_DIR, `${idJogo}.webp`);
  const avifPath = path.join(COVERS_DIR, `${idJogo}.avif`);
  const tempInput = path.join(COVERS_DIR, `temp_${idJogo}.jpg`);

  try {
    const tituloBusca = encodeURIComponent(nomeJogo.replace(/\s+/g, '_'));
    let imageUrl = null;

    // 1. Wikipedia Summary API
    try {
      const summary = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${tituloBusca}`);
      if (summary.originalimage && summary.originalimage.source) {
        imageUrl = summary.originalimage.source;
      } else if (summary.thumbnail && summary.thumbnail.source) {
        imageUrl = summary.thumbnail.source;
      }
    } catch (e) {}

    // 2. Wikipedia Search API
    if (!imageUrl) {
      try {
        const search = await fetchJson(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(nomeJogo + ' video game')}&gsrlimit=1&prop=pageimages&pithumbsize=800&piprop=thumbnail|original&format=json&origin=*`);
        if (search.query && search.query.pages) {
          const first = Object.values(search.query.pages)[0];
          if (first && first.original) imageUrl = first.original.source;
          else if (first && first.thumbnail) imageUrl = first.thumbnail.source;
        }
      } catch (e) {}
    }

    // 3. Fallback: GitHub OpenGraph Preview Card
    if (!imageUrl && repoSlug) {
      imageUrl = `https://opengraph.githubassets.com/1/${repoSlug}`;
    }

    if (imageUrl) {
      console.log(`  -> Baixando capa oficial: ${imageUrl}`);
      const buf = await fetchUrl(imageUrl);
      fs.writeFileSync(tempInput, buf);

      const cmd = getMagickCommand();
      if (!cmd) {
        console.warn('  ⚠️ Nem "magick" nem "convert" foram encontrados no PATH.');
        fs.unlinkSync(tempInput);
        return false;
      }

      let gerouWebp = false;
      try {
        execSync(`${cmd} "${tempInput}" -resize "600x>" -quality 82 -strip "${webpPath}"`, { stdio: 'ignore' });
        gerouWebp = fs.existsSync(webpPath);
      } catch (errWebp) {
        console.warn(`  ⚠️ Erro ao gerar WebP: ${errWebp.message}`);
      }

      try {
        execSync(`${cmd} "${tempInput}" -resize "600x>" -quality 65 -strip "${avifPath}"`, { stdio: 'ignore' });
      } catch (errAvif) {}

      fs.unlinkSync(tempInput);
      return gerouWebp;
    }
  } catch (err) {
    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    console.warn(`  ⚠️ Falha ao baixar capa oficial: ${err.message}`);
  }
  return false;
}

async function adicionarPort(argInput) {
  const repoSlug = extrairOwnerRepo(argInput);
  if (!repoSlug) {
    console.error('[Erro] Por favor informe o repositório no formato "usuario/repo" ou URL do GitHub.');
    process.exit(1);
  }

  console.log('================================================================');
  console.log(`   ADICIONANDO PORT: ${repoSlug}`);
  console.log('================================================================\n');

  console.log('1. Consultando metadados na API do GitHub...');
  let repoData;
  try {
    repoData = await fetchGitHubApi(`/repos/${repoSlug}`);
  } catch (e) {
    console.error(`[Erro] Repositório não encontrado ou inacessível no GitHub: ${e.message}`);
    process.exit(1);
  }

  let latestVersion = 'Port Nativo';
  let dataRelease = repoData.updated_at || new Date().toISOString();

  try {
    const releases = await fetchGitHubApi(`/repos/${repoSlug}/releases`);
    if (Array.isArray(releases) && releases.length > 0) {
      latestVersion = releases[0].tag_name || releases[0].name || latestVersion;
      if (releases[0].published_at) dataRelease = releases[0].published_at;
    }
  } catch (e) {}

  const consoleDetectado = adivinharConsole(repoData.name, repoData.description, repoData.topics);
  const nomeJogo = formatarNomeJogo(repoData.name, repoData.description);
    const cleanBase = repoData.name.toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/[-_]pc$/, '')
    .replace(/[-_]recomp$/, '');
  
  let idBase = cleanBase;
  if (/^gow/i.test(idBase)) {
    idBase = idBase.replace(/^gow/, 'god-of-war');
  }
  const idJogo = `${idBase}-pc`;

  console.log(`   Nome detectado:  ${nomeJogo}`);
  console.log(`   Console:         ${consoleDetectado.name} (${consoleDetectado.code})`);
  console.log(`   Estrelas:        ${repoData.stargazers_count}`);
  console.log(`   Versão:          ${latestVersion}`);
  console.log(`   ID do Port:      ${idJogo}\n`);

  console.log('2. Baixando e convertendo capas (WebP + AVIF)...');
  const temCapaLocal = await baixarCapaWikipedia(nomeJogo, idJogo, repoSlug);

  // 3. Montar objeto do Port
  const tagsList = [
    consoleDetectado.code,
    'AutoDiscover',
    repoData.language || 'C++',
    'Port Nativo'
  ];

  const novoPort = {
    id: idJogo,
    nome: nomeJogo,
    console: consoleDetectado.code,
    consoleNome: consoleDetectado.name,
    codigoJogo: `${consoleDetectado.code}-PORT`,
    status: 'Port Nativo PC',
    statusTipo: 'playable',
    repo: repoSlug,
    repoUrl: repoData.html_url,
    descricao: repoData.description || `Port nativo para PC de ${nomeJogo} rodando com alta performance e suporte nativo a hardware moderno.`,
    termoBuscaCapa: nomeJogo.replace(/\s+/g, '_'),
    capaManual: null,
    dataAtualizacao: dataRelease,
    stars: repoData.stargazers_count,
    versaoPadrao: latestVersion,
    tags: tagsList
  };

  // 4. Inserir em app.js
  console.log('3. Atualizando PORTS_DATABASE em app.js...');
  let appJs = fs.readFileSync(APP_JS_PATH, 'utf8');
  const matchPorts = appJs.match(/const PORTS_DATABASE = (\[[\s\S]*?\n\];)/);
  if (!matchPorts) {
    console.error('[Erro] Não foi possível localizar PORTS_DATABASE em app.js');
    process.exit(1);
  }

  const database = new Function(`return ${matchPorts[1]}`)();
  const indexExistente = database.findIndex(p => p.id === idJogo || p.repo.toLowerCase() === repoSlug.toLowerCase());

  if (indexExistente >= 0) {
    console.log(`   [Aviso] Jogo já existia no catálogo. Atualizando informações...`);
    database[indexExistente] = { ...database[indexExistente], ...novoPort };
  } else {
    database.unshift(novoPort);
    console.log(`   [OK] Jogo inserido no topo do catálogo!`);
  }

  const eol = appJs.includes('\r\n') ? '\r\n' : '\n';
  const novoDbStr = 'const PORTS_DATABASE = ' + JSON.stringify(database, null, 2).replace(/\n/g, eol) + ';';
  appJs = appJs.replace(/const PORTS_DATABASE = \[[\s\S]*?\n\];/, novoDbStr);

  // Se tem capa local, atualizar manifesto
  if (temCapaLocal) {
    let manifest = [];
    try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch (e) {}
    if (!manifest.includes(idJogo)) {
      manifest.push(idJogo);
      manifest.sort();
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    }

    const matchManifest = appJs.match(/const LOCAL_COVERS_MANIFEST = (\[[\s\S]*?\n\];)/);
    if (matchManifest) {
      const currentManifest = new Function(`return ${matchManifest[1]}`)();
      if (!currentManifest.includes(idJogo)) {
        currentManifest.push(idJogo);
        currentManifest.sort();
        const newManifestStr = 'const LOCAL_COVERS_MANIFEST = ' + JSON.stringify(currentManifest, null, 2).replace(/\n/g, eol) + ';';
        appJs = appJs.replace(/const LOCAL_COVERS_MANIFEST = \[[\s\S]*?\n\];/, newManifestStr);
      }
    }
  }

  fs.writeFileSync(APP_JS_PATH, appJs, 'utf8');

  // 5. Atualizar locales.js
  console.log('4. Atualizando locales.js...');
  let localesJs = fs.readFileSync(LOCALES_JS_PATH, 'utf8');
  if (!localesJs.includes(`"${idJogo}":`)) {
    const descEn = `"${idJogo}": "${(repoData.description || `Native PC port of ${nomeJogo}`).replace(/"/g, '\\"')}",`;
    localesJs = localesJs.replace('portDescriptions: {', `portDescriptions: {\n  ${descEn}`);
    const lastIndex = localesJs.lastIndexOf('portDescriptions: {');
    if (lastIndex !== -1) {
      localesJs = localesJs.substring(0, lastIndex) +
        `portDescriptions: {\n  ${descEn}` +
        localesJs.substring(lastIndex + 'portDescriptions: {'.length);
    }
    fs.writeFileSync(LOCALES_JS_PATH, localesJs, 'utf8');
  }

  console.log('\n================================================================');
  console.log(`JOGO ADICIONADO COM SUCESSO AO CATÁLOGO!`);
  console.log(`   ${novoPort.nome} (${novoPort.console})`);
  console.log(`   Total de ports no catálogo agora: ${database.length}`);
  console.log('================================================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Uso: node scripts/adicionar-port.js "<link ou usuario/repo>"');
    console.log('      node scripts/adicionar-port.js --batch "repo1,repo2"');
    console.log('      node scripts/adicionar-port.js --batch ["repo1", "repo2"]');
    process.exit(0);
  }

  const batchIdx = args.indexOf('--batch');
  if (batchIdx !== -1 && args[batchIdx + 1]) {
    const raw = args[batchIdx + 1].trim();
    let lista = [];
    try {
      lista = JSON.parse(raw);
    } catch (e) {
      lista = raw.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);
    }

    if (!Array.isArray(lista) || lista.length === 0) {
      console.error('Nenhum repositório válido fornecido no lote.');
      process.exit(1);
    }

    console.log(`Processando lote de ${lista.length} repositórios...\n`);
    for (let i = 0; i < lista.length; i++) {
      const item = lista[i];
      try {
        console.log(`[Lote ${i+1}/${lista.length}] Processando: ${item}`);
        await adicionarPort(item);
      } catch (err) {
        console.error(`[Erro] Falha ao processar ${item}: ${err.message}`);
      }
    }
    console.log('\nLote de processamento concluído!');
    return;
  }

  await adicionarPort(args[0]);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
