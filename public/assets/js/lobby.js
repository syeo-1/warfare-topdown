user_id = document.currentScript.getAttribute("user_id")
game_id = document.currentScript.getAttribute("game_id");;
start = false
var id = null;
var count = 5;
var countDownTimer = function(){
     if(count >= 0 ) {
          
          $(".timer").html(`Starting in: ${count}`)
          count--;
     } else {
        $(".timer").html(`Started`)
          clearInterval(id);
          count = 15
          $(".clock").html(`00:${count}`)
          count--
          id = setInterval(clock, 1000);
     }
};


var clock = function(){
    if(count >= 0 ) {
         
         $(".clock").html(`00:${count}`)
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
        teamA = '<ul class="list-group"><li class="list-group-item list-group-item-primary">TEAM A</li>'
        teamB = '<ul class="list-group"><li class="list-group-item list-group-item-danger">TEAM B</li>'
        Object.keys(players).forEach(function (id) {
            
            if( players[id].team == "A"){
                teamA += `<li class="list-group-item">` + players[id].username + `</li>`
            }else if(players[id].team == "B"){
                teamB += `<li class="list-group-item">` + players[id].username + `</li>`
            }
        })
        teamA += "</ul>"
        teamB += "</ul>"
        $(".team-a").html(teamA)
        $(".team-b").html(teamB)       
    });

    

});

