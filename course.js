(function(){
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------------- sommaire : leçon en cours ---------------- */
  const links = $$('.toc a');
  const lessons = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  function markToc(){
    const y = window.scrollY + window.innerHeight * 0.3;
    let cur = lessons[0];
    lessons.forEach(l => { if (l.offsetTop <= y) cur = l; });
    links.forEach(a => a.classList.toggle('on', cur && a.getAttribute('href') === '#' + cur.id));
  }
  if (lessons.length){
    window.addEventListener('scroll', markToc, {passive:true});
    markToc();
  }

  /* ---------------- quiz ---------------- */
  const quiz = $('.quiz');
  if (!quiz) return;
  const questions = $$('.q', quiz);
  const scoreEl = $('#quizScore');
  const resultEl = $('#quizResult');
  let score = 0, answered = 0;

  questions.forEach(q => {
    const correct = parseInt(q.getAttribute('data-correct'), 10);
    $$('.opt-btn', q).forEach((btn, i) => {
      btn.addEventListener('click', () => {
        if (q.classList.contains('done')) return;
        q.classList.add('done');
        answered++;
        if (i === correct){ btn.classList.add('good'); score++; }
        else {
          btn.classList.add('bad');
          const good = $$('.opt-btn', q)[correct];
          if (good) good.classList.add('good');
        }
        scoreEl.textContent = score + ' / ' + questions.length;
        if (answered === questions.length){
          const msg = score === questions.length
            ? 'Module validé. Vous pouvez passer au suivant.'
            : score >= 2
              ? 'Presque : relisez les leçons où vous avez hésité, puis refaites le quiz.'
              : 'Relisez le cours calmement, puis refaites le quiz.';
          resultEl.innerHTML = '<b>' + score + ' bonne' + (score > 1 ? 's' : '') + ' réponse' + (score > 1 ? 's' : '') + ' sur ' + questions.length + '.</b> ' + msg;
          resultEl.classList.add('show');
        }
      });
    });
  });
})();
