//board
let tileSize = 16;
let rows = 40;
let columns = 80;

let board;
let boardWidth = tileSize * columns; // 32 * 16
let boardHeight = tileSize * rows; // 32 * 16
let context;

let image;

//ship
let shipWidth = tileSize * 2;
let shipHeight = tileSize;
let shipX = (tileSize * columns) / 2 - tileSize;
let shipY = tileSize * rows - tileSize * 2;

let ship = {
  x: shipX,
  y: shipY,
  width: shipWidth,
  height: shipHeight,
};

let shipImg;
let shipVelocityX = tileSize; //ship moving speed

//aliens
let alienArray = [];
let alienWidth = tileSize * 2;
let alienHeight = tileSize;
let alienX = tileSize;
let alienY = tileSize;
let alienImg;

const alien_images = {};
alien_images.critical = new Image();
alien_images.critical.src = "./alien_critical.png";
alien_images.high = new Image();
alien_images.high.src = "./alien_high.png";
alien_images.medium = new Image();
alien_images.medium.src = "./alien_medium.png";
alien_images.low = new Image();
alien_images.low.src = "./alien_low.png";
alien_images.boom = new Image();
alien_images.boom.src = "./boom.gif";

let alienCount = 0; //number of aliens to defeat
let alienVelocityX = 1; //alien moving speed

//bullets
let bulletArray = [];
let bulletVelocityY = -10; //bullet moving speed

let score = 0;
let gameOver = false;

window.onload = function () {
  // populate the dropdown
};

const images = {
  redis: {
    name: "redis:latest",
    cves: {
      critical: 10,
      high: 12,
      medium: 65,
      low: 123,
    },
    dhi: {
      name: "dhi/redis:latest-7x",
      cves: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 5,
      },
    },
  },
  node: {
    name: "node:latest",
    cves: {
      critical: 20,
      high: 12,
      medium: 25,
      low: 129,
    },
    dhi: {
      name: "dhi/node:latest-24x",
      cves: {
        critical: 0,
        high: 0,
        medium: 1,
        low: 3,
      },
    },
  },
};

function selectImage(picker) {
  if (picker.value) {
    image = images[picker.value];
    document.getElementById("opponent").innerHTML = renderImageStatsAsHtml(
      "Standard image:",
      image
    );
    document.getElementById("opponent-hardened").innerHTML =
      renderImageStatsAsHtml("Docker Hardened Image:", image.dhi);
  }
}

function renderImageStatsAsHtml(label, image) {
  return `<div class='image-stats'>
                <label>${label}</label>
                <h4>${image.name}</h4>
                <div class='cves'>
                    ${image.cves.critical}<span class="c">C</span>, 
                    ${image.cves.high}<span class="h">H</span>, 
                    ${image.cves.medium}<span class="m">M</span>, 
                    ${image.cves.low}<span class="l">L</span>
                </div> 
            </div>        
            `;
}

function start() {
  if (!image) return;

  document.getElementById("start").style.display = "none";
  document.getElementById("game").style.display = "block";

  document.getElementById("hint").innerHTML = renderImageStatsAsHtml(
    "Hit ENTER to switch your image to:",
    image.dhi
  );
  // pick which image to base the #of aliens on
  //const image = redis;

  board = document.getElementById("board");
  board.width = boardWidth;
  board.height = boardHeight;
  context = board.getContext("2d"); //used for drawing on the board

  //draw initial ship
  // context.fillStyle="green";
  // context.fillRect(ship.x, ship.y, ship.width, ship.height);

  //load images
  shipImg = new Image();
  shipImg.src = "./ship.png";
  shipImg.onload = function () {
    context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);
  };

  createAliens(image);

  requestAnimationFrame(update);
  document.addEventListener("keydown", moveShip);
  document.addEventListener("keyup", shoot);
}

function update(timestamp) {
  requestAnimationFrame(update);

  if (gameOver) {
    return;
  }

  // clear the board
  context.clearRect(0, 0, board.width, board.height);

  //draw ship
  context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);

  //alien
  for (let i = 0; i < alienArray.length; i++) {
    let alien = alienArray[i];

    // adding an explosion for 0.5 sec to add a bit of drama to applying DHI
    if (
      alien.alive ||
      (alien.timeOfDeath && timestamp - alien.timeOfDeath < 500)
    ) {
      if (alien.timeOfDeath) alien.img = alien_images.boom;

      alien.x += alienVelocityX;

      //if alien touches the borders
      if (alien.x + alien.width >= board.width || alien.x <= 0) {
        alienVelocityX *= -1;
        alien.x += alienVelocityX * 2;

        //move all aliens down by one row
        for (let j = 0; j < alienArray.length; j++) {
          alienArray[j].y += alienHeight;
        }
      }

      context.drawImage(alien.img, alien.x, alien.y, alien.width, alien.height);

      if (alien.y >= ship.y) {
        gameOver = true;
      }
    }
  }

  //bullets
  for (let i = 0; i < bulletArray.length; i++) {
    let bullet = bulletArray[i];
    bullet.y += bulletVelocityY;
    context.fillStyle = "white";
    context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

    //bullet collision with aliens
    for (let j = 0; j < alienArray.length; j++) {
      let alien = alienArray[j];
      if (!bullet.used && alien.alive && detectCollision(bullet, alien)) {
        bullet.used = true;
        killAlien(alien);
      }
    }
  }

  //clear bullets
  while (
    bulletArray.length > 0 &&
    (bulletArray[0].used || bulletArray[0].y < 0)
  ) {
    bulletArray.shift(); //removes the first element of the array
  }

  //next level - REMOVE
  if (alienCount == 0) {
    //increase the number of aliens in columns and rows by 1
    score += alienColumns * alienRows * 100; //bonus points :)
    alienColumns = Math.min(alienColumns + 1, columns / 2 - 2); //cap at 16/2 -2 = 6
    alienRows = Math.min(alienRows + 1, rows - 4); //cap at 16-4 = 12
    if (alienVelocityX > 0) {
      alienVelocityX += 0.2; //increase the alien movement speed towards the right
    } else {
      alienVelocityX -= 0.2; //increase the alien movement speed towards the left
    }
    alienArray = [];
    bulletArray = [];
    createAliens();
  }

  //score
  context.fillStyle = "white";
  context.font = "16px courier";

  context.fillText("# of dev hours spend: " + score, 5, 20);
  context.fillText("# of open CVEs: " + alienCount, 5, 40);
}

