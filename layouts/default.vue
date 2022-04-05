<template>
  <v-app>
    <div v-if="showCanvas" id="dvd" style="position: absolute; width: 100%; height: 100%; z-index: 2000; pointer-events:none;" />
    <v-system-bar fixed app>
      <span>Supervision</span>
      <v-spacer />
      <span>{{ date }}</span>
    </v-system-bar>
    <v-main>
      <v-container fluid>
        <Nuxt />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'DefaultLayout',
  data () {
    return {
      showCanvas: false,
      date: ''
    }
  },
  created () {
    setInterval(() => {
      this.date = this.getDate()
    }, 10000)
  },
  mounted () {
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

          const colors = ['green', 'red', 'blue', 'yellow', 'orange', 'purple', 'pink']
          const randomTint = () => colors[Math.floor(Math.random() * colors.length)]

          sketch.preload = () => {
            image = sketch.loadImage(localStorage.getItem('dvd')) // base64 or url
          }

          sketch.setup = () => {
            const canvas = sketch.createCanvas(window.innerWidth, window.innerHeight)
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
    /* async pageLoop () {
      await this.$router.push({ path: '/docker' })
      await new Promise(resolve => setTimeout(resolve, 10000))
      await this.$router.push({ path: '/gitlab' })
      await new Promise(resolve => setTimeout(resolve, 10000))
      await this.$router.push({ path: '/uptime' })
      await new Promise(resolve => setTimeout(resolve, 10000))
      await this.pageLoop() // loop
    }, */
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

<style>
html {
  overflow-y: scroll;
}
</style>
