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

  /* ---------- Read a value from theme.css (speeds live there, not here) ---------- */
  function readToken(name) {
    return window.getComputedStyle(root).getPropertyValue(name).trim();
  }

  // "0.65s" or "650ms" -> milliseconds; fallback if the token is missing
  function readTime(name, fallback) {
    const raw = readToken(name);
    const value = parseFloat(raw);
    if (Number.isNaN(value)) {
      return fallback;
    }
    return raw.endsWith("ms") ? value : value * 1000;
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

    const switchTheme = () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      storeTheme(next);
      syncButton();
    };

    syncButton();
    button.addEventListener("click", () => {
      // no View Transitions API, or the visitor prefers less motion: switch instantly
      if (typeof document.startViewTransition !== "function" || reduceMotion.matches) {
        switchTheme();
        return;
      }

      // the new theme is revealed as a circle growing from the centre of the button
      const box = button.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

      root.classList.add("is-theme-switching");
      const transition = document.startViewTransition(switchTheme);
      transition.ready.then(() => {
        root.animate(
          { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + radius + "px at " + x + "px " + y + "px)"] },
          {
            duration: readTime("--transition-speed-theme", 650),
            easing: readToken("--ease") || "ease-out",
            pseudoElement: "::view-transition-new(root)"
          }
        );
      }).catch(() => {
        /* transition skipped by the browser: the theme has still switched */
      });
      transition.finished.finally(() => root.classList.remove("is-theme-switching"));
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

  /* ---------- 5. Header shadow + back-to-top + scroll progress + active section ---------- */
  function initScrollState() {
    const header = document.querySelector(".site-header");
    const backToTop = document.querySelector(".back-to-top");
    const progress = document.querySelector(".scroll-progress__bar");
    const links = Array.from(document.querySelectorAll(".nav__link, .section-dots__link"));
    const lastId = links.length ? links[links.length - 1].getAttribute("href").slice(1) : "";
    let ticking = false;

    // mark the nav link and section dot of one section as active
    const setActive = (id) => {
      links.forEach((link) => {
        const active = link.getAttribute("href") === "#" + id;
        link.classList.toggle("is-active", active);
        if (link.classList.contains("section-dots__link")) {
          if (active) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        }
      });
    };

    const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

    const update = () => {
      const y = window.scrollY;
      if (header) {
        header.classList.toggle("is-scrolled", y > 10);
      }
      if (backToTop) {
        backToTop.classList.toggle("is-visible", y > window.innerHeight * 0.8);
      }
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
        progress.style.setProperty("--scroll-progress", ratio.toFixed(4));
      }
      // a short last section (the footer) never reaches the middle of the screen
      if (lastId && atBottom()) {
        setActive(lastId);
      }
      ticking = false;
    };

    const requestUpdate = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
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

    // highlight the nav link and section dot of the section in the middle of the screen
    if (!("IntersectionObserver" in window) || links.length === 0) {
      return;
    }
    const ids = new Set(links.map((link) => link.getAttribute("href").slice(1)));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !atBottom()) {
          setActive(entry.target.id);
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    ids.forEach((id) => {
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

  /* ---------- 11. Soft cursor glow in the hero (mouse only) ---------- */
  function initHeroGlow() {
    const hero = document.querySelector(".hero");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!hero || !finePointer.matches || reduceMotion.matches) {
      return;
    }

    let originX = 0;
    let originY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    // only CSS custom properties are written, once per frame (no layout reads in between)
    const paint = () => {
      hero.style.setProperty("--glow-x", x + "px");
      hero.style.setProperty("--glow-y", y + "px");
      frame = 0;
    };

    hero.addEventListener("pointerenter", () => {
      const box = hero.getBoundingClientRect();
      originX = box.left + window.scrollX;
      originY = box.top + window.scrollY;
      hero.classList.add("is-glowing");
    });

    hero.addEventListener("pointermove", (event) => {
      x = event.pageX - originX;
      y = event.pageY - originY;
      if (!frame) {
        frame = window.requestAnimationFrame(paint);
      }
    });

    hero.addEventListener("pointerleave", () => hero.classList.remove("is-glowing"));
  }

  /* ---------- 12. Gentle 3D tilt on the interest cards (mouse only) ---------- */
  function initCardTilt() {
    const cards = document.querySelectorAll(".interest-card");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (cards.length === 0 || !finePointer.matches || reduceMotion.matches) {
      return;
    }
    const maxTilt = parseFloat(readToken("--tilt-max")) || 6; // degrees

    cards.forEach((card) => {
      let box = null;
      let px = 0.5;
      let py = 0.5;
      let frame = 0;

      const paint = () => {
        card.style.setProperty("--tilt-x", ((0.5 - py) * 2 * maxTilt).toFixed(2) + "deg");
        card.style.setProperty("--tilt-y", ((px - 0.5) * 2 * maxTilt).toFixed(2) + "deg");
        frame = 0;
      };

      card.addEventListener("pointerenter", () => {
        box = card.getBoundingClientRect(); // measured once, so the tilt never feeds back into itself
        card.classList.add("is-tilting");
      });

      card.addEventListener("pointermove", (event) => {
        if (!box) {
          return;
        }
        px = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
        py = Math.min(Math.max((event.clientY - box.top) / box.height, 0), 1);
        if (!frame) {
          frame = window.requestAnimationFrame(paint);
        }
      });

      // back to flat: the CSS transition makes the reset smooth
      card.addEventListener("pointerleave", () => {
        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
        box = null;
        card.classList.remove("is-tilting");
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
      });
    });
  }

  /* ---------- 13. Typing tagline in the hero ---------- */
  function initTypingTagline() {
    const tagline = document.querySelector(".hero__tagline");
    if (!tagline || reduceMotion.matches) {
      return; // reduced motion: the full static tagline stays
    }
    const full = tagline.querySelector(".hero__tagline-text");
    const typed = tagline.querySelector(".hero__typed");
    const output = tagline.querySelector(".hero__typed-text");
    if (!full || !typed || !output) {
      return;
    }

    // the words are the parts of the real tagline, so there is only one place to edit
    const words = full.textContent.split("|").map((word) => word.trim()).filter(Boolean);
    if (words.length === 0) {
      return;
    }
    const typeDelay = readTime("--typing-speed", 70);
    const deleteDelay = readTime("--typing-delete-speed", 35);
    const pause = readTime("--typing-pause", 1800);

    full.classList.add("visually-hidden"); // still read by screen readers
    typed.hidden = false;

    // start with the first word already written, so the line is never empty
    let word = 0;
    let letters = words[0].length;
    let deleting = true;
    output.textContent = words[0];

    const tick = () => {
      const text = words[word];
      if (!deleting) {
        letters += 1;
        output.textContent = text.slice(0, letters);
        if (letters >= text.length) {
          deleting = true;
          window.setTimeout(tick, pause);
          return;
        }
        window.setTimeout(tick, typeDelay);
        return;
      }
      letters -= 1;
      output.textContent = text.slice(0, letters);
      if (letters <= 0) {
        deleting = false;
        word = (word + 1) % words.length;
        window.setTimeout(tick, typeDelay * 4);
        return;
      }
      window.setTimeout(tick, deleteDelay);
    };

    // begin typing only once the page has finished loading (keeps start-up light)
    const start = () => window.setTimeout(tick, pause);
    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }
  }

  /* ---------- 14. "By the numbers" count-up ---------- */
  function initCountUp() {
    const values = Array.from(document.querySelectorAll(".stat__value"));
    if (values.length === 0 || reduceMotion.matches || !("IntersectionObserver" in window)) {
      return; // the final numbers are already in the HTML
    }
    const duration = readTime("--count-duration", 1600);

    const counters = values.map((element) => {
      const text = element.textContent.trim();
      const match = text.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
      if (!match) {
        return null;
      }
      const decimals = (match[2].split(".")[1] || "").length;
      const format = (value) => match[1] + value.toFixed(decimals) + match[3];

      // screen readers keep the real value; the animated copy is hidden from them
      const finalText = document.createElement("span");
      finalText.className = "visually-hidden";
      finalText.textContent = text;
      const display = document.createElement("span");
      display.setAttribute("aria-hidden", "true");
      display.textContent = format(0);
      element.textContent = "";
      element.append(finalText, display);

      return { element, display, target: parseFloat(match[2]), format };
    }).filter(Boolean);

    const run = (counter) => {
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out
        counter.display.textContent = counter.format(counter.target * eased);
        if (t < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const counter = counters.find((item) => item.element === entry.target);
          if (counter) {
            run(counter);
          }
          obs.unobserve(entry.target); // count once
        }
      });
    }, { threshold: 0.6 });
    counters.forEach((counter) => observer.observe(counter.element));
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
    initHeroGlow();
    initCardTilt();
    initTypingTagline();
    initCountUp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
