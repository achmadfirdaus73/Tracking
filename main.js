 //🔥 Config Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyATp2TW5seBULA5-vAfBV8tfnS9jYEhRDo",
      authDomain: "absensi-48cef.firebaseapp.com",
      databaseURL: "https://absensi-48cef-default-rtdb.asia-southeast1.firebasedatabase.app/",
      projectId: "absensi-48cef",
      storageBucket: "absensi-48cef.firebasestorage.app",
      messagingSenderId: "652126290992",
      appId: "1:652126290992:web:ede30d62f3141b690799f5"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // ✅ Semua const ada nilainya
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const statusMessage = document.getElementById('status-message');
    const namaInput = document.getElementById('nama-karyawan');

    // ✅ variabel kosong pakai let
    let watchId = null;
    let lastPosition = null;
    let userId = null;

    function getDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2 - lat1) * Math.PI/180;
      const Δλ = (lon2 - lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    async function handlePosition(position) {
      if (!position || !position.coords) {
        console.error("Posisi tidak valid");
        return;
      }

      const lat = position.coords.latitude;
      const long = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      const timestamp = position.timestamp;

      let isSuspicious = false;

      if (lastPosition) {
        const distance = getDistance(lastPosition.lat, lastPosition.long, lat, long);
        const timeTaken = (timestamp - lastPosition.timestamp) / 1000;
        const speed = timeTaken > 0 ? (distance / timeTaken) * 3.6 : 0;

        if (speed > 300 || accuracy < 10) {
          isSuspicious = true;
        }
      } else {
        if (accuracy < 10) {
          isSuspicious = true;
        }
      }

      lastPosition = { lat, long, timestamp };

      let address = "Alamat tidak diketahui";
      try {
        const geocodingUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${long}`;
        const response = await fetch(geocodingUrl);
        const data = await response.json();
        if (data && data.display_name) {
          address = data.display_name;
        }
      } catch (e) {
        console.error("Gagal mendapatkan alamat:", e);
      }

      try {
        await db.ref('locations/' + userId).set({
          lat,
          long,
          accuracy,
          isFake: isSuspicious,
          address,
          timestamp: new Date().toLocaleString(),
          status: 'live'
        });

        if (isSuspicious) {
          statusMessage.textContent = 'Data lokasi sedang dikirim...';
          statusMessage.style.color = '#4a4a4a';
        } else {
          statusMessage.textContent = '✅ Lokasi live terverifikasi.';
          statusMessage.style.color = '#28a745';
        }
      } catch (error) {
        console.error("Gagal mengirim data ke Firebase:", error);
        statusMessage.textContent = '❌ Gagal mengirim data. Periksa koneksi internet.';
        statusMessage.style.color = '#dc3545';
      }
    }

    function handleError(error) {
      statusMessage.textContent = '❌ Gagal mendapatkan lokasi. Pastikan izin GPS diberikan.';
      statusMessage.style.color = '#dc3545';
      stopTracking();
    }

    function startTracking() {
      const nama = namaInput.value.trim();
      if (!nama) {
        alert("Mohon masukkan nama Anda!");
        return;
      }

      userId = nama.replace(/[.#$/[\]]/g, "_");

      if (watchId) return;

      statusMessage.textContent = 'Mulai melacak lokasi dan mengirim ke server...';
      statusMessage.style.color = '#4a4a4a';
      startButton.disabled = true;
      stopButton.disabled = false;
      namaInput.disabled = true;

      const options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
      lastPosition = null;
      watchId = navigator.geolocation.watchPosition(handlePosition, handleError, options);
    }

    function stopTracking() {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;

        db.ref('locations/' + userId).update({
          status: 'stopped',
          timestamp: new Date().toLocaleString()
        });

        statusMessage.textContent = 'Tracking dihentikan.';
        statusMessage.style.color = '#007bff';
        startButton.disabled = false;
        stopButton.disabled = true;
        namaInput.disabled = false;
      }
    }

    startButton.addEventListener('click', startTracking);
    stopButton.addEventListener('click', stopTracking);
