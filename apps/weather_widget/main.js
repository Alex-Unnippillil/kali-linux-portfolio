import demoCity from './demoCity.json';
import { isBrowser } from '../../utils/env';
import { safeLocalStorage } from '../../utils/safeStorage';

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
const saveApiKeyBtn = document.getElementById('save-api-key');
const pinCityBtn = document.getElementById('pin-city');
const datalist = document.getElementById('saved-cities');
const errorMessageEl = document.getElementById('error-message');

let apiKey = safeLocalStorage?.getItem('weatherApiKey') || '';
if (apiKey) apiKeyInput.value = apiKey;

let unit = safeLocalStorage?.getItem('weatherUnit') || unitToggle.value;
unitToggle.value = unit;

let savedCities = JSON.parse(safeLocalStorage?.getItem('savedCities') || '[]');

function updateDatalist() {
  datalist.innerHTML = '';
  savedCities.forEach((c) => {
    const option = document.createElement('option');
    option.value = c;
    datalist.appendChild(option);
  });
}

function updatePinButton() {
  const city = citySearch.value.trim();
  if (safeLocalStorage?.getItem('pinnedCity') === city) {
    pinCityBtn.textContent = 'Unpin';
  } else {
    pinCityBtn.textContent = 'Pin';
  }
}

updateDatalist();

function convertTemp(celsius) {
  return unit === 'metric' ? celsius : (celsius * 9) / 5 + 32;
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderWeather(data) {
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
        iconEl.className = 'icon icon-lg animated-icon';
      }
      forecastEl.textContent = data.condition;
      if (data.forecast) {
        dailyEl.innerHTML = data.forecast
          .map(
            (d) =>
              `<div class="day"><img class="icon icon-sm animated-icon" src="https://openweathermap.org/img/wn/${d.icon}.png" alt="${d.condition}"><div>${d.day} ${Math.round(
                convertTemp(d.tempC)
              )}°${unit === 'metric' ? 'C' : 'F'}</div></div>`
          )
          .join('');
      }
      sunriseEl.textContent = `Sunrise: ${formatTime(data.sunrise)}`;
      sunsetEl.textContent = `Sunset: ${formatTime(data.sunset)}`;
      widget.classList.add('fade-in');
      widget.removeEventListener('animationend', handler);
    },
    { once: true }
  );
}

async function fetchLiveWeather(city) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&units=metric&appid=${apiKey}`
  );
  if (!response.ok) throw new Error('Failed to fetch weather');
  const data = await response.json();
  let forecast = [];
  try {
    const fcRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        city
      )}&units=metric&appid=${apiKey}`
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
}

async function updateWeather() {
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
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

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

saveApiKeyBtn.addEventListener('click', () => {
  apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    safeLocalStorage?.setItem('weatherApiKey', apiKey);
  } else {
    safeLocalStorage?.removeItem('weatherApiKey');
  }
  updateWeather();
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

const pinned = safeLocalStorage?.getItem('pinnedCity');
const lastCity = safeLocalStorage?.getItem('lastCity');
if (pinned) {
  citySearch.value = pinned;
} else if (lastCity) {
  citySearch.value = lastCity;
}
updatePinButton();

updateWeather();

setInterval(updateWeather, 10 * 60 * 1000);
}
