<template>
  <v-row justify="center" align="center">
    <v-col xl="8" md="10" style="max-width: 100%;">
      <div class="d-flex flex-row" style="height: 94vh;">
        <LazyGitLabViewer style="width: 47vw;" />
        <LazyDockerViewer style="width: 47vw;" />
      </div>
    </v-col>
  </v-row>
</template>

<script>
export default {
  name: 'IndexPage'
}
</script>

<style>
.list-complete-item {
  transition: all 1s;
  display: flex;
  flex-direction: column;
}
.list-complete-enter, .list-complete-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
.list-complete-leave-active {
  position: absolute;
}
</style>
