// Fallback para páginas exportadas do Framer em hospedagem estática.
// Se o runtime original não carregar, elementos de "appear" ficam presos
// em opacity: 0.001/0 e a página parece quebrada.

const FRAMER_HIDDEN_SELECTOR = [
  "[data-framer-appear-id]",
  '[style*="opacity:0.001"]',
  '[style*="opacity: 0.001"]',
  '[style*="opacity:0;"]',
  '[style*="opacity: 0;"]',
].join(", ");

const MARQUEE_SECTION_SELECTOR = [
  'section[style*="mask-image:linear-gradient"]',
  'section[style*="mask-image: linear-gradient"]',
  'section[style*="-webkit-mask-image:linear-gradient"]',
  'section[style*="-webkit-mask-image: linear-gradient"]',
].join(", ");

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const FRAMER_APPEAR_PRESETS = {
  "4z9oyd": { x: -150, stiffness: 400, damping: 100 },
  "1muv076": { x: -150, stiffness: 400, damping: 100 },
  "1tvyzvo": { x: -150, stiffness: 400, damping: 100 },
  "1s8bh6": { y: -50, stiffness: 140, damping: 30 },
  "14j7di0": { y: -50, stiffness: 140, damping: 30 },
  "19pr6f0": { y: -50, stiffness: 140, damping: 30 },
  "15qdjdx": { y: 40, delay: 300, stiffness: 320, damping: 60 },
};

function isInsideMarquee(el) {
  return el.matches?.(MARQUEE_SECTION_SELECTOR) || el.closest?.(MARQUEE_SECTION_SELECTOR);
}

function revealFramerAppearElements(root = document, animated = true) {
  const elements = [];

  if (root.matches?.(FRAMER_HIDDEN_SELECTOR)) elements.push(root);

  root.querySelectorAll(FRAMER_HIDDEN_SELECTOR).forEach((el) => {
    elements.push(el);
  });

  prepareAppearElements(elements, animated);

  if (!animated || prefersReducedMotion() || !("IntersectionObserver" in window)) {
    elements.forEach((el) => revealElement(el, false));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealElement(entry.target, true);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  elements.forEach((el) => {
    if (isInsideMarquee(el)) {
      revealElement(el, false);
      return;
    }

    el.style.visibility = "visible";

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
      revealElement(el, true);
      return;
    }

    observer.observe(el);
  });
}

function prepareAppearElements(elements, animated) {
  if (!animated || prefersReducedMotion()) return;

  const groupCounts = new WeakMap();

  elements.forEach((el) => {
    if (isInsideMarquee(el) || el.dataset.staticAppearReady === "true") return;

    const group = el.parentElement || document.body;
    const index = groupCounts.get(group) || 0;
    groupCounts.set(group, index + 1);

    const preset = FRAMER_APPEAR_PRESETS[el.dataset.framerAppearId || ""];
    const transform = el.style.transform || transformFromPreset(preset);
    const distance = appearDistance(transform);
    const duration = preset
      ? springLikeDuration(preset.stiffness, preset.damping, distance)
      : Math.max(520, Math.min(980, 520 + distance * 3));
    const delay = preset?.delay ?? Math.min(index * 70, 280);

    el.dataset.staticAppearReady = "true";
    if (!el.style.transform && transform) el.style.transform = transform;
    el.style.transition = [
      el.style.transition,
      `opacity ${Math.round(duration * 0.72)}ms ease ${delay}ms`,
      `transform ${Math.round(duration)}ms cubic-bezier(.16, 1, .3, 1) ${delay}ms`,
      `filter ${Math.round(duration)}ms ease ${delay}ms`,
    ]
      .filter(Boolean)
      .join(", ");

    if (transform && transform !== "none") {
      el.style.filter = distance >= 80 ? "blur(2px)" : "";
    }
  });
}

function transformFromPreset(preset) {
  if (!preset) return "";

  const parts = [];
  if (preset.x) parts.push(`translateX(${preset.x}px)`);
  if (preset.y) parts.push(`translateY(${preset.y}px)`);
  return parts.join(" ");
}

