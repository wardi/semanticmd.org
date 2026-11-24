(() => {
  const toc = document.querySelector(".docs-toc");
  const list = toc.querySelector(":scope > ul");
  const content = document.querySelector(".docs-content");
  const entries = Array.from(toc.querySelectorAll("a[href^='#']"))
    .map((link) => ({
      link,
      heading: document.getElementById(decodeURIComponent(link.hash.slice(1))),
    }))
    .filter((entry) => entry.heading);

  if (!entries.length) return;

  let highlightedHeading = null;
  let highlightTimer;
  let highlightFrame;

  for (const { link, heading } of entries) {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      window.clearTimeout(highlightTimer);
      window.cancelAnimationFrame(highlightFrame);
      if (highlightedHeading) highlightedHeading.classList.remove("toc-target-flash");
      highlightFrame = window.requestAnimationFrame(() => {
        heading.classList.remove("toc-target-flash");
        void heading.offsetWidth;
        heading.classList.add("toc-target-flash");
        highlightedHeading = heading;
        highlightTimer = window.setTimeout(() => {
          heading.classList.remove("toc-target-flash");
          highlightedHeading = null;
        }, 1400);
      });
    });
  }

  let current = null;
  let scheduled = false;

  function updateCurrent() {
    scheduled = false;
    const positions = entries.map(({ heading }) => heading.getBoundingClientRect().top);
    const contentBottom = content.getBoundingClientRect().bottom;
    let active = null;

    entries.forEach((entry, index) => {
      const sectionEnd = positions[index + 1] ?? contentBottom;
      const visible = positions[index] < window.innerHeight && sectionEnd > 0;
      entry.link.classList.toggle("is-visible", visible);

      if (visible && positions[index] <= 0) {
        active = entry;
      }
    });

    if (!active) active = entries.find((entry) => entry.link.classList.contains("is-visible"));
    if (active === current) return;

    if (current) current.link.removeAttribute("aria-current");
    current = active;
    if (current) {
      current.link.setAttribute("aria-current", "location");
      if (window.matchMedia("(min-width: 960px)").matches) {
        const linkRect = current.link.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        if (linkRect.top < listRect.top) {
          list.scrollTop -= listRect.top - linkRect.top;
        } else if (linkRect.bottom > listRect.bottom) {
          list.scrollTop += linkRect.bottom - listRect.bottom;
        }
      }
    }
  }

  function scheduleUpdate() {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(updateCurrent);
    }
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  updateCurrent();
})();
