let message = "Bine ai venit în universul meu. \n Fii diferit, fii curajos, urmează-ți visele. \n Pofta mersi pentru fiecare moment creativ.";
let displayedCharCount = 0;
let typingSpeed = 20; // ch / second
let lastTypeTime = 0;
let boyfriendImg;
let bgImg;
let waveAlpha = 0;

function preload() {
  boyfriendImg = loadImage('matiasszeus.png');
  bgImg = loadImage('bcg.jpg');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  textFont('Rubik Glitch');
  //textStyle(BOLDITALIC);
}

function draw() {
  imageMode(CENTER);
  let bgAspect = bgImg.width / bgImg.height;
  let canvasAspect = width / height;

  let drawWidth, drawHeight;

  if (canvasAspect > bgAspect) {
    drawWidth = width;
    drawHeight = width / bgAspect;
  } else {
    drawHeight = height;
    drawWidth = height * bgAspect;
  }

  image(bgImg, width / 2, height / 2, drawWidth, drawHeight);

  // doar după ce se termină de scris textul
  if (displayedCharCount >= message.length/1.5) {
    waveAlpha += 1;
    waveAlpha = constrain(waveAlpha, 0, 90); 
    drawWaves(waveAlpha);
  }

  // mati jos
  let targetHeight = height * 0.6;
  let aspectRatio = boyfriendImg.width / boyfriendImg.height;
  let targetWidth = targetHeight * aspectRatio;
  image(boyfriendImg, width / 2, height - targetHeight / 2, targetWidth, targetHeight);

  // text box area scris
  let textBoxX = width * 0.1;
  let textBoxY = height * 0.05;
  let textBoxWidth = width * 0.8;
  let textBoxHeight = height * 0.5; // top half of screen
  let currentTime = millis();

  // Increase character count for typewriter effect
  if (displayedCharCount < message.length && currentTime - lastTypeTime > 1000 / typingSpeed) {
    displayedCharCount++;
    lastTypeTime = currentTime;
  }

  // Display the wrapped text up to the current character
  let currentText = message.substring(0, displayedCharCount);
  let conturC = color('#C71585');
  fill('black');
  conturC.setAlpha(160);
  stroke(conturC);
  strokeWeight(1);
  textSize(37.5);
  textAlign(CENTER);
  text(currentText, textBoxX, textBoxY, textBoxWidth, textBoxHeight);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawWaves(alpha) {
  noFill();
  let waveColor = color('blue');
  waveColor.setAlpha(alpha);
  stroke(waveColor);
  strokeWeight(2);

  let waveHeight = 25;
  let waveCount = 10;

  for (let j = 0; j < waveCount; j++) {
    beginShape();
    for (let x = 0; x < width; x += 10) {
      let y = height - (height * 0.8) + j * 20 + sin(x * 0.02 + frameCount * 0.04 + j * 15) * waveHeight;
      vertex(x, y);
    }
    endShape();
  }
}

