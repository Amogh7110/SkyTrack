const API_KEY = "4527bc2c6e824164b5974300250512";
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const geoBtn = document.getElementById("geo-btn");
const weatherCard = document.getElementById("weather-card");
const loader = document.getElementById("loader");
const emptyState = document.getElementById("empty-state");
const savedContainer = document.getElementById("saved-cities");

// Tabs
const btnHourly = document.getElementById("btn-hourly");
const btnForecast = document.getElementById("btn-forecast");
const hourlySection = document.getElementById("hourly-section");
const forecastSection = document.getElementById("forecast-section");

let savedCities = JSON.parse(localStorage.getItem("skytrack_cities")) || [];
renderSavedCities();

// Tab Switching
btnHourly.addEventListener("click", () => switchTab('hourly'));
btnForecast.addEventListener("click", () => switchTab('forecast'));

function switchTab(tab) {
  if (tab === 'hourly') {
    btnHourly.classList.add("active");
    btnForecast.classList.remove("active");
    hourlySection.classList.remove("hidden");
    forecastSection.classList.add("hidden");
    // Re-draw chart on tab switch to ensure it fits the container
    if(window.currentHourlyData) drawChart(window.currentHourlyData);
  } else {
    btnForecast.classList.add("active");
    btnHourly.classList.remove("active");
    forecastSection.classList.remove("hidden");
    hourlySection.classList.add("hidden");
  }
}

form.addEventListener("submit", e => { e.preventDefault(); fetchWeather(input.value.trim()); });

async function fetchWeather(query) {
  try {
    loader.classList.remove("hidden");
    emptyState.style.display = "none";
    weatherCard.classList.add("hidden");

    const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${query}&days=7&aqi=yes`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    // CRITICAL: Unhide the card BEFORE drawing the chart
    loader.classList.add("hidden");
    weatherCard.classList.remove("hidden");
    
    updateUI(data);
    saveCity(data.location.name);
  } catch (err) {
    alert(err.message);
    loader.classList.add("hidden");
    emptyState.style.display = "block";
  }
}

function updateUI(data) {
  // Update Text Content
  document.getElementById("location-name").textContent = `${data.location.name}, ${data.location.country}`;
  document.getElementById("temp").textContent = `${Math.round(data.current.temp_c)}°C`;
  document.getElementById("condition").textContent = data.current.condition.text;
  document.getElementById("weather-icon").src = "https:" + data.current.condition.icon;
  document.getElementById("humidity").textContent = data.current.humidity + "%";
  document.getElementById("wind").textContent = data.current.wind_kph + " km/h";
  document.getElementById("feels").textContent = Math.round(data.current.feelslike_c) + "°C";
  document.getElementById("uv").textContent = data.current.uv;

  // AQI
  const aqi = data.current.air_quality["us-epa-index"];
  const badge = document.getElementById("aqi-label");
  const aqiMap = ["Good", "Moderate", "Unhealthy", "Bad", "Very Bad", "Hazardous"];
  badge.textContent = aqiMap[aqi-1] || "Unknown";

  // Store data globally for tab switching and draw chart
  window.currentHourlyData = data.forecast.forecastday[0].hour.filter((_, i) => i % 3 === 0);
  drawChart(window.currentHourlyData);

  // Forecast List
  const forecastList = document.getElementById("forecast-list");
  forecastList.innerHTML = data.forecast.forecastday.map(day => {
    const date = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
    return `
      <div class="forecast-item">
        <span class="forecast-date">${date}</span>
        <img src="https:${day.day.condition.icon}">
        <span class="forecast-temp">${Math.round(day.day.maxtemp_c)}° / ${Math.round(day.day.mintemp_c)}°</span>
      </div>`;
  }).join("");
}

function drawChart(hours) {
  const canvas = document.getElementById("hourlyChart");
  const ctx = canvas.getContext("2d");
  
  // Use clientWidth to get the actual visible size
  const width = canvas.clientWidth;
  const height = 160;
  
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const temps = hours.map(h => h.temp_c);
  const max = Math.max(...temps);
  const min = Math.min(...temps);
  const range = (max - min) || 4;

  ctx.clearRect(0, 0, width, height);
  
  // Drawing the line
  ctx.beginPath();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";

  hours.forEach((h, i) => {
    const x = (i / (hours.length - 1)) * (width - 60) + 30;
    const y = (height - 40) - ((h.temp_c - min) / range) * (height - 80);
    
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    // Labels
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.fillText(`${Math.round(h.temp_c)}°`, x - 8, y - 10);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(h.time.split(" ")[1], x - 12, height - 5);
  });
  ctx.stroke();
}

function saveCity(name) {
  if (!savedCities.includes(name)) {
    savedCities.unshift(name);
    if (savedCities.length > 5) savedCities.pop();
    localStorage.setItem("skytrack_cities", JSON.stringify(savedCities));
    renderSavedCities();
  }
}

function renderSavedCities() {
  savedContainer.innerHTML = savedCities.map(c => `<span class="city-tag" onclick="fetchWeather('${c}')">${c}</span>`).join("");
}