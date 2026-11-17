class Play extends Phaser.Scene {
    constructor() {
        super('playScene')
    }

    preload() {
        //image assets
        this.load.path = './assets/'
        this.load.image('ball', 'ball.png')
        this.load.image('paddle', 'paddle.png')
        this.load.image('bg', 'capstone bg.png')

        //audio assets
        this.load.audio('technoloop', 'techno_loop_recording.wav')
        this.load.audio('paddleHit', 'ball sfx.wav') //by michorvath on freesound
        this.load.audio('cattDeath', 'caterpillar fully dying sfx.mp3') //by quavosh on freesound
        this.load.audio('cattHit', 'caterpillar hit by ball sfx.wav') // by stumpbutt on freesound
        this.load.audio('gameOver', 'game over sfx.wav') // by hotpin7 on freesound
        this.load.audio('powerUpPickup', 'pick up powerup sfx.wav') //by LilMati on freesound

        //Cattipede
        this.load.image('centipedeHead', 'catterpillar head 1.png')
        this.load.image('centipedeHead2', 'catterpillar head 2.png')
        this.load.image('centipedeBody', 'catterpillar body 1.png')
        this.load.image('centipedeBody2', 'catterpillar body 2.png')
        this.load.image('centipedeTail', 'catterpillar tail 1.png')
        this.load.image('centipedeTail2', 'catterpillar tail 2.png')
    }

    create() {
        this.bgm = this.sound.add('technoloop', {
            volume: 1,
            loop: true
        })
        this.bgm.play()

        //setting up other in game sounds
        this.paddleHit = this.sound.add('paddleHit', {
            volume: 1,
            loop: false
        })
        this.enemyDeath = this.sound.add('cattDeath', {
            volume: 1,
            loop: false
        })
        this.enemyHit = this.sound.add('cattHit', {
            volume: 1,
            loop: false
        })
        this.gameOver = this.sound.add('gameOver', {
            volume: 1,
            loop: false
        })
        this.powerUp = this.sound.add('powerUpPickup', {
            volume: 1, 
            loop: false
        })

        this.bg = this.add.image(0, 0, 'bg').setOrigin(0).setDisplaySize(width, height)
        //this.bg = this.add.image(960, 0, 'bg').setOrigin(0).setDisplaySize(width/2, height)
        
        this.ball = this.physics.add.sprite(width / 2, 0, 'ball')
        this.ball.body.setCircle(this.ball.width / 2)
        this.ball.setY(this.ball.height / 2)
        this.ball.body.setVelocityY(500)
        this.ball.body.setCollideWorldBounds(true)
        this.ball.body.setBounce(1)

        this.paddle = this.physics.add.sprite(this.input.activePointer.x, height - 30, 'paddle').setScale(3)
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

            this.paddleHit.play()
        })

        //centipede settings, so we can change along way
        this.centipede = []
        this.segmentCount = 100
        this.segmentSpacing = 62

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
        this.initialSpiralRadius = this.spiralRadius
        this.spiralSpeed = 0.15
        this.spiralShrinkSpeed = 5

        //create centipede segments:
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

        //make body follow head, so we store head position
        this.centipedePath = []
        const initialPathLength = this.segmentCount * this.segmentSpacing + 1
        for (let i = initialPathLength - 1; i >= 0; i--) {
            const elapsed = i / 60
            const radius = this.spiralRadius + this.spiralShrinkSpeed * elapsed
            const angle = this.spiralAngle - this.spiralSpeed * elapsed
            const position = {
                x: width / 2 + Math.cos(angle) * radius,
                y: height / 2 + Math.sin(angle) * radius
            }
            const previousPosition = this.centipedePath[this.centipedePath.length - 1]
            position.distance = previousPosition
                ? previousPosition.distance + Phaser.Math.Distance.Between(
                    previousPosition.x,
                    previousPosition.y,
                    position.x,
                    position.y
                )
                : 0
            this.centipedePath.push(position)
        }
        const headPathIndex = this.centipedePath.length - 1
        this.segmentDistance = this.centipedePath[headPathIndex].distance -
            this.centipedePath[headPathIndex - this.segmentSpacing].distance
    }

    update(time, delta) {
        this.paddle.setX(this.input.activePointer.x)
        this.paddle.setY(height - 30)

        this.updateCentipede(delta)
    }

    getCentipedePathPosition(targetDistance) {
        let low = 0
        let high = this.centipedePath.length - 1

        //find the trail points around the specific distance
        while (low < high) {
            const middle = Math.floor((low + high) / 2)
            if (this.centipedePath[middle].distance < targetDistance) {
                low = middle + 1
            } else {
                high = middle
            }
        }

        const newerPosition = this.centipedePath[low]
        const olderPosition = this.centipedePath[Math.max(0, low - 1)]
        const distanceBetween = newerPosition.distance - olderPosition.distance

        //blend between those points for a smooth position
        const interpolation = distanceBetween > 0
            ? (targetDistance - olderPosition.distance) / distanceBetween
            : 0

        return {
            x: Phaser.Math.Linear(olderPosition.x, newerPosition.x, interpolation),
            y: Phaser.Math.Linear(olderPosition.y, newerPosition.y, interpolation)
        }
    }

    //adding the spiraling effect: 
    updateCentipede(delta) {
        const dt = delta / 1000

        //move along a shrinking spiral
        this.spiralAngle += this.spiralSpeed * dt
        this.spiralRadius -= this.spiralShrinkSpeed * dt

        //stop shrinking at the center
        this.spiralRadius = Math.max(0, this.spiralRadius)

        const centerX = width / 2
        const centerY = height / 2

        const headX = centerX +
            Math.cos(this.spiralAngle) * this.spiralRadius

        const headY = centerY +
            Math.sin(this.spiralAngle) * this.spiralRadius

        //move head
        this.centipede[0].setPosition(headX, headY)

        //record head's position
        const previousHeadPosition = this.centipedePath[this.centipedePath.length - 1]
        const headPathPosition = {
            x: headX,
            y: headY,
            distance: previousHeadPosition.distance + Phaser.Math.Distance.Between(
                previousHeadPosition.x,
                previousHeadPosition.y,
                headX,
                headY
            )
        }
        this.centipedePath.push(headPathPosition)
        if (previousHeadPosition) {
            this.centipede[0].setRotation(
                Phaser.Math.Angle.Between(
                    previousHeadPosition.x,
                    previousHeadPosition.y,
                    headX,
                    headY
                ) - Math.PI / 2
            )
        }

        //move each body segment along the path
        for (let i = 1; i < this.centipede.length; i++) {
            const targetDistance = headPathPosition.distance - i * this.segmentDistance
            const position = this.getCentipedePathPosition(targetDistance)

            this.centipede[i].setPosition(position.x, position.y)
            this.centipede[i].setRotation(
                Phaser.Math.Angle.Between(
                    position.x,
                    position.y,
                    this.centipede[i - 1].x,
                    this.centipede[i - 1].y
                ) - Math.PI / 2
            )
        }

        //keep enough traveled distance for the tail to follow
        if (this.centipedePath.length > 1200) {
            const oldestNeededDistance = headPathPosition.distance -
                this.segmentDistance * (this.segmentCount - 1) - this.segmentDistance
            let low = 0
            let high = this.centipedePath.length - 1

            while (low < high) {
                const middle = Math.floor((low + high) / 2)
                if (this.centipedePath[middle].distance < oldestNeededDistance) {
                    low = middle + 1
                } else {
                    high = middle
                }
            }

            if (low > 1) {
                this.centipedePath.splice(0, low - 1)
            }
        }
    }
}