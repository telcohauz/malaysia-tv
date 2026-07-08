let channels=[];
let allStreams={};
let currentPlaylist='';
let streamValidationCache={};

document.addEventListener('DOMContentLoaded', function(){
  fetch("data/channels.json")
  .then(response=>response.json())
  .then(data=>{
    channels=data;
    displayPlaylists(channels);
  })
  .catch(e => {
    console.error('Error loading channels.json:', e);
    document.getElementById("channels").innerHTML="<p style='color:red;'>Error loading channels</p>";
  });

  // Search listener - safe after DOM ready
  let searchInput = document.getElementById("search");
  if(searchInput) {
    searchInput.addEventListener("input",function(){
      let keyword=this.value.toLowerCase();
      
      let results = [];
      Object.keys(allStreams).forEach(country => {
        allStreams[country].forEach(channel => {
          if(channel.name.toLowerCase().includes(keyword)) {
            results.push(channel);
          }
        });
      });

      displayChannels(results.slice(0, 50));
    });
  }
});

async function validateStream(url) {
  if(streamValidationCache[url] !== undefined) {
    return streamValidationCache[url];
  }
  
  try {
    let response = await fetch(url, { 
      method: 'HEAD', 
      mode: 'cors',
      timeout: 5000
    });
    streamValidationCache[url] = response.ok;
    return response.ok;
  } catch(e) {
    streamValidationCache[url] = false;
    return false;
  }
}

function parseM3U(content, playlistName) {
  let streams = {};
  let lines = content.split('\n');
  let currentStream = null;
  
  for(let line of lines) {
    line = line.trim();
    
    if(line.startsWith('#EXTINF:')) {
      // Extract tvg-country, tvg-name
      let countryMatch = line.match(/tvg-country="([^"]*)"/);
      let nameMatch = line.match(/,(.+)$/);
      
      let countries = countryMatch ? countryMatch[1].split(',') : ['Unknown'];
      let name = nameMatch ? nameMatch[1].trim() : 'Unknown';
      
      currentStream = {
        name: name,
        stream: null,
        countries: countries.map(c => c.trim()),
        rawLine: line,
        status: 'pending' // pending, working, broken
      };
    } else if((line.startsWith('http://') || line.startsWith('https://')) && currentStream) {
      currentStream.stream = line;
      
      // Organize by country ONLY
      for(let country of currentStream.countries) {
        if(!streams[country]) {
          streams[country] = [];
        }
        streams[country].push(currentStream);
      }
      
      currentStream = null;
    }
  }
  
  return streams;
}

function displayPlaylists(list){
  let container=document.getElementById("channels");
  container.innerHTML="";
  
  list.forEach((playlist, idx)=>{
    let card=document.createElement("div");
    card.className="channel-card";
    
    card.innerHTML=`
      <h3>${playlist.name}</h3>
      <p>${playlist.category}</p>
      <small>Click to load...</small>
    `;
    
    card.onclick=function(){
      loadPlaylist(playlist, idx);
    };
    
    container.appendChild(card);
  });
}

