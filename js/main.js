/* =========================================================================
   ИП Белицкий — скрипты сайта (ванильный JS, без библиотек)
   Контакты и настройки — в js/config.js, здесь их менять не нужно.

   Содержание:
   1. Подстановка контактов и реквизитов из config.js
   2. Шапка: уменьшение при скролле, бургер-меню
   3. Анимации появления блоков (Intersection Observer)
   4. Портфолио: фильтр и лайтбокс
   5. Слайдер «до/после»
   6. Слайдер отзывов
   7. Плавающая кнопка связи
   8. Форма заявки: маска телефона, валидация, отправка в Telegram
   ========================================================================= */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.remove('no-js');

  /* ---------- 1. КОНТАКТЫ И РЕКВИЗИТЫ ИЗ CONFIG ---------- */
  var tgUser = String(CFG.telegramUsername || '').replace(/^@/, '');
  var links = {
    phone: CFG.phoneHref ? 'tel:' + CFG.phoneHref : null,
    telegram: tgUser ? 'https://t.me/' + tgUser : null,
    max: CFG.maxUrl || null
  };
  var values = Object.assign({}, CFG, { telegramHandle: tgUser ? '@' + tgUser : '' });

  $$('[data-link]').forEach(function (el) {
    var href = links[el.getAttribute('data-link')];
    if (href) el.setAttribute('href', href);
  });
  $$('[data-cfg]').forEach(function (el) {
    var v = values[el.getAttribute('data-cfg')];
    if (v !== undefined && v !== '') el.textContent = v;
  });
  $$('[data-price]').forEach(function (el) {
    var v = CFG.prices && CFG.prices[el.getAttribute('data-price')];
    if (v) el.textContent = v;
  });

  // Обновляем микроразметку Schema.org актуальным телефоном и ссылками
  var schemaEl = $('#schema-org');
  if (schemaEl) {
    try {
      var schema = JSON.parse(schemaEl.textContent);
      if (CFG.phoneHref) schema.telephone = CFG.phoneHref;
      if (CFG.ownerName) schema.legalName = 'ИП Белицкий ' + CFG.ownerName;
      if (CFG.inn) schema.taxID = CFG.inn;
      schema.sameAs = [links.telegram, links.max].filter(Boolean);
      schemaEl.textContent = JSON.stringify(schema);
    } catch (e) { /* разметка останется как в HTML */ }
  }

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- 2. ШАПКА И БУРГЕР-МЕНЮ ---------- */
  var header = $('#header');
  var burger = $('#burger');
  var nav = $('#nav');

  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  // Закрываем меню при клике по пункту (плавная прокрутка — через CSS scroll-behavior)
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* ---------- 3. АНИМАЦИИ ПОЯВЛЕНИЯ ---------- */
  var revealEls = $$('.reveal');
  // Лёгкая «лесенка» для элементов внутри одной сетки
  $$('.grid, .gallery, .timeline').forEach(function (group) {
    $$('.reveal', group).forEach(function (el, i) { el.style.setProperty('--delay', (i % 4) * 0.08 + 's'); });
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 4. ПОРТФОЛИО: ФИЛЬТР И ЛАЙТБОКС ---------- */
  var filterBtns = $$('.filters__btn');
  var galleryItems = $$('.gallery__item');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      filterBtns.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      galleryItems.forEach(function (item) {
        var show = f === 'all' || item.getAttribute('data-category') === f;
        item.classList.toggle('is-hidden', !show);
        if (show) item.classList.add('is-visible');
      });
    });
  });

  var lightbox = $('#lightbox');
  var lbImg = $('.lightbox__img', lightbox);
  var lbCaption = $('.lightbox__caption', lightbox);
  var lbIndex = 0;
  var lbList = [];
  var lbReturnFocus = null;

  function visibleGalleryButtons() {
    return galleryItems.filter(function (i) { return !i.classList.contains('is-hidden'); })
      .map(function (i) { return $('.gallery__btn', i); });
  }
  function showLightbox(i) {
    lbIndex = (i + lbList.length) % lbList.length;
    var btn = lbList[lbIndex];
    var img = $('img', btn);
    lbImg.src = btn.getAttribute('data-full') || img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = btn.getAttribute('data-caption') || '';
  }
  function openLightbox(btn) {
    lbList = visibleGalleryButtons();
    lbReturnFocus = btn;
    showLightbox(lbList.indexOf(btn));
    lightbox.hidden = false;
    document.body.classList.add('is-locked');
    $('.lightbox__close', lightbox).focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    document.body.classList.remove('is-locked');
    if (lbReturnFocus) lbReturnFocus.focus();
  }
  $$('.gallery__btn').forEach(function (btn) {
    btn.addEventListener('click', function () { openLightbox(btn); });
  });
  $('.lightbox__close', lightbox).addEventListener('click', closeLightbox);
  $('.lightbox__nav--prev', lightbox).addEventListener('click', function () { showLightbox(lbIndex - 1); });
  $('.lightbox__nav--next', lightbox).addEventListener('click', function () { showLightbox(lbIndex + 1); });
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox || e.target.classList.contains('lightbox__figure')) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
    if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
    if (e.key === 'Tab') { // держим фокус внутри лайтбокса
      var f = $$('button', lightbox);
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // Свайп в лайтбоксе на телефоне
  var touchX = null;
  lightbox.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showLightbox(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- 5. СЛАЙДЕР «ДО/ПОСЛЕ» ---------- */
  var compare = $('#compare');
  if (compare) {
    var range = $('.compare__range', compare);
    var setPos = function () { compare.style.setProperty('--pos', range.value + '%'); };
    range.addEventListener('input', setPos);
    setPos();
  }

  /* ---------- 6. СЛАЙДЕР ОТЗЫВОВ ---------- */
  var track = $('#reviews-track');
  if (track) {
    var slides = $$('.review', track);
    var prev = $('#reviews-prev');
    var next = $('#reviews-next');
    var dotsWrap = $('#reviews-dots');
    var step = function () {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return slides[0].getBoundingClientRect().width + gap;
    };
    slides.forEach(function () {
      var d = document.createElement('span');
      d.className = 'reviews__dot';
      dotsWrap.appendChild(d);
    });
    var dots = $$('.reviews__dot', dotsWrap);
    var update = function () {
      var maxScroll = track.scrollWidth - track.clientWidth - 2;
      var i = Math.round(track.scrollLeft / step());
      if (track.scrollLeft >= maxScroll) i = slides.length - 1;
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxScroll;
    };
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- 7. ПЛАВАЮЩАЯ КНОПКА СВЯЗИ ---------- */
  var fabToggle = $('#fab-toggle');
  var fabMenu = $('#fab-menu');
  function setFab(open) {
    fabToggle.setAttribute('aria-expanded', String(open));
    fabMenu.hidden = !open;
  }
  fabToggle.addEventListener('click', function () { setFab(fabMenu.hidden); });
  $$('a', fabMenu).forEach(function (a) { a.addEventListener('click', function () { setFab(false); }); });
  document.addEventListener('click', function (e) { if (!fabMenu.hidden && !$('#fab').contains(e.target)) setFab(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !fabMenu.hidden) { setFab(false); fabToggle.focus(); } });

  /* ---------- 8. ФОРМА ЗАЯВКИ ---------- */
  var form = $('#lead-form');
  var phoneInput = $('#phone-input');
  var statusEl = $('#form-status');

  // Маска +7 (XXX) XXX-XX-XX
  function formatPhone(value) {
    var d = value.replace(/\D/g, '');
    if (/^\s*\+7/.test(value)) {
      d = d.slice(1);                      // убираем код страны из префикса «+7»
      if (d === '8' || d === '7') d = '';  // человек по привычке начал набор с 8 или 7
    } else if (/^[78]/.test(d)) {
      d = d.slice(1);                      // вставили номер вида 8XXXXXXXXXX или 7XXXXXXXXXX
    }
    d = d.slice(0, 10);
    var out = '+7';
    if (d.length > 0) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  }
  function phoneDigits(value) { return value.replace(/\D/g, '').replace(/^[78]/, ''); }

  phoneInput.addEventListener('focus', function () { if (!phoneInput.value) phoneInput.value = '+7 '; });
  phoneInput.addEventListener('blur', function () { if (phoneDigits(phoneInput.value).length === 0) phoneInput.value = ''; });
  phoneInput.addEventListener('input', function (e) {
    // При стирании убираем «хвост» из скобок, пробелов и дефисов, чтобы курсор не застревал
    if (e.inputType && e.inputType.indexOf('delete') === 0) {
      phoneInput.value = phoneInput.value.replace(/[\s()\-]+$/, '');
      return;
    }
    phoneInput.value = formatPhone(phoneInput.value);
  });

  function setError(field, msg) {
    var wrap = field.closest('.field');
    wrap.classList.toggle('is-invalid', !!msg);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $('.field__error', wrap).textContent = msg || '';
  }
  function validate() {
    var ok = true;
    var name = form.elements.name;
    var obj = form.elements.object;
    if (name.value.trim().length < 2) { setError(name, 'Укажите, как к вам обращаться'); ok = false; } else setError(name);
    if (phoneDigits(phoneInput.value).length !== 10) { setError(phoneInput, 'Введите номер полностью: +7 (XXX) XXX-XX-XX'); ok = false; } else setError(phoneInput);
    if (!obj.value) { setError(obj, 'Выберите тип объекта'); ok = false; } else setError(obj);
    return ok;
  }
  // Убираем ошибку, как только пользователь начал исправлять
  ['name', 'phone', 'object'].forEach(function (n) {
    form.elements[n].addEventListener(n === 'object' ? 'change' : 'input', function () {
      if (form.elements[n].closest('.field').classList.contains('is-invalid')) validate();
    });
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function sendLead(data) {
    var tg = CFG.telegram || {};

    // Вариант 1: серверный посредник (токен скрыт на сервере)
    if (tg.proxyUrl) {
      return fetch(tg.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.ok === false) throw new Error('proxy'); }); });
    }

    // Вариант 2: напрямую в Telegram Bot API (токен виден в коде страницы!)
    if (tg.botToken && tg.chatId) {
      var text = [
        '<b>🏠 Новая заявка с сайта</b>',
        '',
        '<b>Имя:</b> ' + escapeHtml(data.name),
        '<b>Телефон:</b> ' + escapeHtml(data.phone),
        '<b>Объект:</b> ' + escapeHtml(data.object),
        data.comment ? '<b>Комментарий:</b> ' + escapeHtml(data.comment) : '',
        '',
        '<i>' + escapeHtml(data.page) + '</i>'
      ].filter(function (l, i, arr) { return l !== '' || arr[i - 1] !== ''; }).join('\n');

      return fetch('https://api.telegram.org/bot' + tg.botToken + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tg.chatId, text: text, parse_mode: 'HTML' })
      }).then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.description || 'telegram'); });
    }

    return Promise.reject(new Error('not-configured'));
  }

  function showStatus(type, html) {
    statusEl.className = 'form__status is-' + type;
    statusEl.innerHTML = html;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusEl.className = 'form__status';
    statusEl.textContent = '';
    if (!validate()) {
      var firstInvalid = $('.field.is-invalid .field__input', form);
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    if (form.elements.website.value) return; // сработала ловушка для ботов

    var btn = $('button[type="submit"]', form);
    var btnText = $('.btn__text', btn);
    btn.disabled = true;
    btnText.textContent = 'Отправляем…';

    sendLead({
      name: form.elements.name.value.trim(),
      phone: phoneInput.value,
      object: form.elements.object.value,
      comment: form.elements.comment.value.trim(),
      page: location.href
    }).then(function () {
      form.reset();
      showStatus('success', 'Спасибо! Заявка отправлена — скоро перезвоним.');
    }).catch(function (err) {
      if (err && err.message === 'not-configured') console.warn('Отправка заявок не настроена: заполните telegram в js/config.js');
      var phone = escapeHtml(CFG.phoneDisplay || '');
      showStatus('error', 'Не получилось отправить заявку. Позвоните нам' +
        (links.phone ? ': <a href="' + links.phone + '"><u>' + phone + '</u></a>' : '') +
        ' или напишите в Telegram / MAX — кнопки рядом.');
    }).then(function () {
      btn.disabled = false;
      btnText.textContent = 'Отправить заявку';
    });
  });
})();
