class Play extends Phaser.Scene {
    constructor() {
        super('playScene')
    }

    preload() {
        this.load.path = './assets/'
        this.load.image('ball', 'ball.png')
        this.load.image('paddle', 'paddle.png')
        this.load.image('bg', 'bg.png')
    }

    create() {
        this.bg = this.add.image(0, 0, 'bg').setOrigin(0)
        
        this.ball = this.physics.add.sprite(width / 2, 0, 'ball')
        this.ball.body.setCircle(this.ball.width / 2)
        this.ball.setY(this.ball.height / 2)
        this.ball.body.setVelocityY(450)
        this.ball.body.setCollideWorldBounds(true)
        this.ball.body.setBounce(1)

        this.paddle = this.physics.add.sprite(this.input.activePointer.x, height / 2, 'paddle')
        this.paddle.body.setImmovable(true)

        this.physics.add.collider(this.ball, this.paddle, (ball, paddle) => {
            const hitOffset = Phaser.Math.Clamp(
                (ball.x - paddle.x) / (paddle.displayWidth / 2), -1, 1)
            const speed = Math.hypot(ball.body.velocity.x, ball.body.velocity.y)
            const angle = hitOffset * Phaser.Math.DegToRad(35)
            const verticalDirection = ball.y < paddle.y ? -1 : 1

            ball.body.setVelocity(
                speed * Math.sin(angle),
                verticalDirection * speed * Math.cos(angle)
            )
        })
    }

    update() {
        this.paddle.setX(this.input.activePointer.x)
        this.paddle.setY(height / 2)
    }
}