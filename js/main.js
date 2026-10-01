(() => {
  'use strict';

  const CONFIG = {
    email: 'luispyim@icloud.com',
    whatsapp: '5511947849239',
    // Formulários enviados via FormSubmit (https://formsubmit.co). No primeiro envio,
    // o FormSubmit manda um email de ativação para o endereço abaixo — basta confirmar.
    formEndpoint: 'https://formsubmit.co/ajax/luispyim@icloud.com',
    demoUrl: 'https://demo-menu-luis.vercel.app/',
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- Header ---------- */

  const header = $('.site-header');
  const navToggle = $('.nav-toggle');

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    header.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  navToggle?.addEventListener('click', () => setMenu(!header.classList.contains('nav-open')));
  $$('.mobile-menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('nav-open')) setMenu(false);
  });

  /* ---------- Animação de entrada ---------- */

  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Link ativo no menu ---------- */

  const navLinks = $$('.nav-links a');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${entry.target.id}`)));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Ano no rodapé ---------- */

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Formulários ---------- */

  const fallbackHtml = `Não foi possível enviar agora. Tente de novo ou escreva para <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>.`;

  const setStatus = (el, message, type, html = false) => {
    if (!el) return;
    el.classList.remove('is-success', 'is-error');
    if (type) el.classList.add(`is-${type}`);
    if (html) el.innerHTML = message;
    else el.textContent = message;
  };

  const sendForm = async (payload) => {
    const res = await fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ _captcha: 'false', _template: 'table', ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data.success) === 'false') throw new Error(data.message || 'Falha no envio');
    return data;
  };

  const submitWith = async (form, statusEl, payload, successMessage) => {
    const button = $('button[type="submit"]', form);
    // Honeypot preenchido = robô. Finge sucesso e não envia nada.
    if ($('[name="_honey"]', form)?.value) {
      form.reset();
      setStatus(statusEl, successMessage, 'success');
      return;
    }
    button.disabled = true;
    button.classList.add('is-loading');
    setStatus(statusEl, 'Enviando…');
    try {
      await sendForm(payload);
      form.reset();
      setStatus(statusEl, successMessage, 'success');
    } catch {
      setStatus(statusEl, fallbackHtml, 'error', true);
    } finally {
      button.disabled = false;
      button.classList.remove('is-loading');
    }
  };

  // "Deixe seu email"
  $$('[data-lead-form]').forEach((form) => {
    const statusEl = document.getElementById(form.dataset.status);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const email = form.elements.email.value.trim();
      submitWith(form, statusEl, {
        _subject: 'Lumenu — novo interessado',
        email,
        origem: form.dataset.origin || 'Site',
      }, 'Prontinho! Em breve você recebe uma apresentação do Lumenu.');
    });
  });

  // Formulário de contato
  const contactForm = $('#contactForm');
  if (contactForm) {
    const statusEl = $('#status-contact');
    const select = $('#cf-interesse');
    const phone = $('#cf-whatsapp');

    const selectedPlan = () => (select.value ? select.options[select.selectedIndex].text : '');

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }
      const f = contactForm.elements;
      submitWith(contactForm, statusEl, {
        _subject: `Lumenu — contato pelo site (${selectedPlan()})`,
        nome: f.nome.value.trim(),
        restaurante: f.restaurante.value.trim(),
        email: f.email.value.trim(),
        whatsapp: f.whatsapp.value.trim(),
        interesse: selectedPlan(),
        mensagem: f.mensagem.value.trim(),
      }, 'Mensagem enviada! Vamos responder o quanto antes.');
    });

    // Monta a mensagem com o que já foi preenchido e abre o WhatsApp
    $('[data-whatsapp-form]', contactForm).addEventListener('click', () => {
      const f = contactForm.elements;
      const nome = f.nome.value.trim();
      const restaurante = f.restaurante.value.trim();
      const mensagem = f.mensagem.value.trim();
      const parts = ['Olá! Vim pelo site do Lumenu.'];
      if (nome) parts.push(`Meu nome é ${nome}${restaurante ? `, do ${restaurante}` : ''}.`);
      if (select.value) parts.push(`Tenho interesse em: ${selectedPlan()}.`);
      if (mensagem) parts.push(mensagem);
      window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(parts.join(' '))}`, '_blank', 'noopener');
    });

    // Botões dos planos já escolhem o plano no formulário
    $$('[data-plan]').forEach((btn) => {
      btn.addEventListener('click', () => {
        select.value = btn.dataset.plan;
        setTimeout(() => $('#cf-nome').focus({ preventScroll: true }), 700);
      });
    });

    // Máscara simples de telefone: (11) 91234-5678
    phone.addEventListener('input', (e) => {
      if (e.inputType && e.inputType.startsWith('delete')) return;
      const d = phone.value.replace(/\D/g, '').slice(0, 11);
      let out = d;
      if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length > 6 && d.length <= 10) out = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      if (d.length === 11) out = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
      phone.value = out;
    });
  }

  /* ---------- Demonstração: janela estilo macOS ---------- */

  const win = $('#macWindow');
  if (win) {
    const body = $('.mac-body', win);
    const iframe = $('iframe', win);
    const maxBtn = $('.tl-max', win);
    const closedState = $('#macClosed');
    const minState = $('#macMinimized');
    let backdrop = null;

    iframe.addEventListener('load', () => body.classList.add('is-loaded'));

    const reloadDemo = () => {
      body.classList.remove('is-loaded');
      iframe.src = CONFIG.demoUrl;
    };

    const setWindowState = (state) => {
      win.classList.toggle('is-closed', state === 'closed');
      win.classList.toggle('is-minimized', state === 'minimized');
      win.inert = state !== 'open';
      closedState.classList.toggle('is-active', state === 'closed');
      closedState.inert = state !== 'closed';
      minState.classList.toggle('is-active', state === 'minimized');
      minState.inert = state !== 'minimized';
    };

    // Tela cheia: usa a Fullscreen API e, se não houver (ex.: iPhone), expande a janela na página.
    const setExpanded = (on) => {
      win.classList.toggle('is-expanded', on);
      document.body.classList.toggle('demo-expanded', on);
      if (on) {
        backdrop = document.createElement('div');
        backdrop.className = 'demo-backdrop';
        backdrop.addEventListener('click', () => setExpanded(false));
        document.body.appendChild(backdrop);
      } else {
        backdrop?.remove();
        backdrop = null;
      }
      updateMaxLabel();
    };

    const isMaximized = () => document.fullscreenElement === win || win.classList.contains('is-expanded');

    const updateMaxLabel = () => {
      const label = isMaximized() ? 'Sair da tela cheia' : 'Tela cheia';
      maxBtn.setAttribute('aria-label', label);
      maxBtn.title = label;
    };

    const exitMaximized = async () => {
      if (document.fullscreenElement === win) await document.exitFullscreen().catch(() => {});
      if (win.classList.contains('is-expanded')) setExpanded(false);
    };

    const toggleMaximized = async () => {
      if (isMaximized()) {
        await exitMaximized();
        return;
      }
      if (win.requestFullscreen && document.fullscreenEnabled) {
        // Alguns navegadores embutidos nunca respondem ao pedido; após 600 ms, cai no modo expandido.
        const entered = await Promise.race([
          win.requestFullscreen().then(() => true, () => false),
          new Promise((resolve) => setTimeout(() => resolve(false), 600)),
        ]);
        if (entered || document.fullscreenElement === win) return;
      }
      setExpanded(true);
    };

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement === win && win.classList.contains('is-expanded')) setExpanded(false);
      updateMaxLabel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && win.classList.contains('is-expanded')) setExpanded(false);
    });

    $('.tl-close', win).addEventListener('click', async () => {
      await exitMaximized();
      setWindowState('closed');
      $('[data-demo-reopen]').focus({ preventScroll: true });
    });

    $('.tl-min', win).addEventListener('click', async () => {
      await exitMaximized();
      setWindowState('minimized');
      $('[data-demo-restore]').focus({ preventScroll: true });
    });

    maxBtn.addEventListener('click', toggleMaximized);

    // Reabrir depois de fechar começa do zero, como um app de verdade
    $('[data-demo-reopen]').addEventListener('click', () => {
      reloadDemo();
      setWindowState('open');
      $('.tl-close', win).focus({ preventScroll: true });
    });

    // Restaurar do Dock mantém onde o usuário estava
    $('[data-demo-restore]').addEventListener('click', () => {
      setWindowState('open');
      $('.tl-min', win).focus({ preventScroll: true });
    });

    $('[data-demo-reload]', win).addEventListener('click', reloadDemo);

    const deviceButtons = $$('.seg button', win);
    deviceButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        body.dataset.device = btn.dataset.device;
        deviceButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      });
    });
  }
})();
