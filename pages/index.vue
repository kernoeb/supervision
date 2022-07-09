<template>
  <v-row justify="center" align="center">
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
</template>

<script>
export default {
  name: 'IndexPage'
}
</script>
