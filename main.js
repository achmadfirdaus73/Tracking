let firebaseConfig = {
        apiKey: "AIzaSyATp2TW5seBULA5-vAfBV8tfnS9jYEhRDo",
        authDomain: "absensi-48cef.firebaseapp.com",
        databaseURL: "https://absensi-48cef-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "absensi-48cef",
        storageBucket: "absensi-48cef.firebasestorage.app",
        messagingSenderId: "652126290992",
        appId: "1:652126290992:web:ede30d62f3141b690799f5"
    };
    firebase.initializeApp(firebaseConfig);
    let db = firebase.database();

    // Elements
    let startButton = document.getElementById('startButton');
    let stopButton = document.getElementById('stopButton');
    let statusMessage = document.getElementById('status-message');
    let namaInput = document.getElementById('nama-karyawan');
    let liveUsersList = document.getElementById('live-users');

    // Variables
    let watchId = null;
    let lastPosition = null;
    let userId = null;
    let updateCount = 0;

    function getDistance(lat1, lon1, lat2, lon2){
        let R = 6371000;
        let dLat = (lat2-lat1)*Math.PI/180;
        let dLon = (lon2-lon1)*Math.PI/180;
        let a = Math.pow(Math.sin(dLat/2),2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.pow(Math.sin(dLon/2),2);
        let c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R*c;
    }

    async function handlePosition(position){
        updateCount++;
        let lat = position.coords.latitude;
        let long = position.coords.longitude;
        let accuracy = position.coords.accuracy;
        let timestamp = position.timestamp;
        let isSuspicious = false;

        if(lastPosition){
            let distance = getDistance(lastPosition.lat, lastPosition.long, lat, long);
            let timeTaken = (timestamp - lastPosition.timestamp)/1000;
            let speed = timeTaken>0 ? (distance/timeTaken)*3.6 : 0;
            if(speed>300 || accuracy<10) isSuspicious=true;
        } else if(accuracy<10) { isSuspicious=true; }
        lastPosition={lat,long,timestamp};

        // alamat default supaya fetch tidak error
        let address = "Alamat tidak diketahui";

        let locationData = {
            lat,long,accuracy,isFake:isSuspicious,address,
            timestamp:new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}),
            status:'live', lastUpdate:Date.now(), updateCount
        };

        try{
            await db.ref('locations/'+userId).set(locationData);
            statusMessage.textContent = isSuspicious?`⚠️ Data lokasi sedang dikirim... (#${updateCount})`:`✅ Lokasi live terverifikasi. (#${updateCount})`;
            statusMessage.style.color = isSuspicious?'#ffc107':'#28a745';
        } catch(e){
            statusMessage.textContent='❌ Gagal kirim data'; 
            statusMessage.style.color='#dc3545';
        }
    }

    function handleError(error){
        statusMessage.textContent='❌ Gagal dapat lokasi';
        statusMessage.style.color='#dc3545';
        stopTracking();
    }

    function startTracking(){
        let nama = namaInput.value.trim();
        if(!nama){ alert("Masukkan nama!"); return; }
        userId = nama.replace(/[.#$/[\]]/g,"_");
        statusMessage.textContent="Mulai tracking...";
        startButton.disabled=true; stopButton.disabled=false; namaInput.disabled=true;
        updateCount=0; lastPosition=null;

        if(!navigator.geolocation){ alert("Browser tidak support geolocation!"); return; }
        watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {enableHighAccuracy:true,timeout:10000,maximumAge:1000});
    }

    async function stopTracking(){
        if(watchId){
            navigator.geolocation.clearWatch(watchId); watchId=null;
            await db.ref('locations/'+userId).update({status:'stopped',lastUpdate:Date.now()});
            startButton.disabled=false; stopButton.disabled=true; namaInput.disabled=false;
            statusMessage.textContent="Tracking dihentikan"; 
            statusMessage.style.color="#007bff";
        }
    }

    // Realtime daftar karyawan live
    db.ref('locations').on('value',function(snapshot){
        liveUsersList.innerHTML="";
        let val=snapshot.val();
        if(val) for(let key in val){
            if(val[key].status==='live'){
                let li=document.createElement('li');
                li.textContent=key;
                liveUsersList.appendChild(li);
            }
        }
    });

    startButton.onclick=startTracking;
    stopButton.onclick=stopTracking;
    namaInput.addEventListener('keypress',function(e){if(e.key==='Enter' && !startButton.disabled) startTracking();});
    window.addEventListener('load',()=>namaInput.focus());
