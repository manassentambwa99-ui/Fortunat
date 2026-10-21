(function(){
  "use strict";
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------------- header ---------------- */
  const header = $('#header');
  const onScroll = () => {
    if (window.scrollY > 24) header.classList.add('shrunk');
    else header.classList.remove('shrunk');
    updateRail();
  };
  window.addEventListener('scroll', onScroll, {passive:true});

  /* ---------------- burger ---------------- */
  const burger = $('#burger'), menu = $('#mobileMenu');
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open'); burger.classList.remove('open');
    burger.setAttribute('aria-expanded','false');
  }));

  /* ---------------- rail : page courante + sections de la page ---------------- */
  const railItems = $$('.rail-item');
  const railMark = $('#railMark');
  const page = document.body.getAttribute('data-page') || '';
  const pageToRail = { academie:'academie', cours:'academie', croissance:'croissance', diagnostic:'diagnostic' };
  const scrollSections = ['chef','contact'].map(id => document.getElementById(id)).filter(Boolean);
  function updateRail(){
    let current = pageToRail[page] || null;
    const y = window.scrollY + window.innerHeight * 0.34;
    scrollSections.forEach(s => { if (s.offsetTop <= y) current = s.id; });
    railItems.forEach(it => {
      const on = it.dataset.rail === current;
      it.classList.toggle('active', on);
      if (on && railMark){
        const r = it.getBoundingClientRect(), rr = it.closest('.rail').getBoundingClientRect();
        railMark.style.top = (r.top - rr.top) + 'px';
        railMark.style.height = r.height + 'px';
      }
    });
    if (!current && railMark) railMark.style.height = '0px';
  }
  updateRail();

  /* ---------------- accordion registre ---------------- */
  $$('.row-head').forEach(head => {
    const row = head.closest('.row');
    const toggle = () => {
      const open = row.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
  const firstRow = $('.row');
  if (firstRow) { firstRow.classList.add('open'); $('.row-head', firstRow).setAttribute('aria-expanded','true'); }

  /* ---------------- animations d'entrée ---------------- */
  if (window.gsap && window.ScrollTrigger && !reduce){
    gsap.registerPlugin(ScrollTrigger);
    $$('.reveal').forEach((el, i) => {
      gsap.fromTo(el, {y: 26, opacity: 0}, {
        y: 0, opacity: 1, duration: .85, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        delay: (i % 4) * 0.06
      });
    });
    const heroMedia = $('.hero-media img');
    if (heroMedia){
      gsap.fromTo(heroMedia, {scale: 1.12}, {scale: 1, duration: 1.7, ease: 'power3.out'});
    }
    if ($('.hero-plate')) gsap.fromTo('.hero-plate', {y: 34, opacity: 0}, {y: 0, opacity: 1, duration: .95, ease: 'power3.out', delay: .22});
    if ($('.hero-title')) gsap.fromTo('.hero-title', {y: 30, opacity: 0}, {y: 0, opacity: 1, duration: 1, ease: 'power3.out'});
  }

  /* filet de sécurité : rien ne doit rester invisible si une animation échoue */
  setTimeout(() => {
    $$('.reveal, .hero-plate, .hero-title').forEach(el => {
      const r = el.getBoundingClientRect();
      if (parseFloat(getComputedStyle(el).opacity) < 0.06 && r.top < window.innerHeight && r.bottom > 0){
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
  }, 2800);

  onScroll();
  window.addEventListener('resize', updateRail);
})();
