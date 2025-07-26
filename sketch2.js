let zoom = 1;
let zoomSpeed = 0.01;
let baseSize;
let zoomDirection = 1; // 1 for in, -1 for out

function setup() {
  createCanvas(windowWidth, windowHeight);
  baseSize = min(windowWidth, windowHeight) * 0.12; // 12% of the smallest side
  textAlign(CENTER, CENTER);
  textFont('Tilt Prism');
  fill(255);
  noStroke();
}

let isResetting = false;
let resetProgress = 0;
let resetSpeed = 0.05;
let zoomTarget = 1;

function draw() {
  background(0);
  drawWaves();

  // Smooth zoom reset logic
  if (isResetting) {
    resetProgress += resetSpeed;
    zoom = lerp(zoom, zoomTarget, resetProgress);

    if (abs(zoom - zoomTarget) < 0.001) {
      zoom = zoomTarget;
      isResetting = false;
      resetProgress = 0;
    }
  } else {
    zoom *= 1 + zoomSpeed * zoomDirection;

    if (zoom > 8 || zoom < 0.125) {
      isResetting = true;
      resetProgress = 0;
    }
  }

  // Apply fade only near the zoom extremes
  let fadeAlpha = 255;
  if (zoom > 6.5 || zoom < 0.3) {
    fadeAlpha = map(zoom, 0.125, 0.3, 0, 255);
    if (zoom > 6.5) {
      fadeAlpha = map(zoom, 6.5, 8, 255, 0);
    }
    fadeAlpha = constrain(fadeAlpha, 0, 255);
  }

  // Optional: smooth fade at startup
  if (frameCount < 60) {
    fadeAlpha *= map(frameCount, 0, 60, 0, 1);
  }

  // Draw the zoomed text
  push();
  translate(width / 2, height / 2);
  scale(zoom);
  textSize(baseSize);
  fill(0, 255, 255, fadeAlpha);
  text("pofta mersi", 0, 0);
  pop();
}



function mousePressed() {
  zoomDirection *= -1;
}

function drawWaves() {
  noFill();
  stroke(255, 20, 147, 100); // 100 transparenta TINE MINTE
  strokeWeight(1);

  let waveHeight = 40;
  let waveCount = 6;

  for (let j = 0; j < waveCount; j++) {
    beginShape();
    for (let x = 0; x < width; x += 10) {
      let y = height / waveCount * j + sin(x * 0.02 + frameCount * 0.03 + j * 10) * waveHeight;
      vertex(x, y);
    }
    endShape();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function touchStarted() {
  zoomDirection *= -1;
  return false; // Prevent default (like scroll)
}






// let zoom = 1;
// let zoomSpeed = 0.01;
// let baseSize = 100;

// function setup() {
//   createCanvas(windowWidth, windowHeight);
//   textAlign(CENTER, CENTER);
//   textFont('Tilt Prism');
//   fill(255);
//   noStroke();
// }

// function draw() {
//   background(0);

//   zoom *= 1 + zoomSpeed;

//   if (zoom > 8) {
//     zoom = 1;
//   }

//   push();
//   translate(width / 2, height / 2);
//   scale(zoom);
//   textSize(baseSize);
//   text("pofta mersi", 0, 0);
//   pop();
// }
