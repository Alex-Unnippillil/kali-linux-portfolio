import demoCity from './demoCity.json';
import { isBrowser } from '../../utils/env';
import { safeLocalStorage } from '../../utils/safeStorage';
import {
  getSecureItem,
  setSecureItem,
  hasSecureItem,
  rotateSecureItem,
  removeSecureItem,
  SecureStoreError,
  isSecureStoreUsingWebCrypto,
} from '../../utils/secureStore';

if (isBrowser) {
  const widget = document.getElementById('weather');
  const tempEl = widget.querySelector('.temp');
  const feelsEl = widget.querySelector('.feels-like');
  const iconEl = widget.querySelector('.icon');
  const forecastEl = widget.querySelector('.forecast');
  const dailyEl = widget.querySelector('.daily');
  const sunriseEl = widget.querySelector('.sunrise');
  const sunsetEl = widget.querySelector('.sunset');
  const citySearch = document.getElementById('city-search');
  const unitToggle = document.getElementById('unit-toggle');
  const apiKeyInput = document.getElementById('api-key-input');
  const passphraseInput = document.getElementById('api-passphrase');
  const unlockApiKeyBtn = document.getElementById('unlock-api-key');
  const newPassphraseInput = document.getElementById('new-api-passphrase');
  const rotatePassphraseBtn = document.getElementById('rotate-api-passphrase');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const pinCityBtn = document.getElementById('pin-city');
  const datalist = document.getElementById('saved-cities');
  const errorMessageEl = document.getElementById('error-message');
  const secureInfoEl = document.getElementById('secure-store-info');
  const secureStatusEl = document.getElementById('secure-store-status');

  let apiKey = '';
  let securePassphrase = '';
  let secureUnlocked = false;
  let hasStoredApiKey = hasSecureItem('weatherApiKey');
  const usesWebCrypto = isSecureStoreUsingWebCrypto();
  let pendingLegacyKey = safeLocalStorage?.getItem('weatherApiKey') || '';
  if (pendingLegacyKey) {
    apiKeyInput.value = pendingLegacyKey;
    try {
      safeLocalStorage?.removeItem('weatherApiKey');
    } catch {
      // ignore removal issues
    }
  }

  const setSecureStatus = (message, type = 'info') => {
    if (!secureStatusEl) return;
    secureStatusEl.textContent = message;
    secureStatusEl.className = `secure-note ${type}`;
  };

  if (secureInfoEl) {
    secureInfoEl.textContent = usesWebCrypto
      ? 'Secure storage uses AES-GCM encryption backed by your passphrase.'
      : 'Secure storage is running in compatibility mode because WebCrypto is unavailable.';
    secureInfoEl.className = `secure-note ${usesWebCrypto ? 'info' : 'warning'}`;
  }

  const initialStatusMessage = hasStoredApiKey
    ? 'Encrypted API key detected. Unlock with your passphrase to use it.'
    : pendingLegacyKey
    ? 'Legacy API key found in localStorage. Unlock and click Save to encrypt it.'
    : 'Create a passphrase to save your API key securely.';
  const initialStatusType = hasStoredApiKey ? 'info' : pendingLegacyKey ? 'warning' : 'info';
  setSecureStatus(initialStatusMessage, initialStatusType);

  const updateSecureUiState = () => {
    const legacyAvailable = Boolean(pendingLegacyKey);
    apiKeyInput.disabled = !secureUnlocked && !legacyAvailable;
    saveApiKeyBtn.disabled = !secureUnlocked;
    passphraseInput.disabled = secureUnlocked;
    unlockApiKeyBtn.disabled = secureUnlocked;
    newPassphraseInput.disabled = !secureUnlocked || !hasStoredApiKey;
    rotatePassphraseBtn.disabled = !secureUnlocked || !hasStoredApiKey;
  };

  updateSecureUiState();

  let unit = safeLocalStorage?.getItem('weatherUnit') || unitToggle.value;
  unitToggle.value = unit;

  let savedCities = JSON.parse(safeLocalStorage?.getItem('savedCities') || '[]');

  const updateDatalist = () => {
    datalist.innerHTML = '';
    savedCities.forEach((c) => {
      const option = document.createElement('option');
      option.value = c;
      datalist.appendChild(option);
    });
  };

  const updatePinButton = () => {
    const city = citySearch.value.trim();
    if (safeLocalStorage?.getItem('pinnedCity') === city) {
      pinCityBtn.textContent = 'Unpin';
    } else {
      pinCityBtn.textContent = 'Pin';
    }
  };

  updateDatalist();

  const convertTemp = (celsius) =>
    unit === 'metric' ? celsius : (celsius * 9) / 5 + 32;

  const formatTime = (timestamp) =>
    new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  const renderWeather = (data) => {
    widget.classList.remove('fade-in');
    widget.classList.add('fade-out');
    widget.addEventListener(
      'animationend',
      function handler() {
        widget.classList.remove('fade-out');
        const temp = convertTemp(data.tempC);
        tempEl.textContent = `${Math.round(temp)}°${unit === 'metric' ? 'C' : 'F'}`;
        const feels = convertTemp(data.feelsLikeC ?? data.tempC);
        feelsEl.textContent = `Feels like ${Math.round(feels)}°${unit === 'metric' ? 'C' : 'F'}`;
        if (data.icon) {
          iconEl.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
          iconEl.alt = data.condition;
          iconEl.className = 'icon animated-icon';
        }
        forecastEl.textContent = data.condition;
        if (data.forecast) {
          dailyEl.innerHTML = data.forecast
            .map(
              (d) =>
                `<div class="day"><img class="forecast-icon animated-icon" src="https://openweathermap.org/img/wn/${d.icon}.png" alt="${d.condition}"><div>${d.day} ${Math.round(
                  convertTemp(d.tempC),
                )}°${unit === 'metric' ? 'C' : 'F'}</div></div>`
            )
            .join('');
        }
        sunriseEl.textContent = `Sunrise: ${formatTime(data.sunrise)}`;
        sunsetEl.textContent = `Sunset: ${formatTime(data.sunset)}`;
        widget.classList.add('fade-in');
        widget.removeEventListener('animationend', handler);
      },
      { once: true },
    );
  };

  const fetchLiveWeather = async (city) => {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city,
      )}&units=metric&appid=${apiKey}`,
    );
    if (!response.ok) throw new Error('Failed to fetch weather');
    const data = await response.json();
    const forecast = [];
    try {
      const fcRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          city,
        )}&units=metric&appid=${apiKey}`,
      );
      const fcJson = await fcRes.json();
      for (let i = 0; i < fcJson.list.length && forecast.length < 5; i += 8) {
        const entry = fcJson.list[i];
        forecast.push({
          day: new Date(entry.dt * 1000).toLocaleDateString([], {
            weekday: 'short',
          }),
          tempC: entry.main.temp,
          icon: entry.weather[0].icon,
          condition: entry.weather[0].description,
        });
      }
    } catch {
      // ignore forecast errors
    }
    return {
      tempC: data.main.temp,
      feelsLikeC: data.main.feels_like,
      condition: data.weather[0].description,
      icon: data.weather[0].icon,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      forecast,
    };
  };

  const updateWeather = async () => {
    const city = citySearch.value.trim();
    try {
      let data;
      if (apiKey && city) {
        data = await fetchLiveWeather(city);
        safeLocalStorage?.setItem('lastCity', city);
        if (!savedCities.includes(city)) {
          savedCities.push(city);
          safeLocalStorage?.setItem('savedCities', JSON.stringify(savedCities));
          updateDatalist();
        }
      } else {
        data = demoCity;
        citySearch.value = demoCity.name;
        safeLocalStorage?.setItem('lastCity', demoCity.name);
      }
      renderWeather(data);
      errorMessageEl.textContent = '';
      updatePinButton();
    } catch (err) {
      console.error(err);
      errorMessageEl.textContent = 'Unable to fetch weather data. Please try again later.';
    }
  };

  const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  };

  const debouncedUpdateWeather = debounce(updateWeather, 500);
  citySearch.addEventListener('input', () => {
    updatePinButton();
    debouncedUpdateWeather();
  });

  unitToggle.addEventListener('change', () => {
    unit = unitToggle.value;
    try {
      safeLocalStorage?.setItem('weatherUnit', unit);
    } catch {
      // ignore storage errors
    }
    updateWeather();
  });

  const unlockSecureStore = async () => {
    const passphrase = passphraseInput.value.trim();
    if (!passphrase) {
      setSecureStatus('Enter a passphrase to unlock the API key.', 'error');
      return;
    }
    try {
      const stored = hasStoredApiKey
        ? await getSecureItem('weatherApiKey', passphrase)
        : null;
      apiKey = stored ?? pendingLegacyKey ?? '';
      securePassphrase = passphrase;
      secureUnlocked = true;
      pendingLegacyKey = '';
      passphraseInput.value = '';
      apiKeyInput.value = apiKey;
      setSecureStatus(
        stored
          ? 'Secure storage unlocked.'
          : 'Secure storage unlocked. Save your API key to encrypt it.',
        'success',
      );
      updateSecureUiState();
      updateWeather();
    } catch (error) {
      secureUnlocked = false;
      securePassphrase = '';
      apiKey = '';
      const message =
        error instanceof SecureStoreError
          ? error.message
          : 'Unable to unlock secure storage.';
      setSecureStatus(message, 'error');
      updateSecureUiState();
    }
  };

  unlockApiKeyBtn.addEventListener('click', () => {
    unlockSecureStore();
  });

  const rotateApiKeyPassphrase = async () => {
    const next = newPassphraseInput.value.trim();
    if (!secureUnlocked) {
      setSecureStatus('Unlock secure storage before rotating the passphrase.', 'error');
      return;
    }
    if (!hasStoredApiKey) {
      setSecureStatus('Save an API key before rotating the passphrase.', 'error');
      return;
    }
    if (!next) {
      setSecureStatus('Enter a new passphrase.', 'error');
      return;
    }
    if (next === securePassphrase) {
      setSecureStatus('Choose a different passphrase.', 'error');
      return;
    }
    try {
      await rotateSecureItem('weatherApiKey', securePassphrase, next);
      securePassphrase = next;
      newPassphraseInput.value = '';
      setSecureStatus('Passphrase rotated.', 'success');
    } catch (error) {
      const message =
        error instanceof SecureStoreError
          ? error.message
          : 'Unable to rotate passphrase.';
      setSecureStatus(message, 'error');
    }
  };

  rotatePassphraseBtn.addEventListener('click', () => {
    rotateApiKeyPassphrase();
  });

  saveApiKeyBtn.addEventListener('click', async () => {
    if (!secureUnlocked) {
      setSecureStatus('Unlock secure storage before saving the API key.', 'error');
      return;
    }
    apiKey = apiKeyInput.value.trim();
    try {
      if (apiKey) {
        await setSecureItem('weatherApiKey', apiKey, securePassphrase);
        hasStoredApiKey = true;
        setSecureStatus('API key saved securely.', 'success');
      } else {
        removeSecureItem('weatherApiKey');
        hasStoredApiKey = false;
        setSecureStatus('API key cleared.', 'info');
      }
      updateSecureUiState();
      updateWeather();
    } catch (error) {
      const message =
        error instanceof SecureStoreError
          ? error.message
          : 'Unable to save API key.';
      setSecureStatus(message, 'error');
    }
  });

  pinCityBtn.addEventListener('click', () => {
    const city = citySearch.value.trim();
    if (!city) return;
    if (safeLocalStorage?.getItem('pinnedCity') === city) {
      safeLocalStorage?.removeItem('pinnedCity');
    } else {
      safeLocalStorage?.setItem('pinnedCity', city);
    }
    updatePinButton();
  });

  const lastCity = safeLocalStorage?.getItem('lastCity');
  if (lastCity) {
    citySearch.value = lastCity;
  }
  updateWeather();
}
