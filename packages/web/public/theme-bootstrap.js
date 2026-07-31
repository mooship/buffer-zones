(() => {
  const stored = localStorage.getItem("buffer-zones-theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.dataset.theme = stored;
  }
})();
