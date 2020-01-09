var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 3000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};
var player;
var stars;
var obstacles;
var platforms;
var cursors;
var restart;
var wKey;
var score = 0;
var gameOver = false;
var scoreText;

//Current player
var playerNameText;
var playerSocketVal;
var playerNameVal;

var playerRoomCode;
var roomCodeToJoin;
var changingRoom = false;

var cameraPos = 0;
var background;


var map;
var sx = 0;
var mapWidth = 51;
var mapHeight = 37;
var generated = false;
var scoreSent = false;

var firstTime = true;
//Keeps track of the index of terrain as the player joins the game, so it knows when to start generating.
var joiningTerrainIndex = "0";
//Used to check if a change has been made and hence new terrain should be placed
var nextTerrainIndex = "0";
var currentTerrainIndex = "0";

var background;

var game = new Phaser.Game(config);
setInterval(function(){updateHighscoreText();},200);
function preload (){
    //preload all necessary assets.
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('obstacle', 'assets/obstacle.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

//Runs game and environment setup.
function create (){
    var self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.staticGroup();

    //Requests all of the current players in the server, to console.log and check correct connection has been made.
    this.socket.on('currentPlayers',function(players){
      Object.keys(players).forEach(function(id){
        if(players[id].playerId == self.socket.id){
          playerNameVal = players[id].playerName;
          playerSocketVal = players[id].playerId;
          playerRoomCode = players[id].roomCode;
          console.log("Awaiting Room Code " + players[id].roomCode);
          console.log("Player Match Found. Socket ID is " + players[id].playerId + " . Name assigned of " + playerNameVal);
        } else{
          //This detects players that exist in the public room. Not necessary to draw
          console.log("New Player Found. Socket ID is " + players[id].playerId + " and name is " + players[id].playerName);
        }
      })
    })
    //If a player joins your room, create a new player object for them.
    this.socket.on('newPlayer',function (playerInfo){
      if (playerInfo.roomCode == playerRoomCode && playerInfo.roomCode != "NONE"){
        console.log("Adding Player " + playerInfo.playerName);
        addOtherPlayer(self,playerInfo);
      }
    })
    //If a player disconnects, remove their player object.
    this.socket.on('disconnect',function(playerId){
      self.otherPlayers.getChildren().forEach(function(otherPlayer){
        if(playerId == otherPlayer.playerId){
          otherPlayer.destroy();
        }
      })
    })
    //When any player moves across the server, update the position of their sprite on the players screen.
    this.socket.on('playerMoved',function(playerInfo){
      self.otherPlayers.getChildren().forEach(function(otherPlayer){
        if(playerInfo.playerId == otherPlayer.playerId && playerInfo.roomCode == playerRoomCode){
          otherPlayer.setPosition(playerInfo.x+30,playerInfo.y);
        }
      })
    })
    //Listener for the cameraPosition on the server, which is sent on a very quick interval.
    this.socket.on('camPos',function(camValue){
        cameraPos = camValue;
    })
    //Update the players room code and then check whether there are any other players in the room.
    this.socket.on('updateRoomCode',function(players){
      console.log("Changing to " + players[self.socket.id].roomCode);
      playerRoomCode = players[self.socket.id].roomCode;
      Object.keys(players).forEach(function(id){
        if(players[id].playerId == self.socket.id){
          playerNameVal = players[id].playerName;
          playerSocketVal = players[id].playerId;
          playerRoomCode = players[id].roomCode;
          console.log("Player Match Found. Socket ID is " + players[id].playerId + " . Name assigned of " + playerNameVal);
        }
        else if (players[id].playerId != self.socket.id && players[id].roomCode == playerRoomCode){
          //This detects players that exist in the public room. Not necessary to draw
          console.log("New Player Found. Socket ID is " + players[id].playerId + " and name is " + players[id].playerName);
          addOtherPlayer(self,players[id]);
        }
      })
    })
    //If a player joins the current room, add their player object
    this.socket.on('updateRoomPlayers',function(players){
      console.log("Updating Room Players");
      Object.keys(players).forEach(function(id){
        if(players[id].playerId == self.socket.id){
          playerNameVal = players[id].playerName;
          playerSocketVal = players[id].playerId;
          playerRoomCode = players[id].roomCode;
          console.log("Player Match Found. Socket ID is " + players[id].playerId + " . Name assigned of " + playerNameVal);
        }
        else if (players[id].playerId != self.socket.id && players[id].roomCode == playerRoomCode){
          //This detects players that exist in the public room. Not necessary to draw
          console.log("New Player Found. Socket ID is " + players[id].playerId + " and name is " + players[id].playerName);
          addOtherPlayer(self,players[id]);
        }
      })

    })


    //Adding appropraite sprites and physics to the game
    background = this.physics.add.sprite(400, 300, 'sky');
    //this.otherPlayers.body.setAllowGravity(false);
    platforms = this.physics.add.staticGroup();
    stars = this.physics.add.staticGroup();
    obstacles = this.physics.add.staticGroup();

    player = this.physics.add.sprite(300,300,'dude');

    //  Our player animations, turning, walking left and walking right.
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 4 } ],
        frameRate: 20
    });
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    //  Input Events
    cursors = this.input.keyboard.createCursorKeys();
    wKey = this.input.keyboard.addKey('W');
    restart = this.input.keyboard.addKey('R');


    //  The score and other text prompts
    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#ffffff' });
    playerNameText = this.add.text(16, 50, playerNameVal, { fontSize: '15px', fill: '#ffffff', align: 'center'});
    roomCodeText = this.add.text(16, 50, "Awaiting Room Code", { fontSize: '20px', fill: '#ffffff', align: 'lef'});

    //  Collide the player and the stars with the platforms
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(obstacles, platforms);

    //  Checks to see if the player overlaps with any of the stars, if he does call the collectStar function
    this.physics.add.overlap(player, stars, collectStar, null, this);

    this.physics.add.collider(player, obstacles, hitObstacle, null, this);

