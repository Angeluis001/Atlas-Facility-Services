/* Atlas Facility Services — interactions */

(() => {
  "use strict";

  // Year in footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Header scroll state
  const header = document.getElementById("header");
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  // Mobile nav
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const navLinks = document.querySelectorAll(".nav-link");

  const closeNav = () => {
    navMenu?.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  navToggle?.addEventListener("click", () => {
    const open = navMenu?.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  // Active nav link on scroll
  const sections = document.querySelectorAll("section[id]");
  const setActiveLink = () => {
    const y = window.scrollY + 120;
    let current = "inicio";
    sections.forEach((sec) => {
      if (sec.offsetTop <= y) current = sec.id;
    });
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.toggle("active", href === `#${current}`);
    });
  };
  window.addEventListener("scroll", setActiveLink, { passive: true });
  setActiveLink();

  // Scroll reveal
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  // Hero counters
  const animateCount = (el, target, duration = 1600) => {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const stats = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && stats.length) {
    const statsIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = Number(el.getAttribute("data-count")) || 0;
            animateCount(el, target);
            statsIo.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    stats.forEach((el) => statsIo.observe(el));
  }

  // Cursor glow
  const glow = document.getElementById("cursorGlow");
  if (glow && window.matchMedia("(pointer: fine)").matches) {
    let mx = 0,
      my = 0,
      gx = 0,
      gy = 0;
    document.addEventListener(
      "mousemove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
      },
      { passive: true }
    );
    const loop = () => {
      gx += (mx - gx) * 0.08;
      gy += (my - gy) * 0.08;
      glow.style.left = `${gx}px`;
      glow.style.top = `${gy}px`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  // Service card spotlight
  document.querySelectorAll(".service-card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });
  });

  // Contact form
  const form = document.getElementById("contactForm");
  const success = document.getElementById("formSuccess");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Demo: show success UI. Wire to backend/email later.
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.querySelector("span").textContent = "Enviando…";
    }

    setTimeout(() => {
      if (success) {
        success.hidden = false;
      }
      form.reset();
      if (btn) {
        btn.disabled = false;
        btn.querySelector("span").textContent = "Enviar solicitud";
      }
      setTimeout(() => {
        if (success) success.hidden = true;
      }, 5000);
    }, 800);
  });

  // Prefill service from service cards
  document.querySelectorAll(".service-link").forEach((link) => {
    link.addEventListener("click", () => {
      const card = link.closest("[data-service]");
      const service = card?.getAttribute("data-service");
      const select = document.getElementById("service");
      if (service && select) {
        select.value = service;
      }
    });
  });
})();
