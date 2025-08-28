import cities from './cities.json';

const widget = document.getElementById('weather');
const tempEl = widget.querySelector('.temp');
const iconEl = widget.querySelector('.icon');
const forecastEl = widget.querySelector('.forecast');
const cityPicker = document.getElementById('city-picker');
const unitToggle = document.getElementById('unit-toggle');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key');

let apiKey = localStorage.getItem('weatherApiKey') || '';
if (apiKey) apiKeyInput.value = apiKey;

let unit = unitToggle.value;

function loadCities() {
  cityPicker.innerHTML = cities
    .map((c) => `<option value="${c.name}">${c.name}</option>`)
    .join('');
}

function convertTemp(celsius) {
  return unit === 'metric' ? celsius : (celsius * 9) / 5 + 32;
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
      widget.classList.add('fade-in');
      widget.removeEventListener('animationend', handler);
    },
    { once: true }
  );
}

async function fetchLiveWeather(city) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
  );
  if (!response.ok) throw new Error('Failed to fetch weather');
  const data = await response.json();
  return {
    tempC: data.main.temp,
    condition: data.weather[0].description,
    icon: data.weather[0].icon,
  };
}

async function updateWeather() {
  const city = cityPicker.value;
  try {
    let data;
    if (apiKey) {
      data = await fetchLiveWeather(city);
    } else {
      data = cities.find((c) => c.name === city);
    }
    if (data) {
      renderWeather(data);
    }
  } catch (err) {
    console.error(err);
  }
}

cityPicker.addEventListener('change', updateWeather);

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

loadCities();
if (cities.length) {
  cityPicker.value = cities[0].name;
  updateWeather();
}

setInterval(updateWeather, 10 * 60 * 1000);
