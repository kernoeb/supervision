<template>
  <v-app>
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
      date: this.getDate(),
      title: 'Vuetify.js'
    }
  },
  created () {
    setInterval(() => {
      this.date = this.getDate()
    }, 10000)
  },
  methods: {
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
