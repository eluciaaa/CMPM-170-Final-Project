class Play extends Phaser.Scene {
    constructor() {
        super('playScene')
    }

    preload() {
        //image assets
        this.load.path = './assets/'
        this.load.image('ball', 'ball.png')
        this.load.image('paddle', 'curved_paddle.png')
        this.load.image('bg', 'capstone bg.png')

        //audio assets
        this.load.audio('technoloop', 'techno_loop_recording.wav')
        this.load.audio('paddleHit', 'ball sfx.wav') //by michorvath on freesound
        this.load.audio('cattDeath', 'caterpillar fully dying sfx.mp3') //by quavosh on freesound
        this.load.audio('cattHit', 'caterpillar hit by ball sfx.wav') // by stumpbutt on freesound
        this.load.audio('gameOver', 'game over sfx.wav') //by hotpin7 on freesound
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
        //adding UI design:
        //start with instructions visible
        this.gameStarted = false
        this.bgm = this.sound.add('technoloop', {
            volume: 1,
            loop: true
        })
        this.bgm.play()
        //after game restarts, clean music up so it doesn't glitch and overlap-
        // Clean up sounds when the scene restarts
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.bgm.destroy()
            this.paddleHit.destroy()
            this.enemyDeath.destroy()
            this.enemyHit.destroy()
            this.gameOver.destroy()
            this.powerUp.destroy()
        })

        //setting up other in game sounds
        this.paddleHit = this.sound.add('paddleHit', {
            volume: 0.5,
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
        this.warningZoneRadius = 300
        this.warningZone = this.add.circle(width / 2, height / 2, this.warningZoneRadius, 0xff9ed6, 0.12)
        this.warningZone.setStrokeStyle(4, 0xff9ed6, 0.8)
        this.warningZone.setDepth(0)
        this.warningZone.setAlpha(0)

        this.gamePaused = false

        this.planetRadius = 115
        this.planet = this.add.circle(width / 2, height / 2, this.planetRadius, 0x6d4b9e)
        this.planet.setStrokeStyle(6, 0xf59bd5)
        this.planet.setDepth(1)
        this.planet.setAlpha(0)

        this.ball = this.physics.add.sprite(width / 2, 0, 'ball')
        this.ball.body.setCircle(this.ball.width / 2)
        this.ball.setY(this.ball.height / 2)
        this.ballSpeed = 500
        this.ballGravity = 800
        this.ballReturningToCenter = false
        this.ball.body.setVelocityY(this.ballSpeed)
        this.ball.body.setCollideWorldBounds(true, 1, 1, true)
        this.ball.body.setBounce(1)

        //any world-edge bounce starts the ball's return toward the center
        this.physics.world.on('worldbounds', (body) => {
            if (body.gameObject === this.ball) {
                this.sendBallToCenter()
            }
        })

        this.paddle = this.add.sprite(this.input.activePointer.x, height - 30, 'paddle').setScale(5)
        this.paddleOrbitAngle = 0
        this.paddleOrbitRadius = Math.min(width, height) * 0.16

        //centipede settings, so we can change along way
        this.centipede = []
        this.segmentCount = 70 //change to test UI
        this.segmentSpacing = 62

        //adding smaller centipede mechanic:
        //mini-centipedes created when a segment is destroyed
        this.miniCentipedes = []

        this.miniSegmentCount = 2
        this.miniScale = 4
        this.miniStartSpeed = 100
        this.miniMaxSpeed = 600
        this.miniAcceleration = 250

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
        this.minimumSpiralRadius = 24
        this.spiralCenterLoopAngle = 0
        this.spiralHeadingToCenter = false
        this.initialSpiralRadius = this.spiralRadius
        this.spiralSpeed = 0.15
        this.spiralShrinkSpeed = 5
        this.spiralTravelSpeed = Math.hypot(
            this.spiralRadius * this.spiralSpeed,
            this.spiralShrinkSpeed
        )

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
            segment.currentAnimationKey = animation
            segment.pathIndex = i
            segment.targetPathIndex = i
            segment.shiftStartPathIndex = i
            segment.shiftElapsed = 1000
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

        //actually calling UI
        this.physics.world.pause()
        this.createInstructionsUI()

        //temporarily add this to test game over:
        // TEMPORARY: Press G to test Game Over
        this.input.keyboard.on('keydown-G', () => {
            if (this.gameStarted && !this.gamePaused) {
                this.pauseAtPlanet()
            }
        })
    }

    createInstructionsUI() {
        const centerX = width / 2
        const centerY = height / 2

        //container for the entire instructions screen
        this.instructionsUI = this.add.container(0, 0)
        this.instructionsUI.setDepth(1000)

        //dark background overlay
        const overlay = this.add.rectangle(
            centerX, centerY,
            width, height,
            0x0d0929, 0.85
        )

        //main panel
        const panel = this.add.rectangle(
            centerX, centerY,
            1000, 720,
            0x241b52
        )
        panel.setStrokeStyle(4, 0xf59bd5)

        //helper for centered text
        const addText = (y, message, size, color) => {
            return this.add.text(centerX, y, message, {
                fontFamily: 'monospace',
                fontSize: `${size}px`,
                color: color,
                align: 'center'
            }).setOrigin(0.5)
        }

        //title
        const title = addText(
            centerY - 290,
            'CATTIPEDE',
            80,
            '#ff9ed6'
        )

        //subtitle
        const subtitle = addText(
            centerY - 210,
            'DEFEND THE PLANET',
            30,
            '#ffe39c'
        )

        //objective section
        const objectiveTitle = addText(
            centerY - 140,
            'OBJECTIVE',
            28,
            '#ff9ed6'
        )

        const objectiveText = addText(
            centerY - 95,
            'Bounce the ball into the Cattipede',
            24,
            '#ffffff'
        )

        //controls section
        const controlsTitle = addText(
            centerY - 30,
            'CONTROLS',
            28,
            '#ff9ed6'
        )

        const controlsText = addText(
            centerY + 15,
            'Move your mouse to rotate the paddle.',
            24,
            '#ffffff'
        )

        //warning section
        const warningTitle = addText(
            centerY + 80,
            'WARNING',
            28,
            '#ff9ed6'
        )

        const warningText = addText(
            centerY + 135,
            'Destroyed segments release mini-Cattipedes!\n' +
            'Block them before they reach and destroy the planet.',
            22,
            '#ffffff'
        )

        //game over warning
        const gameOverText = addText(
            centerY + 215,
            'ONE HIT TO THE PLANET = GAME OVER!',
            22,
            '#ffe39c'
        )

        //start button
        const startButton = this.add.rectangle(
            centerX,
            centerY + 290,
            280, 55,
            0xf59bd5
        )

        startButton.setInteractive({ useHandCursor: true })

        const startText = addText(
            centerY + 230,
            'CLICK TO START',
            28,
            '#241b52'
        )

        //add everything to the container
        this.instructionsUI.add([
            overlay,
            panel,
            title,
            subtitle,
            objectiveTitle,
            objectiveText,
            controlsTitle,
            controlsText,
            warningTitle,
            warningText,
            gameOverText,
            startButton,
            startText
        ])

        //start the game when clicked
        startButton.on('pointerdown', () => {
            this.gameStarted = true

            //resume physics
            this.physics.world.resume()

            //remove instructions UI
            this.instructionsUI.destroy()
        })
    }



    update(time, delta) {
        if (!this.gameStarted || this.gamePaused) {
            return
        }
        this.paddleOrbitAngle = Math.atan2(
            this.input.activePointer.y - height / 2,
            this.input.activePointer.x - width / 2
        )
        this.paddle.setPosition(
            width / 2 + Math.cos(this.paddleOrbitAngle) * this.paddleOrbitRadius,
            height / 2 + Math.sin(this.paddleOrbitAngle) * this.paddleOrbitRadius
        )
        this.paddle.setRotation(this.paddleOrbitAngle + Math.PI / 2)
        this.checkPaddleCollision()

        this.updateCentipede(delta)
        this.checkCentipedeCollision()
        this.updateMiniCentipedes(delta)
        this.checkMiniBallCollision()
        this.checkMiniPaddleCollision()
        this.checkZoneContacts()

        //check winning conditions
        this.checkVictory()
    }

    checkZoneContacts() {
        const centerX = width / 2
        const centerY = height / 2

        const checkSegment = (segment) => {
            const segmentRadius = Math.min(segment.displayWidth, segment.displayHeight) * 0.5
            const distance = Phaser.Math.Distance.Between(segment.x, segment.y, centerX, centerY)

            if (distance <= this.planetRadius + segmentRadius) {
                this.pauseAtPlanet()
                return true
            }

            return false
        }

        for (const segment of this.centipede) {
            if (checkSegment(segment)) {
                return
            }
        }

        for (const mini of this.miniCentipedes) {
            for (const segment of mini.segments) {
                if (checkSegment(segment)) {
                    return
                }
            }
        }
    }

    pauseAtPlanet() {
        if (this.gamePaused) {
            return
        }
        //stops the gameplay
        this.gamePaused = true
        this.physics.world.pause()
        //stop music
        this.bgm.stop()
        //play game over
        this.gameOver.play()
        //Restart screen
        this.createGameOverUI()
    }

    //checking winning conditions to implement UI
    checkVictory() {
        if (!this.gameStarted || this.gamePaused) {
            return
        }

        // Check if all enemies have been destroyed
        if (this.centipede.length === 0 &&
            this.miniCentipedes.length === 0) {

            // Stop gameplay
            this.gamePaused = true
            this.physics.world.pause()

            // Stop background music
            this.bgm.stop()

            // Play enemy defeated sound
            this.enemyDeath.play()

            // Display victory screen
            this.createVictoryUI()
        }
    }

    //gameover UI

    createGameOverUI() {
        const centerX = width / 2
        const centerY = height / 2

        // Container for the game over screen
        this.gameOverUI = this.add.container(0, 0)
        this.gameOverUI.setDepth(2000)

        // Dark overlay over the gameplay
        const overlay = this.add.rectangle(
            centerX, centerY,
            width, height,
            0x0d0929, 0.85
        )

        // Main panel
        const panel = this.add.rectangle(
            centerX, centerY,
            680, 460,
            0x241b52
        )
        panel.setStrokeStyle(4, 0xf59bd5)

        // Helper for centered text
        const addText = (y, message, size, color) => {
            return this.add.text(centerX, y, message, {
                fontFamily: 'monospace',
                fontSize: `${size}px`,
                color: color,
                align: 'center'
            }).setOrigin(0.5)
        }

        // Game over title
        const title = addText(
            centerY - 160,
            'GAME OVER',
            52,
            '#ff9ed6'
        )

        // Subtitle
        const subtitle = addText(
            centerY - 95,
            'THE PLANET HAS BEEN DESTROYED!!!',
            24,
            '#ffe39c'
        )

        // Explanation
        const message = addText(
            centerY - 15,
            'The Cattipedes ate the planet!\n' +
            'Your defense has failed.',
            20,
            '#ffffff'
        )

        message.setLineSpacing(12)

        // Encouragement
        const retryText = addText(
            centerY + 75,
            'Protect the planet. Try again!',
            18,
            '#ffe39c'
        )

        // Restart button
        const restartButton = this.add.rectangle(
            centerX,
            centerY + 155,
            280, 60,
            0xf59bd5
        )

        restartButton.setInteractive({ useHandCursor: true })

        const restartText = addText(
            centerY + 155,
            'PLAY AGAIN',
            24,
            '#241b52'
        )

        // Add everything to the UI container
        this.gameOverUI.add([
            overlay,
            panel,
            title,
            subtitle,
            message,
            retryText,
            restartButton,
            restartText
        ])

        // Restart the game when clicked
        restartButton.on('pointerdown', () => {
            this.scene.restart()
        })
    }

    //create winning victory UI

    createVictoryUI() {
        const centerX = width / 2
        const centerY = height / 2

        // Container for victory screen
        this.victoryUI = this.add.container(0, 0)
        this.victoryUI.setDepth(2000)

        // Dark background overlay
        const overlay = this.add.rectangle(
            centerX, centerY,
            width, height,
            0x0d0929, 0.85
        )

        // Main panel
        const panel = this.add.rectangle(
            centerX, centerY,
            800, 520,
            0x241b52
        )

        panel.setStrokeStyle(4, 0xf59bd5)

        // Helper for centered text
        const addText = (y, message, size, color) => {
            return this.add.text(centerX, y, message, {
                fontFamily: 'monospace',
                fontSize: `${size}px`,
                color: color,
                align: 'center'
            }).setOrigin(0.5)
        }

        // Victory title
        const title = addText(
            centerY - 190,
            'VICTORY!',
            72,
            '#ff9ed6'
        )

        // Subtitle
        const subtitle = addText(
            centerY - 110,
            'THE PLANET IS SAVED',
            32,
            '#ffe39c'
        )

        // Victory message
        const message = addText(
            centerY - 15,
            'You successfully defeated the Cattipede!\n' +
            'All threats have been eliminated.',
            26,
            '#ffffff'
        )

        message.setLineSpacing(15)

        // Additional message
        const congratulations = addText(
            centerY + 85,
            'The galaxy thanks you!',
            24,
            '#ffe39c'
        )

        // Restart button
        const restartButton = this.add.rectangle(
            centerX,
            centerY + 185,
            340, 70,
            0xf59bd5
        )

        restartButton.setInteractive({
            useHandCursor: true
        })

        const restartText = addText(
            centerY + 185,
            'PLAY AGAIN',
            30,
            '#241b52'
        )

        // Add everything to container
        this.victoryUI.add([
            overlay,
            panel,
            title,
            subtitle,
            message,
            congratulations,
            restartButton,
            restartText
        ])

        // Restart game
        restartButton.on('pointerdown', () => {
            this.scene.restart()
        })
    }


    applyBallGravity(delta) {
        //gravity only curves the ball on its trip back from a non-paddle hit
        if (!this.ballReturningToCenter) {
            return
        }

        const toCenterX = width / 2 - this.ball.x
        const toCenterY = height / 2 - this.ball.y
        const distanceToCenter = Math.hypot(toCenterX, toCenterY)
        const gravityStep = this.ballGravity * delta / 1000
        const gravityX = distanceToCenter > 0 ? toCenterX / distanceToCenter : 0
        const gravityY = distanceToCenter > 0 ? toCenterY / distanceToCenter : 0
        let velocityX = this.ball.body.velocity.x + gravityX * gravityStep
        let velocityY = this.ball.body.velocity.y + gravityY * gravityStep
        const speed = Math.hypot(velocityX, velocityY)

        if (speed === 0) {
            velocityX = gravityX
            velocityY = distanceToCenter > 0 ? gravityY : -1
        }

        this.setBallVelocityAtSpeed(velocityX, velocityY, this.ballSpeed)
    }

    setBallVelocityAtSpeed(velocityX, velocityY, speed) {
        const currentSpeed = Math.hypot(velocityX, velocityY)
        if (currentSpeed === 0) {
            return
        }

        this.ball.body.setVelocity(
            velocityX * speed / currentSpeed,
            velocityY * speed / currentSpeed
        )
    }

    sendBallToCenter() {
        const toCenterX = width / 2 - this.ball.x
        let toCenterY = height / 2 - this.ball.y
        if (toCenterX === 0 && toCenterY === 0) {
            toCenterY = -1
        }

        this.setBallVelocityAtSpeed(toCenterX, toCenterY, this.ballSpeed)
        this.ballReturningToCenter = true
    }

    checkPaddleCollision() {
        const radialX = Math.cos(this.paddleOrbitAngle)
        const radialY = Math.sin(this.paddleOrbitAngle)
        const tangentX = -radialY
        const tangentY = radialX
        const ballOffsetX = this.ball.x - this.paddle.x
        const ballOffsetY = this.ball.y - this.paddle.y
        const localX = ballOffsetX * tangentX + ballOffsetY * tangentY
        const localY = ballOffsetX * radialX + ballOffsetY * radialY
        const halfWidth = this.paddle.displayWidth / 2
        const halfHeight = this.paddle.displayHeight / 2
        const closestX = Phaser.Math.Clamp(localX, -halfWidth, halfWidth)
        const closestY = Phaser.Math.Clamp(localY, -halfHeight, halfHeight)
        const separationX = localX - closestX
        const separationY = localY - closestY
        const distance = Math.hypot(separationX, separationY)
        const ballRadius = this.ball.body.halfWidth

        if (distance >= ballRadius) {
            return
        }

        let normalX
        let normalY
        if (distance > 0) {
            normalX = (tangentX * separationX + radialX * separationY) / distance
            normalY = (tangentY * separationX + radialY * separationY) / distance
        } else {
            const radialVelocity = this.ball.body.velocity.x * radialX +
                this.ball.body.velocity.y * radialY
            const direction = radialVelocity > 0 ? -1 : 1
            normalX = radialX * direction
            normalY = radialY * direction
        }

        this.ball.setPosition(
            this.ball.x + normalX * (ballRadius - distance),
            this.ball.y + normalY * (ballRadius - distance)
        )

        const velocityX = this.ball.body.velocity.x
        const velocityY = this.ball.body.velocity.y
        const approachSpeed = velocityX * normalX + velocityY * normalY
        if (approachSpeed >= 0) {
            return
        }

        //offset breakout style launch angle
        const hitOffset = Phaser.Math.Clamp(localX / halfWidth, -1, 1)
        const maxSpread = Phaser.Math.DegToRad(55)
        const baseSpread = hitOffset * maxSpread
        const randomDirection = Math.sign(hitOffset) || (Math.random() < 0.5 ? -1 : 1)
        const randomNudge = Math.random() < 0.3
            ? randomDirection * Phaser.Math.FloatBetween(0, Phaser.Math.DegToRad(8))
            : 0
        const spread = Phaser.Math.Clamp(
            baseSpread + randomNudge,
            -maxSpread,
            maxSpread
        )
        const speed = Math.hypot(velocityX, velocityY)
        const outgoingX = normalX * Math.cos(spread) + tangentX * Math.sin(spread)
        const outgoingY = normalY * Math.cos(spread) + tangentY * Math.sin(spread)
        this.setBallVelocityAtSpeed(outgoingX, outgoingY, speed)
        this.ballReturningToCenter = false
        this.paddleHit.play()
    }

    checkCentipedeCollision() {
        const ballRadius = this.ball.body.halfWidth
        const velocityX = this.ball.body.velocity.x
        const velocityY = this.ball.body.velocity.y

        //test the ball against each segment's rotated rectangle
        for (const segment of this.centipede) {
            const axisX = Math.cos(segment.rotation)
            const axisY = Math.sin(segment.rotation)
            const sideX = -axisY
            const sideY = axisX
            const offsetX = this.ball.x - segment.x
            const offsetY = this.ball.y - segment.y
            const localX = offsetX * axisX + offsetY * axisY
            const localY = offsetX * sideX + offsetY * sideY
            const halfWidth = segment.displayWidth * 0.30
            const halfHeight = segment.displayHeight / 2
            const closestX = Phaser.Math.Clamp(localX, -halfWidth, halfWidth)
            const closestY = Phaser.Math.Clamp(localY, -halfHeight, halfHeight)
            const separationX = localX - closestX
            const separationY = localY - closestY
            const distance = Math.hypot(separationX, separationY)

            if (distance >= ballRadius) {
                continue
            }

            let normalX
            let normalY
            let penetration
            if (distance > 0) {
                normalX = (axisX * separationX + sideX * separationY) / distance
                normalY = (axisY * separationX + sideY * separationY) / distance
                penetration = ballRadius - distance
            } else {
                const depthX = halfWidth - Math.abs(localX)
                const depthY = halfHeight - Math.abs(localY)
                if (depthX < depthY) {
                    const direction = localX < 0 ? -1 : 1
                    normalX = axisX * direction
                    normalY = axisY * direction
                    penetration = ballRadius + depthX
                } else {
                    const direction = localY < 0 ? -1 : 1
                    normalX = sideX * direction
                    normalY = sideY * direction
                    penetration = ballRadius + depthY
                }
            }

            const normalLength = Math.hypot(normalX, normalY)
            normalX /= normalLength
            normalY /= normalLength

            this.ball.setPosition(
                this.ball.x + normalX * penetration,
                this.ball.y + normalY * penetration
            )

            const approachSpeed = velocityX * normalX + velocityY * normalY
            if (approachSpeed < 0) {
                this.sendBallToCenter()
                this.enemyHit.play()

                const hitPathIndex = segment.pathIndex

                //save the destroyed segment's position
                const spawnX = segment.x
                const spawnY = segment.y

                //remove the segment struck by the ball
                this.centipede.splice(this.centipede.indexOf(segment), 1)
                segment.destroy()
                this.refreshCentipedeEndAnimations()

                //spawn mini centipede going towards planet
                this.spawnMiniCentipede(spawnX, spawnY)

                //animate segments to fill the gap
                for (const remainingSegment of this.centipede) {
                    if (remainingSegment.pathIndex < hitPathIndex) {
                        remainingSegment.shiftStartPathIndex = remainingSegment.pathIndex
                        remainingSegment.targetPathIndex++
                        remainingSegment.shiftElapsed = 0
                    }
                }
            }
            return
        }
    }

    refreshCentipedeEndAnimations() {
        const tailIndex = this.centipede.length - 1
        this.centipede.forEach((segment, index) => {
            let animation = 'centipedeBodyAnim'
            if (index === 0) {
                animation = 'centipedeHeadAnim'
            } else if (index === tailIndex) {
                animation = 'centipedeTailAnim'
            }

            if (segment.currentAnimationKey !== animation) {
                segment.play(animation)
                segment.currentAnimationKey = animation
            }
        })
    }

    //for smaller centipedes:
    spawnMiniCentipede(x, y) {
        const centerX = width / 2
        const centerY = height / 2

        //direction toward the planet
        const angle = Phaser.Math.Angle.Between(
            x, y, centerX, centerY
        )

        const directionX = Math.cos(angle)
        const directionY = Math.sin(angle)

        const segments = []
        const spacing = 32 * this.miniScale * 0.7

        for (let i = 0; i < this.miniSegmentCount; i++) {
            let texture = 'centipedeBody'
            let animation = 'centipedeBodyAnim'

            if (i === 0) {
                texture = 'centipedeHead'
                animation = 'centipedeHeadAnim'
            } else if (i === this.miniSegmentCount - 1) {
                texture = 'centipedeTail'
                animation = 'centipedeTailAnim'
            }

            const segment = this.add.sprite(
                x - directionX * spacing * i,
                y - directionY * spacing * i,
                texture
            )

            segment.setScale(this.miniScale)
            segment.setDepth(10)
            segment.setRotation(angle - Math.PI / 2)
            segment.play(animation)

            segments.push(segment)
        }

        this.miniCentipedes.push({
            segments: segments,
            directionX: directionX,
            directionY: directionY,
            speed: this.miniStartSpeed
        })
    }

    //checking for mini cattipede deaths:
    destroyMiniCentipede(index) {
        const mini = this.miniCentipedes[index]

        if (!mini) {
            return
        }

        for (const segment of mini.segments) {
            segment.destroy()
        }

        this.miniCentipedes.splice(index, 1)
        this.enemyHit.play()
    }
    //checking for player ball collision:
    checkMiniBallCollision() {
        const ballRadius = this.ball.body.halfWidth

        for (let i = this.miniCentipedes.length - 1; i >= 0; i--) {
            const mini = this.miniCentipedes[i]

            for (const segment of mini.segments) {

                const distance = Phaser.Math.Distance.Between(
                    this.ball.x,
                    this.ball.y,
                    segment.x,
                    segment.y
                )

                const segmentRadius = Math.min(
                    segment.displayWidth,
                    segment.displayHeight
                ) * 0.4

                if (distance < ballRadius + segmentRadius) {

                    //destroy the mini-centipede
                    this.destroyMiniCentipede(i)

                    //send the ball back toward the planet
                    this.sendBallToCenter()

                    break
                }
            }
        }
    }
    //also adding it so that the player can block using paddle as well
    checkMiniPaddleCollision() {
        const radialX = Math.cos(this.paddleOrbitAngle)
        const radialY = Math.sin(this.paddleOrbitAngle)

        const tangentX = -radialY
        const tangentY = radialX

        const halfWidth = this.paddle.displayWidth / 2
        const halfHeight = this.paddle.displayHeight / 2

        for (let i = this.miniCentipedes.length - 1; i >= 0; i--) {
            const mini = this.miniCentipedes[i]

            for (const segment of mini.segments) {

                // Position relative to paddle
                const offsetX = segment.x - this.paddle.x
                const offsetY = segment.y - this.paddle.y

                // Convert to paddle's local coordinates
                const localX =
                    offsetX * tangentX + offsetY * tangentY

                const localY =
                    offsetX * radialX + offsetY * radialY

                // Closest point on the paddle
                const closestX = Phaser.Math.Clamp(
                    localX, -halfWidth, halfWidth
                )

                const closestY = Phaser.Math.Clamp(
                    localY, -halfHeight, halfHeight
                )

                const distance = Math.hypot(
                    localX - closestX,
                    localY - closestY
                )

                const segmentRadius = Math.min(
                    segment.displayWidth,
                    segment.displayHeight
                ) * 0.4

                if (distance < segmentRadius) {

                    // Paddle intercepted the mini-centipede
                    this.destroyMiniCentipede(i)

                    break
                }
            }
        }
    }

    //add movement towards the planet for smaller centipedes:
    updateMiniCentipedes(delta) {
        const dt = delta / 1000
        const centerX = width / 2
        const centerY = height / 2

        for (let i = this.miniCentipedes.length - 1; i >= 0; i--) {
            const mini = this.miniCentipedes[i]
            // Accelerate toward the planet
            mini.speed = Math.min(
                mini.speed + this.miniAcceleration * dt,
                this.miniMaxSpeed
            )

            // Move all segments toward the planet
            for (const segment of mini.segments) {
                segment.x += mini.directionX * mini.speed * dt
                segment.y += mini.directionY * mini.speed * dt
            }

            const head = mini.segments[0]

            // Check if head reaches planet
            const distance = Phaser.Math.Distance.Between(
                head.x, head.y, centerX, centerY
            )

            if (distance <= this.planetRadius) {
                this.miniCentipedes.splice(i, 1)

                for (const segment of mini.segments) {
                    segment.destroy()
                }

                this.pauseAtPlanet()
            }
        }
    }

    getCentipedePathPosition(targetDistance) {
        if (this.centipedePath.length === 0) {
            return { x: width / 2, y: height / 2 }
        }

        //never extrapolate a segment beyond the newest or oldest stored trail point
        const oldestDistance = this.centipedePath[0].distance
        const newestDistance = this.centipedePath[this.centipedePath.length - 1].distance
        targetDistance = Phaser.Math.Clamp(targetDistance, oldestDistance, newestDistance)

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

        const previousRadius = this.spiralRadius
        //loop near center, then travel inward while continuing to advance the angle
        if (this.spiralHeadingToCenter) {
            this.spiralRadius = Math.max(
                this.minimumSpiralRadius * 0.25,
                previousRadius - this.spiralTravelSpeed * dt
            )

            const averageRadius = (previousRadius + this.spiralRadius) / 2
            const radialSpeed = dt > 0
                ? (previousRadius - this.spiralRadius) / dt
                : 0
            const tangentialSpeed = Math.sqrt(Math.max(
                0,
                this.spiralTravelSpeed ** 2 - radialSpeed ** 2
            ))
            if (averageRadius > 0) {
                this.spiralAngle += tangentialSpeed * dt / averageRadius
            }
        } else {
            this.spiralRadius = Math.max(
                this.minimumSpiralRadius,
                previousRadius - this.spiralShrinkSpeed * dt
            )

            const radialSpeed = dt > 0
                ? (previousRadius - this.spiralRadius) / dt
                : 0
            const tangentialSpeed = Math.sqrt(Math.max(
                0,
                this.spiralTravelSpeed ** 2 - radialSpeed ** 2
            ))
            const averageRadius = (previousRadius + this.spiralRadius) / 2
            const angleStep = averageRadius > 0
                ? tangentialSpeed * dt / averageRadius
                : 0
            this.spiralAngle += angleStep

            if (previousRadius <= this.minimumSpiralRadius) {
                this.spiralCenterLoopAngle += angleStep
                if (this.spiralCenterLoopAngle >= Math.PI * 2) {
                    this.spiralHeadingToCenter = true
                }
            }
        }

        const centerX = width / 2
        const centerY = height / 2

        const headX = centerX +
            Math.cos(this.spiralAngle) * this.spiralRadius

        const headY = centerY +
            Math.sin(this.spiralAngle) * this.spiralRadius

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

        //move each segment along its assigned path slot
        for (let i = 0; i < this.centipede.length; i++) {
            const segment = this.centipede[i]
            if (segment.shiftElapsed < 1000) {
                segment.shiftElapsed = Math.min(1000, segment.shiftElapsed + delta)
                const progress = segment.shiftElapsed / 1000
                segment.pathIndex = Phaser.Math.Linear(
                    segment.shiftStartPathIndex,
                    segment.targetPathIndex,
                    progress
                )
            }

            const targetDistance = headPathPosition.distance -
                segment.pathIndex * this.segmentDistance
            const position = this.getCentipedePathPosition(targetDistance)

            segment.setPosition(position.x, position.y)
            if (i === 0) {
                const directionDistance = Math.min(
                    1,
                    headPathPosition.distance - targetDistance
                )
                const directionStart = directionDistance > 0
                    ? position
                    : previousHeadPosition
                const directionEnd = directionDistance > 0
                    ? this.getCentipedePathPosition(targetDistance + directionDistance)
                    : headPathPosition
                segment.setRotation(
                    Phaser.Math.Angle.Between(
                        directionStart.x,
                        directionStart.y,
                        directionEnd.x,
                        directionEnd.y
                    ) - Math.PI / 2
                )
            } else if (i > 0) {
                const precedingSegment = this.centipede[i - 1]
                segment.setRotation(
                    Phaser.Math.Angle.Between(
                        position.x,
                        position.y,
                        precedingSegment.x,
                        precedingSegment.y
                    ) - Math.PI / 2
                )
            }
        }

        //keep history for the farthest segment, including active setbacks
        if (this.centipedePath.length > 1200) {
            const maxPathIndex = this.centipede.reduce((maxIndex, segment) =>
                Math.max(maxIndex, segment.pathIndex, segment.targetPathIndex), 0)
            const oldestNeededDistance = headPathPosition.distance -
                this.segmentDistance * (maxPathIndex + 1)
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