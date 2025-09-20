module.exports = async (page, context = {}) => {
  const scenarioSettings = context?.settings ?? context?.scenario?.settings ?? {};
  const classes = scenarioSettings.classes ?? scenarioSettings.classList ?? [];

  const config = {
    localStorage: scenarioSettings.localStorage ?? {},
    dataset: scenarioSettings.dataset ?? {},
    classes: Array.isArray(classes)
      ? classes.filter(Boolean)
      : classes
        ? [classes]
        : [],
    style: scenarioSettings.style ?? {},
  };

  await page.evaluateOnNewDocument(({ localStorage: storage, dataset, classes: classList, style }) => {
    const root = document.documentElement;

    if (storage && typeof storage === 'object') {
      for (const [key, value] of Object.entries(storage)) {
        try {
          localStorage.setItem(key, String(value));
        } catch (error) {
          console.warn('Failed to persist accessibility preference', key, error);
        }
      }
    }

    if (Array.isArray(classList)) {
      for (const className of classList) {
        root.classList.add(className);
      }
    }

    if (dataset && typeof dataset === 'object') {
      for (const [dataKey, dataValue] of Object.entries(dataset)) {
        root.dataset[dataKey] = dataValue;
      }
    }

    if (style && typeof style === 'object') {
      for (const [property, value] of Object.entries(style)) {
        root.style.setProperty(property, value);
      }
    }
  }, config);
};
