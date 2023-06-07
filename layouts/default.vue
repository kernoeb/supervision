<template>
  <v-app>
    <div
      v-if="showCanvas"
      id="dvd"
      style="
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: 2000;
        pointer-events: none;
      "
    />
    <v-system-bar app fixed>
      <span>Supervision</span>
      <v-spacer />
      <div class="d-inline-flex align-center">
        <span>Carousel</span>
        <v-switch v-model="carousel" class="ma-0 pa-0 ml-2" dense hide-details inset />
        <span>Cycle</span>
        <v-switch v-model="cycle" class="ma-0 pa-0 ml-2" dense hide-details inset />
      </div>
      <span class="mr-2">{{ date }}</span>
      <v-btn v-if="!fullscreen" icon x-small @click="setFullscreen()">
        <v-icon>mdi-fullscreen</v-icon>
      </v-btn>
    </v-system-bar>
    <v-main>
      <v-container fluid style="height: calc(100vh - 50px)">
        <Nuxt />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { mapMutations } from 'vuex'

export default {
  name: 'DefaultLayout',
  data () {
    return {
      showCanvas: false,
      fullscreen: false,
      date: '',
      carousel: false,
      cycle: false
    }
  },
  watch: {
    carousel (value) {
      this.activateCarousel(value)
    },
    cycle (value) {
      this.activateCycle(value)
    }
  },
  created () {
    this.carousel = this.$store.state.carousel
    this.cycle = this.$store.state.cycle
    this.date = this.getDate()
    setInterval(() => {
      this.date = this.getDate()
    }, 10000)
  },
  mounted () {
    // Check if fullscreen is active every 2 seconds
    setInterval(() => {
      this.fullscreen =
        document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement
    }, 2000)

    // This is really important, don't remove it
    if (localStorage.getItem('dvd')) {
      this.showCanvas = true
      setTimeout(() => {
        // Based on https://github.com/remarkablemark/Bouncing-DVD-Logo
        const P5 = require('p5')

        // eslint-disable-next-line no-new
        new P5((sketch) => {
          let image = null

          const position = sketch.createVector(0, 0)
          const velocity = P5.Vector.fromAngle(45)
          velocity.mult(2) // speed

          const checkBoundaryCollision = (image) => {
            let hasCollision = false

            // left or right collision
            if (position.x < 0 || position.x + image.width > sketch.width) {
              velocity.x *= -1
              hasCollision = true
            }

            // top or bottom collision
            if (position.y < 0 || position.y + image.height > sketch.height) {
              velocity.y *= -1
              hasCollision = true
            }

            return hasCollision
          }

          const colors = [
            'green',
            'red',
            'blue',
            'yellow',
            'orange',
            'purple',
            'pink'
          ]
          const randomTint = () =>
            colors[Math.floor(Math.random() * colors.length)]

          sketch.preload = () => {
            image = sketch.loadImage(localStorage.getItem('dvd')) // base64 or url
          }

          sketch.setup = () => {
            const canvas = sketch.createCanvas(
              window.innerWidth,
              window.innerHeight
            )
            canvas.parent('dvd')

            // Resize the image to not exceed the predefined size
            const size = 75
            const scale = Math.min(size / image.width, size / image.height)
            image.resize(image.width * scale, image.height * scale)
          }

          sketch.draw = () => {
            sketch.clear()
            const hasCollision = checkBoundaryCollision(image)
            if (hasCollision) sketch.tint(randomTint()) // tint the image with random color on collision
            position.add(velocity)
            sketch.image(image, position.x, position.y)
          }
        })
      }, 60000) // 1 minute
    }
  },
  methods: {
    ...mapMutations(['activateCarousel', 'activateCycle']),
    setFullscreen () {
      const element = document.body // Make the body go full screen.

      // Supports most browsers and their versions.
      const requestMethod =
        element.requestFullScreen ||
        element.webkitRequestFullScreen ||
        element.mozRequestFullScreen ||
        element.msRequestFullScreen

      if (requestMethod) {
        // Native full screen.
        requestMethod.call(element)
      } else if (typeof window.ActiveXObject !== 'undefined') {
        // Older IE.
        // eslint-disable-next-line no-undef
        const wscript = new ActiveXObject('WScript.Shell')
        if (wscript !== null) {
          wscript.SendKeys('{F11}')
        }
      }
    },
    getDate () {
      return this.$dayjs().format('DD/MM/YYYY, HH:mm')
    }
  }
}
</script>

<style scoped>
.v-application {
  background-color: #fafafa;
}
</style>
