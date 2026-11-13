// Netlify Function: legge e scrive checklists.json in un repository GitHub privato.
// Variabili d'ambiente richieste: GITHUB_TOKEN, GITHUB_REPO ("utente/repo-dati"), APP_PIN.
// Opzionali: GITHUB_BRANCH (default "main"), GITHUB_PATH (default "checklists.json").
const crypto = require('crypto');

function sameString(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

exports.handler = async (event) => {
  const { GITHUB_TOKEN, GITHUB_REPO, APP_PIN } = process.env;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const file = process.env.GITHUB_PATH || 'checklists.json';
  const reply = (code, obj) => ({
    statusCode: code,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(obj)
  });

  if (!GITHUB_TOKEN || !GITHUB_REPO || !APP_PIN) {
    return reply(500, { error: 'Mancano le variabili GITHUB_TOKEN, GITHUB_REPO o APP_PIN su Netlify.' });
  }

  const pin = (event.headers && event.headers['x-app-pin']) || '';
  if (!sameString(pin, APP_PIN)) {
    await new Promise((r) => setTimeout(r, 600));
    return reply(401, { error: 'PIN non valido' });
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${file}`;
  const gh = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'estrattore-checklist',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  async function current() {
    const r = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers: gh });
    if (r.status === 404) return { sha: null, data: { lists: [] } };
    if (!r.ok) throw new Error('GitHub ha risposto ' + r.status + ' in lettura. Controlla token e nome del repository.');
    const j = await r.json();
    const data = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
    return { sha: j.sha, data };
  }

  try {
    if (event.httpMethod === 'GET') return reply(200, await current());

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      if (!body.data || !Array.isArray(body.data.lists)) return reply(400, { error: 'Dati non validi' });
      const cur = await current();
      if ((cur.sha || null) !== (body.sha || null)) return reply(409, cur);
      const payload = {
        message: 'Aggiorna checklist',
        content: Buffer.from(JSON.stringify(body.data, null, 1)).toString('base64'),
        branch
      };
      if (cur.sha) payload.sha = cur.sha;
      const put = await fetch(url, {
        method: 'PUT',
        headers: { ...gh, 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (put.status === 409 || put.status === 422) return reply(409, await current());
      if (!put.ok) return reply(502, { error: 'GitHub ha risposto ' + put.status + ' in scrittura. Il token ha il permesso Contents: Read and write?' });
      const pj = await put.json();
      return reply(200, { sha: pj.content.sha });
    }

    return reply(405, { error: 'Metodo non consentito' });
  } catch (e) {
    return reply(500, { error: String((e && e.message) || e) });
  }
};
