user_id = document.currentScript.getAttribute("user_id")
game_id = document.currentScript.getAttribute("game_id");;
start = false

$(document).ready(function() {
    
    var socket = io();
    var data = {user_id: user_id, game_id: game_id}
    socket.emit("new_player", data)

    

    socket.on('currentPlayers', function(players) {
        teamA = "<ul>"
        teamB = "<ul>"
        Object.keys(players).forEach(function (id) {
            
            if( players[id].team == "A"){
                teamA += `<li>` + players[id].username + `</li>`
            }else if(players[id].team == "B"){
                teamB += `<li>` + players[id].username + `</li>`
            }
        })
        teamA += "</ul>"
        teamB += "</ul>"
        $(".team-a").html(teamA)
        $(".team-b").html(teamB)       
    });

    socket.on('allPlayerInfo', function (players) {
        teamA = "<ul>"
        teamB = "<ul>"

        Object.keys(players).forEach(function (id) {
            
            if(players[id].team == "A"){
                teamA += `<li>` + players[id].username + `</li>`
            }else if(players[id].team == "B"){
                teamB += `<li>` + players[id].username + `</li>`
            }
        })
        
        teamA += "</ul>"
        teamB += "</ul>"
        $(".team-a").html(teamA)
        $(".team-b").html(teamB)
      })

    socket.on('redirect', function(destination) {
        if(destination == "game"){
            destination = "/game?game_id=" + game_id + "&user_id=" + user_id
        }
        
        window.location.href = destination;
    });

    $(".start-game").on("click", function(socket){
        dest = "/game?game_id=" + game_id + "&user_id=" + user_id
        start = true;
        window.location.href = dest
        
        
        
        
    })
});

