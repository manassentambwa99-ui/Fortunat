(function(){
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  if (!document.getElementById('plantSvg')) return;

  /* ---------------- simulateur de croissance ---------------- */  
  const plant = $('#plantSvg');  
  const sliders = {  
    lum: $('#sLum'), eau: $('#sEau'), temp: $('#sTemp'), azote: $('#sAzote')  
  };  
  const out = {  
    lum: $('#vLum'), eau: $('#vEau'), temp: $('#vTemp'), azote: $('#vAzote')  
  };  
  
  // score : 1 dans la plage optimale, décroissance linéaire en dehors  
  function score(v, min, max, span){  
    if (v >= min && v <= max) return 1;  
    const d = v < min ? min - v : v - max;  
    return Math.max(0, 1 - d / span);  
  }  
  
  function evaluate(clearPresets){  
    const lum = +sliders.lum.value, eau = +sliders.eau.value,  
          temp = +sliders.temp.value, azote = +sliders.azote.value;  
  
    out.lum.textContent = lum + ' h / jour';  
    out.eau.textContent = eau + ' mm / sem.';  
    out.temp.textContent = temp + ' °C';  
    out.azote.textContent = azote + ' kg / ha';  
  
    const s = {  
      lum: score(lum, 8, 12, 6),  
      eau: score(eau, 25, 45, 22),  
      temp: score(temp, 18, 28, 11),  
      azote: score(azote, 60, 120, 65)  
    };  
    const keys = Object.keys(s);  
    const moy = keys.reduce((a,k) => a + s[k], 0) / keys.length;  
    const vigueur = Math.round(moy * 100);  
  
    // plante  
    const grow = Math.max(0.16, Math.min(1, 0.22 + (vigueur / 100) * 0.92));  
    plant.style.setProperty('--grow', grow.toFixed(3));  
    const health = vigueur / 100;  
    const leaf = health > 0.72 ? '#69B96B' : health > 0.45 ? '#8FA84F' : health > 0.25 ? '#B98B3F' : '#9A6B3A';  
    const stem = health > 0.72 ? '#8CCB84' : health > 0.45 ? '#A7BE6E' : '#C2A15C';  
    plant.style.setProperty('--leaf', leaf);  
    plant.style.setProperty('--stem', stem);  
    plant.classList.toggle('wilt', vigueur < 45);  
    plant.classList.toggle('wet', eau > 30 && eau <= 60);  
  
    // soleil réagit à la lumière  
    const sun = $('#sun'), rays = $('#sunRays');  
    if (sun) sun.setAttribute('opacity', (0.14 + (lum / 16) * 0.72).toFixed(2));  
    if (rays) rays.setAttribute('opacity', (0.08 + (lum / 16) * 0.55).toFixed(2));  
  
    // indicateurs  
    $('#idxVigueur').textContent = vigueur;  
    $('#gVigueur').style.width = vigueur + '%';  
    $('#gVigueur').style.background = vigueur > 70 ? '#69B96B' : vigueur > 45 ? '#C2622D' : '#D2691E';  
    $('#idxCroissance').textContent = '+' + (0.4 + health * 3.4).toFixed(1).replace('.', ',');  
    $('#idxRendement').textContent = (0.8 + health * 6.4).toFixed(1).replace('.', ',');  
    $('#idxRecolte').textContent = Math.round(128 - health * 52);  
  
    // verdict : on pointe le facteur le plus déficient  
    const worst = keys.reduce((a,k) => s[k] < s[a] ? k : a, keys[0]);  
    const titre = $('#verdictTitle'), texte = $('#verdictText');  
    const msgs = {  
      lum: lum < 8  
        ? ["Manque de lumière", "La plante s'étiole : tiges allongées, feuillage pâle. Ajoutez 2 à 3 h d'exposition ou déplacez la culture près d'une baie au sud."]  
        : ["Excès de lumière", "Au-delà de 12 h d'exposition, la plante consomme ses réserves. Installez une ombrière 30 % aux heures les plus chaudes."],  
      eau: eau < 25  
        ? ["Sous-arrosage", "Le substrat s'assèche : la croissance ralentit dès que la turgescence chute. Passez à 2 arrosages longs par semaine et pailler 7 cm."]  
        : ["Excès d'eau", "Risque d'asphyxie racinaire et de botrytis. Espacez les arrosages, vérifiez le drainage et aérez la serre en fin de journée."],  
      temp: temp < 18  
        ? ["Température trop fraîche", "Sous 18 °C, la floraison stagne et la nouaison est mal assurée. Couvrez la culture la nuit ou chauffez la serre à 18 °C minimum."]  
        : ["Température trop élevée", "Au-delà de 28 °C, le pollen devient stérile. Ventilez, ombragez et arrosez au petit matin pour refroidir la zone racinaire."],  
      azote: azote < 60  
        ? ["Carence en azote", "Feuillage pâle, feuilles vieilles jaunes, croissance ralentie. Apportez 30 kg/ha d'azote sous forme de compost mûr ou de purin d'ortie."]  
        : ["Excès d'azote", "Feuillage très vert, tiges molles, sensibilité aux maladies. Interrompez tout apport et passez à une formule riche en potassium."]  
    };  
    if (vigueur >= 82 && s[worst] > 0.92){  
      titre.textContent = 'Conditions équilibrées';  
      texte.textContent = "La plante dispose de tout ce qu'il lui faut : maintenez l'humidité régulière et surveillez le stade floraison.";  
    } else {  
      titre.textContent = msgs[worst][0];  
      texte.textContent = msgs[worst][1];  
    }  
    if (clearPresets) $$('.preset').forEach(b => b.classList.remove('on'));  
  }  
  
  Object.keys(sliders).forEach(k => sliders[k].addEventListener('input', () => evaluate(true)));  
  
  const presets = {  
    optimal: {lum:10, eau:35, temp:23, azote:90},  
    secheresse: {lum:14, eau:8, temp:31, azote:70},  
    canicule: {lum:15, eau:22, temp:37, azote:110},  
    carence: {lum:10, eau:35, temp:22, azote:15}  
  };  
  $$('.preset').forEach(btn => btn.addEventListener('click', () => {  
    const p = presets[btn.dataset.preset];  
    if (!p) return;  
    Object.keys(p).forEach(k => sliders[k].value = p[k]);  
    evaluate();  
    btn.classList.add('on');  
  }));  
  evaluate();  
})();
