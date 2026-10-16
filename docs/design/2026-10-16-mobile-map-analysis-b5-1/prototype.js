/* Isolated interaction sketch. No services, geometry calculations or production imports. */
(() => {
  const ref = window.DesignReference;
  const params = new URLSearchParams(location.search);
  const alternative = ['A', 'B', 'C'].includes(params.get('alternative')) ? params.get('alternative') : 'A';
  const scene = params.get('scene') || 'area-all';
  const titles = { A: 'Kart først', B: 'Resultat først', C: 'Delt arbeidsflate' };
  const layers = [ ['level0', 'Grunnkart nivå 0', 'Regnskapsgrunnlag'], ['plan', 'Framtidig utbygging', 'Plandata'], ['nature', 'Verdsatte naturtyper', 'Supplerende temadata'], ['protected', 'Verneområder', 'Supplerende temadata'], ['inon', 'Inngrepsfri natur · 2023', 'Supplerende temadata'], ['reindeer', 'Villrein', 'Supplerende temadata'], ['grey', 'Grå arealer', 'Supplerende temadata'] ];
  const state = {
    alternative, commune: 'Trondheim', active: scene !== 'entry', mode: 'area', selection: 'all', search: '', sort: 'area', content: 'summary',
    panel: alternative === 'A' ? 'none' : 'results', size: 'split', resultFocus: false,
    layers: Object.fromEntries(layers.map(([id]) => [id, id === 'level0'])), opacity: 25,
    view: { x: 0, y: 0, zoom: 1, kind: 'commune' },
  };
  const selectedLocality = () => ref.nature.localities.find(l => l.id === state.selection);
  const format = value => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 }).format(value);
  const daa = value => `${format(value)} daa`;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const byId = id => document.getElementById(id);
  const available = () => state.commune === 'Trondheim';
  const selected = () => {
    if (!available()) return { label: 'Analyse ikke klargjort', number: null };
    if (state.mode === 'area') {
      const category = ref.area.categories.find(c => c.id === state.selection);
      return category ? { label: category.label, number: daa(category.areaDaa) } : { label: 'Alle arealer', number: daa(ref.area.totalDaa) };
    }
    const local = selectedLocality();
    if (local) return { label: local.name, number: daa(local.overlapAreaDaa) };
    const [kind, label] = state.selection.split(':');
    const item = (kind === 'value' ? ref.nature.values : ref.nature.types).find(item => item.label === label);
    return item ? { label: item.label, number: daa(item.areaDaa) } : { label: 'Samlet resultat', number: daa(ref.nature.uniqueAreaDaa) };
  };
  const defaultPanel = () => alternative === 'A' ? 'none' : 'results';
  if (scene === 'forest' || scene === 'pan') state.selection = 'skog';
  if (scene === 'nature-all' || scene === 'locality') {
    state.mode = 'nature'; state.content = scene === 'locality' ? 'detail' : 'localities';
    state.panel = scene === 'nature-all' ? 'results' : defaultPanel();
    if (scene === 'locality') state.selection = 'BN00109936';
  }
  if (scene === 'pan') { state.panel = 'none'; state.size = 'map'; state.view = { x: -170, y: 100, zoom: 1.35, kind: 'panned' }; }
  if (scene === 'missing') { state.commune = 'Oslo'; state.panel = 'results'; }
  if (scene === 'entry') state.panel = 'none';
  function announce(text) { byId('announcement').textContent = text; }
  function focusVisible(id) {
    const target = byId(id);
    if (target && target.getClientRects().length) target.focus({ preventScroll: true });
  }
  function options() {
    if (state.mode === 'area') return [['all', 'Alle arealer'], ...ref.area.categories.map(c => [c.id, c.label])];
    const list = [['all', 'Samlet resultat'], ...ref.nature.values.map(v => [`value:${v.label}`, v.label])];
    const local = selectedLocality();
    if (local) list.push([local.id, local.name]);
    if (state.selection.startsWith('type:')) list.push([state.selection, selected().label]);
    return list;
  }
  function choice(id, label, value, more = '', color) {
    return `<li><button id="choice-${escape(encodeURIComponent(id))}" data-action="select" data-selection="${escape(id)}" aria-pressed="${state.selection === id}"><span>${color ? `<i class="swatch" style="background:${color}" aria-hidden="true"></i>` : ''}${escape(label)}${more ? `<small>${escape(more)}</small>` : ''}</span><b>${value}</b></button></li>`;
  }
  function method() {
    return `<details><summary>Metode, kilder og usikkerhet</summary><p>Dette er en designskisse med dokumenterte referansetall fra Trondheim, ikke en ny analyse. Kartillustrasjonen viser ingen faktisk beregnet geografi.</p><p>Planavsetning er ikke faktisk eller forventet naturtap. DiBK-filter: arealbruksstatus 2, formål i 1000-/2000-serien. Grunnkart: etablert 2025-grunnlag; WMS-kilder er ikke låst til én felles årsversjon.</p><p>${state.mode === 'area' ? 'Planarealene er rasterbaserte. 706,71 daa natur er ufordelt. Identifisert nullareal dokumenterer ikke fravær av naturtypen.' : 'Registrerte naturverdier er supplerende data, ikke heldekkende naturkunnskap. Høyeste KU-verdi prioriteres i unik overlapp. Lokalitetens hele kildegeometri er nevner for overlappsandelen. Manglende treff betyr ikke manglende naturverdi.'}</p><p>Regnskapsgrunnlag, historiske demodata, ordinære kartlag og analyseutvalg holdes adskilt. Full produksjonsmetode og kildeproveniens beholdes ved eventuell implementering.</p><small>Referansemetode: ${escape(ref[state.mode].methodVersion)}</small><p><code>${escape(ref[state.mode].analysisId)}</code></p></details>`;
  }
  function listMarkup() {
    const term = state.search.toLocaleLowerCase('nb');
    const data = ref.nature.localities.filter(l => `${l.name} ${l.id} ${l.natureType} ${l.value}`.toLocaleLowerCase('nb').includes(term));
    data.sort((a,b) => state.sort === 'name' ? a.name.localeCompare(b.name, 'nb') : state.sort === 'share' ? b.overlapSharePercent-a.overlapSharePercent : state.sort === 'type' ? a.natureType.localeCompare(b.natureType,'nb') : state.sort === 'value' ? a.value.localeCompare(b.value,'nb') : b.overlapAreaDaa-a.overlapAreaDaa);
    return `<p class="muted" role="status">${data.length} av ${ref.nature.localityCount} lokaliteter</p><ul class="choice-list">${data.map(l => choice(l.id, l.name, daa(l.overlapAreaDaa), `${l.natureType} · ${l.value} · ${l.id}`)).join('')}</ul>`;
  }
  function areaMarkup() {
    return `<div class="stat-grid"><div class="stat"><strong>${daa(ref.area.natureDaa)}</strong><span>Natur i planområder</span></div><div class="stat"><strong>${daa(ref.area.agricultureDaa)}</strong><span>Jordbruk i planområder</span></div></div><p>Identifiserte arealer avsatt til framtidig utbygging. Planavsetning er ikke naturtap.</p><p class="note">Delvis naturfordeling: <strong>706,71 daa ufordelt</strong>. Kjente typer viser identifiserte delarealer.</p><h3>Velg arealer i kartet</h3><ul class="choice-list">${choice('all', 'Alle arealer', daa(ref.area.totalDaa))}${ref.area.categories.map(c => choice(c.id, c.label, daa(c.areaDaa), '', c.color)).join('')}</ul>${method()}`;
  }
  function natureMarkup() {
    const l = selectedLocality();
    if (state.content === 'method') return method().replace('<details>','<details open>');
    if (state.content === 'detail' && l) return `<section class="locality-detail" aria-label="Valgt lokalitet"><h3>${escape(l.name)}</h3><p>${escape(l.natureType)} · ${escape(l.value)}</p><p><strong>${daa(l.overlapAreaDaa)}</strong> overlapper planområdene.</p><p>Hele lokaliteten: ${daa(l.totalAreaDaa)}.<br>Overlappsandel: ${format(l.overlapSharePercent)} %.</p><small>Faglig ID: ${escape(l.id)}</small><p>Overlapp betyr ikke naturtap. Karttilpassing er en egen handling.</p></section>`;
    if (state.content === 'values') return `<p>KU-verdi: verdisetting brukt i konsekvensutredninger, ikke beregnet konsekvensgrad for planen.</p><ul class="choice-list">${ref.nature.values.map(v => choice(`value:${v.label}`, v.label, daa(v.areaDaa), `${v.count} lokaliteter`)).join('')}</ul>`;
    if (state.content === 'types') return `<p>Naturtypene kan overlappe og skal ikke summeres som unikt areal.</p><ul class="choice-list">${ref.nature.types.map(v => choice(`type:${v.label}`, v.label, daa(v.areaDaa), `${v.count} lokaliteter`)).join('')}</ul>`;
    if (state.content === 'summary') return `<div class="stat-grid"><div class="stat"><strong>${daa(ref.nature.uniqueAreaDaa)}</strong><span>Unikt overlappsareal</span></div><div class="stat"><strong>${ref.nature.localityCount}</strong><span>Unike lokaliteter</span></div></div><p>Registrerte naturtypelokaliteter i planområder. Overlapp betyr ikke naturtap. Manglende registrering betyr ikke fravær av naturverdi.</p><button data-action="find-locality">Finn lokalitet</button>`;
    return `<label>Søk etter lokalitet<input id="locality-search" type="search" value="${escape(state.search)}" placeholder="Navn, naturtype eller faglig ID"></label><label class="sr-only" for="locality-sort">Sorter lokaliteter</label><select id="locality-sort"><option value="area">Overlappsareal, størst først</option><option value="name">Navn, alfabetisk</option><option value="share">Overlappsandel, størst først</option><option value="type">Naturtype, alfabetisk</option><option value="value">KU-verdi</option></select><div id="locality-list">${listMarkup()}</div>`;
  }
  function contentOptions() {
    const choices = state.mode === 'area' ? [['summary','Resultater'],['method','Metode og kilder']] : [['localities','Lokaliteter'],['summary','Samlet resultat'],['values','KU-verdi'],['types','Naturtyper'],['method','Metode og kilder']];
    if (selectedLocality()) choices.unshift(['detail','Valgt lokalitet']);
    return choices.map(([id,label])=>`<option value="${id}" ${state.content === id ? 'selected' : ''}>${label}</option>`).join('');
  }
  function layerMarkup(prefix = '') {
    return `${['Regnskapsgrunnlag','Plandata','Supplerende temadata'].map(group => `<fieldset><legend>${group}</legend>${layers.filter(l=>l[2] === group).map(([id,label]) => `<label class="layer-choice"><input id="${prefix}layer-${id}" type="checkbox" data-layer="${id}" ${state.layers[id] ? 'checked' : ''}>${label}</label>`).join('')}</fieldset>`).join('')}<p>Ordinære kartlag. Analyseutvalget har egen markering og beholdes når lag endres.</p><details><summary>Grå arealer: innstillinger og kilde</summary><label class="range-label">Gjennomsiktighet <output class="opacity-value">${state.opacity}</output> %<input type="range" data-opacity min="0" max="100" value="${state.opacity}"></label><p>Illustrert lagkontroll. Kildens tre framstillingsvalg, legend, målestokk og feilhåndtering beholdes i B5.2; de simuleres ikke faglig her.</p></details><details><summary>Tegnforklaring og tjenestestatus</summary><p>Fargeflater er kun illustrasjon i denne skissen. Ingen karttjeneste er koblet til. I produksjon skal synlige lag fortsatt ha kildelegender og tilgjengelige feil-/målestokkmeldinger.</p></details>`;
  }
  function render(focusId) {
    const oldFocus = document.activeElement.id;
    const oldScroll = document.querySelector('.result-scroll')?.scrollTop || 0;
    const sel = selected();
    document.body.className = `variant-${alternative} mode-${state.mode} panel-${state.panel} size-${state.size} selected-${state.selection} ${available() ? '' : 'missing'} ${state.active ? '' : 'inactive'} ${state.resultFocus ? 'result-focus' : ''} ${Object.values(state.layers).some((visible,i)=>i>0&&visible) ? 'has-ordinary' : ''}`;
    byId('alternative-name').textContent = `${alternative} · ${titles[alternative]}`;
    byId('commune').value = state.commune;
    byId('analysis-mode').value = state.mode;
    byId('analysis-mode').disabled = !state.active;
    for (const letter of ['A','B','C']) {
      byId(`alt-${letter.toLowerCase()}`).href = `?alternative=${letter}&scene=${encodeURIComponent(scene)}`;
      if (letter === alternative) byId(`alt-${letter.toLowerCase()}`).setAttribute('aria-current', 'page');
    }
    document.title = `B5.1 ${alternative} – ${titles[alternative]} – ${state.commune}`;
    byId('desktop-selection').textContent = `${sel.label}${sel.number ? ` · ${sel.number}` : ''} · utsnitt endres bare ved tilpassing`;
    byId('layers-button').setAttribute('aria-expanded', String(state.panel === 'layers'));
    byId('layer-count').textContent = Object.values(state.layers).filter(Boolean).length;
    byId('desktop-layers').innerHTML = `<h2>Kartlag</h2>${layerMarkup('desktop-')}`;
    byId('layers').hidden = state.panel !== 'layers';
    byId('layers').innerHTML = `<header class="layer-heading"><h2>Kartlag</h2><button id="close-layers" data-action="return-layers">Tilbake</button></header><div class="layer-scroll" tabindex="0" role="region" aria-label="Rullbar lagliste">${layerMarkup()}</div>`;
    byId('results').innerHTML = `<header class="results-heading"><h2 class="sr-only">Resultater</h2><label class="sr-only" for="result-view">Vis analyseinnhold</label><select id="result-view">${contentOptions()}</select><div>${alternative === 'A' ? `<button id="expand-results" data-action="expand" aria-pressed="${state.resultFocus}">${state.resultFocus ? 'Delt' : 'Utvid'}</button>` : ''}<button id="reset" data-action="reset" aria-label="Nullstill kartutvalg">Nullstill</button></div></header><div class="result-scroll" tabindex="0" role="region" aria-label="Rullbare analyseresultater">${available() ? (state.mode === 'area' ? (state.content === 'method' ? method().replace('<details>','<details open>') : areaMarkup()) : natureMarkup()) : '<h3>Analyse ikke klargjort for Oslo</h3><p>Det kommunevise analysegrunnlaget mangler. Dette er ikke et nullresultat og sier ikke at natur eller naturverdier mangler.</p><p>Trondheim-resultater vises ikke. Analysetype beholdes, men kommuneavhengige kartutvalg er nullstilt.</p>'}</div>`;
    const sort = byId('locality-sort'); if (sort) sort.value = state.sort;
    byId('summary').innerHTML = !state.active ? '' : `${available() ? `<small>${state.mode === 'area' ? (state.selection === 'all' ? 'Planområder · natur og jordbruk' : 'Planområder · identifisert delareal') : 'Planoverlapp · registrerte naturverdier'}</small><div class="summary-line"><strong>${escape(sel.number)}</strong><span>${state.selection === 'all' && state.mode === 'nature' ? '70 lokaliteter · ' : ''}${escape(sel.label)}</span></div>` : '<p class="missing-note"><strong>Oslo: analyse ikke klargjort</strong><br>Manglende grunnlag, ikke null treff.</p>'}<div class="summary-controls"><label class="sr-only" for="quick-selection">Kartutvalg</label><select id="quick-selection" ${available() ? '' : 'disabled'}>${options().map(([id,label]) => `<option value="${escape(id)}" ${state.selection === id ? 'selected' : ''}>${escape(label)}</option>`).join('')}</select><button id="results-toggle" data-action="results" aria-controls="results" aria-expanded="${state.panel === 'results'}">${state.panel === 'results' ? (alternative === 'B' ? 'Se kart' : 'Mer kart') : 'Resultater'}</button></div>`;
    if (!state.active) byId('summary').innerHTML = '';
    byId('mode-bar-start')?.remove();
    if (!state.active) {
      const start = document.createElement('div'); start.id = 'mode-bar-start'; start.className = 'mode-bar';
      start.innerHTML = '<button id="start" class="primary" data-action="start">Start Arealfordeling</button>';
      byId('analysis-mode').parentElement.after(start);
    }
    document.querySelectorAll('[data-size]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.size === state.size)));
    byId('fit').disabled = !state.active || !available();
    byId('selection-legend').textContent = !state.active ? 'Ingen aktiv analyse · ordinære kartlag' : available() ? `Kartutvalg: ${sel.label} · illustrert markering` : 'Ingen analysetreff vises';
    updateView();
    document.querySelector('.result-scroll').scrollTop = ['reset','analysis-mode','commune','result-view'].includes(focusId) ? 0 : oldScroll;
    focusVisible(focusId || oldFocus);
  }
  function updateView() {
    const {x,y,zoom,kind} = state.view;
    byId('map-drawing').setAttribute('transform', `translate(${x} ${y}) translate(300 325) scale(${zoom}) translate(-300 -325)`);
    byId('view-label').textContent = kind === 'panned' ? 'Utsnitt flyttet · utvalg beholdt' : kind === 'selection' ? (state.view.fitFor === state.selection ? 'Illustrert tilpassing til utvalget' : 'Utsnitt beholdt · nytt kartutvalg') : `${state.commune} · kommuneutsnitt (skisse)`;
  }
  function setPanel(panel, focusId) { state.panel = panel; render(focusId); }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    if (action === 'select') { state.selection = target.dataset.selection; if (selectedLocality()) state.content = 'detail'; render(selectedLocality() ? 'result-view' : undefined); announce(`Kartutvalg: ${selected().label}. Kartutsnittet er beholdt.`); }
    if (action === 'reset') { state.selection = 'all'; state.search = ''; state.content = state.mode === 'nature' ? 'localities' : 'summary'; render('reset'); announce('Samlet resultat. Kartutvalg og lokalitetssøk nullstilt; utsnitt og kartlag beholdt.'); }
    if (action === 'find-locality') { state.content = 'localities'; render('result-view'); }
    if (action === 'expand') { state.resultFocus = !state.resultFocus; render('expand-results'); }
    if (action === 'results') { state.resultFocus = false; state.size = 'split'; setPanel(state.panel === 'results' ? 'none' : 'results', state.panel === 'results' ? 'results-toggle' : 'reset'); }
    if (action === 'map') { state.resultFocus = false; state.size = 'map'; setPanel('none', 'map'); }
    if (action === 'layers') {
      if (innerWidth > 1100) { focusVisible('desktop-layer-level0'); return; }
      state.returnPanel = state.panel === 'layers' ? state.returnPanel : state.panel;
      setPanel(state.panel === 'layers' ? state.returnPanel || 'none' : 'layers', state.panel === 'layers' ? 'layers-button' : 'close-layers');
    }
    if (action === 'return-layers') setPanel(state.returnPanel || 'none', 'layers-button');
    if (action === 'preset') { state.size = target.dataset.size; setPanel(state.size === 'map' ? 'none' : 'results'); }
    if (action === 'fit') {
      if (!available()) return;
      state.view = { x: 0, y: 0, zoom: state.selection === 'all' ? 1.15 : 1.6, kind: 'selection', fitFor: state.selection }; updateView();
      announce('Illustrert kart tilpasset valgt utvalg. Ingen geografisk analyse er utført.');
    }
    if (action === 'whole') { state.view = {x:0,y:0,zoom:1,kind:'commune'}; updateView(); announce('Kommuneutsnitt. Kartutvalget er beholdt.'); }
    if (action === 'zoom-in' || action === 'zoom-out') { state.view.zoom = Math.max(.6,Math.min(3,state.view.zoom + (action === 'zoom-in' ? .15 : -.15))); state.view.kind = 'panned'; updateView(); }
    if (action === 'close') { state.active = false; state.panel = 'none'; state.selection = 'all'; state.search = ''; render('start'); announce('Analysen lukket. Analysemarkering fjernet; ordinære kartlag og utsnitt beholdt.'); }
    if (action === 'start') { state.active = true; state.mode = 'area'; state.content = 'summary'; state.panel = defaultPanel(); state.selection = 'all'; state.size = 'split'; render(alternative === 'A' ? 'quick-selection' : 'reset'); }
  });
  document.addEventListener('change', event => {
    const target = event.target;
    if (target.id === 'commune') {
      state.commune = target.value; state.content = state.mode === 'nature' ? 'localities' : 'summary'; state.selection = 'all'; state.search = ''; state.view = {x:0,y:0,zoom:1,kind:'commune'};
      render('commune'); announce(`${state.commune}. ${available() ? 'Dokumentert Trondheim-referanse tilgjengelig.' : 'Analysegrunnlag mangler, ikke null treff.'}`);
    }
    if (target.id === 'analysis-mode') { state.mode = target.value; state.content = state.mode === 'nature' ? 'localities' : 'summary'; state.selection = 'all'; state.search = ''; render('analysis-mode'); announce('Analysetype endret. Kartutvalg og søk nullstilt; utsnitt og kartlag beholdt.'); }
    if (target.id === 'quick-selection') { state.selection = target.value; if (state.mode === 'nature' && state.selection === 'all') state.content = 'localities'; render('quick-selection'); announce(`Kartutvalg: ${selected().label}. Utsnitt beholdt.`); }
    if (target.id === 'result-view') { state.content = target.value; render('result-view'); }
    if (target.dataset.layer) { state.layers[target.dataset.layer] = target.checked; render(target.id); announce('Kartlag endret. Analyseutvalg og utsnitt beholdt.'); }
    if (target.id === 'locality-sort') { state.sort = target.value; byId('locality-list').innerHTML = listMarkup(); }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'locality-search') { state.search = event.target.value; byId('locality-list').innerHTML = listMarkup(); }
    if (event.target.hasAttribute('data-opacity')) { state.opacity = Number(event.target.value); document.querySelectorAll('.opacity-value').forEach(o => o.value = state.opacity); }
  });
  const map = byId('map');
  const pan = (x,y) => { state.view.x += x; state.view.y += y; state.view.kind = 'panned'; updateView(); };
  map.addEventListener('keydown', event => {
    const directions = {ArrowLeft:[35,0],ArrowRight:[-35,0],ArrowUp:[0,35],ArrowDown:[0,-35]};
    if (directions[event.key]) {event.preventDefault();pan(...directions[event.key]);}
    if (event.key === '+' || event.key === '-') {event.preventDefault();state.view.zoom = Math.max(.6,Math.min(3,state.view.zoom+(event.key === '+'?.15:-.15)));state.view.kind='panned';updateView();}
  });
  let drag;
  map.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY};map.setPointerCapture(event.pointerId);map.focus({preventScroll:true});});
  map.addEventListener('pointermove',event=>{if(!drag)return;pan(event.clientX-drag.x,event.clientY-drag.y);drag={x:event.clientX,y:event.clientY};});
  map.addEventListener('pointerup',()=>{drag=null;});map.addEventListener('pointercancel',()=>{drag=null;});
  document.addEventListener('keydown', event => {
    if(event.key !== 'Escape')return;
    if(state.panel === 'layers')setPanel(state.returnPanel || 'none','layers-button');
    else if(state.panel === 'results'){state.resultFocus=false;state.size='map';setPanel('none','results-toggle');}
  });
  window.designState = () => JSON.parse(JSON.stringify(state));
  render();
})();
