<template>
  <v-card
    class="rounded-lg"
    elevation="0"
    style="border: 2px solid #9b9b9b; overflow-y: auto"
  >
    <v-card-title class="d-flex justify-center flex-column">
      <div class="text-h4 font-weight-medium">
        Vulnerabilities - Dependency Track
      </div>
      <div class="text-h6 mt-2">
        Dernier Import: {{ formattedLastImportDate }}
      </div>
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col
          v-for="service in sortedServicesPerCriticality"
          :key="service.uuid"
          lg="3"
        >
          <v-card class="mx-2 my-4" elevation="2">
            <v-card-title>
              {{ service.name }}<span v-if="service.version"> - {{ service.version }}</span>
            </v-card-title>
            <v-card-text>
              <div :class="service.metrics.critical > 0 ? 'red--text' : ''">
                <b>Critiques:</b> {{ service.metrics.critical }}
              </div>
              <div :class="service.metrics.high > 0 ? 'orange--text' : ''">
                <b>Hautes:</b> {{ service.metrics.high }}
              </div>
              <div>
                <b>Dernier Import:</b> {{ service.lastBomImportDate }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import StorageManagement from '../mixins/StorageManagement.js'

export default {
  name: 'DependencyTrack',
  mixins: [StorageManagement],
  data () {
    return {
      services: [],
      interval: null,
      lastImportDate: ''
    }
  },
  async fetch () {
    try {
      this.vulnerabilities_URL = this.globalGetData('vulnerabilities_URL') || 'http://localhost:20304/'
      const { data } = await this.$axios.get(this.vulnerabilities_URL)
      this.services = data
      this.lastImportDate = data[0].lastBomImportDate
    } catch (err) {
      console.error(err)
    }
  },
  computed: {
    formattedLastImportDate () {
      return this.lastImportDate ? this.$dayjs(this.lastImportDate).format('DD/MM/YYYY HH:mm:ss') : ''
    },
    sortedServicesPerCriticality () {
      const tmp = [...this.services]
      return tmp.sort((a, b) => {
        if (a.metrics.critical > b.metrics.critical) return -1
        if (a.metrics.critical < b.metrics.critical) return 1
        return 0
      })
    }
  },
  mounted () {
    this.interval = setInterval(() => this.$fetch(), 60000)
  },
  destroyed () {
    if (this.interval) clearInterval(this.interval)
  }
}
</script>
