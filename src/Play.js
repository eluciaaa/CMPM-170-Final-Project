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
        this.load.image('centipedeHead', 'catterpillar head 1.png')
        this.load.image('centipedeHead2', 'catterpillar head 2.png')
        this.load.image('centipedeBody', 'catterpillar body 1.png')
        this.load.image('centipedeBody2', 'catterpillar body 2.png')
        this.load.image('centipedeTail', 'catterpillar tail 1.png')
        this.load.image('centipedeTail2', 'catterpillar tail 2.png')
    }

    create() {
        this.bg = this.add.image(0, 0, 'bg').setOrigin(0)
        
        this.ball = this.physics.add.sprite(width / 2, 0, 'ball')
        this.ball.body.setCircle(this.ball.width / 2)
        this.ball.setY(this.ball.height / 2)
        this.ball.body.setVelocityY(450)
        this.ball.body.setCollideWorldBounds(true)
        this.ball.body.setBounce(1)

        this.paddle = this.physics.add.sprite(this.input.activePointer.x, height - 30, 'paddle')
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
        this.segmentSpacing = 30

        //animations
        this.anims.create({
            key: 'centipedeHeadAnim',
            frames: [{ key: 'centipedeHead' }, { key: 'centipedeHead2' }],
            frameRate: 4,
            repeat: -1
        })
        this.anims.create({
            key: 'centipedeBodyAnim',
            frames: [{ key: 'centipedeBody' }, { key: 'centipedeBody2' }],
            frameRate: 4,
            repeat: -1
        })
        this.anims.create({
            key: 'centipedeTailAnim',
            frames: [{ key: 'centipedeTail' }, { key: 'centipedeTail2' }],
            frameRate: 4,
            repeat: -1
        })
        
        //spiral movement settings
        this.spiralAngle = 0
        this.spiralRadius = Math.max(width, height) * 0.55 //markus eger lowk W pull
        this.spiralSpeed = 0.5
        this.spiralShrinkSpeed = 20

        //Create centipede segments:
        for (let i = 0; i < this.segmentCount; i++) {
            let sprite = 'centipedeBody'
            let animation = 'centipedeBodyAnim'

            if(i === 0) {
                sprite = 'centipedeHead'
                animation = 'centipedeHeadAnim'
            }
            else if (i === this.segmentCount - 1){
                sprite = 'centipedeTail'
                animation = 'centipedeTailAnim'
            }

            const segment = this.add.sprite(
                width/2,
                height/2,
                sprite
            )
            segment.setScale(9)
            segment.play(animation)
            this.centipede.push(segment)
        }

        //Make body follow head, so we store head position
        this.centipedePath = []
        const initialPathLength = this.segmentCount * this.segmentSpacing + 1
        for (let i = 0; i < initialPathLength; i++) {
            const elapsed = i / 60
            const radius = this.spiralRadius + this.spiralShrinkSpeed * elapsed
            const angle = this.spiralAngle - this.spiralSpeed * elapsed
            this.centipedePath.push({
                x: width / 2 + Math.cos(angle) * radius,
                y: height / 2 + Math.sin(angle) * radius
            })
        }

        //just want to see if centipede loads in
        /*this.add.image(
            width / 2,
            height / 2,
            'centipedeHead'
        ).setScale(0.5)
        */
    }

    update(time, delta) {
        this.paddle.setX(this.input.activePointer.x)
        this.paddle.setY(height - 30)

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