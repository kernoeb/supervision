<template>
  <v-row justify="center" align="center">
    <v-col xl="8" md="10">
      <v-card elevation="0" style="background-color: transparent">
        <v-card-text>
          <a href="https://gitlab.com/-/profile/personal_access_tokens?name=monitor&scopes=read_user,read_registry,read_api" target="_blank">
            Générer une clé d'API GitLab
          </a>
        </v-card-text>
      </v-card>
      <v-card v-if="needAuth" class="rounded-lg" elevation="0" style="border: 2px solid red;">
        <v-card-text>
          <v-form v-model="valid">
            <v-text-field
              v-model="GROUP"
              label="Groupe"
              :rules="[v => !!v || 'Veuillez entrer votre groupe']"
            />
            <v-text-field
              v-model="TOKEN"
              label="Token GitLab"
              :rules="[v => !!v || 'Veuillez entrer votre token GitLab']"
              type="password"
            />
            <v-text-field
              v-model="tmpBlacklist"
              label="Blacklist"
              :rules="[v => isJson(v)]"
              type="text"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" :disabled="!valid" @click="login">
            Valider
          </v-btn>
        </v-card-actions>
      </v-card>
      <v-card v-else class="rounded-lg" elevation="0" style="border: 2px solid #9b9b9b">
        <v-progress-linear v-if="$fetchState.pending" indeterminate absolute />
        <v-card-title class="d-flex justify-center">
          <v-img src="https://about.gitlab.com/images/press/logo/png/gitlab-logo-gray-rgb.png" height="50" contain />
        </v-card-title>
        <v-card-text>
          <div>
            <div class="title">
              Jobs en cours
            </div>
            <div class="mb-4" />
            <div v-for="(project, i) in projects" :key="`jobs_${i}`">
              <v-card elevation="0" class="text-h5 text-center rounded-lg" style="border: 1px solid #313131; background-color: #fafafa">
                <span style="font-size: 12px; position: absolute; left: 9px;" class="text--disabled">{{ project.lastTag }}</span>
                <span>{{ project.title }}</span>
                <span style="font-size: 12px; position: absolute; right: 9px;" class="text--disabled">{{ project.id }}</span>
              </v-card>
              <div v-if="project.nbCommitsSinceLastTag != null && project.lastTag != null">
                <span v-if="project.nbCommitsSinceLastTag === 0" class="text--disabled">Aucun commit depuis {{ project.lastTag }}</span>
                <span v-else><a :href="project.url + '/-/commits/master'" target="_blank"><b>{{ project.nbCommitsSinceLastTag === -1 ? '> 10' : project.nbCommitsSinceLastTag }}</b></a> depuis {{ project.lastTag }}</span>
              </div>
              <br>
              <v-row class="mb-4 container pt-0">
                <v-col v-for="job in project.data" :key="`job_${job.id}`" cols="6" class="pb-0 pr-1 pl-1">
                  <v-sheet min-height="100" class="fill-height" color="transparent">
                    <v-lazy
                      v-model="job.isActive"
                      class="fill-height"
                    >
                      <v-hover v-slot="{ hover }">
                        <v-card :href="job.web_url" target="_blank" :elevation="hover ? 2 : 0" class="rounded-lg fill-height" style="border: 1px solid lightgrey">
                          <v-card-text>
                            <div class="pb-1">
                              <v-chip color="primary" class="mr-1">
                                {{ job.ref }}
                              </v-chip>
                              <v-chip class="mr-1">
                                {{ job.stage }}
                              </v-chip>
                              <v-chip>{{ job.name }}</v-chip>
                            </div>
                            <v-chip class="mb-1">
                              {{ $dayjs(job.started_at).format('llll') }}
                            </v-chip>
                            <div>
                              <v-chip :href="job.pipeline.web_url" target="_blank">
                                <v-icon class="mr-1">
                                  mdi-open-in-new
                                </v-icon>Pipeline : {{ job.pipeline.id }}
                              </v-chip>
                            </div>
                          </v-card-text>
                          <v-card-actions>
                            <v-list-item class="grow">
                              <v-list-item-avatar color="grey darken-3">
                                <v-img
                                  :src="job.user.avatar_url"
                                />
                              </v-list-item-avatar>
                              <v-list-item-content>
                                <v-list-item-title class="text--disabled">
                                  {{ job.user.name }}
                                </v-list-item-title>
                              </v-list-item-content>
                            </v-list-item>
                          </v-card-actions>
                        </v-card>
                      </v-hover>
                    </v-lazy>
                  </v-sheet>
                </v-col>
              </v-row>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
