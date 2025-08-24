document.addEventListener('DOMContentLoaded', () => {
  const widget = document.getElementById('weather');
  const tempEl = widget.querySelector('.temp');
  const forecastEl = widget.querySelector('.forecast');
  const unitBtns = widget.querySelectorAll('.unit-btn');

  const city = widget.dataset.city || 'London';
  let units = 'metric';

  unitBtns.forEach((btn) =>
    btn.addEventListener('click', () => {
      unitBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      units = btn.dataset.unit;
      loadWeather();
    })
  );

  function showSkeleton() {
    tempEl.classList.add('skeleton');
    tempEl.textContent = '';
    forecastEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const li = document.createElement('li');
      li.className = 'skeleton';
      forecastEl.appendChild(li);
    }
  }

  function clearSkeleton() {
    tempEl.classList.remove('skeleton');
    forecastEl.querySelectorAll('.skeleton').forEach((el) => el.remove());
  }

  async function geocode(loc) {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1`
    );
    if (!res.ok) throw new Error('Location lookup failed');
    const data = await res.json();
    if (!data.results || !data.results.length) throw new Error('Location not found');
    return { lat: data.results[0].latitude, lon: data.results[0].longitude };
  }

  async function loadWeather() {
    showSkeleton();
    try {
      const { lat, lon } = await geocode(city);
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&units=${units}`);
      if (!res.ok) throw new Error('Failed to fetch weather');
      const data = await res.json();
      renderWeather(data);
    } catch (err) {
      console.error(err);
      clearSkeleton();
    }
  }

  function renderWeather(data) {
    clearSkeleton();
    const unitSymbol = units === 'metric' ? '°C' : '°F';
    tempEl.textContent = `${Math.round(data.hourly.temperature_2m[0])}${unitSymbol}`;
    forecastEl.innerHTML = '';
    for (let i = 0; i < data.daily.time.length; i++) {
      const li = document.createElement('li');
      const day = data.daily.time[i];
      const max = Math.round(data.daily.temperature_2m_max[i]);
      const min = Math.round(data.daily.temperature_2m_min[i]);
      li.textContent = `${day}: ${max}${unitSymbol} / ${min}${unitSymbol}`;
      forecastEl.appendChild(li);
    }
  }

  loadWeather();
});

