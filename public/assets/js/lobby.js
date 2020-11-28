$(document).ready(function() {
    
    var socket = io();


    socket.on('allPlayerInfo', function(players) {
        teamA = '<ul class="list-group"><li class="list-group-item list-group-item-primary"><div class="row"><div class="col-8">TEAM A</div><div class="col-2">KILLS</div><div class="col-2">DEATHS</div></div></li>'
        teamB = '<ul class="list-group"><li class="list-group-item list-group-item-secondary"><div class="row"><div class="col-8">TEAM B</div><div class="col-2">KILLS</div><div class="col-2">DEATHS</div></div></li>'
        Object.keys(players).forEach(function (id) {
            
            if( players[id].team == "A"){
                teamA += `<li class="list-group-item"><div class="row"><div class="col-8">${players[id].username}</div><div class="col-2">${players[id].kills} </div><div class="col-2">${players[id].deaths}</div></div></li>`
            }else if(players[id].team == "B"){
                teamB += `<li class="list-group-item"><div class="row"><div class="col-8">${players[id].username}</div><div class="col-2">${players[id].kills} </div><div class="col-2">${players[id].deaths}</div></div></li>`
            }
        })
        teamA += "</ul>"
        teamB += "</ul>"
        $(".team-a").html(teamA)
        $(".team-b").html(teamB)       
    });

    

});

