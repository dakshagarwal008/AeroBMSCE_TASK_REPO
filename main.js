/* ============================================================
   AEROBMSCE — interaction layer
   preloader · starfield · cursor · reveals · counters · nav
   ============================================================ */
(function () {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. PRELOADER ---------- */
  const preloader = $("#preloader");
  const checkEl   = $("#preloaderCheck");
  const barEl     = $("#preloaderBar");
  const altEl     = $("#preloaderAlt");

  const CHECKS = [
    "GYROS ................ NOMINAL",
    "CONTROL SURFACES ..... ARMED",
    "PAYLOAD BAY .......... SECURED",
    "AVIONICS ............. ONLINE",
    "CLEARANCE GRANTED — ROTATE"
  ];

  function runPreloader() {
    if (!preloader) return finishLoad();
    let step = 0;
    const total = CHECKS.length;

    const tick = setInterval(() => {
      if (step < total) {
        checkEl.textContent = CHECKS[step];
        const pct = ((step + 1) / total) * 100;
        barEl.style.width = pct + "%";
        altEl.textContent = String(Math.round(pct * 105)).padStart(4, "0");
        step++;
      } else {
        clearInterval(tick);
        setTimeout(() => {
          preloader.classList.add("is-done");
          finishLoad();
        }, 450);
      }
    }, reduceMotion ? 30 : 340);
  }

  function finishLoad() {
    document.body.classList.add("is-loaded");
    initReveals();      // hero reveals fire now
    initCounters();
  }

  /* ---------- 2. STARFIELD ---------- */
  function initStarfield() {
    const canvas = $("#starfield");
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    let w, h, stars = [], mx = 0, my = 0;

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(180, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 0.9 + 0.1,       // depth → size & speed
        r: Math.random() * 1.4 + 0.3
      }));
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", e => {
      mx = (e.clientX / w - 0.5) * 2;
      my = (e.clientY / h - 0.5) * 2;
    });

    (function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.y += s.z * 0.25;                    // slow fall — like light haze
        if (s.y > h) { s.y = -4; s.x = Math.random() * w; }
        const px = s.x + mx * s.z * 14;
        ctx.globalAlpha = 0.25 + s.z * 0.55;
        ctx.fillStyle = s.z > 0.75 ? "#9fdcff" : "#5a7396";
        ctx.beginPath();
        ctx.arc(px, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    })();
  }

  /* ---------- 3. CUSTOM CURSOR ---------- */
  function initCursor() {
    if (window.matchMedia("(hover: none)").matches) return;
    const dot = $("#cursor"), ring = $("#cursorRing");
    if (!dot || !ring) return;
    let rx = -100, ry = -100, tx = -100, ty = -100;

    window.addEventListener("mousemove", e => {
      tx = e.clientX; ty = e.clientY;
      dot.style.left = tx + "px";
      dot.style.top  = ty + "px";
    });

    (function follow() {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.left = rx + "px";
      ring.style.top  = ry + "px";
      requestAnimationFrame(follow);
    })();

    $$("[data-cursor]").forEach(el => {
      el.addEventListener("mouseenter", () => ring.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => ring.classList.remove("is-hover"));
    });
  }

  /* ---------- 4. SCROLL REVEALS ---------- */
  let revealObserver;
  function initReveals() {
    const items = $$(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(el => el.classList.add("is-visible"));
      return;
    }
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // stagger siblings entering together
          setTimeout(() => entry.target.classList.add("is-visible"), (i % 4) * 90);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(el => revealObserver.observe(el));
  }

  /* ---------- 5. STAT COUNTERS ---------- */
  function initCounters() {
    const counters = $$(".counter");
    if (!counters.length) return;
    const animate = el => {
      const target = +el.dataset.target;
      const dur = 1400, t0 = performance.now();
      const step = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  }

  /* ---------- 6. NAV: scrolled state + progress ---------- */
  function initNav() {
    const nav = $("#nav"), progress = $("#scrollProgress");
    const onScroll = () => {
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // active section highlighting
    const links = $$(".nav__link");
    const map = {};
    links.forEach(l => (map[l.getAttribute("href").slice(1)] = l));
    const secIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(l => l.classList.remove("is-active"));
          map[e.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["home", "about", "build", "achievements", "partner"]
      .forEach(id => { const s = document.getElementById(id); if (s) secIO.observe(s); });

    // burger / mobile menu
    const burger = $("#burger"), menu = $("#mobileMenu");
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    $$(".mobilemenu__link").forEach(l =>
      l.addEventListener("click", () => {
        menu.classList.remove("is-open");
        burger.classList.remove("is-open");
        document.body.style.overflow = "";
      })
    );
  }

  /* ---------- 7. TIMELINE PROGRESS + HERO PARALLAX ---------- */
  function initScrollFx() {
    const timeline = $("#timeline"), tlBar = $("#timelineProgress");
    const plane = $(".hero__plane");
    const onScroll = () => {
      if (timeline && tlBar) {
        const rect = timeline.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(Math.max((vh * 0.7 - rect.top) / rect.height, 0), 1);
        tlBar.style.height = p * 100 + "%";
      }
      if (plane && !reduceMotion) {
        const speed = parseFloat(plane.dataset.parallax || 0.15);
        plane.style.transform = `translateY(${window.scrollY * speed}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- BOOT ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#year").textContent = new Date().getFullYear();
    initStarfield();
    initCursor();
    initNav();
    initScrollFx();
    runPreloader();
    // safety: never trap the user behind the preloader
    setTimeout(() => {
      if (!document.body.classList.contains("is-loaded")) {
        preloader && preloader.classList.add("is-done");
        finishLoad();
      }
    }, 6000);
  });
})();
