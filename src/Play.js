class Play extends Phaser.Scene {
    constructor() {
        super('playScene')
    }

    preload() {
        this.load.path = './assets/'
        this.load.image('ball', 'ball.png')
        this.load.image('paddle', 'paddle.png')
        this.load.image('bg', 'bg.png')

        //Cattipede
        this.load.image('centipedeHead', 'caterpillar head 1.png')
        this.load.image('centipedeBody', 'caterpillar body 1.png')
        this.load.image('centipedeTail', 'caterpillar tail 1.png')
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

        //centipede settings, so we can change along way
        this.centipede = []
        this.segmentCount = 12
        this.segmentSpacing = 22
        
        //spiral movement settings
        this.spiralAngle = 0
        this.SpiralRadius = Math.max(width, height) * 0.55 //markus eger lowk W pull
        this.spiralSpeed = 1.2
        this.spiralShrinkSpeed = 25

        //Create centipede segments:
        for (let i = 0; i < this.segmentCount; i++) {
            let spite = 'centipedeBody'

            if(i === 0) {
                sprite = 'centipedeHead'
            }
            else if (i === this.segmentCount - 1){
                sprite = 'centipedeTail'
            }

            const segment = this.add.sprite(
                width/2,
                height/2,
                sprite
            )
            segment.setScale(0.5)
            this.centipede.push(segment)
        }

        //Make body follow head, so we store head position
        this.centipedePath = []
    }

    update() {
        this.paddle.setX(this.input.activePointer.x)
        this.paddle.setY(height / 2)

        this.updateCentipede(delta)
    }

    //adding the spiraling effect: 
    updateCentipede(delta) {
        const dt = delta / 1000

        // Move along a shrinking spiral
        this.spiralAngle += this.spiralSpeed * dt
        this.spiralRadius -= this.spiralShrinkSpeed * dt

        // Stop shrinking at the center
        this.spiralRadius = Math.max(0, this.spiralRadius)

        const centerX = width / 2
        const centerY = height / 2

        const headX = centerX +
            Math.cos(this.spiralAngle) * this.spiralRadius

        const headY = centerY +
            Math.sin(this.spiralAngle) * this.spiralRadius

        // Move head
        this.centipede[0].setPosition(headX, headY)

        // Record head's position
        this.centipedePath.unshift({ x: headX, y: headY })

        // Move each body segment along the path
        for (let i = 1; i < this.centipede.length; i++) {
            const pathIndex = i * this.segmentSpacing

            if (this.centipedePath[pathIndex]) {
                const position = this.centipedePath[pathIndex]

                this.centipede[i].setPosition(
                    position.x,
                    position.y
                )
            }
        }

        // Prevent the path array from growing forever
        const maxPathLength =
            this.segmentCount * this.segmentSpacing + 1

        if (this.centipedePath.length > maxPathLength) {
            this.centipedePath.length = maxPathLength
        }
    }
}