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
var score = 0;
var gameOver = false;
var scoreText;
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
var distance = 0;
var prevDistance = 0;
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
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('obstacle', 'assets/obstacle.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

function create (){
    var self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.staticGroup();
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
    this.socket.on('newPlayer',function (playerInfo){
      if (playerInfo.roomCode == playerRoomCode && playerInfo.roomCode != "NONE"){
        console.log("Adding Player " + playerInfo.playerName);
        addOtherPlayer(self,playerInfo);
      }
    })
    this.socket.on('disconnect',function(playerId){
      self.otherPlayers.getChildren().forEach(function(otherPlayer){
        if(playerId == otherPlayer.playerId){
          otherPlayer.destroy();
        }
      })
    })
    this.socket.on('playerMoved',function(playerInfo){
      self.otherPlayers.getChildren().forEach(function(otherPlayer){
        if(playerInfo.playerId == otherPlayer.playerId && playerInfo.roomCode == playerRoomCode){
          otherPlayer.setPosition(playerInfo.x+30,playerInfo.y);
        }
      })
    })
    this.socket.on('camPos',function(camValue){
        cameraPos = camValue;
    })
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

    //  The score
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

    $.get('/data', {}, function(data){
      joiningTerrainIndex = data.toString();
      currentTerrainIndex = joiningTerrainIndex;
      nextTerrainIndex = joiningTerrainIndex;
    });
}

function update (time, delta){
    if (changingRoom == true){
      this.socket.emit('changeRoomCode',{roomCode:roomCodeToJoin});
      roomCodeText.setText("Room Code : " + roomCodeToJoin);
      $.get('/data', {}, function(data){
        joiningTerrainIndex = data.toString();
        currentTerrainIndex = joiningTerrainIndex;
        nextTerrainIndex = joiningTerrainIndex;
      });
      scoreText.setText('score : 0');
      firstTime = true;
      changingRoom = false;
    }
    //Update the high scores
    if (playerRoomCode == "NONE")
    {
      background.y = 300;
      scoreText.setText('Join a room code above!');
    }
    else{
      if (player.y > 650){die();}
      player.anims.play('right', true);
      //Jumping
      if (cursors.up.isDown && player.body.touching.down){
        player.setVelocityY(-1000);
      }
      //Sending Player Position
      var x = player.x;
      var y = player.y;
      //Send player position
      this.socket.emit('playerMovement',{x : player.x, y: player.y});

      //  Any speed as long as 16 evenly divides by it
      sx += 4;
      distance += sx;

      this.socket.emit('camPosRequest');
      this.cameras.main.scrollX = cameraPos;



      //UNCOMMENT FOR SAFETY PLATFORM FOR DEMO -platforms.create(player.x , 350, 'ground');

      //Get the next terrain index from the server
      $.get('/data', {}, function(data){
        nextTerrainIndex = data.toString();
        if(currentTerrainIndex != nextTerrainIndex)
        {
          console.log("Generating Panel " + currentTerrainIndex);
          currentTerrainIndex = nextTerrainIndex;
          switch(currentTerrainIndex)
          {
            case "0":
              platforms.create(camPos.x, 570, 'ground');
              platforms.create(camPos.x + 200, 570, 'ground');
              platforms.create(camPos.x + 400, 570, 'ground');
              platforms.create(camPos.x + 800, 570, 'ground');
              platforms.create(camPos.x + 1000, 570, 'ground');
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

      //Ensures the player doesn't start in the void.
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

      background.y = 300;
      background.x = cameraPos;
      scoreText.x = cameraPos+16;
      roomCodeText.x = cameraPos+16;
      if(gameOver==false)
      {
        player.x = cameraPos + 100;
        playerNameText.setText(playerNameVal);
        playerNameText.x = player.x - (playerNameText.width/2);
        playerNameText.y = player.y - 40;
      }
      if(gameOver == true && scoreSent == false){
        
        this.socket.emit('sendScore',{socket: playerSocketVal,name: playerNameVal,score: score});
        scoreSent = true;
      }
    }
}
//Procedural Generation Methods
function spawnBlock1(){
  var offset = cameraPos+800;
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
  var offset = cameraPos+800;
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
  var offset = cameraPos+800;
  platforms.create(offset+ 400,550, 'ground');
  platforms.create(offset+800,450, 'ground');
  platforms.create(offset+1200,350, 'ground');
  stars.create(offset+430,520,'star');
  stars.create(offset+830,420,'star');
  obstacles.create(offset+480,515,'obstacle');
  obstacles.create(offset+790,415,'obstacle');
}
function spawnBlock4(){
  var offset = cameraPos+800;
  platforms.create(offset+ 400,550, 'ground');
  platforms.create(offset+1010,500, 'ground');
  platforms.create(offset+920,500, 'ground');
  stars.create(offset+880,470,'star');
  obstacles.create(offset+960,465,'obstacle');
  obstacles.create(offset+800,465,'obstacle');
  obstacles.create(offset+505,515,'obstacle');}
function spawnBlock5(){
  var offset = cameraPos+800;
  platforms.create(offset+ 400,570, 'ground');
  platforms.create(offset+800,450, 'ground');
  platforms.create(offset+1200,450, 'ground');
  obstacles.create(offset+880,415,'obstacle');
  obstacles.create(offset+1100,415,'obstacle');
  obstacles.create(offset+1300,415,'obstacle');
  stars.create(offset+830,420,'star');
}

function updateRoomCode(roomCode){
  roomCodeToJoin = roomCode;
  changingRoom = true;
}
function updateHighscoreText(){
  $.get('/highscore1', {}, function(data){$('#highscore1Text').text(data);});
  $.get('/highscore2', {}, function(data){$('#highscore2Text').text(data);});
  $.get('/highscore3', {}, function(data){$('#highscore3Text').text(data);});
}
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


$(document).ready(function() {
    $('#joinButton').click(function() {
        updateRoomCode($('#inputField').val());
    });
});
