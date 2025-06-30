
let stickers = [];
let images = [];
let clicked = false;

function preload() {
  for (let i = 1; i <= 8; i++) {
    images.push(loadImage(`p${i}.jpeg`));
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  textSize(64);
  fill(0);
}

function draw() {
  background(255);

  if (!clicked) {
    text("NSFW", width / 2, height / 2);
  } else {
    for (let s of stickers) {
      s.update();
      s.display();
    }
  }
}

function mousePressed() {
  if (!clicked) {
    clicked = true;
    for (let i = 0; i < images.length; i++) {
      let x = random([-100, width + 100]);
      let y = random([-100, height + 100]);
      let vx = (width / 2 - x) / 60 + random(-1, 1);
      let vy = (height / 2 - y) / 60 + random(-1, 1);
      let angle = random(TWO_PI);
      let rSpeed = random(-0.05, 0.05);
      stickers.push(new Sticker(images[i], x, y, vx, vy, angle, rSpeed));
    }
  }
}

class Sticker {
  constructor(img, x, y, vx, vy, angle, rSpeed) {
    this.img = img;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.angle = angle;
    this.rSpeed = rSpeed;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rSpeed;
  }
  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    imageMode(CENTER);
    image(this.img, 0, 0, this.img.width / 3, this.img.height / 3);
    pop();
  }
}
