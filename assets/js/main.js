(() => {
  const body = document.body;
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  const scrim = document.querySelector(".nav-scrim");

  if (!toggle || !mobileNav || !scrim) {
    return;
  }

  const focusablesSelector = "a, button, input, textarea, [tabindex]:not([tabindex='-1'])";
  let lastFocused = null;

  const setExpanded = (isOpen) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    mobileNav.setAttribute("aria-hidden", String(!isOpen));
    body.classList.toggle("nav-open", isOpen);
  };

  const openNav = () => {
    lastFocused = document.activeElement;
    setExpanded(true);
    mobileNav.style.maxHeight = `${mobileNav.scrollHeight}px`;
    const firstLink = mobileNav.querySelector("a");
    if (firstLink) {
      firstLink.focus();
    }
  };

  const closeNav = () => {
    setExpanded(false);
    mobileNav.style.maxHeight = "0px";
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeNav();
    } else {
      openNav();
    }
  });

  scrim.addEventListener("click", closeNav);

  mobileNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.tagName === "A") {
      closeNav();
    }
  });

  document.addEventListener("keydown", (event) => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (!isOpen) return;

    if (event.key === "Escape") {
      closeNav();
      return;
    }

    if (event.key === "Tab") {
      const focusables = mobileNav.querySelectorAll(focusablesSelector);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener("resize", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      mobileNav.style.maxHeight = `${mobileNav.scrollHeight}px`;
    }
  });
})();
