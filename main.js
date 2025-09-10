        // GANTI DENGAN KONFIGURASI FIREBASE-MU
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
        
        const startButton = document.getElementById('startButton');
        const stopButton = document.getElementById('stopButton');
        const statusMessage = document.getElementById('status-message');
        const namaInput = document.getElementById('nama-karyawan');
        
        let watchId = null;
        let lastPositionTime = null;
        let userId = null;
        
        async function handlePosition(position) {
          const currentTime = new Date().getTime();
          const timeTaken = lastPositionTime ? currentTime - lastPositionTime : 0;
          lastPositionTime = currentTime;
          const accuracy = position.coords.accuracy;
          
          const isSuspicious = accuracy < 10 || timeTaken < 200;
          
          const lat = position.coords.latitude;
          const long = position.coords.longitude;
          
          let address = "Alamat tidak diketahui";
          
          // Mencoba mendapatkan alamat dari koordinat
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
          
          db.ref('locations/' + userId).set({
              lat: lat,
              long: long,
              accuracy: accuracy,
              isFake: isSuspicious,
              address: address, // Alamat baru ditambahkan di sini
              timestamp: new Date().toLocaleString()
            })
            .then(() => {
              if (isSuspicious) {
                statusMessage.textContent = 'Data lokasi sedang dikirim...';
                statusMessage.style.color = '#4a4a4a';
              } else {
                statusMessage.textContent = ' Lokasi live terverifikasi.';
                statusMessage.style.color = '#28a745';
              }
            })
            .catch(error => {
              console.error("Gagal mengirim data ke Firebase:", error);
              statusMessage.textContent = ' Gagal mengirim data. Periksa koneksi internet.';
              statusMessage.style.color = '#dc3545';
            });
        }
        
        function handleError(error) {
          statusMessage.textContent = ' Gagal mendapatkan lokasi. Pastikan izin GPS diberikan.';
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
          lastPositionTime = new Date().getTime();
          watchId = navigator.geolocation.watchPosition(handlePosition, handleError, options);
        }
        
        function stopTracking() {
          if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
            statusMessage.textContent = 'Tracking dihentikan.';
            statusMessage.style.color = '#007bff';
            startButton.disabled = false;
            stopButton.disabled = true;
            namaInput.disabled = false;
          }
        }
        
        startButton.addEventListener('click', startTracking);
        stopButton.addEventListener('click', stopTracking);