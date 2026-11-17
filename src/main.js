'use strict'

let config = {
    type: Phaser.AUTO,
    width: 1920, //bg image width: 320px. 320*6 = 1920
    height: 1200, //bg image height: 200px. 200*6=1200
    //height: 1080,
    scale: {
        //mode: Phaser.Scale.FIT,
        mode: Phaser.Scale.ZOOM, //trying this line also for pixel crispness
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    pixelArt: true,
    roundPixels: true, //rounds indiv. pixel values to whole numbers (hopefully to get rid of blurring)
    physics: {
        default: 'arcade',
        arcade: {
            debug: true
        }
    },
    scene: [ Play ]
}

let game = new Phaser.Game(config)

let { width, height } = game.config