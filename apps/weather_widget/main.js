import demoCity from './demoCity.json';

const widget = document.getElementById('weather');
const tempEl = widget.querySelector('.temp');
const iconEl = widget.querySelector('.icon');
const forecastEl = widget.querySelector('.forecast');
const sunriseEl = widget.querySelector('.sunrise');
const sunsetEl = widget.querySelector('.sunset');
const citySearch = document.getElementById('city-search');
const unitToggle = document.getElementById('unit-toggle');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key');
const errorMessageEl = document.getElementById('error-message');

let apiKey = localStorage.getItem('weatherApiKey') || '';
if (apiKey) apiKeyInput.value = apiKey;

let unit = unitToggle.value;

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
      if (data.icon) {
        iconEl.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
        iconEl.alt = data.condition;
      }
      forecastEl.textContent = data.condition;
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
  return {
    tempC: data.main.temp,
    condition: data.weather[0].description,
    icon: data.weather[0].icon,
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset,
  };
}

async function updateWeather() {
  const city = citySearch.value.trim();
  try {
    let data;
    if (apiKey && city) {
      data = await fetchLiveWeather(city);
      localStorage.setItem('lastCity', city);
    } else {
      data = demoCity;
      citySearch.value = demoCity.name;
      localStorage.setItem('lastCity', demoCity.name);
    }
    renderWeather(data);
    errorMessageEl.textContent = '';
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
citySearch.addEventListener('input', debouncedUpdateWeather);

unitToggle.addEventListener('change', () => {
  unit = unitToggle.value;
  updateWeather();
});

saveApiKeyBtn.addEventListener('click', () => {
  apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    localStorage.setItem('weatherApiKey', apiKey);
  } else {
    localStorage.removeItem('weatherApiKey');
  }
  updateWeather();
});

const lastCity = localStorage.getItem('lastCity');
if (lastCity) {
  citySearch.value = lastCity;
}

updateWeather();

setInterval(updateWeather, 10 * 60 * 1000);
