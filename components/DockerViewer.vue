<template>
  <v-card class="rounded-lg" elevation="0" style="border: 2px solid #9b9b9b; overflow-y: auto;">
    <v-progress-linear v-if="$fetchState.pending" indeterminate absolute />
    <v-card-title class="d-flex justify-center">
      <v-img src="https://www.docker.com/sites/default/files/d8/2019-07/horizontal-logo-monochromatic-white.png" height="40" contain />
    </v-card-title>
    <v-card-text>
      <div class="mb-4" />
      <v-row>
        <transition-group name="list-docker-complete" tag="col">
          <v-col v-for="container in computedContainers" :key="container.name" cols="4" class="pa-2 list-docker-complete-item">
            <v-card style="height: 100%;" class="rounded-lg" :style="{'background-color': getCardColor(container.state)}">
              <v-card-title class="subtitle-2">
                <v-tooltip top>
                  <template #activator="{ on, attrs }">
                    <div v-bind="attrs" v-on="on">
                      <span class="rounded-circle mr-1" :style="{'background-color': getColor(container.state)}" style="height: 10px; width: 10px; display: inline-block;" />
                      <span>{{ container.name }}</span>
                    </div>
                  </template>
                  <span>{{ container.status }}</span>
                </v-tooltip>
              </v-card-title>
              <v-card-text>
                <div>
                  <v-chip small>
                    {{ container.memory[0] }} / {{ container.memory[1] }}
                  </v-chip>
                  <v-chip small>
                    {{ container.cpu }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </transition-group>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'DockerViewer',
  data () {
    return {
      containers: [],
      interval: null
    }
  },
  async fetch () {
    try {
      const { data } = await this.$axios.get('//localhost:20302/')
      this.containers = data
    } catch (err) {
      console.error(err)
    }
  },
  computed: {
    computedContainers () {
      const tmp = [...this.containers].sort((a, b) => a.name.localeCompare(b.name))
      return tmp.sort((a, b) => a.state !== 'running' ? -1 : 1)
    }
  },
  mounted () {
    this.interval = setInterval(() => this.$fetch(), 20000)
  },
  destroyed () {
    clearInterval(this.interval)
  },
  methods: {
    getColor (state) {
      if (state === 'unknown') return 'orange'
      return state === 'running' ? 'green' : 'red'
    },
    getCardColor (state) {
      if (state === 'unknown') return '#eeeded'
      return state === 'running' ? '' : '#ffc8c8'
    }
  },
  fetchOnServer: false
}
</script>

<style scoped>
.list-docker-complete-item {
  transition: all 1s;
  display: inline-block;
}
.list-docker-complete-enter, .list-docker-complete-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
.list-docker-complete-leave-active {
  position: absolute;
}
</style>
