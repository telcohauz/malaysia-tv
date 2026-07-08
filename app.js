let channels=[];
let allStreams=[];

fetch("data/channels.json")
.then(response=>response.json())
.then(data=>{
  channels=data;
  displayChannels(channels);
  loadM3UPlaylists();
});

function parseM3U(content) {
  let streams = [];
  let lines = content.split('\n');
  let currentStream = null;
  
  for(let line of lines) {
    line = line.trim();
    
    if(line.startsWith('#EXTINF:')) {
      let nameMatch = line.match(/,(.+)$/);
      if(nameMatch) {
        currentStream = {
          name: nameMatch[1].trim(),
          stream: null,
          category: 'IPTV'
        };
      }
    } else if(line.startsWith('http') && currentStream) {
      currentStream.stream = line;
      streams.push(currentStream);
      currentStream = null;
    }
  }
  
  return streams;
}

async function loadM3UPlaylists() {
  for(let channel of channels) {
    if(channel.type === 'm3u') {
      try {
        let response = await fetch(channel.stream);
        let content = await response.text();
        let streams = parseM3U(content);
        allStreams = allStreams.concat(streams);
      } catch(e) {
        console.log('Error loading M3U:', channel.name, e);
      }
    }
  }
  
  if(allStreams.length > 0) {
    displayChannels(allStreams.slice(0, 50));
  }
}

function displayChannels(list){
  let container=document.getElementById("channels");
  container.innerHTML="";

  list.forEach(channel=>{
    let card=document.createElement("div");
    card.className="channel-card";

    card.innerHTML=`
      <h3>${channel.name}</h3>
      <p>${channel.category}</p>
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
  
  let result = allStreams.length > 0 
    ? allStreams.filter(channel=>
        channel.name.toLowerCase().includes(keyword)
      )
    : channels.filter(channel=>
        channel.name.toLowerCase().includes(keyword)
      );

  displayChannels(result.slice(0, 50));
});