//Gets the index of the terrain when joining, to check when the player needs to have the environment sent to them.
    $.get('/data', {}, function(data){
      joiningTerrainIndex = data.toString();
      currentTerrainIndex = joiningTerrainIndex;
      nextTerrainIndex = joiningTerrainIndex;
    });
}

//Phaser implements this update function, which is ran every frame.
function update (time, delta){
  //While the player is changing room, send this change to the server and ensure it's updated properly.
    if (changingRoom == true){
      this.socket.emit('changeRoomCode',{roomCode:roomCodeToJoin});
      roomCodeText.setText("Room Code : " + roomCodeToJoin);
      //Gets the index of the terrain when joining, to check when the player needs to have the environment sent to them.
      $.get('/data', {}, function(data){
        joiningTerrainIndex = data.toString();
        currentTerrainIndex = joiningTerrainIndex;
        nextTerrainIndex = joiningTerrainIndex;
      });
      if(gameOver == false)
      {
        scoreText.setText('score : 0');
        score = 0;
      }
      firstTime = true;
      changingRoom = false;
    }
    //Update the text if the player isn't in a room.
    if (playerRoomCode == "NONE")
    {
      background.y = 300;
      scoreText.setText('Join a room code above!');
    }
    else{

      //Kill player if they fall off the screen.
      if (player.y > 650){die();}

      //Ensure constant running animation
      player.anims.play('right', true);


      //Input Management for Jumping
      if ((cursors.up.isDown||cursors.space.isDown || wKey.isDown)&& player.body.touching.down){
        player.setVelocityY(-1000);
      }
      //Sending Player Position to the server.
      this.socket.emit('playerMovement',{x : player.x, y: player.y});

      //Socket to request camera position from server and move appropriately.
      this.socket.emit('camPosRequest');
      this.cameras.main.scrollX = cameraPos;
      background.y = 300;
      background.x = cameraPos;
      scoreText.x = cameraPos+16;
      roomCodeText.x = cameraPos+16;



      //UNCOMMENT FOR SAFETY PLATFORM FOR DEMO -platforms.create(player.x , 350, 'ground');

      //Get the next terrain index from the server, and spawn the appropriate block.
      $.get('/data', {}, function(data){
        nextTerrainIndex = data.toString();
        if(currentTerrainIndex != nextTerrainIndex)
        {
          //console.log("Generating Panel " + currentTerrainIndex);
          currentTerrainIndex = nextTerrainIndex;
          switch(currentTerrainIndex)
          {
            case "0":
              generated = true;
              platforms.create(cameraPos.x + 800, 570, 'ground');
              platforms.create(cameraPos.x + 1000, 570, 'ground');
              platforms.create(cameraPos.x + 1200, 570, 'ground');
              platforms.create(cameraPos.x + 1600, 570, 'ground');
              platforms.create(cameraPos.x + 1800, 570, 'ground');
              break;
            case "1":
              generated = true;
              spawnBlock1();
              break;
            case "2":
              generated = true;
              spawnBlock2();
              break;
            case "3":
              generated = true;
              spawnBlock3();
              break;
            case "4":
              generated = true;
              spawnBlock4();
              break;
            case "5":
              generated = true;
              spawnBlock5();
              break;
          }
          currentTerrainIndex = nextTerrainIndex;
        }
      });

      //Ensures the player doesn't start in the void by spawning a platform under them if they join or refresh during a block.
      if (currentTerrainIndex == joiningTerrainIndex && firstTime)
      {
        scoreText.setText('score : 0');
        platforms.create(player.x , 570, 'ground');
        platforms.create(player.x + 400, 570, 'ground');
        platforms.create(player.x + 800, 570, 'ground');
      }
      if(nextTerrainIndex != joiningTerrainIndex && generated == true)
      {
        firstTime = false;
      }


      //Keep player and their name plate moving if they're alive
      if(gameOver==false)
      {
        player.x = cameraPos + 100;
        playerNameText.setText(playerNameVal);
        playerNameText.x = player.x - (playerNameText.width/2);
        playerNameText.y = player.y - 40;
      }

      //Send the score to the server through a socket
      if(gameOver == true && scoreSent == false){
        scoreText.setText("Game over! score:" + score + ". Press R to restart.")
        this.socket.emit('sendScore',{socket: playerSocketVal,name: playerNameVal,score: score});
        scoreSent = true;
      }

      //Restart the game
      if(gameOver == true && restart.isDown){
        gameOver = false;
        scoreSent = false;
        player.x = cameraPos.x + 100;
        platforms.create(player.x , 230, 'ground');
        platforms.create(player.x+ 300 , 230, 'ground');
        player.y = 150;
        scoreText.setText("score: 0");
        score = 0;
        console.log("Restarting Player");
      }
    }
}
//PROC GEN - All of the sections used for generating environment.
function spawnBlock1(){
  var offset = cameraPos+400;
  platforms.create(offset+ 400,500, 'ground');
  platforms.create(offset+800,400, 'ground');
  platforms.create(offset+1200,500, 'ground');
  stars.create(offset+470,470,'star');
  stars.create(offset+700,370,'star');
  stars.create(offset+1250,470,'star');
  obstacles.create(offset+350,465,'obstacle');
  obstacles.create(offset+760,365,'obstacle');
}
function spawnBlock2(){
  var offset = cameraPos+400;
  platforms.create(offset+ 400,500, 'ground');
  platforms.create(offset+800,400, 'ground');
  platforms.create(offset+1200,300, 'ground');
  stars.create(offset+430,470,'star');
  stars.create(offset+830,270,'star');
  stars.create(offset+1250,270,'star');
  obstacles.create(offset+500,465,'obstacle');
  obstacles.create(offset+1100,265,'obstacle');
}
function spawnBlock3(){
  var offset = cameraPos+400;
  platforms.create(offset+ 400,550, 'ground');
  platforms.create(offset+800,450, 'ground');
  platforms.create(offset+1200,350, 'ground');
  stars.create(offset+430,520,'star');
  stars.create(offset+830,420,'star');
  obstacles.create(offset+480,515,'obstacle');
  obstacles.create(offset+790,415,'obstacle');
}
function spawnBlock4(){
  var offset = cameraPos+400;
  platforms.create(offset+ 400,550, 'ground');
  platforms.create(offset+1010,500, 'ground');
  platforms.create(offset+920,500, 'ground');
  stars.create(offset+880,470,'star');
  obstacles.create(offset+960,465,'obstacle');
  obstacles.create(offset+800,465,'obstacle');
  obstacles.create(offset+505,515,'obstacle');}
