<template>
  <v-card
    class="rounded-lg"
    elevation="0"
    style="border: 2px solid #9b9b9b; overflow-y: auto"
  >
    <v-progress-linear v-if="$fetchState.pending" indeterminate absolute />
    <v-card-title class="d-flex justify-center">
      <v-img
        :src="require('@/assets/docker.png')"
        height="40"
        contain
      />
      <v-menu
        offset-y
        :close-on-click="false"
        :close-on-content-click="false"
      >
        <template #activator="{ on, attrs }">
          <v-btn
            small
            v-bind="attrs"
            style="position: absolute; right: 15px"
            v-on="on"
          >
            <v-icon small>
              mdi-cogs
            </v-icon>
          </v-btn>
        </template>
        <v-card outlined class="pa-4">
          <v-card-title>Modifier l'URL</v-card-title>
          <v-text-field
            v-model="DOCKER_URL"
            hide-details
            @change="
              globalSetData('DOCKER_URL', $event)
              $nextTick(() => $fetch())
            "
          />
        </v-card>
      </v-menu>
    </v-card-title>
    <v-card-text>
      <div class="mb-4" />
      <v-row>
        <transition-group name="list-docker-complete" tag="col">
          <v-col
            v-for="container in computedContainers"
            :key="container.name"
            cols="4"
            class="pa-2 list-docker-complete-item"
          >
            <v-card
              style="height: 100%"
              class="rounded-lg"
              :style="{ 'background-color': getCardColor(container.state) }"
            >
              <v-card-title class="subtitle-2">
                <v-tooltip top>
                  <template #activator="{ on, attrs }">
                    <div v-bind="attrs" v-on="on">
                      <span
                        class="rounded-circle mr-1"
                        :style="{
                          'background-color': getColor(container.state),
                        }"
                        style="height: 10px; width: 10px; display: inline-block"
                      />
                      <span>{{ container.name }}</span>
                    </div>
                  </template>
                  <span>{{ container.status }}</span>
                </v-tooltip>
              </v-card-title>
              <v-card-text>
                <div>
                  <v-chip small :color="memoryColor(container.memory[0])">
                    {{ container.memory[0] }} / {{ container.memory[1] }}
                  </v-chip>
                  <v-chip small :color="cpuColor(container.cpu)">
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
import { ByteConverter } from '@wtfcode/byte-converter'
import StorageManagement from '../mixins/StorageManagement.js'

export default {
  name: 'DockerViewer',
  mixins: [StorageManagement],
  data () {
    return {
      containers: [],
      interval: null,
      DOCKER_URL: ''
    }
  },
  async fetch () {
    this.DOCKER_URL = this.globalGetData('DOCKER_URL') || 'http://localhost:20302/'

    try {
      const { data } = await this.$axios.get(this.DOCKER_URL)
      this.containers = data
    } catch (err) {
      console.error(err)
    }
  },
  computed: {
    computedContainers () {
      const tmp = [...this.containers]
      const filtered = tmp.filter(
        container => container.state !== 'running' || this.cpuColor(container.cpu) || this.memoryColor(container.memory[0])
      ).sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      return [...filtered, ...tmp.filter(container => !filtered.some(f => f.name === container.name)).sort((a, b) =>
        a.name.localeCompare(b.name)
      )]
    }
  },
  mounted () {
    this.interval = setInterval(() => this.$fetch(), 20000) // 20s
  },
  destroyed () {
    clearInterval(this.interval)
  },
  methods: {
    cpuColor (cpu) {
      // parse cpu percentage
      const cpuParsed = parseFloat(cpu.replace(',', '.').replace('%', ''))
      if (cpuParsed > 90) {
        return 'error'
      } else if (cpuParsed > 50) {
        return 'warning'
      }
    },
    memoryColor (current) {
      const unitCurrent = current.match(/[a-zA-Z]+$/)[0].trim()
      const byteCurrent = ByteConverter.value(parseFloat(current), unitCurrent)
      const toGBCurrent = ByteConverter.convert(byteCurrent, 'GiB')
      if (toGBCurrent.value > 7) { // 7 GiB
        return 'error'
      } else if (toGBCurrent.value > 2) { // 2 GiB
        return 'warning'
      }
    },
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
.list-docker-complete-enter,
.list-docker-complete-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
.list-docker-complete-leave-active {
  position: absolute;
}
</style>
