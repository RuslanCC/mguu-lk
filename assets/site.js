/* Цифровой кампус МГУУ — поведение лендинга. Без зависимостей. */
(function () {
  'use strict';
  window.__campus = 1;

  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ───────── Модули фирменного стиля (геометрия из «линии паттерна», руководство с. 25) ───────── */

  var COL = { gray: '#6D6E71', orange: '#F58221', crimson: '#C7254B', violet: '#6362AC', blue: '#178ACB', green: '#3DB54A', yellow: '#FDB913' };
  var MOD = {
    Y: [['gray', '0,100 47.5,100 47.5,46.8 0.7,0'], ['orange', '24.1,0 50,25.9 75.9,0'], ['crimson', '99.3,0 52.5,46.8 52.5,100 100,100 100,0']],
    V: [['gray', '34.9,65.4 100,0 0,0 0,30.5'], ['violet', '0,37.6 0,100 31.3,68.9'], ['orange', '23.3,100 100,100 100,24.7']],
    G: [['gray', '0,100 51.9,100 51.9,43.2 0,0.1'], ['blue', '7.2,0 54.3,39.7 100,39.7 100,0'], ['blue', '68.4,100 100,100 100,56.4 68.4,56.4']],
    W: [['gray', '94.4,0 10.5,0 52.5,41.9'], ['green', '41.2,53.2 0,12.8 0,94.4'], ['yellow', '1.5,100 100,100 100,1.7']]
  };
  var LINE = 'YVGVWYGWVGYVGVWYGW'.split('');
  var TYPES = ['Y', 'V', 'G', 'W'];

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function mod(type, x, y, size, rot, mono, delay) {
    var s = size / 100, h = size / 2;
    var polys = MOD[type].map(function (p) {
      return '<polygon points="' + p[1] + '"' + (mono ? '' : ' fill="' + COL[p[0]] + '"') + '/>';
    }).join('');
    return '<g transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + rot + ' ' + h + ' ' + h + ') scale(' + s + ')">' +
      '<g class="m" style="--d:' + Math.round(delay) + '">' + polys + '</g></g>';
  }

  // Линия паттерна под первым экраном
  var heroLine = $('#hero-line');
  var lineCount = 0;
  function drawLine() {
    if (!heroLine) return;
    var w = heroLine.parentNode.clientWidth;
    var size = 38, gap = 2, n = Math.ceil(w / (size + gap)) + 1;
    if (n === lineCount) return;
    var fresh = lineCount === 0;
    lineCount = n;
    var out = '';
    for (var i = 0; i < n; i++) out += mod(LINE[i % LINE.length], i * (size + gap), 0, size, 0, false, fresh ? 650 + i * 24 : 0);
    heroLine.innerHTML = '<svg viewBox="0 0 ' + (n * (size + gap) - gap) + ' ' + size + '" width="' + (n * (size + gap) - gap) + '" height="' + size + '" aria-hidden="true">' + out + '</svg>';
  }
  drawLine();

  // Узоры на разворотах частей: монохромный фирменный узор (руководство, с. 20)
  $$('[data-pattern]').forEach(function (svg) {
    var seed = +svg.getAttribute('data-pattern');
    var r = rng(seed * 7919 + 13);
    var size = 124, gap = 8, out = '';
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 4; col++) {
        var t = TYPES[Math.floor(r() * 4)];
        var rot = [0, 90, 180, 270][Math.floor(r() * 4)];
        out += mod(t, col * (size + gap), row * (size + gap), size, rot, true, (col + row) * 80 + r() * 90);
      }
    }
    svg.innerHTML = out;
  });

  // Цветной узор в подвале
  var foot = $('#foot-pattern');
  var footCols = 0;
  function drawFoot() {
    if (!foot) return;
    var w = foot.parentNode.clientWidth;
    var size = w < 720 ? 44 : 64, gap = Math.max(2, Math.round(size / 20)), rows = 2;
    var cols = Math.ceil(w / (size + gap)) + 1;
    if (cols === footCols) return;
    var fresh = footCols === 0;
    footCols = cols;
    var r = rng(2026), out = '';
    for (var row = 0; row < rows; row++) {
      for (var c = 0; c < cols; c++) {
        var t = TYPES[Math.floor(r() * 4)];
        var rot = [0, 90, 180, 270][Math.floor(r() * 4)];
        out += mod(t, c * (size + gap), row * (size + gap), size, rot, false, fresh ? c * 28 + row * 90 : 0);
      }
    }
    var W = cols * (size + gap) - gap, H = rows * (size + gap) - gap;
    foot.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    foot.setAttribute('width', W);
    foot.setAttribute('height', H);
    foot.style.width = W + 'px';
    foot.innerHTML = out;
  }
  drawFoot();

  var rsz;
  window.addEventListener('resize', function () {
    clearTimeout(rsz);
    rsz = setTimeout(function () { drawLine(); drawFoot(); }, 150);
  });

  /* ───────── Появление при прокрутке ───────── */

  var revealSel = '.rv, .rv-h, .rv-line, [data-anim], .gantt, .bento, .cover, .rc, .oc';
  var revealEls = $$(revealSel);
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
          if (e.target._onIn) e.target._onIn();
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }


  /* ───────── Танграм: семь модулей платформы ───────── */

  var tg = $('#tg');
  if (tg) {
    var pcs = $$('.pc', tg);
    var START = {
      lms: [0, -130, -24], comm: [-130, 0, 18], analytics: [130, -80, 45], access: [140, 10, -45],
      integr: [0, 130, 30], cabinet: [-70, 140, -18], portfolio: [120, 120, 32]
    };
    var ORDER = ['comm', 'lms', 'access', 'integr', 'cabinet', 'portfolio', 'analytics'];
    if (!reduce && Element.prototype.animate) {
      pcs.forEach(function (p) {
        var k = p.getAttribute('data-k'), s = START[k], i = ORDER.indexOf(k);
        p.animate([
          { transform: 'translate(' + s[0] + 'px,' + s[1] + 'px) rotate(' + s[2] + 'deg) scale(.9)', opacity: 0 },
          { opacity: 1, offset: .45 },
          { transform: 'translate(0px,0px) rotate(0deg) scale(1)', opacity: 1 }
        ], { duration: 1350, delay: 200 + i * 95, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' });
      });
    }

    var TG = window.CAMPUS_PLAN || {};
    (TG.later || []).forEach(function (k) { var p = $('.pc[data-k="' + k + '"]', tg); if (p) p.classList.add('is-later'); });
    var INFO = TG.INFO || {
      lms: ['LMS и БРС', 'Своя система электронного обучения. Курсы автоматически из учебных планов 1С: материалы, задания, тесты, журнал БРС, перенос из Moodle.', 'var(--orange)'],
      comm: ['Коммуникации', 'Личные и групповые сообщения, уведомления в кабинете, push и email, опросы от администрации.', 'var(--violet)'],
      analytics: ['Аналитика', 'Дашборды для руководства и конструктор отчётов на хранилище данных.', 'var(--green)'],
      access: ['Единая учётная запись', 'Создаётся и блокируется автоматически по данным 1С; роли — по статусу, сроки — по категориям.', 'var(--blue)'],
      integr: ['Интеграция с 1С', '1С:Университет ПРОФ остаётся источником истины: данные читаются через стандартный интерфейс, без доработки конфигурации.', 'var(--gray)'],
      cabinet: ['Личный кабинет', 'Для всех ролей: расписание, успеваемость и зачётка, справки, оплата. В браузере и как приложение на телефоне.', 'var(--crimson)'],
      portfolio: ['Портфолио', 'Загрузка → проверка сотрудником → подтверждено. Используется в конкурсе грантов.', 'var(--yellow)']
    };
    var cap = $('#tg-cap'), body = $('.body', cap), defHTML = body.innerHTML, cur = null, capT;
    var setCap = function (k) {
      if (k === cur) return;
      cur = k;
      tg.classList.toggle('is-focus', !!k);
      pcs.forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-k') === k); });
      cap.style.setProperty('--c', k ? INFO[k][2] : 'var(--ink)');
      cap.classList.toggle('is-on', !!k);
      clearTimeout(capT);
      body.classList.add('is-changing');
      capT = setTimeout(function () {
        body.innerHTML = k ? '<b>' + INFO[k][0] + '</b>' + INFO[k][1] : defHTML;
        body.classList.remove('is-changing');
      }, reduce ? 0 : 140);
    };
    var lastType = 'mouse';
    pcs.forEach(function (p) {
      var k = p.getAttribute('data-k');
      p.addEventListener('pointerdown', function (e) { lastType = e.pointerType; });
      p.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') setCap(k); });
      p.addEventListener('focus', function () { setCap(k); });
      p.addEventListener('blur', function () { setCap(null); });
      p.addEventListener('click', function (e) {
        // На сенсорном экране первое касание показывает описание, второе — переходит к разделу
        if (lastType !== 'mouse' && cur !== k) { e.preventDefault(); setCap(k); }
      });
    });
    tg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') setCap(null); });
  }

  /* ───────── Шапка, прогресс, кнопка «наверх» ───────── */

  var head = $('#head'), prog = $('#progress'), toTop = $('#to-top');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || root.scrollTop;
    var max = root.scrollHeight - window.innerHeight;
    head.classList.toggle('is-scrolled', y > 8);
    prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    toTop.classList.toggle('is-on', y > window.innerHeight * 1.2);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    $('.brand').focus({ preventScroll: true });
  });

  /* ───────── Текущий раздел ───────── */

  var PART = ['var(--crimson)', 'var(--crimson)', 'var(--yellow)', 'var(--blue)'];
  var PART_NAME = ['', 'Часть 1 · Концепция и план', 'Часть 2 · Бюджет и решение', 'Часть 3 · Технические детали'];
  var nowN = $('#head-n'), nowT = $('#head-t'), swap = $('.head-now .swap');
  var tocLinks = $$('.toc a');
  var activeId = null;
  function setActive(sec) {
    if (!sec || sec.id === activeId) return;
    activeId = sec.id;
    var part = +sec.getAttribute('data-part') || 0;
    head.style.setProperty('--pc', PART[part]);
    var n = sec.getAttribute('data-spy'), t;
    if (sec.classList.contains('part')) { n = ''; t = PART_NAME[part]; }
    else if (n) { var a = $('.toc a[href="#' + sec.id + '"]'); t = a ? a.lastChild.textContent : ''; }
    else { n = ''; t = 'Цифровой кампус'; }
    swap.classList.add('is-changing');
    setTimeout(function () { nowN.textContent = n; nowT.textContent = t; swap.classList.remove('is-changing'); }, reduce ? 0 : 160);
    tocLinks.forEach(function (a) {
      if (a.getAttribute('href') === '#' + sec.id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  var spyEls = $$('[data-spy], .part');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) setActive(e.target); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    spyEls.forEach(function (s) { spy.observe(s); });
  }

  /* ───────── Меню разделов ───────── */

  var sheet = $('#sheet'), openBtn = $('#menu-open');
  var lastFocus = null;
  function sbw() { return window.innerWidth - root.clientWidth; }
  function openSheet() {
    lastFocus = d.activeElement;
    var w = sbw();
    root.style.overflow = 'hidden';
    if (w) { d.body.style.paddingRight = w + 'px'; head.style.paddingRight = w + 'px'; }
    sheet.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    var cur = $('.toc a[aria-current="true"]', sheet) || $('.toc a', sheet);
    setTimeout(function () { cur.focus({ preventScroll: true }); }, 60);
  }
  function closeSheet(restore) {
    sheet.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    root.style.overflow = '';
    d.body.style.paddingRight = '';
    head.style.paddingRight = '';
    if (restore !== false && lastFocus) lastFocus.focus({ preventScroll: true });
  }
  openBtn.addEventListener('click', openSheet);
  $$('[data-close]', sheet).forEach(function (b) { b.addEventListener('click', function () { closeSheet(); }); });
  $$('.toc a', sheet).forEach(function (a) { a.addEventListener('click', function () { closeSheet(false); }); });
  sheet.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('a, button:not([tabindex="-1"])', sheet);
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ───────── «Сегодня» на шкале проекта ───────── */

  // Страница может передать свой план: window.CAMPUS_PLAN = { M, MS, COLS, start, unit, S, ROWK, period }
  var P = window.CAMPUS_PLAN || {};
  var MONTHS = P.COLS || ['окт', 'ноя', 'дек', 'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек', 'янв', 'фев', 'мар'];
  var N = MONTHS.length;
  var today = new Date(), pos;
  if (P.unit === 'week') {
    // Недели от понедельника P.start (ГГГГ-ММ-ДД)
    var st = P.start.split('-');
    var t0 = new Date(+st[0], st[1] - 1, +st[2]), t1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    pos = Math.round((t1 - t0) / 864e5) / (N * 7);
  } else {
    var mIdx = (today.getFullYear() - 2026) * 12 + today.getMonth() - 9;
    var dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    pos = (mIdx + (today.getDate() - 1) / dim) / N;
  }
  var inRange = pos >= 0 && pos < 1;
  var gNow = $('#gantt-now');
  if (inRange) {
    var label = 'сегодня, ' + today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    gNow.title = label;
    gNow.style.setProperty('--now', pos.toFixed(4));
    gNow.classList.add('is-on');
  }

  /* ───────── Диаграмма Ганта и помесячный инспектор ───────── */

  var S = P.S || {
    o: ['О', 'var(--violet)', 'организация и ИБ'], i: ['И', 'var(--blue)', 'доступ и интеграция'], l: ['Л', 'var(--crimson)', 'кабинет'],
    u: ['У', 'var(--orange)', 'LMS', 1], a: ['А', 'var(--green)', 'аналитика', 1]
  };
  var M = P.M || [
    ['М1', 'окт 2026', [['o', 'приказ о проекте, руководящий комитет, владельцы процессов, источник средств на 2026 г., оффер техлиду до 31.10'], ['i', 'обследование 1С, Moodle и компетенций сотрудников; малая закупка облака']], 'Концепция, первые прототипы'],
    ['М2', 'ноя 2026', [['i', 'обезличенная тестовая копия 1С до 15.11, стенд в облаке, единый вход, защищённый канал'], ['o', 'класс защищённости, модель угроз, договор с лицензиатом ИБ, поток «качество данных»']], '30.11 — интерактивные прототипы', 1],
    ['М3', 'дек 2026', [['l', 'вход по единой учётке, расписание и зачётка из 1С'], ['a', 'дашборд «Контингент»'], ['o', 'конкурентная закупка площадки']], '25.12 — демо-стенд, веха В0', 1],
    ['М4', 'янв 2027', [['i', 'управление учётными записями, логины, решение по расширению 1С'], ['a', 'хранилище данных'], ['u', 'курсы из учебных планов'], ['o', 'документы по ПДн, оценка соответствия']], 'Учётки создаются автоматически'],
    ['М5', 'фев 2027', [['i', 'промышленный контур, пентест №\u00a01, двухфакторный вход'], ['l', 'уведомления, зачётка'], ['u', 'готовые электронные курсы (SCORM), перенос из Moodle']], 'Курс из Moodle в новой LMS'],
    ['М6', 'мар 2027', [['l', 'пилот кабинета с 01.03 (3–5 групп), сообщения, опросы'], ['u', 'задания, тесты, банк вопросов, журнал БРС']], 'Первые реальные пользователи', 1],
    ['М7', 'апр 2027', [['u', 'пилот LMS в ДПО с 01.04'], ['i', 'нагрузочный тест'], ['a', 'успеваемость и риск гранта, нагрузка ППС, регламентные справки']], 'Ключевые дашборды'],
    ['М8', 'май 2027', [['l', 'кабинет для всех, портфолио'], ['i', 'учётки и двухфакторный вход для всех сотрудников'], ['o', 'обучение преподавателей, первая линия']], 'Кабинет у всего университета, веха В1', 1],
    ['М9', 'июн 2027', [['l', 'летняя сессия в кабинете'], ['o', 'положение о БРС, эквайринг и касса'], ['a', 'дашборд «Оплаты»']], 'Сессия в кабинете'],
    ['М10', 'июл 2027', [['u', 'подготовка курсов 1-го курса и ДПО'], ['a', 'конструктор отчётов, дашборд «ДПО»'], ['o', 'акт приёмки кабинета']], 'Кабинет принят'],
    ['М11', 'авг 2027', [['i', 'учётки нового набора из приказов, пентест №\u00a02'], ['o', 'обучение 24–31.08, усиленная поддержка']], 'Новый набор получает доступ сам'],
    ['М12', 'сен 2027', [['u', 'LMS для ДПО, 1-го курса и добровольцев']], 'Новая LMS в работе, веха В2', 1],
    ['М13', 'окт 2027', [['l', 'оплата обучения, заявки и справки'], ['a', 'дашборд «Вовлечённость», акт по аналитике']], 'Оплата и справки в кабинете'],
    ['М14', 'ноя 2027', [['u', 'рубежные точки БРС, перенос курсов 2–4 курсов'], ['i', 'обратная запись в 1С (если согласована)'], ['a', 'дашборд «Опросы»']], 'Баллы БРС в LMS'],
    ['М15', 'дек 2027', [['u', 'зимняя сессия в новой LMS'], ['o', 'обучение преподавателей']], 'Первая сессия в LMS'],
    ['М16', 'янв 2028', [['u', 'курсы всех дисциплин'], ['i', 'реестр сервисов'], ['a', 'дашборд «Портфолио»']], 'Платформа готова к новым системам'],
    ['М17', 'фев 2028', [['u', 'LMS для всех, Moodle — только чтение'], ['o', 'передача сопровождения ИТ-службе']], 'Одна LMS для всех', 1],
    ['М18', 'мар 2028', [['o', 'приёмка LMS, документация, план второй фазы']], 'Проект завершён', 1]
  ];
  function chip(x) {
    var s = S[x];
    return '<span class="s' + (s[3] ? ' dk' : '') + '" style="--c:' + s[1] + '" title="' + s[2] + '">' + s[0] + '</span>';
  }

  // Полный список месяцев (для просмотра целиком и печати)
  var monthsBox = $('#months');
  if (monthsBox) {
    monthsBox.innerHTML = M.map(function (r) {
      var w = r[2].map(function (x) { return '<div>' + chip(x[0]) + '<span>' + x[1] + '</span></div>'; }).join('');
      return '<div class="month' + (r[4] ? ' key' : '') + '"><div class="m"><b>' + r[0] + '</b><span>' + r[1] + '</span></div><div class="w">' + w + '</div><div class="see">' + r[3] + '</div></div>';
    }).join('');
  }

  // Сетка Ганта: строки и кнопки месяцев
  var gantt = $('#gantt'), sel = $('#gantt-sel');
  var frag = d.createDocumentFragment();
  var lastRow = Math.max.apply(null, $$('.rl', gantt).map(function (x) { return parseInt(x.style.gridRow, 10); }));
  gantt.style.setProperty('--n', N);
  for (var r = 3; r <= lastRow; r++) {
    var line = d.createElement('div');
    line.className = 'cell';
    line.style.cssText = 'grid-row:' + r + ';grid-column:2 / -1;border-left:0';
    frag.appendChild(line);
  }
  var mhBtns = [];
  MONTHS.forEach(function (m, i) {
    var c = d.createElement('div');
    c.className = 'mh';
    c.style.cssText = 'grid-row:2;grid-column:' + (i + 2);
    var b = d.createElement('button');
    b.type = 'button';
    b.textContent = m;
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', M[i][0] + ', ' + M[i][1]);
    b.addEventListener('click', function () { selectMonth(i, true); });
    c.appendChild(b);
    mhBtns.push(b);
    frag.appendChild(c);
  });
  gantt.insertBefore(frag, gantt.children[5]);
  gantt.style.backgroundImage = 'linear-gradient(to right, var(--paper-3) 1px, transparent 1px)';
  gantt.style.backgroundSize = 'calc((100% - 172px) / ' + N + ') 100%';
  gantt.style.backgroundPosition = '172px 0';
  gantt.style.backgroundRepeat = 'repeat-x';

  var rail = $('#mi-rail'), tabs = [];
  rail.style.setProperty('--n', N);
  M.forEach(function (r, i) {
    var b = d.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.id = 'mi-tab-' + i;
    b.setAttribute('aria-controls', 'mi-panel');
    b.setAttribute('aria-selected', 'false');
    b.tabIndex = -1;
    if (r[4]) b.classList.add('key');
    b.innerHTML = '<b>' + r[0] + '</b><span>' + MONTHS[i] + '</span>';
    b.addEventListener('click', function () { selectMonth(i); });
    rail.appendChild(b);
    tabs.push(b);
  });
  rail.addEventListener('keydown', function (e) {
    var i = tabs.indexOf(d.activeElement);
    if (i < 0) return;
    var n = null;
    if (e.key === 'ArrowRight') n = Math.min(N - 1, i + 1);
    if (e.key === 'ArrowLeft') n = Math.max(0, i - 1);
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = N - 1;
    if (n !== null) { e.preventDefault(); selectMonth(n); tabs[n].focus(); }
  });

  var miM = $('#mi-m'), miD = $('#mi-d'), miKey = $('#mi-key'), miWorks = $('#mi-works'), miRes = $('#mi-res');
  var miPrev = $('#mi-prev'), miNext = $('#mi-next'), miPanel = $('#mi-panel');
  var anims = $$('.mi-anim'), curM = -1, miT;
  function fillMonth(i) {
    var r = M[i];
    miM.textContent = r[0];
    miD.textContent = r[1];
    miKey.hidden = !r[4];
    miWorks.innerHTML = r[2].map(function (x) { return '<li>' + chip(x[0]) + '<span>' + x[1] + '</span></li>'; }).join('');
    miRes.textContent = r[3];
  }
  function selectMonth(i, fromGantt) {
    if (i === curM) return;
    var first = curM < 0;
    curM = i;
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
    mhBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    miPanel.setAttribute('aria-labelledby', 'mi-tab-' + i);
    sel.style.setProperty('--m', i);
    miPrev.disabled = i === 0;
    miNext.disabled = i === N - 1;
    // Держим выбранный месяц в видимой части ленты
    var t = tabs[i];
    if (rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: t.offsetLeft - rail.clientWidth / 2 + t.clientWidth / 2, behavior: first || reduce ? 'auto' : 'smooth' });
    if (first || reduce) { fillMonth(i); return; }
    clearTimeout(miT);
    anims.forEach(function (a) { a.classList.add('is-changing'); });
    miT = setTimeout(function () {
      fillMonth(i);
      anims.forEach(function (a) { a.classList.remove('is-changing'); });
    }, 170);
    if (fromGantt) {
      var r = miPanel.getBoundingClientRect();
      if (r.top > window.innerHeight || r.bottom < 0) $('#mi').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
  }
  miPrev.addEventListener('click', function () { if (curM > 0) selectMonth(curM - 1); });
  miNext.addEventListener('click', function () { if (curM < N - 1) selectMonth(curM + 1); });
  selectMonth(inRange ? Math.floor(pos * N) : 0);

  /* ───────── Подсказки на диаграмме Ганта ───────── */

  // Вехи: ключ — индекс месяца (М1 = 0)
  var MS = P.MS || {
    1: ['30 ноября 2026', 'Интерактивные прототипы', 'Кликабельные прототипы кабинета студента и преподавателя, LMS с журналом БРС и дашбордов руководства — в фирменном стиле университета. Их обсуждают с владельцами процессов до начала разработки.'],
    2: ['25 декабря 2026', 'Веха В0 — демо-стенд', 'Работают вход по единой учётной записи, расписание и зачётка из 1С, дашборд «Контингент».',
      ['демо-стенд работает на тестовой копии 1С', 'площадка выбрана, требования учредителя к размещению известны'], 'Приёмка Этапа 1 и решение об Этапе 2'],
    5: ['1 марта 2027', 'Пилот личного кабинета', 'Кабинет получают 3–5 учебных групп: расписание, зачётка, уведомления, сообщения и опросы. Замечания пилота учитываются до запуска для всех.'],
    7: ['31 мая 2027', 'Веха В1 — кабинет у всего университета', 'Кабинет и портфолио — для всех студентов и сотрудников, двухфакторный вход — для всех сотрудников, преподаватели прошли обучение.',
      ['кабинет работает у всех', 'учётные записи создаются и блокируются автоматически', 'в пилоте ДПО перенесено не менее 90 % электронных курсов'], 'Приёмка Этапа 2 и решение об Этапе 3'],
    11: ['30 сентября 2027', 'Веха В2 — новая LMS в работе', 'LMS работает для ДПО, 1-го курса и добровольцев; учётные записи нового набора созданы автоматически из приказов.',
      ['LMS работает для ДПО и 1-го курса'], 'Приёмка Этапа 3 и решение о массовом переносе курсов'],
    16: ['февраль 2028', 'Одна LMS для всех', 'Курсы всех дисциплин — в новой LMS, Moodle остаётся только для чтения. Сопровождение передаётся ИТ-службе университета.'],
    17: ['март 2028', 'Приёмка проекта', 'Приёмка LMS и документации, платформа передана университету. План второй фазы: документооборот, статистика приёмной кампании, библиотека и наука.']
  };
  var ROWK = P.ROWK || { 3: 'o', 4: 'i', 5: 'l', 6: 'u', 7: 'a' }, rowName = {};
  $$('.rl', gantt).forEach(function (rl) { rowName[parseInt(rl.style.gridRow, 10)] = rl.textContent.trim(); });

  var gtip = d.createElement('div');
  gtip.className = 'gtip';
  gtip.id = 'gtip';
  gtip.setAttribute('role', 'tooltip');
  d.body.appendChild(gtip);

  function colSpan(el) {
    var c = el.style.gridColumn.split('/');
    var a = parseInt(c[0], 10) - 2, n = c[1] ? parseInt(c[1].replace('span', ''), 10) : 1;
    return [a, a + n - 1];
  }
  var period = P.period || function (a, b) {
    if (a === b) return M[a][1];
    var A = M[a][1].split(' '), B = M[b][1].split(' ');
    return A[1] === B[1] ? A[0] + ' – ' + B[0] + ' ' + B[1] : M[a][1] + ' – ' + M[b][1];
  };
  function barHTML(el) {
    var row = parseInt(el.style.gridRow, 10), k = ROWK[row], r = colSpan(el), li = '';
    for (var i = r[0]; i <= r[1]; i++) {
      M[i][2].forEach(function (x) { if (x[0] === k) li += '<li><span class="m">' + MONTHS[i] + '</span><span>' + x[1] + '</span></li>'; });
    }
    return '<b class="gtip-t">' + el.textContent + '</b>' +
      '<p class="gtip-m">' + rowName[row] + ' · ' + period(r[0], r[1]) + '</p>' +
      (li ? '<ul class="gtip-l">' + li + '</ul>' : '');
  }
  function msHTML(el) {
    var i = colSpan(el)[0], m = MS[i];
    return '<b class="gtip-t">' + m[1] + '</b>' +
      '<p class="gtip-m">' + m[0] + ' · ' + M[i][0] + '</p>' +
      '<p class="gtip-p">' + m[2] + '</p>' +
      (m[3] ? '<p class="gtip-h">Условия вехи</p><ul class="gtip-c">' + m[3].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '') +
      (m[4] ? '<p class="gtip-f">' + m[4] + '</p>' : '');
  }

  var tipFor = null, tipT, tipRaf = 0;
  function placeTip() {
    tipRaf = 0;
    if (!tipFor) return;
    var r = tipFor.getBoundingClientRect(), w = gtip.offsetWidth, h = gtip.offsetHeight, m = 12;
    if (r.bottom < 0 || r.top > window.innerHeight) { hideTip(true); return; }
    var x = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), window.innerWidth - w - m);
    var above = r.top - h - 10 >= head.offsetHeight + 8;
    gtip.style.left = Math.round(x) + 'px';
    gtip.style.top = Math.round(above ? r.top - h - 10 : r.bottom + 10) + 'px';
    gtip.classList.toggle('is-below', !above);
  }
  function showTip(el) {
    clearTimeout(tipT);
    if (tipFor === el) return;
    if (tipFor) { tipFor.removeAttribute('aria-describedby'); tipFor.classList.remove('is-tip'); }
    tipFor = el;
    var isMs = el.classList.contains('ms');
    gtip.innerHTML = isMs ? msHTML(el) : barHTML(el);
    gtip.style.setProperty('--c', isMs ? 'var(--yellow)' : el.style.getPropertyValue('--c'));
    el.setAttribute('aria-describedby', 'gtip');
    el.classList.add('is-tip');
    gantt.classList.add('has-tip');
    placeTip();
    gtip.classList.add('is-on');
  }
  function hideTip(now) {
    clearTimeout(tipT);
    tipT = setTimeout(function () {
      if (!tipFor) return;
      tipFor.removeAttribute('aria-describedby');
      tipFor.classList.remove('is-tip');
      tipFor = null;
      gantt.classList.remove('has-tip');
      gtip.classList.remove('is-on');
    }, now ? 0 : 90);
  }
  $$('.bar, .ms', gantt).forEach(function (el) {
    el.tabIndex = 0;
    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') showTip(el); });
    el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && tipFor === el) hideTip(); });
    el.addEventListener('focus', function () { showTip(el); });
    el.addEventListener('blur', function () { if (tipFor === el) hideTip(true); });
    el.addEventListener('click', function () { showTip(el); });
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tipFor) hideTip(true); });
  var queueTip = function () { if (tipFor && !tipRaf) tipRaf = requestAnimationFrame(placeTip); };
  window.addEventListener('scroll', queueTip, { passive: true });
  window.addEventListener('resize', queueTip);
  $('.gantt-wrap').addEventListener('scroll', queueTip, { passive: true });

  /* ───────── Мелочи ───────── */

  // Подписи для таблиц на узком экране
  $$('table.stack').forEach(function (t) {
    var hs = $$('thead th', t).map(function (th) { return th.textContent.trim(); });
    $$('tbody tr', t).forEach(function (tr) {
      $$('td', tr).forEach(function (td, i) { if (hs[i]) td.setAttribute('data-label', hs[i]); });
    });
  });

  // Печать: раскрыть все скрытые блоки
  window.addEventListener('beforeprint', function () {
    $$('details').forEach(function (x) { x.setAttribute('data-was', x.open ? '1' : ''); x.open = true; });
    $$(revealSel).forEach(function (el) { el.classList.add('is-in'); });
  });
  window.addEventListener('afterprint', function () {
    $$('details').forEach(function (x) { if (!x.getAttribute('data-was')) x.open = false; });
  });
})();