function springLikeDuration(stiffness = 260, damping = 60, distance = 40) {
  const stiffnessFactor = stiffness >= 380 ? 0.82 : 1;
  const dampingFactor = damping <= 35 ? 1.12 : 1;
  return Math.round(Math.max(520, Math.min(980, (620 + distance * 2.2) * stiffnessFactor * dampingFactor)));
}

function appearDistance(transform) {
  if (!transform || transform === "none") return 40;

  const values = [...transform.matchAll(/translate[XY]?\((-?\d+(?:\.\d+)?)px?\)/g)].map((m) =>
    Math.abs(Number(m[1]))
  );

  if (!values.length) return 40;
  return Math.max(...values);
}

function revealElement(el, animated = true) {
  const shouldAnimate =
    animated &&
    !prefersReducedMotion() &&
    !isInsideMarquee(el) &&
    el.style.opacity !== "1";

  if (shouldAnimate) {
    el.style.transition ||= "opacity 560ms ease, transform 760ms cubic-bezier(.16, 1, .3, 1)";
  }

  el.style.visibility = "visible";
  el.style.willChange = shouldAnimate ? "opacity, transform" : "auto";

  requestAnimationFrame(() => {
    el.style.opacity = "1";
    if (!isInsideMarquee(el)) {
      el.style.transform = "none";
      el.style.filter = "";
    }
    if (shouldAnimate) {
      window.setTimeout(() => {
        el.style.willChange = "auto";
      }, 750);
    }
  });
}

function injectMarqueeStyles() {
  if (document.getElementById("static-framer-fallback-styles")) return;

  const style = document.createElement("style");
  style.id = "static-framer-fallback-styles";
  style.textContent = `
    @keyframes static-marquee-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(calc(-1 * var(--static-marquee-distance, 50%))); }
    }

    .static-marquee-track {
      animation: static-marquee-scroll var(--static-marquee-duration, 28s) linear infinite;
      will-change: transform;
    }

    .static-marquee:hover .static-marquee-track {
      animation-play-state: paused;
    }

    @media (prefers-reduced-motion: reduce) {
      .static-marquee-track {
        animation: none;
        transform: none;
      }
    }

    .static-menu-trigger {
      appearance: none;
      -webkit-appearance: none;
      align-items: center;
      background: var(--token-ee1f61cb-8e6c-418e-b98b-0b2968f40164, #a60f9c);
      border: 0;
      border-radius: 999px;
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      height: 44px;
      justify-content: center;
      padding: 0;
      position: relative;
      width: 44px;
    }

    .static-menu-trigger span,
    .static-menu-trigger::before,
    .static-menu-trigger::after {
      background: currentColor;
      border-radius: 999px;
      content: "";
      display: block;
      height: 2px;
      position: absolute;
      transition: transform 220ms ease, opacity 180ms ease;
      width: 18px;
    }

    .static-menu-trigger::before { transform: translateY(-6px); }
    .static-menu-trigger::after { transform: translateY(6px); }

    .static-menu-open .static-menu-trigger span { opacity: 0; }
    .static-menu-open .static-menu-trigger::before { transform: rotate(45deg); }
    .static-menu-open .static-menu-trigger::after { transform: rotate(-45deg); }

    .static-mobile-menu {
      background: rgba(44, 4, 28, 0.32);
      inset: 0;
      opacity: 0;
      pointer-events: none;
      position: fixed;
      transition: opacity 220ms ease;
      z-index: 2147480000;
    }

    .static-mobile-menu[aria-hidden="false"] {
      opacity: 1;
      pointer-events: auto;
    }

    .static-mobile-menu__panel {
      background: var(--token-78700829-9deb-4139-a514-ce0eb43d703b, #ffedfb);
      border-bottom-left-radius: 24px;
      border-bottom-right-radius: 24px;
      box-shadow: 0 24px 80px rgba(44, 4, 28, 0.18);
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 340px;
      padding: 24px;
      transform: translateY(-20px);
      transition: transform 240ms cubic-bezier(.22, 1, .36, 1);
    }

    .static-mobile-menu[aria-hidden="false"] .static-mobile-menu__panel {
      transform: translateY(0);
    }

    .static-mobile-menu__top {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .static-mobile-menu__brand {
      color: var(--token-ee1f61cb-8e6c-418e-b98b-0b2968f40164, #a60f9c);
      font: 500 20px/1.25 Raleway, sans-serif;
      text-decoration: none;
    }

    .static-mobile-menu__close {
      background: #fff;
      border: 0;
      border-radius: 999px;
      color: var(--token-d6376f5b-0896-4d8d-8a71-1f8876d694f4, #725798);
      cursor: pointer;
      font: 26px/1 sans-serif;
      height: 44px;
      width: 44px;
    }

    .static-mobile-menu__link {
      border-radius: 16px;
      color: var(--token-d6376f5b-0896-4d8d-8a71-1f8876d694f4, #725798);
      font: 500 28px/1.2 Raleway, sans-serif;
      padding: 14px 4px;
      text-decoration: none;
      transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
    }

    .static-mobile-menu__link:hover,
    .static-mobile-menu__link:focus-visible {
      background: rgba(166, 15, 156, 0.08);
      color: var(--token-ee1f61cb-8e6c-418e-b98b-0b2968f40164, #a60f9c);
      outline: none;
      transform: translateX(4px);
    }

    .static-menu-open {
      overflow: hidden;
    }

    .static-social-icon {
      align-items: center;
      color: #fff;
      display: inline-flex;
      font: 700 12px/1 Raleway, sans-serif;
      height: 100%;
      justify-content: center;
      letter-spacing: 0;
      width: 100%;
    }

    a[class*="framer-"] {
      transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
    }

    a[class*="framer-"].hover {
      filter: brightness(1.03);
    }
  `;
  document.head.append(style);
}

