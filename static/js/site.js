/**
 * Site chrome — mobile nav, share buttons, copy-to-clipboard (BibTeX),
 * active-section highlighting and scroll-reveal animations.
 */
(function () {
  'use strict';

  const SHARE_URL = 'https://cobe-benchmark.github.io';
  const SHARE_TEXT =
    'CoBe: a new benchmark for counterfactual text editing. Frontier LLMs score only ~54%. Can your model do better?';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    /* ---- mobile nav ---- */
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('is-open'));
      links.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => links.classList.remove('is-open'))
      );
    }

    /* ---- share buttons ---- */
    const url = encodeURIComponent(SHARE_URL);
    const text = encodeURIComponent(SHARE_TEXT);
    const intents = {
      'share-x': 'https://twitter.com/intent/tweet?text=' + text + '&url=' + url,
      'share-linkedin': 'https://www.linkedin.com/sharing/share-offsite/?url=' + url,
      'share-bluesky': 'https://bsky.app/intent/compose?text=' + text + '%20' + url,
    };
    Object.entries(intents).forEach(([id, href]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          window.open(href, '_blank', 'noopener,width=600,height=520');
        });
      }
    });
    const copyLink = document.getElementById('share-copy');
    if (copyLink) {
      copyLink.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(SHARE_URL);
          const label = copyLink.querySelector('.share-label');
          if (label) {
            const prev = label.textContent;
            label.textContent = 'Link copied!';
            setTimeout(() => (label.textContent = prev), 1800);
          }
        } catch (e) { /* ignore */ }
      });
    }

    /* ---- copy bibtex ---- */
    const citeCopy = document.getElementById('cite-copy');
    const citeBlock = document.getElementById('cite-block');
    if (citeCopy && citeBlock) {
      citeCopy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(citeBlock.textContent.trim());
          citeCopy.classList.add('is-done');
          citeCopy.textContent = 'Copied!';
          setTimeout(() => {
            citeCopy.classList.remove('is-done');
            citeCopy.textContent = 'Copy';
          }, 1800);
        } catch (e) { /* ignore */ }
      });
    }

    /* ---- scroll reveal ---- */
    const revealEls = document.querySelectorAll('.reveal-up');
    if ('IntersectionObserver' in window && revealEls.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('in'));
    }

    /* ---- active section highlight ---- */
    const sections = document.querySelectorAll('section[id]');
    const navMap = {};
    document.querySelectorAll('.navbar-links a[href^="#"]').forEach((a) => {
      navMap[a.getAttribute('href').slice(1)] = a;
    });
    if ('IntersectionObserver' in window && sections.length) {
      const so = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const link = navMap[entry.target.id];
            if (!link) return;
            if (entry.isIntersecting) {
              Object.values(navMap).forEach((l) => l.classList.remove('is-current'));
              link.classList.add('is-current');
            }
          });
        },
        { rootMargin: '-45% 0px -50% 0px' }
      );
      sections.forEach((s) => so.observe(s));
    }
  });
})();