async function loadPlaylist(playlist, idx) {
  let container=document.getElementById("channels");
  container.innerHTML="<p>Loading "+playlist.name+"... (this may take 10-30 seconds)</p>";
  
  try {
    let response = await fetch(playlist.stream, {
      headers: { 
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if(!response.ok) {
      throw new Error('HTTP '+response.status);
    }
    
    let content = await response.text();
    console.log('M3U loaded for', playlist.name, 'size:', content.length, 'lines:', content.split('\n').length);
    
    if(content.length < 100) {
      throw new Error('M3U file too small or empty');
    }
    
    let parsed = parseM3U(content, playlist.name);
    let countryCount = Object.keys(parsed).length;
    
    if(countryCount === 0) {
      throw new Error('No countries found in M3U');
    }
    
    allStreams = parsed;
    console.log('Parsed countries:', countryCount, 'countries:', Object.keys(parsed).slice(0,10).join(', '));
    
    displayCountries(Object.keys(parsed).sort());
  } catch(e) {
    console.error('Error loading M3U:', playlist.name, e);
    container.innerHTML=`
      <p style='color:red;'>Error loading ${playlist.name}</p>
      <p style='font-size:12px;'>${e.message}</p>
      <button onclick="location.reload()">Retry</button>
    `;
  }
}

function displayCountries(countries) {
  let container=document.getElementById("channels");
  container.innerHTML="";
  
  if(!countries || countries.length === 0) {
    container.innerHTML="<p style='color:red;'>No countries found</p>";
    return;
  }
  
  // Back button
  let backBtn=document.createElement("div");
  backBtn.className="channel-card";
  backBtn.innerHTML="<h3>← Back to Playlists</h3>";
  backBtn.onclick=function(){
    displayPlaylists(channels);
  };
  container.appendChild(backBtn);
  
  // Country cards
  countries.forEach(country=>{
    let card=document.createElement("div");
    card.className="channel-card";
    
    let channelCount = allStreams[country] ? allStreams[country].length : 0;
    
    card.innerHTML=`
      <h3>${country}</h3>
      <p>${channelCount} channels</p>
    `;
    
    card.onclick=function(){
      if(allStreams[country]) {
        displayChannels(allStreams[country], country);
      }
    };
    
    container.appendChild(card);
  });
}

function displayChannels(list, country){
  let container=document.getElementById("channels");
  container.innerHTML="";
  
  if(!list || list.length === 0) {
    container.innerHTML="<p style='color:red;'>No channels found</p>";
    return;
  }
  
  // Back button
  let backBtn=document.createElement("div");
  backBtn.className="channel-card";
  backBtn.innerHTML="<h3>← Back to Countries</h3>";
  backBtn.onclick=function(){
    displayCountries(Object.keys(allStreams).sort());
  };
  container.appendChild(backBtn);

  // Channel cards with status validation
  list.slice(0, 50).forEach(channel=>{
    let card=document.createElement("div");
    card.className="channel-card";

    let statusIcon = channel.status === 'working' ? '✅' : channel.status === 'broken' ? '❌' : '⏳';
    let statusText = channel.status === 'working' ? 'Working' : channel.status === 'broken' ? 'Broken' : 'Checking...';
    let statusClass = 'status-' + channel.status;

    card.innerHTML=`
      <h3>${channel.name}</h3>
      <div class="channel-status ${statusClass}">
        <span>${statusIcon} ${statusText}</span>
      </div>
      <small>${channel.countries.join(', ')}</small>
    `;

    // Only allow click if working or checking
    if(channel.status !== 'broken') {
      card.style.cursor = 'pointer';
      card.onclick=function(){
        playChannel(channel);
      };
    } else {
      card.style.cursor = 'not-allowed';
      card.style.opacity = '0.6';
    }

    container.appendChild(card);
    
    // Validate stream in background
    if(channel.status === 'pending') {
      validateStream(channel.stream).then(isWorking => {
        channel.status = isWorking ? 'working' : 'broken';
        
        // Update card UI
        let statusDiv = card.querySelector('.channel-status');
        let statusSpan = statusDiv.querySelector('span');
        
        if(isWorking) {
          statusDiv.className = 'channel-status status-working';
          statusSpan.innerHTML = '✅ Working';
          card.style.cursor = 'pointer';
          card.style.opacity = '1';
          card.onclick=function(){
            playChannel(channel);
          };
        } else {
          statusDiv.className = 'channel-status status-broken';
          statusSpan.innerHTML = '❌ Broken';
          card.style.cursor = 'not-allowed';
          card.style.opacity = '0.6';
          card.onclick = null;
        }
      });
    }
  });
  
  if(list.length > 50) {
    let moreInfo=document.createElement("div");
    moreInfo.className="channel-card";
    moreInfo.innerHTML="<p>Showing 50 of "+list.length+" channels</p>";
    container.appendChild(moreInfo);
  }
}

function playChannel(channel){
  let player=document.getElementById("player");
  let nowPlaying=document.getElementById("nowPlaying");
  
  if(!player || !nowPlaying) {
    console.error('Player element not found');
    return;
  }
  
  if(channel.status === 'broken') {
    nowPlaying.innerHTML="❌ This stream is not working";
    return;
  }
  
  nowPlaying.innerHTML="Sedang menonton: "+channel.name;

  let streamUrl = channel.stream;
  
  if(!streamUrl) {
    nowPlaying.innerHTML="Error: No stream URL available";
    return;
  }

  try {
    if(Hls.isSupported()){
      let hls = new Hls({
        xhrSetup: function(xhr){
          xhr.withCredentials = false;
        },
        enableWorker: true,
        debug: false
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(player);

      hls.on(Hls.Events.MANIFEST_PARSED,function(){
        player.play().catch(e => console.log('Play error:', e));
      });

      hls.on(Hls.Events.ERROR, function(event, data){
        console.log('HLS Error:', data);
        if(data.fatal) {
          nowPlaying.innerHTML="Error loading stream";
        }
      });
    }
    else{
      player.src = streamUrl;
      player.play().catch(e => console.log('Play error:', e));
    }
  } catch(e) {
    console.error('Error playing channel:', e);
    nowPlaying.innerHTML="Error playing channel: "+e.message;
  }
}