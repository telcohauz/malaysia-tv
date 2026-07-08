let channels=[];
let allStreams={};
let currentPlaylist='';

fetch("data/channels.json")
.then(response=>response.json())
.then(data=>{
  channels=data;
  displayPlaylists(channels);
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
  container.innerHTML="<p>Loading "+playlist.name+"...</p>";
  
  try {
    let response = await fetch(playlist.stream);
    let content = await response.text();
    console.log('M3U loaded for', playlist.name, 'size:', content.length);
    
    let parsed = parseM3U(content, playlist.name);
    allStreams = parsed;
    
    displayCountries(Object.keys(parsed).sort());
  } catch(e) {
    console.error('Error loading M3U:', playlist.name, e);
    container.innerHTML="<p style='color:red;'>Error loading "+playlist.name+"</p>";
  }
}

function displayCountries(countries) {
  let container=document.getElementById("channels");
  container.innerHTML="";
  
  countries.forEach(country=>{
    let card=document.createElement("div");
    card.className="channel-card";
    
    let categoryCount = Object.keys(allStreams[country]).length;
    let channelCount = Object.values(allStreams[country]).reduce((sum, cat) => sum + cat.length, 0);
    
    card.innerHTML=`
      <h3>${country}</h3>
      <p>${categoryCount} categories</p>
      <small>${channelCount} channels</small>
    `;
    
    card.onclick=function(){
      displayCategories(country);
    };
    
    container.appendChild(card);
  });
}

function displayCategories(country) {
  let container=document.getElementById("channels");
  container.innerHTML="";
  
  let backBtn=document.createElement("div");
  backBtn.className="channel-card";
  backBtn.innerHTML="<h3>← Back</h3>";
  backBtn.onclick=function(){
    displayCountries(Object.keys(allStreams).sort());
  };
  container.appendChild(backBtn);
  
  Object.keys(allStreams[country]).sort().forEach(category=>{
    let card=document.createElement("div");
    card.className="channel-card";
    
    let channelCount = allStreams[country][category].length;
    
    card.innerHTML=`
      <h3>${category}</h3>
      <p>${channelCount} channels</p>
    `;
    
    card.onclick=function(){
      displayChannels(allStreams[country][category]);
    };
    
    container.appendChild(card);
  });
}

function displayChannels(list){
  let container=document.getElementById("channels");
  container.innerHTML="";
  
  let backBtn=document.createElement("div");
  backBtn.className="channel-card";
  backBtn.innerHTML="<h3>← Back</h3>";
  backBtn.onclick=function(){
    displayCountries(Object.keys(allStreams).sort());
  };
  container.appendChild(backBtn);

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
}

function playChannel(channel){
  let player=document.getElementById("player");
  
  document.getElementById("nowPlaying").innerHTML=
    "Sedang menonton: "+channel.name;

  let streamUrl = channel.stream;

  if(Hls.isSupported()){
    let hls = new Hls({
      xhrSetup: function(xhr){
        xhr.withCredentials = false;
      }
    });

    hls.loadSource(streamUrl);
    hls.attachMedia(player);

    hls.on(Hls.Events.MANIFEST_PARSED,function(){
      player.play();
    });

    hls.on(Hls.Events.ERROR, function(event, data){
      console.log('HLS Error:', data);
    });
  }
  else{
    player.src = streamUrl;
    player.play();
  }
}

document
.getElementById("search")
.addEventListener("input",function(){
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