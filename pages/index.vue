<template>
  <div>
    <v-carousel
      v-if="$store.state.carousel"
      :cycle="$store.state.cycle"
      height="calc(100vh - 70px)"
      hide-delimiters
      interval="60000"
    >
      <v-carousel-item>
        <div>
          <GitLabViewer class="custom-carousel-item" />
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <UptimeRobot class="custom-carousel-item" />
      </v-carousel-item>
      <v-carousel-item>
        <DockerViewer class="custom-carousel-item" />
      </v-carousel-item>
    </v-carousel>
    <v-row v-else align="center" justify="center">
      <v-col md="10" style="max-width: 100%" xl="8">
        <div class="d-flex flex-row" style="height: 94vh">
          <div>
            <GitLabViewer style="width: 47vw; height: 65vh" />
            <UptimeRobot style="width: 47vw; height: 29vh" />
          </div>
          <DockerViewer style="width: 47vw" />
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import GitLabViewer from '~/components/GitLabViewer.vue'
import DockerViewer from '~/components/DockerViewer.vue'

export default {
  name: 'IndexPage',
  components: { DockerViewer, GitLabViewer }
}
</script>

<style>
.custom-carousel-item {
  margin: 0 8vh;
  height: calc(100vh - 75px);
}
</style>