function setupStaticMarquees() {
  injectMarqueeStyles();

  document.querySelectorAll(MARQUEE_SECTION_SELECTOR).forEach((section) => {
    const track = section.querySelector("ul");
    if (!track || track.dataset.staticMarquee === "true") return;

    const items = Array.from(track.children);
    if (items.length < 2) return;

    section.classList.add("static-marquee");
    track.classList.add("static-marquee-track");
    track.dataset.staticMarquee = "true";
    track.style.transform = "translateX(0)";

    items.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.append(clone);
    });

    requestAnimationFrame(() => {
      const distance = track.scrollWidth / 2;
      if (!distance) return;

      const duration = Math.max(18, Math.min(60, distance / 42));
      track.style.setProperty("--static-marquee-distance", `${distance}px`);
      track.style.setProperty("--static-marquee-duration", `${duration}s`);
    });
  });
}

function startFallback(animated = true) {
  setupStaticMarquees();
  setupStaticMobileMenu();
  setupHoverStates();
  setupStaticSocialIcons();
  revealFramerAppearElements(document, animated);

  document.querySelectorAll(".ssr-variant").forEach((el) => {
    el.style.visibility = "visible";
  });

  document.getElementById("__framer-badge-container")?.remove();
}

function pagePrefix() {
  return window.location.pathname.includes("/projetos-ux/") ? "../" : "";
}

