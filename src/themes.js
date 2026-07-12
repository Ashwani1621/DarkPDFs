export const DEFAULT_THEME = "midnight";

export const THEMES = [
  { id: "midnight", label: "Midnight" },
  { id: "graphite", label: "Graphite" },
  { id: "sepia-dark", label: "Sepia Dark" },
  { id: "solarized-dark", label: "Solarized Dark" },
  { id: "high-contrast", label: "High Contrast" },
];

export function getThemes() {
  return THEMES.map((theme) => ({ ...theme }));
}

export function isValidTheme(id) {
  return THEMES.some((theme) => theme.id === id);
}

export function applyTheme(id, root = document.documentElement) {
  const theme = isValidTheme(id) ? id : DEFAULT_THEME;
  root.setAttribute("data-theme", theme);
  return theme;
}

export function setupThemeSelector(select, { initialTheme = DEFAULT_THEME, onChange, root } = {}) {
  select.innerHTML = "";
  for (const theme of THEMES) {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.label;
    select.appendChild(option);
  }

  function setTheme(id) {
    const applied = applyTheme(id, root);
    select.value = applied;
    return applied;
  }

  setTheme(initialTheme);

  select.addEventListener("change", () => {
    const applied = setTheme(select.value);
    onChange?.(applied);
  });

  return { setTheme, getTheme: () => select.value };
}
