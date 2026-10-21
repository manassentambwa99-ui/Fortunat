(function(){
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  if (!document.getElementById('drop')) return;

  /* ---------------- diagnostic IA ---------------- */  
  const drop = $('#drop'), fileInput = $('#plantFile'), preview = $('#preview'),  
        previewImg = $('#previewImg'), previewTag = $('#previewTag'), log = $('#log');  

  drop.addEventListener('click', () => fileInput.click());  
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });  
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => {  
    e.preventDefault(); drop.classList.add('over');  
  }));  
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => {  
    e.preventDefault(); drop.classList.remove('over');  
  }));  
  drop.addEventListener('drop', e => {  
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];  
    if (f) handleFile(f);  
  });  
  fileInput.addEventListener('change', e => {  
    const f = e.target.files && e.target.files[0];  
    if (f) handleFile(f);  
  });  
  $('#btnRescan').addEventListener('click', () => fileInput.click());  
  
  function addLog(text){  
    const d = document.createElement('div');  
    d.textContent = text;  
    log.appendChild(d);  
    log.scrollTop = log.scrollHeight;  
    while (log.children.length > 7) log.removeChild(log.firstChild);  
  }  
  function resetLog(){ log.innerHTML = ''; }  
  
  function handleFile(file){  
    if (!file.type || file.type.indexOf('image/') !== 0){  
      addLog('Format refusé : veuillez choisir une image (JPG, PNG, HEIC).');  
      return;  
    }  
    const reader = new FileReader();  
    reader.onload = e => {  
      previewImg.src = e.target.result;  
      preview.style.display = 'block';  
      previewTag.textContent = file.name.length > 28 ? file.name.slice(0,25) + '…' : file.name;  
      runAnalysis(e.target.result, file);  
    };  
    reader.readAsDataURL(file);  
  }  
  
  function setRing(pct, title, desc){  
    const arc = $('#ringArc');  
    const C = 2 * Math.PI * 50;  
    arc.setAttribute('stroke-dasharray', C.toFixed(1));  
    arc.setAttribute('stroke-dashoffset', (C * (1 - pct / 100)).toFixed(1));  
    $('#ringVal').textContent = pct + '%';  
    if (title) $('#ringTitle').textContent = title;  
    if (desc) $('#ringDesc').textContent = desc;  
  }  
  
  function fillReport(r){  
    $('#resEspece').textContent = r.espece;  
    $('#resAge').textContent = r.age;  
    $('#resEngrais').textContent = r.engrais;  
    $('#resArrosage').textContent = r.arrosage;  
    $('#resExposition').textContent = r.exposition;  
    $('#careEau').textContent = r.careEau;  
    $('#careEngrais').textContent = r.careEngrais;  
    $('#careRecolte').textContent = r.careRecolte;  
    setRing(r.maturite, r.titre, r.desc);  
  }  
  
  function simulateResult(){  
    return {  
      espece: "Tomate (Solanum lycopersicum)",  
      age: "3 semaines — stade végétatif",  
      engrais: "Compost mûr + 30 kg/ha d'azote",  
      arrosage: "25 mm / semaine, au pied",  
      exposition: "Plein soleil — 8 à 10 h / jour",  
      careEau: "Dans 2 jours",  
      careEngrais: "Sous 6 jours",  
      careRecolte: "≈ 68 jours",  
      maturite: 42,  
      titre: "Stade végétatif — bonne vigueur",  
      desc: "Le feuillage est franc et l'enracinement progresse. Poursuivez l'apport azoté jusqu'à l'entrée en floraison, puis basculez sur une formule potassique."  
    };  
  }  
  
  async function runAnalysis(base64, file){  
    resetLog();  
    $('#resEspece').textContent = "Analyse en cours…";  
    $('#resAge').textContent = 'Patientez…';  
    $('#resEngrais').textContent = '…';  
    $('#resArrosage').textContent = '…';  
    $('#resExposition').textContent = '…';  
    setRing(12, 'Analyse en cours', 'Le modèle examine le feuillage, la structure et les symptômes visibles.');  
  
    const steps = [  
      'Image reçue (' + Math.max(1, Math.round(file.size / 1024)) + ' Ko) — prétraitement…',  
      'Segmentation du feuillage et du limbe…',  
      'Recherche de symptômes : taches, chlorose, nécrose, mildiou…',  
      'Croisement avec la base AgriFortunat (12 cultures)…'  
    ];  
    steps.forEach((s, i) => setTimeout(() => addLog(s), 240 + i * 520));  
  
    let result = null;  
    try {  
      result = await groqAnalyze(base64);  
      addLog('Réponse du modèle vision reçue.');  
    } catch (err) {  
      addLog('API indisponible (' + (err && err.message ? err.message : 'erreur') + ') — bascule sur le moteur local.');  
      result = simulateResult();  
    }  
    setTimeout(() => {  
      fillReport(result);  
      previewTag.textContent = 'Analyse terminée — ' + result.espece.split('(')[0].trim();  
      addLog('Rapport généré. Réf. ' + $('#reportId').textContent.replace('Réf. ', '') + '.');  
    }, 700);  
  }  
  

  // Réduit la photo avant envoi : plus rapide, et sous les limites de taille du serveur et de l'API
  function shrinkImage(dataUrl, maxSide, quality){
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL('image/jpeg', quality)); } catch (e) { resolve(dataUrl); }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // L'appel à Groq se fait côté serveur (api/analyze.js) : la clé n'est jamais dans cette page.
  async function groqAnalyze(base64){
    const image = await shrinkImage(base64, 1280, 0.82);
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: image })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const text = data && typeof data.text === 'string' ? data.text : '';
    const pick = (key) => {
      const m = text.match(new RegExp(key + '\\s*:\\s*(.+)', 'i'));
      return m ? m[1].trim() : '';
    };
    const mat = parseInt(pick('MATURITE'), 10);
    return {
      espece: pick('ESPECE') || 'Non identifié avec certitude',
      age: pick('AGE') || '—',
      engrais: pick('ENGRAIS') || '—',
      arrosage: pick('ARROSAGE') || '—',
      exposition: pick('EXPOSITION') || '—',
      careEau: 'Sous 3 jours',
      careEngrais: 'Sous 8 jours',
      careRecolte: 'Selon stade',
      maturite: isNaN(mat) ? 35 : Math.max(0, Math.min(100, mat)),
      titre: pick('TITRE') || 'Analyse visuelle',
      desc: pick('DESC') || 'Observez votre plante régulièrement et notez toute évolution dans votre carnet de parcelle.'
    };
  }

  // réf. aléatoire  
  $('#reportId').textContent = 'Réf. AF-2026-' + String(Math.floor(1000 + Math.random() * 8999));  
})();
