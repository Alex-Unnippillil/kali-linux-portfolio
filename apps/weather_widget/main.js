document.addEventListener('DOMContentLoaded', () => {
  const widget = document.getElementById('weather');
  const tempEl = widget.querySelector('.temp');
  const iconEl = widget.querySelector('.icon');
  const forecastEl = widget.querySelector('.forecast');

  const params = new URLSearchParams(location.search);
  const demoMode = params.has('demo');
  let providerName = widget.dataset.provider || 'openweather';
  let city = widget.dataset.city || 'London';
  const apiKey = widget.dataset.apiKey || 'YOUR_API_KEY'; // Replace with your provider API key

  const providers = {
    openweather: async (loc, key) => {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${loc}&units=metric&appid=${key}`
      );
      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();
      return {
        temp: Math.round(data.main.temp),
        icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
        description: data.weather[0].description
      };
    },
    weatherapi: async (loc, key) => {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${key}&q=${loc}`
      );
      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();
      return {
        temp: Math.round(data.current.temp_c),
        icon: `https:${data.current.condition.icon}`,
        description: data.current.condition.text
      };
    },
    demo: async () => ({
      temp: 21,
      icon: 'https://openweathermap.org/img/wn/01d@2x.png',
      description: 'clear sky'
    })
  };

  if (demoMode) {
    providerName = 'demo';
    city = 'Demo City';
  }

  const CACHE_TTL = 60 * 60 * 1000; // 1 hour
  const cacheKey = `weather:${providerName}:${city}`;

  async function fetchWeather() {
    try {
      const data = await providers[providerName](city, apiKey);
      updateWeather(data);
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    } catch (err) {
      console.error(err);
    }
  }

  function loadWeather() {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL;
    if (cached) {
      updateWeather(cached.data);
    }
    if (isStale) {
      fetchWeather();
    } else {
      // revalidate in background
      fetchWeather().catch(() => {});
    }
  }

  function updateWeather(data) {
    widget.classList.remove('fade-in');
    widget.classList.add('fade-out');
    widget.addEventListener(
      'animationend',
      function handler() {
        widget.classList.remove('fade-out');
        tempEl.textContent = `${data.temp}°C`;
        iconEl.src = data.icon;
        iconEl.alt = data.description;
        forecastEl.textContent = data.description;
        widget.classList.add('fade-in');
        widget.removeEventListener('animationend', handler);
      },
      { once: true }
    );
  }

  loadWeather();
  setInterval(loadWeather, CACHE_TTL);
});