function spawnBlock5(){
  var offset = cameraPos+400;
  platforms.create(offset+ 400,570, 'ground');
  platforms.create(offset+800,450, 'ground');
  platforms.create(offset+1200,450, 'ground');
  obstacles.create(offset+880,415,'obstacle');
  obstacles.create(offset+1100,415,'obstacle');
  obstacles.create(offset+1300,415,'obstacle');
  stars.create(offset+830,420,'star');
}


//GAMEPLAY METHODS - Control gameplay
function collectStar (player, star){
    star.disableBody(true, true);

    //  Add and update the score
    score += 10;
    scoreText.setText('score: ' + score);

    if (stars.countActive(true) === 0)
    {
        //  A new batch of stars to collect
        stars.children.iterate(function (child) {

            child.enableBody(true, child.x, 0, true, true);

        });

    }
}
function hitObstacle(player, obstacle){
    die(player,this);
}
function addOtherPlayer(self, playerInfo){
 const otherPlayer = self.add.sprite(300,300,'dude');
 otherPlayer.anims.play('right', true);
 otherPlayer.setTint(0x7a7a7a);
 otherPlayer.playerId = playerInfo.playerId;
 otherPlayer.playerName = playerInfo.playerName;
 otherPlayer.roomCode = playerInfo.roomCode;
 self.otherPlayers.add(otherPlayer);
}
function die(player){

  //player.setTint(0xff0000);
  //player.anims.play('turn');
  if(gameOver == false){
    gameOver = true;
  }
}


//Request to update current players room code.
function updateRoomCode(roomCode){
  if (roomCode != ""){
    roomCodeToJoin = roomCode;
    changingRoom = true;
  }
}

//Request to update the highscore text through jQuery.
function updateHighscoreText(){
  $.get('/highscore1', {}, function(data){$('#highscore1Text').text(data);});
  $.get('/highscore2', {}, function(data){$('#highscore2Text').text(data);});
  $.get('/highscore3', {}, function(data){$('#highscore3Text').text(data);});
}

//Listener for join game room button press.
$(document).ready(function() {
    $('#joinButton').click(function() {
        updateRoomCode($('#inputField').val());
    });
});