export default {
  name: 'IndexPage',
  data () {
    return {
      projectList: null,
      projects: [],
      config: null,
      GROUP: null,
      TOKEN: null,
      tmpBlacklist: null,
      needAuth: false,
      valid: false
    }
  },
  async fetch () {
    if (!this.$cookies.get('TOKEN', { parseJSON: false })) {
      this.needAuth = true
      return
    }
    if (!this.$cookies.get('GROUP', { parseJSON: false })) {
      this.needAuth = true
      return
    }

    if (!this.TOKEN) { this.TOKEN = this.$cookies.get('TOKEN', { parseJSON: false }) } // remove this line
    if (!this.GROUP) { this.GROUP = this.$cookies.get('GROUP', { parseJSON: false }) }
    if (!this.config) { this.config = { headers: { 'PRIVATE-TOKEN': this.TOKEN } } }
    const blacklist = this.$cookies.get('BLACKLIST') || []

    if (!this.projectList) {
      const tmp = (await this.$axios.get(`https://gitlab.com/api/v4/groups/${this.GROUP}/projects?per_page=50&archived=false`, this.config))
        .data.map(v => ({ id: v.id, name: v.name, url: v.web_url })).sort((a, b) => a.name.localeCompare(b.name)).filter(v => !blacklist.includes(v.name))
      this.projectList = tmp.filter((v, i, a) => a.findIndex(w => w.id === v.id) === i)
    }

    const pool = this.projectList.map(p => this.$axios.get(`https://gitlab.com/api/v4/projects/${p.id}/jobs?per_page=10&per_page=10&scope[]=running`, this.config))

    const projectPromise = await Promise.all(pool)
    for (const p of projectPromise) {
      const i = projectPromise.indexOf(p)
      p.title = this.projectList[i].name
      p.id = this.projectList[i].id
      p.url = this.projectList[i].url
      p.lastTag = this.projects[i] && this.projects[i].lastTag
      p.nbCommitsSinceLastTag = this.projects[i] && this.projects[i].nbCommitsSinceLastTag
    }
    this.projects = projectPromise

    this.$nextTick(() => {
      this.callAfter()
    })
  },
  mounted () {
    setInterval(() => {
      this.$fetch()
    }, 30000)
  },
  methods: {
    callAfter () {
      const setCommits = async (project) => {
        try {
          const lastTag = (await this.$axios.get(`https://gitlab.com/api/v4/projects/${project.id}/repository/tags?sort=desc&per_page=1`, this.config)).data[0]
          this.$set(project, 'lastTag', lastTag.name)
          const commits = (await this.$axios.get(`https://gitlab.com/api/v4/projects/${project.id}/repository/commits?sort=desc`, this.config)).data
          this.$set(project, 'nbCommitsSinceLastTag', commits.findIndex(c => c.id === lastTag.commit.id))
        } catch (e) {
        }
      }
      Promise.all(this.projects.map(setCommits))
    },
    isJson (v) {
      if (v) {
        try {
          const j = JSON.parse(v)
          if (j && j.constructor === Array) {
            return true
          } else {
            return 'Ce n\'est pas un tableau...'
          }
        } catch (e) {
          return 'Veuillez saisir un JSON valide (tableau séparé par des virgules)'
        }
      }
      return true
    },
    login () {
      this.$cookies.set('TOKEN', this.TOKEN, { path: '/', maxAge: 60 * 60 * 24 * 365 })
      this.$cookies.set('GROUP', this.GROUP, { path: '/', maxAge: 60 * 60 * 24 * 365 })
      this.$cookies.set('BLACKLIST', this.tmpBlacklist, { path: '/', maxAge: 60 * 60 * 24 * 365 })
      this.tmpBlacklist = null
      this.needAuth = false
      this.$nextTick(() => {
        this.$fetch()
      })
    }
  },
  fetchOnServer: false
}
</script>
