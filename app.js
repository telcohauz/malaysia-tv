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


player.src=channel.stream;


document.getElementById("nowPlaying").innerHTML=

"Sedang menonton: "+channel.name;


player.play();


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