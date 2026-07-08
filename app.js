let channels=[];


fetch("data/channels.json")

.then(response=>response.json())

.then(data=>{

channels=data;

displayChannels(channels);

});




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



let result=channels.filter(channel=>


channel.name
.toLowerCase()
.includes(keyword)


);



displayChannels(result);


});