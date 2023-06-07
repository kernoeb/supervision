<template>
  <v-card
    class="rounded-lg"
    elevation="0"
    style="border: 2px solid #9b9b9b; overflow-y: auto"
  >
    <v-progress-linear v-if="$fetchState.pending" absolute indeterminate />
    <v-card-title class="d-flex justify-center">
      <v-img
        :src="require('@/assets/uptimerobot-logo-dark.svg')"
        contain
        height="20"
      />
      <v-menu :close-on-click="false" :close-on-content-click="false" offset-y>
        <template #activator="{ on, attrs }">
          <v-btn
            small
            style="position: absolute; right: 15px"
            v-bind="attrs"
            v-on="on"
          >
            <v-icon small>
              mdi-cogs
            </v-icon>
          </v-btn>
        </template>
        <v-card class="pa-4" outlined>
          <v-card-title>Modifier l'URL</v-card-title>
          <v-text-field
            v-model="uptimerobot_URL"
            hide-details
            @change="
              globalSetData('uptimerobot_URL', $event)
              $nextTick(() => $fetch())
            "
          />
        </v-card>
      </v-menu>
    </v-card-title>
    <v-card-text>
      <div class="mb-4" />
      <v-row>
        <transition-group name="list-uptimerobot-complete" tag="col">
          <v-col
            v-for="monitor in computedUptimes"
            :key="monitor.name"
            :cols="$store.state.carousel ? 6 : 4"
            class="list-uptimerobot-complete-item"
          >
            <v-card
              :style="{ 'background-color': getCardColor(monitor.status)}"
              class="rounded-lg"
              style="height: 100%"
            >
              <v-card-title class="subtitle-2 pa-1">
                <v-tooltip top>
                  <template #activator="{ on, attrs }">
                    <div
                      class="d-flex justify-space-between align-center"
                      style="width: 100%"
                      v-bind="attrs"
                      v-on="on"
                    >
                      <div class="text-truncate">
                        &nbsp;{{ monitor.name }}
                      </div>
                      <v-chip class="pl-2 pr-2" x-small>
                        <div
                          :style="{'background-color': getColor(monitor.status),}"
                          class="rounded-circle"
                          style="height: 10px;width: 10px;min-width: 10px;margin-right: 5px;"
                        />
                        {{ monitor.uptime === 1 ? '100' : (monitor.uptime * 100).toFixed(2) }}%
                      </v-chip>
                    </div>
                  </template>
                  <span>{{ monitor.status }}</span>
                </v-tooltip>
              </v-card-title>
            </v-card>
          </v-col>
        </transition-group>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import StorageManagement from '../mixins/StorageManagement.js'

export default {
  name: 'UptimerobotViewer',
  mixins: [StorageManagement],
  data () {
    return {
      uptimes: [],
      interval: null,
      uptimerobot_URL: ''
    }
  },
  async fetch () {
    this.uptimerobot_URL =
      this.globalGetData('uptimerobot_URL') || 'http://localhost:20303/'

    try {
      const { data } = await this.$axios.get(this.uptimerobot_URL)
      this.uptimes = data.monitors
    } catch (err) {
      console.error(err)
    }
  },
  computed: {
    computedUptimes () {
      const tmp = [...this.uptimes]
      const filtered = tmp
        .filter(uptime => uptime.status !== 'up')
        .sort((a, b) => a.name.localeCompare(b.name))
      return [
        ...filtered,
        ...tmp
          .filter(uptime => !filtered.some(f => f.name === uptime.name))
          .sort((a, b) => a.name.localeCompare(b.name))
      ]
    }
  },
  mounted () {
    this.interval = setInterval(() => this.$fetch(), 20000) // 20s
  },
  destroyed () {
    clearInterval(this.interval)
  },
  methods: {
    getColor (status) {
      if (status === 'paused') return '#ffdd7b'
      else if (status === 'not-checked') return '#ffdd7b'
      else if (status === 'seems-down') return '#ff5722'
      else if (status === 'down') return '#f44336'
      else if (status === 'up') return '#4caf50'
      else return '#9b9b9b'
    },
    getCardColor (status) {
      if (status === 'paused') return '#fff2cc'
      else if (status === 'not-checked') return '#fff2cc'
      return status === 'up' ? '' : '#ffc8c8'
    }
  },
  fetchOnServer: false
}
</script>

<style scoped>
.list-uptimerobot-complete-item {
  transition: all 1s;
  display: inline-block;
}

.list-uptimerobot-complete-enter,
.list-uptimerobot-complete-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.list-uptimerobot-complete-leave-active {
  position: absolute;
}
</style>