function setupStaticMobileMenu() {
  const navs = Array.from(document.querySelectorAll("nav[data-framer-name]")).filter((nav) =>
    nav.getAttribute("data-framer-name")?.includes("Closed")
  );
  if (!navs.length) return;

  const menu = ensureMobileMenu();

  navs.forEach((nav) => {
    const container = nav.querySelector('[data-framer-name="Icon"]');
    if (!container || container.querySelector(".static-menu-trigger")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "static-menu-trigger";
    button.setAttribute("aria-label", "Abrir menu");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = "<span></span>";
    button.addEventListener("click", () => toggleMobileMenu(menu, true));

    container.replaceChildren(button);
  });
}

function ensureMobileMenu() {
  let menu = document.querySelector(".static-mobile-menu");
  if (menu) return menu;

  const prefix = pagePrefix();
  const links = [
    ["Início", `${prefix}index.html`],
    ["Projetos", `${prefix}projetos.html`],
    ["Sobre", `${prefix}sobre.html`],
    ["Orçamento", `${prefix}orcamento.html`],
    ["Contato", "https://wa.me/5541997218786"],
  ];

  menu = document.createElement("div");
  menu.className = "static-mobile-menu";
  menu.setAttribute("aria-hidden", "true");
  menu.innerHTML = `
    <div class="static-mobile-menu__panel" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="static-mobile-menu__top">
        <a class="static-mobile-menu__brand" href="${prefix}index.html">Nathalia Carvalho</a>
        <button class="static-mobile-menu__close" type="button" aria-label="Fechar menu">x</button>
      </div>
      ${links
        .map(([label, href]) => `<a class="static-mobile-menu__link" href="${href}">${label}</a>`)
        .join("")}
    </div>
  `;

  menu.addEventListener("click", (event) => {
    if (event.target === menu || event.target.closest(".static-mobile-menu__close")) {
      toggleMobileMenu(menu, false);
    }
    if (event.target.closest(".static-mobile-menu__link")) {
      toggleMobileMenu(menu, false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") toggleMobileMenu(menu, false);
  });

  document.body.append(menu);
  return menu;
}

function toggleMobileMenu(menu, open) {
  menu.setAttribute("aria-hidden", String(!open));
  document.documentElement.classList.toggle("static-menu-open", open);
  document.querySelectorAll(".static-menu-trigger").forEach((button) => {
    button.setAttribute("aria-expanded", String(open));
  });

  if (open) {
    menu.querySelector(".static-mobile-menu__link")?.focus();
  }
}

function setupHoverStates() {
  document.querySelectorAll('a[class*="framer-"], button[class*="framer-"]').forEach((el) => {
    if (el.dataset.staticHoverReady === "true") return;
    el.dataset.staticHoverReady = "true";

    el.addEventListener("pointerenter", () => el.classList.add("hover"));
    el.addEventListener("pointerleave", () => el.classList.remove("hover"));
    el.addEventListener("focusin", () => el.classList.add("hover"));
    el.addEventListener("focusout", () => el.classList.remove("hover"));
  });
}

function setupStaticSocialIcons() {
  document.querySelectorAll("a[href]").forEach((link) => {
    const target = link.querySelector(".framer-121k94u-container");
    if (!target || target.dataset.staticIconReady === "true") return;

    const label = socialIconLabel(link.href);
    if (!label) return;

    target.dataset.staticIconReady = "true";
    target.innerHTML = `<span class="static-social-icon" aria-hidden="true">${label}</span>`;
    link.setAttribute("aria-label", link.getAttribute("aria-label") || socialIconName(link.href));
  });
}

function socialIconLabel(href) {
  if (href.includes("behance.net")) return "Be";
  if (href.includes("linkedin.com")) return "in";
  if (href.includes("instagram.com")) return "IG";
  if (href.startsWith("mailto:")) return "@";
  if (href.includes("wa.me")) return "W";
  return "";
}

function socialIconName(href) {
  if (href.includes("behance.net")) return "Behance";
  if (href.includes("linkedin.com")) return "LinkedIn";
  if (href.includes("instagram.com")) return "Instagram";
  if (href.startsWith("mailto:")) return "Email";
  if (href.includes("wa.me")) return "WhatsApp";
  return "Link externo";
}

document.addEventListener("DOMContentLoaded", () => {
  startFallback(true);

  // Rolagem suave para links internos (#secao).
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Abre links externos em nova aba, preservando segurança.
  document.querySelectorAll('a[href^="http"]').forEach((link) => {
    const sameHost = link.hostname === window.location.hostname;
    if (!sameHost) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  });
});
