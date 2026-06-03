// JS mínimo para a versão estática.
// O Framer usa seu runtime para terminar animações/hidratação. Sem ele,
// alguns blocos ficam com opacity: 0.001 e translateY(40px), parecendo página em branco.

const FRAMER_HIDDEN_SELECTOR = [
  "[data-framer-appear-id]",
  '[style*="opacity:0.001"]',
  '[style*="opacity: 0.001"]',
  '[style*="opacity:0;"]',
  '[style*="opacity: 0;"]',
].join(", ");

function revealFramerAppearElements(root = document) {
  if (root.matches?.(FRAMER_HIDDEN_SELECTOR)) {
    revealElement(root);
  }

  root.querySelectorAll(FRAMER_HIDDEN_SELECTOR).forEach((el) => {
    revealElement(el);
  });
}

function revealElement(el) {
  if (el.style.opacity !== "1") el.style.opacity = "1";
  if (el.style.transform !== "none") el.style.transform = "none";
  if (el.style.willChange !== "auto") el.style.willChange = "auto";
  if (el.style.visibility !== "visible") el.style.visibility = "visible";
}

document.addEventListener("DOMContentLoaded", () => {
  // Força a exibição dos elementos que no Framer começavam invisíveis para animação.
  revealFramerAppearElements();

  // Garante que variantes SSR não fiquem escondidas por falta do runtime do Framer.
  document.querySelectorAll('.ssr-variant').forEach((el) => {
    el.style.visibility = "visible";
  });

  document.getElementById("__framer-badge-container")?.remove();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target.matches?.(FRAMER_HIDDEN_SELECTOR)) {
        revealFramerAppearElements(mutation.target.parentElement || document);
        continue;
      }

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        revealFramerAppearElements(node);
      });
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["style", "class"],
    childList: true,
    subtree: true,
  });

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
