let channels=[];
let allStreams={};
let currentPlaylist='';

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
        Object.keys(allStreams[country]).forEach(category => {
          allStreams[country][category].forEach(channel => {
            if(channel.name.toLowerCase().includes(keyword)) {
              results.push(channel);
            }
          });
        });
      });

      displayChannels(results.slice(0, 50));
    });
  }
});

function parseM3U(content, playlistName) {
  let streams = {};
  let lines = content.split('\n');
  let currentStream = null;
  
  for(let line of lines) {
    line = line.trim();
    
    if(line.startsWith('#EXTINF:')) {
      // Extract tvg-country, group-title, tvg-name
      let countryMatch = line.match(/tvg-country="([^"]*)"/);
      let categoryMatch = line.match(/group-title="([^"]*)"/);
      let nameMatch = line.match(/,(.+)$/);
      
      let countries = countryMatch ? countryMatch[1].split(',') : ['Unknown'];
      let category = categoryMatch ? categoryMatch[1] : 'Uncategorized';
      let name = nameMatch ? nameMatch[1].trim() : 'Unknown';
      
      currentStream = {
        name: name,
        stream: null,
        category: category,
        countries: countries.map(c => c.trim()),
        rawLine: line
      };
    } else if((line.startsWith('http://') || line.startsWith('https://')) && currentStream) {
      currentStream.stream = line;
      
      // Organize by country
      for(let country of currentStream.countries) {
        if(!streams[country]) {
          streams[country] = {};
        }
        if(!streams[country][currentStream.category]) {
          streams[country][currentStream.category] = [];
        }
        streams[country][currentStream.category].push(currentStream);
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
    
    let categoryCount = allStreams[country] ? Object.keys(allStreams[country]).length : 0;
    let channelCount = allStreams[country] ? Object.values(allStreams[country]).reduce((sum, cat) => sum + cat.length, 0) : 0;
    
    card.innerHTML=`
      <h3>${country}</h3>
      <p>${categoryCount} categories</p>
      <small>${channelCount} channels</small>
    `;
    
    card.onclick=function(){
      if(allStreams[country]) {
        displayCategories(country);
      }
    };
    
    container.appendChild(card);
  });
}

function displayCategories(country) {
  let container=document.getElementById("channels");
  container.innerHTML="";
  
  if(!allStreams[country]) {
    container.innerHTML="<p style='color:red;'>No data for "+country+"</p>";
    return;
  }
  
  let categories = Object.keys(allStreams[country]);
  
  // Back button
  let backBtn=document.createElement("div");
  backBtn.className="channel-card";
  backBtn.innerHTML="<h3>← Back to Countries</h3>";
  backBtn.onclick=function(){
    displayCountries(Object.keys(allStreams).sort());
  };
  container.appendChild(backBtn);
  
  // Category cards
  categories.sort().forEach(category=>{
    let card=document.createElement("div");
    card.className="channel-card";
    
    let channelCount = allStreams[country][category] ? allStreams[country][category].length : 0;
    
    card.innerHTML=`
      <h3>${category}</h3>
      <p>${channelCount} channels</p>
    `;
    
    card.onclick=function(){
      if(allStreams[country][category]) {
        displayChannels(allStreams[country][category], country, category);
      }
    };
    
    container.appendChild(card);
  });
}

function displayChannels(list, country, category){
  let container=document.getElementById("channels");
  container.innerHTML="";
  
  if(!list || list.length === 0) {
    container.innerHTML="<p style='color:red;'>No channels found</p>";
    return;
  }
  
  // Back button
  let backBtn=document.createElement("div");
  backBtn.className="channel-card";
  backBtn.innerHTML="<h3>← Back to Categories</h3>";
  backBtn.onclick=function(){
    if(country) {
      displayCategories(country);
    } else {
      displayCountries(Object.keys(allStreams).sort());
    }
  };
  container.appendChild(backBtn);

  // Channel cards
  list.slice(0, 50).forEach(channel=>{
    let card=document.createElement("div");
    card.className="channel-card";

    card.innerHTML=`
      <h3>${channel.name}</h3>
      <p>${channel.category}</p>
      <small>${channel.countries.join(', ')}</small>
    `;

    card.onclick=function(){
      playChannel(channel);
    };

    container.appendChild(card);
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