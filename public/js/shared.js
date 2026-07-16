
(function () {
  "use strict";

  const NAV_LINKS = [
    { href: "/", label: "Home", key: "home" },
    { href: "/#release", label: "Music", key: "music" },
    { href: "/#gallery-preview", label: "Gallery", key: "gallery" },
    { href: "/#videos-preview", label: "Videos", key: "videos" },
    { href: "#", label: "Chat", key: "chat", isChat: true },
    { href: "/contact", label: "Contact", key: "contact" },
  ];

  const currentPage = document.body.dataset.page || "home";

  /* ---------------- Loader ---------------- */
  function initLoader() {
    const loader = document.getElementById("site-loader");
    if (!loader) return;
    window.addEventListener("load", () => {
      setTimeout(() => loader.classList.add("hidden"), 350);
    });
    // safety net in case load already fired
    setTimeout(() => loader.classList.add("hidden"), 2500);
  }

  /* ---------------- Nav ---------------- */
  function navLinkHTML(link) {
    const activeClass = link.key === currentPage ? " active" : "";
    if (link.isChat) {
      return `<a href="#" class="chat-link${activeClass}" data-chat-trigger>
        ${link.label}
        <span class="nav-unread-dot" data-nav-unread></span>
      </a>`;
    }
    return `<a href="${link.href}" class="${activeClass}">${link.label}</a>`;
  }

  function buildNav() {
    const mount = document.getElementById("site-header");
    if (!mount) return;
    mount.innerHTML = `
      <nav id="site-nav">
        <div class="container nav-inner">
          <a href="/" class="brand">Jeff Goldblum</a>
          <ul class="nav-links">
            ${NAV_LINKS.map((l) => `<li>${navLinkHTML(l)}</li>`).join("")}
          </ul>
          <div class="nav-controls">
            <button class="theme-toggle" id="theme-toggle" aria-label="Toggle light and dark theme">
              <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
              <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <button class="nav-burger" id="nav-burger" aria-label="Open menu" aria-expanded="false">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
          </div>
        </div>
      </nav>
      <div class="mobile-nav" id="mobile-nav">
        ${NAV_LINKS.map((l) =>
          l.isChat
            ? `<a href="#" data-chat-trigger data-close-mobile>${l.label}</a>`
            : `<a href="${l.href}">${l.label}</a>`
        ).join("")}
      </div>
    `;

    const nav = document.getElementById("site-nav");
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const burger = document.getElementById("nav-burger");
    const mobileNav = document.getElementById("mobile-nav");
    burger.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    mobileNav.querySelectorAll("[data-close-mobile], a:not([data-chat-trigger])").forEach((a) => {
      a.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------- Footer ---------------- */
  function buildFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    const year = new Date().getFullYear();
    mount.innerHTML = `
      <footer>
        <div class="container">
          <div class="footer-top">
            <div class="footer-brand">
              <h3>Jeff Goldblum</h3>
              <p>New music, visuals, and the occasional unfiltered thought straight from the studio.</p>
            </div>
            <div class="footer-cols">
              <div class="footer-col">
                <h4>Explore</h4>
                <a href="/#release">Music</a>
                <a href="/#gallery-preview">Gallery</a>
                <a href="/#videos-preview">Videos</a>
              </div>
              <div class="footer-col">
                <h4>Artist</h4>
                <a href="/contact">Contact</a>
                <a href="#" data-chat-trigger>Chat</a>
              </div>
              <div class="footer-col">
                <h4>Follow</h4>
                <a href="https://www.instagram.com/jeffgoldblum/?hl=en">Instagram</a>
                <a href="https://www.tiktok.com/@jeffgoldblum?lang=en">TikTok</a>
                <a href="https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwjh0ZDV_dSVAxWhU0EAHSo1F7EQFnoECCIQAQ&url=https%3A%2F%2Fwww.youtube.com%2F%40JeffGoldblumTMSO&usg=AOvVaw0RxOcf4_IZGmfKxANUbjVU&opi=89978449">YouTube</a>
              </div>
            </div>
          </div>
          <div class="footer-bottom">
            <span>&copy; ${year} Jeff Goldblum. All rights reserved.</span>
            <span>Site by the studio</span>
          </div>
        </div>
      </footer>
    `;
  }

  /* ---------------- Theme ---------------- */
  function initTheme() {
    const stored = localStorage.getItem("wc_theme");
    const theme = stored || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("wc_theme", next);
    });
  }

  /* ---------------- Scroll reveals ---------------- */
  function initReveals() {
    const targets = document.querySelectorAll(".reveal, .reveal-stagger");
    if (!targets.length) return;
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    targets.forEach((t) => io.observe(t));
  }

  /* =========================================================================
     Chat widget
     ========================================================================= */
  const CHAT_NAME_KEY = "wc_chat_name";
  const CHAT_EMAIL_KEY = "wc_chat_email";

  function initChatWidget() {
    const mount = document.createElement("div");
    mount.innerHTML = `
      <button id="chat-bubble" aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <span id="chat-bubble-badge"></span>
      </button>
      <div id="chat-panel" role="dialog" aria-label="Chat with Jeff Goldblum">
        <div class="chat-header">
          <div>
            <div class="ch-title">Say hello</div>
            <div class="ch-sub" id="chat-sub">Direct line to the team</div>
          </div>
          <button class="chat-close" id="chat-close" aria-label="Close chat">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="chat-join" id="chat-join">
          <p>Enter your name and email to start a conversation. We'll remember you next time, and email you if you get a reply while you're away.</p>
          <input id="chat-name-input" placeholder="Your name" maxlength="40" />
          <input id="chat-email-input" type="email" placeholder="Your email" maxlength="200" />
          <button class="btn btn-primary" id="chat-join-btn" type="button">Start chat</button>
        </div>
        <div class="chat-body" id="chat-body">
          <div class="chat-empty">No messages yet — say hi!</div>
        </div>
        <form class="chat-form" id="chat-form">
          <input id="chat-text-input" placeholder="Type a message…" autocomplete="off" />
          <button type="submit" aria-label="Send">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(mount);

    const bubble = document.getElementById("chat-bubble");
    const bubbleBadge = document.getElementById("chat-bubble-badge");
    const panel = document.getElementById("chat-panel");
    const closeBtn = document.getElementById("chat-close");
    const joinScreen = document.getElementById("chat-join");
    const nameInput = document.getElementById("chat-name-input");
    const emailInput = document.getElementById("chat-email-input");
    const joinBtn = document.getElementById("chat-join-btn");
    const bodyEl = document.getElementById("chat-body");
    const formEl = document.getElementById("chat-form");
    const textInput = document.getElementById("chat-text-input");
    const navUnreadDots = () => document.querySelectorAll("[data-nav-unread]");

    let socket = null;
    let joined = false;
    let unreadCount = 0;
    let panelOpen = false;

    function setUnread(count) {
      unreadCount = count;
      const show = unreadCount > 0 && !panelOpen;
      bubbleBadge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
      bubbleBadge.classList.toggle("show", show);
      navUnreadDots().forEach((dot) => {
        dot.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
        dot.classList.toggle("show", show);
      });
    }

    function formatTime(ts) {
      const d = new Date(ts || Date.now());
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function addMessage(text, who, ts) {
      const empty = bodyEl.querySelector(".chat-empty");
      if (empty) empty.remove();
      const div = document.createElement("div");
      div.className = "chat-msg " + (who === "me" ? "mine" : "theirs");
      const label = document.createElement("span");
      label.className = "cm-label";
      label.textContent = who === "me" ? "You" : "Jeff Goldblum";
      div.appendChild(label);
      const body = document.createElement("div");
      body.textContent = text;
      div.appendChild(body);
      const time = document.createElement("span");
      time.className = "cm-time";
      time.textContent = formatTime(ts);
      div.appendChild(time);
      bodyEl.appendChild(div);
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function ensureSocket() {
      if (socket) return socket;
      if (typeof io === "undefined") {
        // socket.io client didn't load — this page isn't being served by
        // the real Node server. Fail quietly instead of throwing.
        console.warn("Chat unavailable: socket.io client not loaded (is the server running?).");
        return null;
      }
      // socket.io client is loaded globally via a <script> tag on every page
      socket = io();

      socket.on("join_error", ({ error }) => {
        alert(error);
      });

      socket.on("joined", ({ name, history, unreadCount: initialUnread }) => {
        joined = true;
        joinScreen.style.display = "none";
        bodyEl.classList.add("active");
        formEl.classList.add("active");
        document.getElementById("chat-sub").textContent = "Chatting as " + name;
        bodyEl.innerHTML = "";
        (history || []).forEach((m) => addMessage(m.text, m.sender === "admin" ? "them" : "me", m.ts));
        if (!history || history.length === 0) {
          bodyEl.innerHTML = '<div class="chat-empty">No messages yet — say hi!</div>';
        }
        setUnread(panelOpen ? 0 : initialUnread || 0);
        if (panelOpen) socket.emit("user_read");
      });

      socket.on("message_sent", (msg) => addMessage(msg.text, "me", msg.ts));

      socket.on("message_from_admin", (msg) => {
        addMessage(msg.text, "them", msg.ts);
        if (panelOpen) {
          socket.emit("user_read");
        } else {
          setUnread(unreadCount + 1);
        }
      });

      return socket;
    }

    function doJoin(name, emailAddr) {
      const s = ensureSocket();
      if (!s) return;
      s.emit("user_join", { name, email: emailAddr });
    }

    function openPanel() {
      panelOpen = true;
      panel.classList.add("open");
      const storedName = localStorage.getItem(CHAT_NAME_KEY);
      const storedEmail = localStorage.getItem(CHAT_EMAIL_KEY);
      if (!joined && storedName && storedEmail) {
        nameInput.value = storedName;
        emailInput.value = storedEmail;
        doJoin(storedName, storedEmail);
      } else if (!joined) {
        ensureSocket();
      }
      if (joined && socket) socket.emit("user_read");
      setUnread(joined ? 0 : unreadCount);
      if (!(storedName && storedEmail) && !joined) nameInput.focus();
    }

    function closePanel() {
      panelOpen = false;
      panel.classList.remove("open");
      setUnread(unreadCount); // recompute badge visibility now that panel is closed
    }

    bubble.addEventListener("click", () => (panelOpen ? closePanel() : openPanel()));
    closeBtn.addEventListener("click", closePanel);

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-chat-trigger]");
      if (trigger) {
        e.preventDefault();
        openPanel();
      }
    });

    joinBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const emailAddr = emailInput.value.trim();
      if (!name || !emailAddr) return;
      localStorage.setItem(CHAT_NAME_KEY, name);
      localStorage.setItem(CHAT_EMAIL_KEY, emailAddr);
      doJoin(name, emailAddr);
    });
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") emailInput.focus();
    });
    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") joinBtn.click();
    });

    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = textInput.value.trim();
      if (!text || !socket) return;
      socket.emit("user_message", { text });
      textInput.value = "";
    });

    // If the user has chatted before on this device, connect quietly in the
    // background so unread badges are accurate even before they open the panel.
    const storedName = localStorage.getItem(CHAT_NAME_KEY);
    const storedEmail = localStorage.getItem(CHAT_EMAIL_KEY);
    if (storedName && storedEmail) {
      const s = ensureSocket();
      if (s) s.emit("user_join", { name: storedName, email: storedEmail });
    }
  }

  /* ---------------- Init ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initLoader();
    buildNav();
    buildFooter();
    initTheme();
    initReveals();
    initChatWidget();
  });
})();