function moveShip(e) {
  if (gameOver) {
    return;
  }

  if (e.code == "ArrowLeft" && ship.x - shipVelocityX >= 0) {
    ship.x -= shipVelocityX; //move left one tile
  } else if (
    e.code == "ArrowRight" &&
    ship.x + shipVelocityX + ship.width <= board.width
  ) {
    ship.x += shipVelocityX; //move right one tile
  }
}

function createAliens(image) {
  // TODO refactor to object.keys
  const numberOfAliens =
    image.cves.critical + image.cves.high + image.cves.medium + image.cves.low;
  const grid = calculateGrid(numberOfAliens);

  // should be object.keys based..
  alienArray = shuffleArray([
    ...createAliensOfType("critical", image.cves.critical),
    ...createAliensOfType("high", image.cves.high),
    ...createAliensOfType("medium", image.cves.medium),
    ...createAliensOfType("low", image.cves.low),
  ]);

  let a_index = 0;
  for (let c = 0; c < grid.columns; c++) {
    for (let r = 0; r < grid.rows; r++) {
      if (a_index >= numberOfAliens) continue;

      let alien = alienArray[a_index];
      alien.x = alienX + c * alienWidth;
      alien.y = alienY + r * alienHeight;

      a_index++;

      /*let alien = {
        img: alienImg,
        x: alienX + c * alienWidth,
        y: alienY + r * alienHeight,
        width: alienWidth,
        height: alienHeight,
        alive: true,
      };

      alienArray.push(alien);*/
    }
  }
  alienCount = alienArray.length;
}

function createAliensOfType(criticality, number) {
  const arr = [];

  for (let index = 0; index < number; index++) {
    arr.push({
      img: alien_images[criticality],
      x: 0,
      y: 0,
      width: alienWidth,
      height: alienHeight,
      alive: true,
      criticality: criticality,
    });
  }

  return arr;
}

function shuffleArray(array) {
  // Create a copy to avoid modifying the original array directly,
  // or remove this line to shuffle in place.
  const shuffledArray = [...array];

  let currentIndex = shuffledArray.length;
  let randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [shuffledArray[currentIndex], shuffledArray[randomIndex]] = [
      shuffledArray[randomIndex],
      shuffledArray[currentIndex],
    ];
  }

  return shuffledArray;
}

async function applyDHI() {
  //generate random access index
  let access_arr = [];
  for (let index = 0; index < alienArray.length; index++) {
    access_arr.push(index);
  }
  access_arr = shuffleArray(access_arr);

  // we select some aliens to keep
  Object.keys(image.dhi.cves).map((crit) => {
    let cves = image.dhi.cves[crit];

    for (let index = 0; index < cves; index++) {
      let f = alienArray.find(
        (alien) => !alien.keepAlive && alien.alive && alien.criticality === crit
      );
      if (f) f.keepAlive = true;
    }
  });

  // needs a pause thing, so it doesn't kill them all in one ms - or maybe not..
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let index = 0; index < access_arr.length; index++) {
    let al = alienArray[access_arr[index]];
    if (!al.keepAlive) {
      killAlien(al, false);
    }

    await sleep(1);
  }

  document.getElementById("hint").innerHTML =
    "Hardened image:" +
    image.dhi.name +
    " applied - vulnerability management on easy mode!";
}

function calculateGrid(totalItems) {
  if (totalItems < 10 || totalItems > 250) {
    throw new Error("Total items must be between 10 and 250.");
  }

  // Calculate the ideal number of columns based on total items
  // Linearly map the range 10–250 to 5–30 columns
  const minCols = 5;
  const maxCols = 30;

  const colRange = maxCols - minCols;
  const itemRange = 250 - 10;

  const columns = Math.min(
    maxCols,
    Math.round(minCols + ((totalItems - 10) / itemRange) * colRange)
  );

  // Calculate rows based on columns
  const rows = Math.ceil(totalItems / columns);

  return { rows, columns };
}

function killAlien(alien, addPoints = false) {
  if (alien.alive !== false) {
    alien.alive = false;
    alien.timeOfDeath = performance.now();
    alienCount--;
  }

  if (addPoints) {
    score += 100;
  }
}

async function shoot(e) {
  if (gameOver) {
    return;
  }

  if (e.code == "Enter") {
    await applyDHI();
  }

  if (e.code == "Space") {
    //shoot
    let bullet = {
      x: ship.x + (shipWidth * 15) / 32,
      y: ship.y,
      width: tileSize / 8,
      height: tileSize / 2,
      used: false,
    };

    bulletArray.push(bullet);
    score += 1;
  }
}

function detectCollision(a, b) {
  return (
    a.x < b.x + b.width && //a's top left corner doesn't reach b's top right corner
    a.x + a.width > b.x && //a's top right corner passes b's top left corner
    a.y < b.y + b.height && //a's top left corner doesn't reach b's bottom left corner
    a.y + a.height > b.y
  ); //a's bottom left corner passes b's top left corner
}
