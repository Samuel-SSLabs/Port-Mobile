/**
 * ============================================================================
 * CONVERSOR E OTIMIZADOR DE CAPAS — PORTMOBILE
 * ============================================================================
 * Baixa as capas oficiais em alta definição da Wikipedia para os ports que
 * ainda não possuem capa local, converte para o formato moderno WebP com
 * compressão inteligente via ImageMagick (magick.exe) e atualiza o manifesto.
 *
 * Uso:
 *   node scripts/otimizar-capas.js             (otimiza todas as capas pendentes)
 *   node scripts/otimizar-capas.js --limit=10  (otimiza apenas 10 capas para teste)
 *   node scripts/otimizar-capas.js --force     (re-converte todas as capas)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const COVERS_DIR = path.join(ROOT_DIR, 'assets', 'covers');
const APP_JS_PATH = path.join(ROOT_DIR, 'app.js');
const MANIFEST_JSON_PATH = path.join(COVERS_DIR, 'manifest.json');

// Garantir que a pasta de capas exista
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

// Verificar se o ImageMagick está disponível no sistema
let hasMagick = false;
try {
  execSync('magick -version', { stdio: 'ignore' });
  hasMagick = true;
} catch (e) {
  hasMagick = false;
}

if (!hasMagick) {
  console.error('[Erro] ImageMagick (magick.exe) não foi detectado no PATH do sistema.');
  console.error('   Instale o ImageMagick ou certifique-se de que "magick" está no PATH.');
  process.exit(1);
}

// Extrair PORTS_DATABASE do app.js
function extrairPortsDatabase() {
  const content = fs.readFileSync(APP_JS_PATH, 'utf8');
  const start = content.indexOf('const PORTS_DATABASE = [');
  const end = content.indexOf('];', start);
  if (start === -1 || end === -1) {
    throw new Error('Não foi possível localizar PORTS_DATABASE em app.js');
  }
  const jsonStr = content.substring(start + 'const PORTS_DATABASE = '.length, end + 1);
  return JSON.parse(jsonStr);
}

// Requisição HTTP/HTTPS com suporte a redirecionamento (301/302) e User-Agent customizado
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'PortMobileBot/1.0 (https://github.com/Samuel-SSLabs/Port-Mobile; samuelrochalemesdos@hotmail.com)'
      },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} para ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout ao acessar ${url}`));
    });
  });
}

// Baixar JSON da Wikipedia
async function fetchJson(url) {
  const buf = await fetchUrl(url);
  return JSON.parse(buf.toString('utf8'));
}

// Buscar URL da capa oficial na Wikipedia
async function buscarUrlCapaWikipedia(port) {
  const termoBruto = (port.termoBuscaCapa || port.nome).trim();
  let termoDecodificado = termoBruto;
  try {
    termoDecodificado = decodeURIComponent(termoBruto);
  } catch (e) {}
  const tituloFormatado = termoDecodificado.replace(/\s+/g, '_');

  // 1. Tentar API REST de Sumário da Wikipedia
  try {
    const urlSummary = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(tituloFormatado)}`;
    const data = await fetchJson(urlSummary);
    if (data.originalimage && data.originalimage.source) {
      return data.originalimage.source;
    }
    if (data.thumbnail && data.thumbnail.source) {
      return data.thumbnail.source;
    }
  } catch (e) {}

  // 2. Tentar busca da Wikipedia
  try {
    const urlSearch = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(port.nome + ' video game')}&gsrlimit=1&prop=pageimages&pithumbsize=800&piprop=thumbnail|original&format=json&origin=*`;
    const dataSearch = await fetchJson(urlSearch);
    if (dataSearch.query && dataSearch.query.pages) {
      const pages = Object.values(dataSearch.query.pages);
      if (pages.length > 0) {
        if (pages[0].original && pages[0].original.source) {
          return pages[0].original.source;
        }
        if (pages[0].thumbnail && pages[0].thumbnail.source) {
          return pages[0].thumbnail.source;
        }
      }
    }
  } catch (e) {}

  // 3. Fallback: GitHub Preview
  return `https://opengraph.githubassets.com/1/${port.repo}`;
}

// Converter imagem para a dupla WebP e AVIF via ImageMagick
function converterParaFormatos(inputBuffer, webpPath, avifPath) {
  const tempInput = path.join(COVERS_DIR, `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`);
  fs.writeFileSync(tempInput, inputBuffer);

  try {
    // 1. WebP (qualidade 82%, largura max 600px, sem metadados)
    execSync(`magick "${tempInput}" -resize "600x>" -quality 82 -strip "${webpPath}"`, { stdio: 'ignore' });
    // 2. AVIF (qualidade 65%, largura max 600px, sem metadados)
    execSync(`magick "${tempInput}" -resize "600x>" -quality 65 -strip "${avifPath}"`, { stdio: 'ignore' });
  } finally {
    if (fs.existsSync(tempInput)) {
      try { fs.unlinkSync(tempInput); } catch (e) {}
    }
  }
}

// Gerar AVIF diretamente a partir de um WebP já existente
function gerarAvifAPartirDeWebp(webpPath, avifPath) {
  execSync(`magick "${webpPath}" -quality 65 -strip "${avifPath}"`, { stdio: 'ignore' });
}

// Atualizar o manifesto em app.js e manifest.json
function atualizarManifesto(portsComCapa) {
  const idsOrdenados = Array.from(portsComCapa).sort();

  // 1. Salvar manifest.json
  fs.writeFileSync(MANIFEST_JSON_PATH, JSON.stringify(idsOrdenados, null, 2), 'utf8');

  // 2. Atualizar LOCAL_COVERS_MANIFEST em app.js
  let appJs = fs.readFileSync(APP_JS_PATH, 'utf8');
  const eol = appJs.includes('\r\n') ? '\r\n' : '\n';
  const declManifest = `const LOCAL_COVERS_MANIFEST = ${JSON.stringify(idsOrdenados, null, 2).replace(/\n/g, eol)};`;

  if (appJs.includes('const LOCAL_COVERS_MANIFEST =')) {
    const start = appJs.indexOf('const LOCAL_COVERS_MANIFEST =');
    const end = appJs.indexOf('];', start);
    appJs = appJs.substring(0, start) + declManifest + appJs.substring(end + 2);
  } else {
    // Inserir antes da declaração de PORTS_DATABASE
    const posPorts = appJs.indexOf('const PORTS_DATABASE =');
    if (posPorts !== -1) {
      appJs = appJs.substring(0, posPorts) +
        `// ── MANIFESTO DE CAPAS LOCAIS PRÉ-OTIMIZADAS EM WEBP ──${eol}` +
        declManifest + `${eol}const LOCAL_COVERS_SET = new Set(LOCAL_COVERS_MANIFEST);${eol}${eol}` +
        appJs.substring(posPorts);
    }
  }

  fs.writeFileSync(APP_JS_PATH, appJs, 'utf8');
  console.log(`\nManifesto atualizado com sucesso! Total de capas locais registradas: ${idsOrdenados.length}`);
}

// Função Principal
async function main() {
  console.log('================================================================');
  console.log('   PORTMOBILE — OTIMIZADOR DE CAPAS (DUPLA AVIF + WEBP)         ');
  console.log('================================================================');

  const args = process.argv.slice(2);
  const isForce = args.includes('--force');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  const ports = extrairPortsDatabase();
  console.log(`Total de ports no banco de dados: ${ports.length}`);

  const portsComCapa = new Set();
  const pendentes = [];

  for (const port of ports) {
    const destWebp = path.join(COVERS_DIR, `${port.id}.webp`);
    const destAvif = path.join(COVERS_DIR, `${port.id}.avif`);
    if (fs.existsSync(destWebp) && fs.existsSync(destAvif) && !isForce) {
      portsComCapa.add(port.id);
    } else {
      pendentes.push(port);
    }
  }

  console.log(`Capas locais completas (AVIF + WebP): ${portsComCapa.size}`);
  console.log(`Capas pendentes de download/geração: ${pendentes.length}`);

  if (pendentes.length === 0) {
    console.log('Todas as capas já estão otimizadas na dupla AVIF + WebP!');
    atualizarManifesto(portsComCapa);
    return;
  }

  const fila = pendentes.slice(0, limit);
  console.log(`\nIniciando processamento de ${fila.length} jogo(s)...\n`);

  let sucessos = 0;
  let falhas = 0;

  for (let i = 0; i < fila.length; i++) {
    const port = fila[i];
    const destWebp = path.join(COVERS_DIR, `${port.id}.webp`);
    const destAvif = path.join(COVERS_DIR, `${port.id}.avif`);
    process.stdout.write(`[${i + 1}/${fila.length}] ${port.nome} ... `);

    try {
      if (fs.existsSync(destWebp) && !isForce) {
        // Já tem WebP, só gerar o AVIF direto
        gerarAvifAPartirDeWebp(destWebp, destAvif);
        const statsAvif = fs.statSync(destAvif);
        const statsWebp = fs.statSync(destWebp);
        console.log(`OK! (WebP: ${(statsWebp.size / 1024).toFixed(1)} KB | AVIF: ${(statsAvif.size / 1024).toFixed(1)} KB)`);
      } else {
        // Baixar da Wikipedia e gerar ambos
        const urlCapa = await buscarUrlCapaWikipedia(port);
        if (!urlCapa) {
          throw new Error('Nenhuma URL encontrada');
        }

        const imgBuffer = await fetchUrl(urlCapa);
        converterParaFormatos(imgBuffer, destWebp, destAvif);

        const statsAvif = fs.statSync(destAvif);
        const statsWebp = fs.statSync(destWebp);
        console.log(`OK! (WebP: ${(statsWebp.size / 1024).toFixed(1)} KB | AVIF: ${(statsAvif.size / 1024).toFixed(1)} KB)`);
      }

      portsComCapa.add(port.id);
      sucessos++;
    } catch (err) {
      console.log(`FALHOU (${err.message})`);
      falhas++;
    }

    // Delay suave
    await new Promise(r => setTimeout(r, 80));
  }

  console.log('\n================================================================');
  console.log(`Processamento finalizado!`);
  console.log(`   Sucessos: ${sucessos}`);
  console.log(`   Falhas:   ${falhas}`);
  console.log(`   Total local: ${portsComCapa.size} de ${ports.length} jogos`);
  console.log('================================================================');

  atualizarManifesto(portsComCapa);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
