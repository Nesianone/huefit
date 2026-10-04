/* HueFit UI */
(function () {
  'use strict';
  const E = window.HueFitEngine;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem('huefit.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('huefit.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  const state = { tab: 'outfits', garment: 'Dress Shorts', formality: 'Smart Casual', bottom: { key: 'navy', hex: null }, top: { key: 'white', hex: null } };
  let profile = Object.assign({ skin: null, undertone: null, hair: null, season: 'any', climate: 'mild' }, store.get('profile', {}));
  let wardrobe = Object.assign({ tops: [], bottoms: [] }, store.get('wardrobe', {}));
  let favs = store.get('favs', []);
  let shoes = store.get('shoes', []);
  if (!Array.isArray(shoes)) shoes = [];
  if (!Array.isArray(favs)) favs = [];

  /* ---------- helpers ---------- */
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1500);
  }
  function copy(text) {
    const done = () => toast('Copied ' + text);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
  }
  const mini = (top, bottom) => `<span class="mini" aria-hidden="true"><i style="background:${top}"></i><i style="background:${bottom}"></i></span>`;

  function seg(host, items, get, set, opts) {
    opts = opts || {};
    const draw = () => {
      host.innerHTML = items.map(it => {
        const v = it.v !== undefined ? it.v : it;
        const label = it.label !== undefined ? it.label : it;
        return `<button type="button" role="radio" aria-checked="${get() === v}" data-v="${esc(v)}">${it.color ? `<i class="dot" style="background:${it.color}"></i>` : ''}${esc(label)}</button>`;
      }).join('');
    };
    host.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v;
      set(opts.clearable && get() === v ? null : v);
      draw();
    });
    draw();
  }

  /* ---------- colour input (palette + custom + photo) ---------- */
  function colourInput(host, items, initialKey, onChange) {
    host.innerHTML = `<div class="palette" role="radiogroup"></div>
      <div class="custom">
        <label>Custom</label>
        <input type="color" class="cpick" value="#1f2a44" aria-label="Pick a colour">
        <input type="text" class="chex" maxlength="7" placeholder="#1F2A44" autocapitalize="characters" aria-label="Hex code">
        <button type="button" class="btn use">Use</button>
        <button type="button" class="btn ghost photo">📷 From photo</button>
      </div>
      <p class="err" hidden>Enter a 6-digit hex like #6B7040</p>`;
    const pal = host.querySelector('.palette'), pick = host.querySelector('.cpick'), hex = host.querySelector('.chex'), err = host.querySelector('.err');
    pal.innerHTML = items.map(i => `<button type="button" class="chip" role="radio" data-k="${i.key}"><span class="sw" style="background:${i.hex}"></span><span>${esc(i.name)}</span></button>`).join('');
    let sel = initialKey;
    const mark = () => pal.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-checked', String(c.dataset.k === sel)));
    pal.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      sel = b.dataset.k;
      const it = items.find(i => i.key === sel);
      hex.value = ''; pick.value = it.hex.toLowerCase(); err.hidden = true;
      mark(); onChange({ key: sel, hex: null });
    });
    const custom = v => {
      const h = E.normHex(v);
      if (!h) { err.hidden = false; return; }
      err.hidden = true; sel = null; hex.value = h; pick.value = h.toLowerCase();
      mark(); onChange({ key: null, hex: h });
    };
    pick.addEventListener('input', e => custom(e.target.value));
    host.querySelector('.use').addEventListener('click', () => custom(hex.value));
    hex.addEventListener('keydown', e => { if (e.key === 'Enter') custom(hex.value); });
    host.querySelector('.photo').addEventListener('click', () => photoPicker(custom));
    mark();
  }

  /* ---------- photo colour picker ---------- */
  function photoPicker(onUse) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const url = URL.createObjectURL(f), img = new Image();
      img.onload = () => { openSampler(img, onUse); URL.revokeObjectURL(url); };
      img.onerror = () => toast('Could not open that image');
      img.src = url;
    });
    inp.click();
  }
  function openSampler(img, onUse) {
    const sc = Math.min(1, 900 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Pick a colour from your photo">
      <p class="sub"><b>Tap the garment</b> to sample its colour. Daylight and a flat, evenly lit area work best, because shadows and indoor light shift colours.</p>
      <div class="canvas-wrap"><canvas></canvas><span class="dot-mark" hidden></span></div>
      <div class="samp"><span class="sw"></span><code>Tap the photo</code></div>
      <div class="row"><button type="button" class="btn ghost" data-a="cancel">Cancel</button><button type="button" class="btn" data-a="use" disabled>Use this colour</button></div></div>`;
    document.body.appendChild(m);
    const cv = m.querySelector('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const mark = m.querySelector('.dot-mark'), sw = m.querySelector('.samp .sw'), code = m.querySelector('.samp code'), useBtn = m.querySelector('[data-a=use]');
    let picked = null;
    cv.addEventListener('click', ev => {
      const r = cv.getBoundingClientRect();
      const x = Math.round((ev.clientX - r.left) * w / r.width), y = Math.round((ev.clientY - r.top) * h / r.height);
      const half = 5, x0 = Math.max(0, Math.min(w - 1, x) - half), y0 = Math.max(0, Math.min(h - 1, y) - half);
      const sw_ = Math.min(half * 2 + 1, w - x0), sh_ = Math.min(half * 2 + 1, h - y0);
      const d = ctx.getImageData(x0, y0, sw_, sh_).data;
      let R = 0, G = 0, B = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
      picked = '#' + [R, G, B].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('').toUpperCase();
      sw.style.background = picked; code.textContent = picked + ' · ' + E.nameColour(picked); useBtn.disabled = false;
      mark.hidden = false; mark.style.left = (ev.clientX - r.left) + 'px'; mark.style.top = (ev.clientY - r.top) + 'px';
    });
    const close = () => m.remove();
    m.addEventListener('click', e => {
      if (e.target === m || e.target.dataset.a === 'cancel') close();
      else if (e.target.dataset.a === 'use' && picked) { close(); onUse(picked); }
    });
  }

  /* ---------- favourites ---------- */
  const favId = (...a) => a.join('|');
  const favAttr = o => esc(JSON.stringify(o));
  function renderFavs() {
    $('favSection').hidden = favs.length === 0;
    $('favList').innerHTML = favs.map(f => `<button class="fav-chip" data-del="${esc(f.id)}" aria-label="Remove saved look ${esc(f.topName)} with ${esc(f.bottomName)}">${mini(f.top, f.bottom)}<span>${esc(f.topName)} + ${esc(f.bottomName)}</span><span aria-hidden="true">✕</span></button>`).join('');
  }
  const heart = (fav) => `<button class="heart" aria-pressed="${favs.some(f => f.id === fav.id)}" aria-label="Save look" data-fav="${favAttr(fav)}">${favs.some(f => f.id === fav.id) ? '♥' : '♡'}</button>`;

  /* ---------- badges ---------- */
  function badges(note, ownedName) {
    let h = '';
    if (note === 'flatter') h += '<span class="badge good">Flatters you</span>';
    if (note === 'wash') h += '<span class="badge warn">May wash you out</span>';
    if (ownedName) h += `<span class="badge own">You own: ${esc(ownedName)}</span>`;
    return h ? `<div class="badges">${h}</div>` : '';
  }
  const owned = hex => { const o = wardrobe.tops.find(t => E.dist(t.hex, hex) < .1); return o ? o.name : null; };
  const rankBanner = ranked => ranked ? '<div class="tip"><b>Ranked for you.</b> Your profile and season reorder each row, best first. Colours near your face matter most.</div>' : '';

  /* ---------- Outfits tab (bottoms -> tops) ---------- */
  function topCard(item, res) {
    const fav = { id: favId(res.bottom.hex, item.hex, res.garment, res.formality), top: item.hex, topName: item.name, bottom: res.bottom.hex, bottomName: res.bottom.name };
    return `<article class="card">
      <button class="swatch" style="background:${item.hex}" data-copy="${item.hex}" aria-label="Copy ${esc(item.name)} hex ${item.hex}"><span>${item.hex}</span></button>
      <div class="body">
        <h3><span>${esc(item.name)}</span>${heart(fav)}</h3>
        ${badges(item.note, owned(item.hex))}
        <div class="pair">${mini(item.hex, res.bottom.hex)}<p>${esc(item.why)}</p></div>
        <p class="meta"><b>Wear:</b> ${item.pieces.map(esc).join(' · ')}</p>
        <p class="meta"><b>Shoes:</b> ${esc(item.shoes)}</p>${item.shoeNote ? `<p class="meta shoenote">${esc(item.shoeNote)}</p>` : ''}
      </div></article>`;
  }
  function renderOutfits() {
    const res = E.recommend({ bottomKey: state.bottom.key, customHex: state.bottom.hex, garment: state.garment, formality: state.formality, profile, season: profile.season, climate: profile.climate, ownedShoes: shoes });
    let h = `<div class="summary"><span class="big" style="background:${res.bottom.hex}"></span>
      <div><h2>${esc(res.bottom.name)} ${esc(res.garment.toLowerCase())}</h2><p>${esc(res.formality)} · ${res.bottom.hex}</p></div></div>${rankBanner(res.ranked)}`;
    res.categories.forEach(c => { h += `<h2>${esc(c.title)}</h2><p class="sub">${esc(c.sub)}</p><div class="grid">${c.items.map(i => topCard(i, res)).join('')}</div>`; });
    h += `<h2>Colours to Avoid</h2><p class="sub">These clash with, or wash out, your bottoms.</p><div class="avoid">` +
      res.avoid.map(a => `<div class="item"><span class="sw" style="background:${a.hex}"></span><div><strong>${esc(a.name)}</strong><span>${esc(a.why)}</span></div></div>`).join('') + '</div>';
    if (res.tip) h += `<div class="tip"><b>Fit tip:</b> ${esc(res.tip)}</div>`;
    $('outfitsResults').innerHTML = h;
  }

  /* ---------- Match-a-top tab (tops -> bottoms) ---------- */
  function bottomCard(item, res) {
    const fav = { id: favId(item.hex, res.top.hex, res.garment, res.formality), top: res.top.hex, topName: res.top.name, bottom: item.hex, bottomName: item.name };
    return `<article class="card">
      <button class="swatch" style="background:${item.hex}" data-copy="${item.hex}" aria-label="Copy ${esc(item.name)} hex ${item.hex}"><span>${item.hex}</span></button>
      <div class="body">
        <h3><span>${esc(item.name)}</span>${heart(fav)}</h3>
        <div class="badges"><span class="badge rel-${item.rel}">${esc(E.REL_LABEL[item.rel])}</span></div>
        <div class="pair">${mini(res.top.hex, item.hex)}<p>${esc(item.why)}</p></div>
        <p class="meta"><b>Top:</b> ${item.pieces.map(esc).join(' · ')}</p>
        <p class="meta"><b>Shoes:</b> ${esc(item.shoes)}</p>${item.shoeNote ? `<p class="meta shoenote">${esc(item.shoeNote)}</p>` : ''}
      </div></article>`;
  }
  function renderTops() {
    const t = state.top.key ? E.TOPS.find(x => x.key === state.top.key) : { name: null, hex: state.top.hex };
    const res = E.recommendBottoms({ topHex: t.hex, topName: t.name, garment: state.garment, formality: state.formality, profile, season: profile.season, climate: profile.climate, ownedShoes: shoes });
    const fitNote = res.fit.note === 'flatter' ? '<div class="tip good"><b>Flatters you:</b> this top has strong contrast with your skin tone.</div>'
      : res.fit.note === 'wash' ? '<div class="tip warn-tip"><b>Heads up:</b> this top is close to your skin tone in depth and may wash you out near your face.</div>' : '';
    let h = `<div class="summary"><span class="big" style="background:${res.top.hex}"></span>
      <div><h2>Bottoms for ${esc(res.top.name)}</h2><p>${esc(res.formality)} · ${esc(res.garment.toLowerCase())} · ${res.top.hex}</p></div></div>${fitNote}`;
    res.groups.forEach(g => {
      if (g.id === 'avoid') {
        h += `<h2>${esc(g.title)}</h2><p class="sub">${esc(g.sub)}</p><div class="avoid">` + g.items.map(a => `<div class="item"><span class="sw" style="background:${a.hex}"></span><div><strong>${esc(a.name)}</strong><span>${esc(a.why)}</span></div></div>`).join('') + '</div>';
      } else {
        h += `<h2>${esc(g.title)}</h2><p class="sub">${esc(g.sub)}</p><div class="grid">${g.items.map(i => bottomCard(i, res)).join('')}</div>`;
      }
    });
    if (res.tip) h += `<div class="tip"><b>Fit tip:</b> ${esc(res.tip)}</div>`;
    $('topsResults').innerHTML = h;
  }

  /* ---------- Wardrobe tab ---------- */
  const wForm = { kind: 'top', hex: null, name: '' };
  const REL_CHIP = { classic: 'Great', tonal: 'Great', comp: 'Good', neutral: 'OK', avoid: 'Avoid' };
  function renderWardrobe() {
    const list = (arr, kind) => arr.length ? arr.map((x, i) => `<button class="fav-chip" data-wdel="${kind}:${i}" aria-label="Remove ${esc(x.name)}"><span class="mini one" aria-hidden="true"><i style="background:${x.hex}"></i></span><span>${esc(x.name)}</span><span aria-hidden="true">✕</span></button>`).join('') : '<p class="sub">None yet.</p>';
    let h = `<h2>Your tops</h2><div class="chips">${list(wardrobe.tops, 'tops')}</div><h2>Your bottoms</h2><div class="chips">${list(wardrobe.bottoms, 'bottoms')}</div>`;
    if (wardrobe.tops.length && wardrobe.bottoms.length) {
      h += '<h2>Outfit matches</h2><p class="sub">Best pairings from what you already own, strongest first.</p>';
      E.wardrobeMatches(wardrobe, profile, profile.season).forEach(g => {
        h += `<div class="wcard"><div class="whead"><span class="big sm" style="background:${g.bottom.hex}"></span><strong>${esc(g.bottom.name)}</strong></div>` +
          g.matches.map(m => `<div class="wrow">${mini(m.top.hex, g.bottom.hex)}<div class="wtxt"><strong>${esc(m.top.name)}</strong><span>${esc(m.why)}</span></div><span class="badge rel-${m.rel}">${REL_CHIP[m.rel]}</span></div>`).join('') + '</div>';
      });
    } else {
      h += '<div class="tip">Add at least one top and one bottom to see matches.</div>';
    }
    const hexes = wardrobe.bottoms.length ? wardrobe.bottoms.map(b => b.hex) : Object.values(E.BOTTOMS).map(b => b.hex);
    const gaps = E.shoeGaps({ owned: shoes, bottomHexes: hexes, garment: state.garment, climate: profile.climate });
    if (gaps.length) {
      h = `<div class="tip buy"><b>${shoes.length ? 'Worth buying next' : 'Good first pairs to get'}:</b> ${gaps.map(g => esc(g.name)).join(' and ')}. ${shoes.length ? 'They would improve the most outfits' : 'They suit the most outfits'}${wardrobe.bottoms.length ? ' with your bottoms' : ''}.</div>` + h;
    }
    $('wardList').innerHTML = h;
  }
  function buildWardrobeForm() {
    colourInput($('wardColour'), [], null, c => { wForm.hex = c.hex; $('wardPreview').style.background = c.hex; });
    seg($('wardKind'), [{ v: 'top', label: 'Top' }, { v: 'bottom', label: 'Bottom' }], () => wForm.kind, v => { if (v) wForm.kind = v; });
    $('wardName').addEventListener('input', e => { wForm.name = e.target.value; });
    $('wardAdd').addEventListener('click', () => {
      if (!wForm.hex) { toast('Pick a colour first'); return; }
      const item = { name: (wForm.name || '').trim().slice(0, 40) || E.nameColour(wForm.hex), hex: wForm.hex };
      (wForm.kind === 'top' ? wardrobe.tops : wardrobe.bottoms).push(item);
      store.set('wardrobe', wardrobe);
      wForm.name = ''; $('wardName').value = '';
      toast('Added ' + item.name); renderWardrobe();
    });
  }

  /* ---------- My shoes ---------- */
  function drawShoes() {
    $('shoeList').innerHTML = E.SHOES.map(s => `<button type="button" role="checkbox" aria-checked="${shoes.includes(s.id)}" data-shoe="${s.id}">${esc(s.name)}</button>`).join('');
    $('shoeCount').textContent = shoes.length ? shoes.length + ' selected' : 'tick what you own';
  }
  $('shoeList').addEventListener('click', e => {
    const b = e.target.closest('[data-shoe]'); if (!b) return;
    const id = b.dataset.shoe;
    shoes = shoes.includes(id) ? shoes.filter(x => x !== id) : shoes.concat(id);
    store.set('shoes', shoes); drawShoes(); renderActive();
  });

  /* ---------- tabs & global render ---------- */
  function renderActive() {
    if (state.tab === 'outfits') renderOutfits();
    else if (state.tab === 'tops') renderTops();
    else renderWardrobe();
    renderFavs();
  }
  function setTab(t) {
    state.tab = t;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    ['outfits', 'tops', 'wardrobe'].forEach(id => { $('tab-' + id).hidden = id !== t; });
    renderActive();
  }

  document.addEventListener('click', e => {
    const c = e.target.closest('[data-copy]'); if (c) { copy(c.dataset.copy); return; }
    const f = e.target.closest('[data-fav]');
    if (f) {
      const d = JSON.parse(f.dataset.fav), i = favs.findIndex(x => x.id === d.id);
      if (i >= 0) favs.splice(i, 1); else favs.push(d);
      store.set('favs', favs); renderActive(); return;
    }
    const del = e.target.closest('[data-del]');
    if (del) { favs = favs.filter(x => x.id !== del.dataset.del); store.set('favs', favs); renderActive(); return; }
    const wd = e.target.closest('[data-wdel]');
    if (wd) { const [k, i] = wd.dataset.wdel.split(':'); wardrobe[k].splice(+i, 1); store.set('wardrobe', wardrobe); renderActive(); }
  });
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  const setProfile = key => v => { profile[key] = v; store.set('profile', profile); renderActive(); };
  seg($('garment'), E.GARMENTS, () => state.garment, v => { state.garment = v; renderActive(); });
  seg($('formality'), E.FORMALITY, () => state.formality, v => { state.formality = v; renderActive(); });
  seg($('skin'), E.SKIN, () => profile.skin, setProfile('skin'), { clearable: true });
  seg($('undertone'), [{ v: 'warm', label: 'Warm' }, { v: 'cool', label: 'Cool' }, { v: 'unsure', label: 'Not sure' }], () => profile.undertone, setProfile('undertone'), { clearable: true });
  seg($('hair'), E.HAIR, () => profile.hair, setProfile('hair'), { clearable: true });
  seg($('season'), E.SEASONS, () => profile.season, v => setProfile('season')(v || 'any'));
  seg($('climate'), E.CLIMATES, () => profile.climate, v => setProfile('climate')(v || 'mild'));

  colourInput($('bottomInput'), Object.entries(E.BOTTOMS).map(([key, b]) => ({ key, name: b.name, hex: b.hex })), state.bottom.key, c => { state.bottom = c; renderActive(); });
  colourInput($('topInput'), E.TOPS, state.top.key, c => { state.top = c; renderActive(); });
  buildWardrobeForm();
  drawShoes();
  setTab('outfits');

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
