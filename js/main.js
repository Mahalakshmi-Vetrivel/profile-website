/* ==========================================================================
   main.js — all interactions for the profile website (vanilla ES6+)
   1. Theme (runs immediately so there is no flash of the wrong theme)
   2. Everything else runs once the page has loaded (DOMContentLoaded)
   ========================================================================== */

(function () {
  "use strict";

  const THEME_KEY = "mv-profile-theme";
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Safe localStorage helpers (storage can be blocked) ---------- */
  function readStoredTheme() {
    try {
      return window.localStorage.getItem(THEME_KEY);
    } catch (error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      /* storage unavailable: the theme still works for this visit */
    }
  }

  /* ---------- 1. Apply theme immediately ---------- */
  function applyTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  applyTheme(readStoredTheme() === "dark" ? "dark" : "light"); // light is the default
  root.classList.add("js"); // lets CSS know JavaScript is running (used by reveal animations)

  /* ---------- 2. Theme toggle button ---------- */
  function initThemeToggle() {
    const button = document.querySelector(".theme-toggle");
    if (!button) {
      return;
    }

    const syncButton = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    };

    syncButton();
    button.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      storeTheme(next);
      syncButton();
    });
  }

  /* ---------- 3. Mobile navigation (hamburger) ---------- */
  function initNavigation() {
    const toggle = document.querySelector(".nav__toggle");
    const menu = document.getElementById("nav-menu");
    if (!toggle || !menu) {
      return;
    }

    const setOpen = (open) => {
      menu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // close when a link is chosen
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });

    // close with Escape and give focus back to the button
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    // close when clicking outside the open menu
    document.addEventListener("click", (event) => {
      if (menu.classList.contains("is-open") && !event.target.closest(".nav")) {
        setOpen(false);
      }
    });

    // reset when resizing up to the desktop layout
    window.matchMedia("(min-width: 900px)").addEventListener("change", (event) => {
      if (event.matches) {
        setOpen(false);
      }
    });
  }

  /* ---------- 4. Smooth scrolling for in-page links ---------- */
  function initSmoothScroll() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) {
        return;
      }
      const id = link.getAttribute("href").slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) {
        return;
      }
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
      // move keyboard focus to the section for screen-reader and keyboard users
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
      history.replaceState(null, "", "#" + id);
    });
  }

  /* ---------- 5. Header shadow + back-to-top + active nav link ---------- */
  function initScrollState() {
    const header = document.querySelector(".site-header");
    const backToTop = document.querySelector(".back-to-top");
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      if (header) {
        header.classList.toggle("is-scrolled", y > 10);
      }
      if (backToTop) {
        backToTop.classList.toggle("is-visible", y > window.innerHeight * 0.8);
      }
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();

    if (backToTop) {
      backToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
        const brand = document.querySelector(".nav__brand");
        if (brand) {
          brand.focus({ preventScroll: true });
        }
      });
    }

    // highlight the nav link of the section currently on screen
    const links = document.querySelectorAll(".nav__link");
    if (!("IntersectionObserver" in window) || links.length === 0) {
      return;
    }
    const linkFor = new Map();
    links.forEach((link) => linkFor.set(link.getAttribute("href").slice(1), link));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = linkFor.get(entry.target.id);
        if (link && entry.isIntersecting) {
          links.forEach((other) => other.classList.remove("is-active"));
          link.classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    linkFor.forEach((link, id) => {
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    });
  }

  /* ---------- 6. Show more / Show less in the timeline ---------- */
  function initShowMore() {
    document.querySelectorAll(".timeline__toggle").forEach((button) => {
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      if (!panel) {
        button.hidden = true;
        return;
      }
      button.addEventListener("click", () => {
        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
        button.textContent = expanded ? "Show more" : "Show less";
        panel.hidden = expanded;
      });
    });
  }

  /* ---------- 7. Scroll-triggered reveal (IntersectionObserver) ---------- */
  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target); // animate once
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach((item) => observer.observe(item));
  }

  /* ---------- 8. Family flip cards (click, tap, Enter, Space) ---------- */
  function initFlipCards() {
    document.querySelectorAll(".flip-card__inner").forEach((card) => {
      card.addEventListener("click", () => {
        const flipped = card.classList.toggle("is-flipped");
        card.setAttribute("aria-pressed", String(flipped));
      });
    });
  }

  /* ---------- 9. Hobbies lightbox ---------- */
  function initLightbox() {
    const dialog = document.querySelector(".lightbox");
    const triggers = Array.from(document.querySelectorAll(".gallery__button"));
    if (!dialog || triggers.length === 0 || typeof dialog.showModal !== "function") {
      return;
    }

    const image = dialog.querySelector(".lightbox__image");
    const title = dialog.querySelector(".lightbox__title");
    const description = dialog.querySelector(".lightbox__description");
    const counter = dialog.querySelector(".lightbox__counter");
    const prev = dialog.querySelector(".lightbox__nav--prev");
    const next = dialog.querySelector(".lightbox__nav--next");
    const close = dialog.querySelector(".lightbox__close");
    let current = 0;
    let lastTrigger = null;

    const show = (index) => {
      current = (index + triggers.length) % triggers.length; // wrap around
      const trigger = triggers[current];
      const thumb = trigger.querySelector("img");
      image.src = thumb.getAttribute("src");
      image.alt = thumb.getAttribute("alt");
      image.width = thumb.width;
      image.height = thumb.height;
      title.textContent = trigger.dataset.title || "";
      description.textContent = trigger.dataset.description || "";
      counter.textContent = (current + 1) + " / " + triggers.length;
    };

    const open = (index, trigger) => {
      lastTrigger = trigger;
      show(index);
      dialog.showModal();
      close.focus();
    };

    triggers.forEach((trigger, index) => {
      trigger.addEventListener("click", () => open(index, trigger));
    });

    prev.addEventListener("click", () => show(current - 1));
    next.addEventListener("click", () => show(current + 1));
    close.addEventListener("click", () => dialog.close());

    // click on the dark backdrop (outside the panel) closes
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    // arrow keys navigate; Escape is handled natively by <dialog>
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        show(current - 1);
      } else if (event.key === "ArrowRight") {
        show(current + 1);
      }
    });

    // return focus to the tile that opened the lightbox
    dialog.addEventListener("close", () => {
      if (lastTrigger) {
        lastTrigger.focus();
      }
    });
  }

  /* ---------- 10. Copyright year ---------- */
  function initYear() {
    document.querySelectorAll(".footer__year").forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---------- Start ---------- */
  function init() {
    initThemeToggle();
    initNavigation();
    initSmoothScroll();
    initScrollState();
    initShowMore();
    initReveal();
    initFlipCards();
    initLightbox();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
