<template>
  <v-row v-if="!loopMode" justify="center" align="center">
    <v-col xl="8" md="10" style="max-width: 100%">
      <div class="d-flex flex-row" style="height: 94vh">
        <div>
          <GitLabViewer style="width: 47vw; height: 65vh" />
          <UptimeRobot style="width: 47vw; height: 29vh" />
        </div>
        <DockerViewer style="width: 47vw" />
      </div>
    </v-col>
  </v-row>
  <v-row v-else>
    <transition name="slide-fade" mode="out-in">
      <GitLabViewer v-if="mode === 0" key="gitlab" style="width: 100%; height: 100%; overflow-y: hidden;" />
      <DockerViewer v-else-if="mode === 1" key="docker" style="width: 100%; height: 100%; overflow-y: hidden;" />
      <UptimeRobot v-else-if="mode === 2" key="uptime" style="width: 100%; height: 100%; overflow-y: hidden;" />
    </transition>
  </v-row>
</template>

<script>

export default {
  name: 'IndexPage',
  data () {
    return {
      loopMode: false,
      mode: 0
    }
  },
  mounted () {
    this.toggleLoopMode()
  },
  methods: {
    toggleLoopMode () {
      this.loopMode = true
      // every 5 seconds, switch to the next mode
      setInterval(() => {
        this.mode = (this.mode + 1) % 3
      }, 120000)
    }
  }
}
</script>

<style>
.slide-fade-enter-active {
  transition: all .3s ease;
}
.slide-fade-leave-active {
  transition: all .8s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}
.slide-fade-enter, .slide-fade-leave-to
  /* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(10px);
  opacity: 0;
}
</style>
