(function (root) {
  'use strict';

  var B = '(?<![\\p{L}\\d])';
  var E = '(?![\\p{L}\\d])';
  var MONTHS = {
    gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6, luglio: 7, agosto: 8,
    settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
    gen: 1, feb: 2, mar: 3, apr: 4, mag: 5, giu: 6, lug: 7, ago: 8, sett: 9, set: 9, ott: 10, nov: 11, dic: 12
  };
  var MON_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  var MON_RE = 'gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|gen|feb|mar|apr|mag|giu|lug|ago|sett|set|ott|nov|dic';
  var WEEKDAYS = { domenica: 0, lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6 };
  var URL_RE_SRC = 'https?:\\/\\/[^\\s<>"\')\\]]+|www\\.[^\\s<>"\')\\]]+';

  var _n = 0;
  function uid(p) { return p + Math.random().toString(36).slice(2, 7) + (++_n); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function stripAccents(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function validDate(y, m, d) {
    var dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
  function mkDue(y, m, d, prefix) {
    var label = d + ' ' + MON_SHORT[m - 1] + ' ' + y;
    return { iso: y + '-' + pad(m) + '-' + pad(d), label: prefix ? prefix + ' (' + d + ' ' + MON_SHORT[m - 1] + ')' : label };
  }
  function fromDate(dt, prefix) { return mkDue(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), prefix); }
  function inferYear(mo, d, today) {
    var y = today.getFullYear();
    var cand = new Date(y, mo - 1, d);
    if (cand.getTime() < today.getTime() - 45 * 86400000) y++;
    return y;
  }

  function extractDue(text, today) {
    var t = text.replace(new RegExp(URL_RE_SRC, 'gi'), ' ');
    var m, y, d, mo;

    var numRe = /(?<![\d.])(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{4}|\d{2}))?(?!\d)/g;
    var mm;
    while ((mm = numRe.exec(t))) {
      var before = t.slice(Math.max(0, mm.index - 18), mm.index);
      var ctx = /(entro(?:\s+il)?|scadenz\w*(?:\s+il)?|il|del|per\s+il|al|dal|data)\s*$/i.test(before);
      if (!mm[3] && !ctx) continue;
      d = +mm[1]; mo = +mm[2];
      y = mm[3] ? (mm[3].length === 2 ? 2000 + +mm[3] : +mm[3]) : inferYear(mo, d, today);
      if (mo >= 1 && mo <= 12 && validDate(y, mo, d)) return mkDue(y, mo, d);
    }

    var nameRe = new RegExp(B + '(\\d{1,2})\\s*[º°]?\\s+(' + MON_RE + ')\\.?' + E + '(?:\\s+(\\d{4}))?', 'iu');
    if ((m = nameRe.exec(t))) {
      d = +m[1]; mo = MONTHS[m[2].toLowerCase()];
      y = m[3] ? +m[3] : inferYear(mo, d, today);
      if (validDate(y, mo, d)) return mkDue(y, mo, d);
    }

    if ((m = /entro\s+(?:i\s+|le\s+)?(?:prossim[ie]\s+)?(\d{1,3})\s+(giorn[oi]|settiman[ae]|mes[ei]|or[ae])/i.exec(t))) {
      return { iso: null, label: 'entro ' + m[1] + ' ' + m[2].toLowerCase(), rel: true };
    }
    var base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if ((m = /(?:entro|per)\s+(oggi|domani|dopodomani|stasera)/i.exec(t))) {
      var w = m[1].toLowerCase();
      var add = w === 'domani' ? 1 : w === 'dopodomani' ? 2 : 0;
      return fromDate(new Date(base.getTime() + add * 86400000), w);
    }
    var wdRe = new RegExp('entro\\s+(?:il\\s+|questo\\s+)?(lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì|sabato|domenica)' + E, 'iu');
    if ((m = wdRe.exec(t))) {
      var wd = WEEKDAYS[stripAccents(m[1].toLowerCase())];
      var diff = (wd - base.getDay() + 7) % 7;
      return fromDate(new Date(base.getTime() + diff * 86400000), m[1].toLowerCase());
    }
    if ((m = /entro\s+(?:la\s+)?fine\s+(mese|settimana|anno)/i.exec(t))) {
      var k = m[1].toLowerCase(), dt;
      if (k === 'mese') dt = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      else if (k === 'anno') dt = new Date(base.getFullYear(), 11, 31);
      else dt = new Date(base.getTime() + ((7 - base.getDay()) % 7) * 86400000);
      return fromDate(dt, 'fine ' + k);
    }
    return null;
  }

  var VERBS = [
    'riordin\\w*', 'inserir\\w*', 'inserisc\\w*', 'aggiung\\w*', 'aggiunt\\w*', 'modific\\w*', 'caricar\\w*', 'carica',
    'usar\\w*', 'usa', 'usate', 'toglier\\w*', 'allinear\\w*', 'allinea', 'corregg\\w*', 'correzion\\w*', 'verific\\w*',
    'controll\\w*', 'sostitu\\w*', 'spostar\\w*', 'sposta', 'cambiar\\w*', 'cambia', 'creare', 'crea', 'rimuover\\w*',
    'rimuov\\w*', 'elimin\\w*', 'aggiornar\\w*', 'aggiorna', 'invia\\w*', 'presentar\\w*', 'presenta', 'allegar\\w*',
    'compilar\\w*', 'firmar\\w*', 'pagar\\w*', 'preparar\\w*', 'realizzar\\w*', 'scriver\\w*', 'riscriv\\w*', 'rivedere',
    'ridurre', 'aument\\w*', 'ingrandir\\w*', 'ridimension\\w*', 'mettere', 'metti', 'pubblicar\\w*', 'collegar\\w*',
    'sistemar\\w*', 'sistema', 'testar\\w*', 'provar\\w*', 'chiedere', 'contattar\\w*', 'confermar\\w*', 'consegnar\\w*',
    'fornire', 'produrre', 'rispondere', 'segnalar\\w*', 'portare', 'duplicar\\w*', 'rinominar\\w*', 'diventa', 'diventare',
    'ripristinar\\w*', 'nascondere', 'mostrare', 'visualizzar\\w*', 'impostar\\w*', 'configurar\\w*', 'installar\\w*',
    'richiedere', 'ottenere', 'scaricar\\w*', 'completar\\w*', 'definire', 'decidere', 'valutar\\w*', 'approvar\\w*',
    'salvar\\w*', 'spedire', 'stampar\\w*', 'prenotar\\w*', 'organizzar\\w*', 'avvisar\\w*', 'comunicar\\w*', 'tradur\\w*',
    'ottimizzar\\w*', 'render\\w*', 'rendere', 'fare'
  ];
  var VERB_RE = new RegExp(B + '(?:' + VERBS.join('|') + ')' + E, 'iu');
  var MODAL_RE = new RegExp(B + '(?:deve|devono|dovr\\w+|dobbiamo|dovete|bisogna|occorre|occorrono|è necessari\\w*|sono necessari\\w*|è richiest\\w+|sono richiest\\w+|va|vanno|vengono|da (?:fare|inserire|completare|consegnare|inviare|allegare|verificare|controllare|correggere|sostituire)|obbligatori\\w*|a pena di|entro|prima di|possiamo fare in modo|ricordati|ricordare|non dimenticare|segnalo|errore|manca\\w*|mancano)' + E, 'iu');

  function analyze(text, today) {
    today = today || new Date();
    var tags = [];
    var due = extractDue(text, today);
    var verb = VERB_RE.test(text);
    var modal = MODAL_RE.test(text);
    var score = (verb ? 2 : 0) + (modal ? 2 : 0) + (due ? 1 : 0);
    if (/errore|errori|sbagliat|errat|non funzion|rott[oa]|\bbug\b|refuso|typo/i.test(text)) tags.push('correzione');
    if (/urgent|important|priorit|a pena di esclusione|obbligator|assolutamente|\bentro\b/i.test(text)) tags.push('priorità');
    if (/allegat|in allegato/i.test(text)) tags.push('allegato');
    if (/€\s?\d|\d[\d.,]*\s?(?:€|euro)/i.test(text)) tags.push('importo');
    return { score: score, tags: tags, due: due };
  }

  var OK_RE = /^(ok|okay|va bene|fatto|fatta|a posto|approvato|approvata|confermato|già fatto|tutto ok|nessuna modifica|nulla da modificare)\W*$/i;
  var GREET_RE = /^(ciao|salve|buongiorno|buonasera|gentile|egregio|spett|cordiali saluti|distinti saluti|saluti|a presto|grazie|buon lavoro|un saluto|ecco a te|ecco le|ecco il|in attesa|resto a disposizione|per qualunque|per qualsiasi|fammi sapere|a disposizione)/i;

  function capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function cleanText(s) { return capFirst(s.replace(/\s+/g, ' ').trim()); }

  function mkNode(text, today) {
    var t = cleanText(text);
    var a = analyze(t, today);
    return {
      id: uid('n'), text: t, done: false, children: [],
      tags: a.tags, due: a.due, score: a.score,
      ok: OK_RE.test(t)
    };
  }

  var BULLET_RE = /^([ \t]*)([·•●▪■▫◦○§➢➤►▸◆\-–—*]|o(?=[ \t])|\d{1,2}[.)]|[a-z]\))[ \t]+(?=\S)(.*)$/u;

  function markerKey(marker, indent) {
    if (/^[o○◦]$/.test(marker)) return 'b2';
    if (/^[§▪■▫]$/.test(marker)) return 'b3';
    if (/^\d/.test(marker)) return 'n:' + indent;
    if (/^[a-z]\)$/.test(marker)) return 'l:' + indent;
    return 'b1:' + indent;
  }

  function nextNonBlank(lines, from) {
    for (var j = from; j < lines.length; j++) if (lines[j].trim()) return j;
    return -1;
  }

  function splitSentences(p) {
    return p.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9“"«(])/u).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function isLabelLike(n) {
    if (n.children.length || n.ok || n.done || n.due) return false;
    if (n.score >= 2) return false;
    if (/https?:|www\./i.test(n.text)) return false;
    if (/[.!?;,:]$/.test(n.text)) return false;
    return n.text.split(/\s+/).length <= 5;
  }

  function prune(n) {
    n.children.forEach(prune);
    if (!n.children.length) return;
    var okKids = n.children.filter(function (c) { return c.ok && !c.children.length; });
    if (okKids.length === n.children.length) {
      n.children = [];
      n.done = true;
      n.okNote = true;
    } else {
      n.children = n.children.filter(function (c) { return !(c.ok && !c.children.length); });
    }
  }

  function parseDocument(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date();
    var norm = String(text || '').replace(/\r/g, '').replace(/[​﻿]/g, '').replace(/ /g, ' ').replace(/\t/g, '    ');
    var lines = norm.split('\n');
    var blocks = [];
    var stack = [];
    var blank = true;

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (!raw.trim()) { blank = true; continue; }
      var t = raw.trim();
      var bm = BULLET_RE.exec(raw);
      var isBullet = false;
      if (bm) {
        var mk = bm[2];
        isBullet = !(mk === 'o' && stack.length === 0 && bm[1].length === 0);
      }
      var last = blocks[blocks.length - 1];

      if (isBullet) {
        var key = markerKey(bm[2], bm[1].length);
        var idx = stack.indexOf(key);
        var level;
        if (idx >= 0) { stack.length = idx + 1; level = idx; }
        else { stack.push(key); level = stack.length - 1; }
        blocks.push({ type: 'item', level: level, text: bm[3].trim() });
        blank = false;
        continue;
      }

      if (last && last.type === 'item' && !blank && /^[a-zà-ÿ(“"«'-]/.test(t)) {
        last.text += ' ' + t;
        continue;
      }

      var heading = null;
      var hm = /^#{1,6}\s+(.*)$/.exec(t);
      var nx = nextNonBlank(lines, i + 1);
      var nextIsBullet = nx >= 0 && BULLET_RE.test(lines[nx]);
      var letters = (t.match(/\p{L}/gu) || []).length;
      var isCaps = letters >= 3 && t === t.toUpperCase() && t.length <= 60;
      var short = t.length <= 70 && t.split(/\s+/).length <= 9 && !/[.!?;,]$/.test(t);
      if (hm) heading = hm[1].trim();
      else if (isCaps) heading = t;
      else if (nextIsBullet && (short || (/:$/.test(t) && t.length <= 90))) heading = t.replace(/:$/, '');

      if (heading) {
        blocks.push({ type: 'heading', text: heading });
        stack = [];
      } else if (last && last.type === 'para' && !blank) {
        last.text += ' ' + t;
      } else {
        blocks.push({ type: 'para', text: t });
        stack = [];
      }
      blank = false;
    }

    var sections = [];
    var discarded = [];
    var cur = null;
    var lv = [];
    function ensure() {
      if (!cur) { cur = { id: uid('s'), title: 'Generale', parent: null, items: [] }; sections.push(cur); }
    }

    blocks.forEach(function (b) {
      if (b.type === 'heading') {
        cur = { id: uid('s'), title: cleanText(b.text), parent: null, items: [] };
        sections.push(cur);
        lv = [];
      } else if (b.type === 'item') {
        ensure();
        var n = mkNode(b.text, today);
        var L = Math.min(b.level, lv.length);
        lv.length = L;
        if (L > 0) lv[L - 1].children.push(n); else cur.items.push(n);
        lv[L] = n;
      } else {
        lv = [];
        splitSentences(b.text).forEach(function (s) {
          if (GREET_RE.test(s) || s.replace(/\W/g, '').length <= 3) { discarded.push(s); return; }
          var a = analyze(s, today);
          if (a.score >= 2) { ensure(); cur.items.push(mkNode(s, today)); }
          else discarded.push(s);
        });
      }
    });

    sections.forEach(function (s) { s.items.forEach(prune); });

    var out = [];
    sections.forEach(function (sec) {
      var curSec = sec;
      var items = sec.items;
      curSec.items = [];
      out.push(curSec);
      items.forEach(function (n, i) {
        var prev = items[i - 1];
        var next = items[i + 1];
        var promote = i > 0 && next && isLabelLike(n) && !isLabelLike(prev) &&
          (next.score >= 2 || next.children.length > 0);
        if (promote) {
          curSec = { id: uid('s'), title: n.text, parent: sec.title, items: [] };
          out.push(curSec);
        } else {
          var key = n.text.toLowerCase();
          if (!curSec.items.some(function (x) { return x.text.toLowerCase() === key; })) curSec.items.push(n);
        }
      });
    });

    return { sections: out.filter(function (s) { return s.items.length; }), discarded: discarded };
  }

  function leaves(n) { return n.children.length ? n.children.reduce(function (a, c) { return a.concat(leaves(c)); }, []) : [n]; }
  function nodeDone(n) { return n.children.length ? n.children.every(nodeDone) : !!n.done; }

  function toMarkdown(sections) {
    var out = [];
    function walk(n, depth) {
      var pad2 = '  '.repeat(depth);
      var extra = n.due && !/\d/.test(n.text.slice(-12)) ? ' (scadenza: ' + n.due.label + ')' : '';
      out.push(pad2 + '- [' + (nodeDone(n) ? 'x' : ' ') + '] ' + (n.children.length ? '**' + n.text + '**' : n.text) + extra);
      n.children.forEach(function (c) { walk(c, depth + 1); });
    }
    sections.forEach(function (s) {
      out.push('## ' + (s.parent ? s.parent + ' › ' : '') + s.title);
      s.items.forEach(function (n) { walk(n, 0); });
      out.push('');
    });
    return out.join('\n').trim() + '\n';
  }

  function toText(sections) {
    var out = [];
    function walk(n, depth) {
      out.push('  '.repeat(depth) + (nodeDone(n) ? '☑ ' : '☐ ') + n.text);
      n.children.forEach(function (c) { walk(c, depth + 1); });
    }
    sections.forEach(function (s) {
      out.push((s.parent ? s.parent + ' › ' : '') + s.title.toUpperCase());
      s.items.forEach(function (n) { walk(n, 0); });
      out.push('');
    });
    return out.join('\n').trim() + '\n';
  }

  var api = { parseDocument: parseDocument, analyze: analyze, toMarkdown: toMarkdown, toText: toText, leaves: leaves, nodeDone: nodeDone, uid: uid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChecklistParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
