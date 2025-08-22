document.addEventListener('DOMContentLoaded', () => {
  const apiKey = 'YOUR_API_KEY'; // Replace with your OpenWeather API key
  const city = 'London';
  const widget = document.getElementById('weather');
  const tempEl = widget.querySelector('.temp');
  const iconEl = widget.querySelector('.icon');
  const forecastEl = widget.querySelector('.forecast');

  async function fetchWeather() {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
      );
      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();
      updateWeather(data);
    } catch (err) {
      console.error(err);
    }
  }

  function updateWeather(data) {
    widget.classList.remove('fade-in');
    widget.classList.add('fade-out');
    widget.addEventListener(
      'animationend',
      function handler() {
        widget.classList.remove('fade-out');
        tempEl.textContent = `${Math.round(data.main.temp)}°C`;
        const icon = data.weather[0].icon;
        iconEl.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        iconEl.alt = data.weather[0].description;
        forecastEl.textContent = data.weather[0].description;
        widget.classList.add('fade-in');
        widget.removeEventListener('animationend', handler);
      },
      { once: true }
    );
  }

  fetchWeather();
  // Refresh weather every 10 minutes
  setInterval(fetchWeather, 10 * 60 * 1000);
});
