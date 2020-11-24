user_id = document.currentScript.getAttribute("user_id")
game_id = document.currentScript.getAttribute("game_id");;
start = false
var id = null;
var count = 5;
var countDownTimer = function(){
     if(count > 0 ) {
          
          $(".timer").html(`Starting in: ${count}`)
          count--;
     } else {
        $(".timer").html(`Started`)
          clearInterval(id);
          count = 15
          $(".timer").html(`Starting in: 0`)
          $(".clock").html(`00:${count}`)
          count--
          id = setInterval(clock, 1000);
     }
};


var clock = function(){
    if(count >= 0 ) {
         if(count < 10){
            $(".clock").html(`00:0${count}`)
         }
         else{
            $(".clock").html(`00:${count}`)
         }
         
         count--;
    } else {
         clearInterval(id);
    }
};

$(document).ready(function() {
    
    var socket = io();
    
    

    socket.on('startGame', function () {
        $(".timer").html(`Starting in: ${count}`)
        count--
        id = setInterval(countDownTimer, 1000);
    })

    socket.on('allPlayerInfo', function(players) {
        teamA = '<ul class="list-group"><li class="list-group-item list-group-item-primary"><div class="d-flex justify-content-between"><div>TEAM A</div><div>KILLS</div></div</li>'
        teamB = '<ul class="list-group"><li class="list-group-item list-group-item-danger"><div class="d-flex justify-content-between"><div>TEAM B</div><div>KILLS</div></div</li>'
        Object.keys(players).forEach(function (id) {
            
            if( players[id].team == "A"){
                teamA += `<li class="list-group-item"><div class="d-flex justify-content-between"><div>${players[id].username}</div><div>${players[id].kills}</div></div></li>`
            }else if(players[id].team == "B"){
                teamB += `<li class="list-group-item"><div class="d-flex justify-content-between"><div>${players[id].username}</div><div>${players[id].kills}</div></div></li>`
            }
        })
        teamA += "</ul>"
        teamB += "</ul>"
        $(".team-a").html(teamA)
        $(".team-b").html(teamB)       
    });

    

});

