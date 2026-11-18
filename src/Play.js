class Play extends Phaser.Scene {
    constructor() {
        super('playScene')
    }

    preload() {
        //image assets
        this.load.path = './assets/'
        this.load.image('ball', 'ball.png')
        this.load.image('paddle', 'testpaddle.png')
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

        this.paddle = this.add.sprite(this.input.activePointer.x, height - 30, 'paddle').setScale(3)
        this.paddleOrbitAngle = 0
        this.paddleOrbitRadius = Math.min(width, height) * 0.15

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
    }

    update(time, delta) {
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
        this.applyBallGravity(delta)
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

                //remove the segment struck by the ball
                this.centipede.splice(this.centipede.indexOf(segment), 1)
                segment.destroy()
                this.refreshCentipedeEndAnimations()

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

        const previousRadius = this.spiralRadius
        //loop near center, then travel inward and stop at the center
        if (this.spiralHeadingToCenter) {
            this.spiralRadius = Math.max(0, previousRadius - this.spiralTravelSpeed * dt)
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
            if (segment.pathIndex === 0) {
                segment.setRotation(
                    Phaser.Math.Angle.Between(
                        previousHeadPosition.x,
                        previousHeadPosition.y,
                        headX,
                        headY
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