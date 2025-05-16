// Firebase SDK
const firebaseConfig = {
  apiKey: "AIzaSyDCBz5O-5M95H_XiLROv2os5hJzlljIqVI",
  authDomain: "pemantauan-suhu-b5833.firebaseapp.com",
  databaseURL: "https://pemantauan-suhu-b5833-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pemantauan-suhu-b5833",
  storageBucket: "pemantauan-suhu-b5833.firebasestorage.app",
  messagingSenderId: "872883354742",
  appId: "1:872883354742:web:63c122d072f6318a98f357"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Mapping of sensor paths to kandang names
const sensorMapping = [
  { path: 'sensor1', kandang: 'SUHU 1' },
  { path: 'sensor2', kandang: 'SUHU 2' },
  { path: 'sensor3', kandang: 'SUHU 3' },
  { path: 'sensor4', kandang: 'SUHU 4' },
  { path: 'sensor5', kandang: 'SUHU 5' },
  { path: 'sensor6', kandang: 'SUHU 6' },
  { path: 'sensor7', kandang: 'SUHU 7' },
  { path: 'sensor8', kandang: 'SUHU 8' },
  { path: 'sensor9', kandang: 'SUHU 9' },
  { path: 'sensor10', kandang: 'SUHU 10' },
  { path: 'sensor11', kandang: 'SUHU 11' },
  { path: 'sensor12', kandang: 'SUHU 12' }
];

function getCardColor(temp) {
  if (temp >= 30) return 'red';
  if (temp <= 25) return 'green';
  return 'blue';
}

function getStatusText(temp) {
  if (temp >= 30) return ['hot', 'Panas'];
  if (temp <= 25) return ['cold', 'Dingin'];
  return ['normal', 'Normal'];
}

// Modal functionality
const modal = document.getElementById('detail-modal');
const closeBtn = document.getElementsByClassName('close')[0];

closeBtn.onclick = function() {
  modal.style.display = 'none';
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = 'none';
  }
}

function showDetailModal(sensorPath, kandangName) {
  const modalTitle = document.getElementById('modal-title');
  const detailContainer = document.getElementById('detail-container');
  
  modalTitle.textContent = kandangName;
  detailContainer.innerHTML = '<tr><td colspan="4" class="loading">Memuat data...</td></tr>';
  modal.style.display = 'block';

  // Fetch historical data for the selected kandang
  db.ref(sensorPath)
    .orderByKey()
    .limitToLast(50) // Get last 50 entries
    .once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (data) {
        const entries = Object.entries(data)
          .map(([timestamp, data]) => {
            // Convert timestamp to milliseconds if it's in seconds
            const timestampMs = timestamp.length === 10 ? parseInt(timestamp) * 1000 : parseInt(timestamp);
            return {
              timestamp: timestampMs,
              temperature: data.temperature
            };
          })
          .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

        detailContainer.innerHTML = entries.map(entry => {
          const date = new Date(entry.timestamp);
          const formattedDate = date.toLocaleString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          const [statusClass, statusText] = getStatusText(entry.temperature);
          
          return `
            <tr>
              <td>${entry.temperature} °C</td>
              <td><span class="status-text ${statusClass}">${statusText}</span></td>
              <td>${formattedDate}</td>
              <td>${entry.timestamp}</td>
            </tr>
          `;
        }).join('');
      } else {
        detailContainer.innerHTML = '<tr><td colspan="4">Tidak ada data tersedia</td></tr>';
      }
    })
    .catch(error => {
      console.error('Error fetching detail data:', error);
      detailContainer.innerHTML = '<tr><td colspan="4" class="error">Error loading data</td></tr>';
    });
}

function renderCards(data) {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';
  sensorMapping.forEach((sensor, idx) => {
    const suhu = data && data[sensor.path] !== undefined ? data[sensor.path] : '--';
    const color = typeof suhu === 'number' ? getCardColor(suhu) : 'blue';
    container.innerHTML += `
      <div class="card ${color}">
        <div class="room">${sensor.kandang}</div>
        <div class="temp">${suhu} °C</div>
        <a class="detail" href="#" onclick="showDetailModal('${sensor.path}', '${sensor.kandang}')">Detail →</a>
      </div>
    `;
  });
}

// Fetch latest temperatures for all sensors
function fetchLatestTemperatures() {
  const data = {};
  const promises = sensorMapping.map(sensor => {
    return db.ref(sensor.path).once('value').then(snapshot => {
      const sensorData = snapshot.val();
      if (sensorData) {
        // Get the latest timestamp
        const timestamps = Object.keys(sensorData)
          .map(Number)
          .filter(timestamp => !isNaN(timestamp))
          .sort((a, b) => b - a);
        
        if (timestamps.length > 0) {
          const latestData = sensorData[timestamps[0]];
          // Use the timestamp from Firebase or current time if not available
          data[sensor.path] = latestData.temperature;
        } else {
          data[sensor.path] = '--';
        }
      } else {
        data[sensor.path] = '--';
      }
    });
  });

  Promise.all(promises).then(() => {
    renderCards(data);
  }).catch(error => {
    console.error('Error fetching data:', error);
    renderCards({});
  });
}

// Function to write data to Firebase with current timestamp
function writeTemperatureData(sensorPath, temperature) {
  const timestamp = Date.now(); // Current timestamp in milliseconds
  return db.ref(sensorPath).child(timestamp.toString()).set({
    temperature: temperature,
    timestamp: timestamp
  });
}

// Initial render
renderCards({});

// Listen for real-time updates
sensorMapping.forEach(sensor => {
  db.ref(sensor.path).on('value', () => {
    fetchLatestTemperatures();
  });
});