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
          v-for="service in services"
          :key="service.uuid"
          lg="3"
        >
          <v-card class="mx-2 my-4" elevation="2">
            <v-card-title>
              {{ service.name }} - {{ service.version }}
            </v-card-title>
            <v-card-text>
              <div>
                <b>Critiques:</b> {{ service.metrics.critical }}
              </div>
              <div>
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
      formattedLastImportDate: ''
    }
  },
  mounted () {
    this.interval = setInterval(() => this.$fetch(), 60000)
  },
  async created () {
    try {
      this.vulnerabilities_URL =
      this.globalGetData('vulnerabilities_URL') || 'http://localhost:20304/'

      const { data } = await this.$axios.get(this.vulnerabilities_URL)
      this.services = data
      this.lastImportDate = data[0].lastBomImportDate
    } catch (err) {
      console.error(err)
    }
  }
}
</script>
