<template>
  <v-card class="rounded-lg" elevation="0" style="border: 2px solid #9b9b9b; overflow-y: auto;">
    <client-only>
      <v-dialog v-model="needAuth" width="50vw" persistent>
        <v-card class="rounded-lg" elevation="0" style="border: 2px solid red;">
          <v-card-title>
            Connexion
          </v-card-title>
          <v-card-text>
            <a href="https://gitlab.com/-/profile/personal_access_tokens?name=monitor&scopes=read_user,read_registry,read_api" target="_blank">
              Générer une clé d'API GitLab
            </a>
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
      </v-dialog>
    </client-only>
    <v-progress-linear v-if="$fetchState.pending" indeterminate absolute />
    <v-card-title class="d-flex justify-center">
      <v-img src="https://about.gitlab.com/images/press/logo/png/gitlab-logo-gray-rgb.png" height="50" contain />
      <v-tooltip top>
        <template #activator="{ on, attrs }">
          <v-btn v-bind="attrs" style="position: absolute; right: 15px;" v-on="on" @click="filtered = !filtered; $nextTick(() => $fetch())">
            <v-icon :color="iconColor">
              {{ filtered ? 'mdi-filter' : 'mdi-filter-off' }}
            </v-icon>
          </v-btn>
        </template>
        <span v-if="filtered">Cliquez pour <b>ne plus afficher</b> les projets sans activité</span>
        <span v-else>Cliquez pour <b>afficher</b> les projets sans activité</span>
      </v-tooltip>
    </v-card-title>
    <v-card-text>
      <div>
        <div class="title">
          Groupe <a :href="`https://gitlab.com/${GROUP}`" target="_blank">{{ GROUP }}</a>
        </div>
        <div class="mb-4" />
        <transition-group name="list-complete" tag="div">
          <div v-for="project in computedProjects" :key="`jobs_${project.id}`" class="list-complete-item">
            <v-card elevation="0" class="text-h5 text-center rounded-lg" style="border: 1px solid #313131; background-color: #fafafa">
              <span style="font-size: 12px; position: absolute; left: 9px;" class="text--disabled">{{ project.lastTag }}</span>
              <span>{{ project.name }}</span>
              <span style="font-size: 12px; position: absolute; right: 9px;" class="text--disabled">
                {{ project.id }}
                <v-btn icon small @click="addToBlacklist(project.name)"><v-icon size="15">mdi-trash-can</v-icon></v-btn>
              </span>
            </v-card>
            <div v-if="project.nbCommitsSinceLastTag != null && project.lastTag != null">
              <span v-if="project.nbCommitsSinceLastTag === 0" class="text--disabled">Aucun commit depuis {{ project.lastTag }}</span>
              <span v-else>
                <span><a :href="project.url + '/-/commits/master'" target="_blank"><b>{{ project.nbCommitsSinceLastTag === -1 ? '> 10' : project.nbCommitsSinceLastTag }}</b></a> depuis {{ project.lastTag }}</span>
                <span v-if="project.commitsByType && typeof project.commitsByType === 'object'" class="float-right">
                  {{ commitByTypes(project.commitsByType) }}
                </span>
              </span>
            </div>
            <br>
            <v-row class="mb-4 container pt-0">
              <v-col v-for="job in project.data" :key="`job_${job.id}`" cols="6" class="pb-0 pr-1 pl-1">
                <v-sheet min-height="100" class="fill-height" color="transparent">
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
                </v-sheet>
              </v-col>
            </v-row>
          </div>
        </transition-group>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import StorageManagement from '../mixins/StorageManagement.js'

export default {
  name: 'GitLabViewer',
  mixins: [
    StorageManagement
  ],
  data () {
    return {
      projectList: null,
      projects: [],
      config: null,
      GROUP: null,
      TOKEN: null,
      tmpBlacklist: null,
      needAuth: false,
      valid: false,
      interval: undefined,
      filtered: false,
      fetching: false
    }
  },
  async fetch () {
    if (this.fetching) {
      return
    }
    this.fetching = true
    this.filtered = await this.globalGetData('GITLAB_ONLY') || false

    if (!await this.globalGetData('TOKEN', { parseJSON: false })) {
      this.needAuth = true
      this.fetching = false
      return
    }
    if (!await this.globalGetData('GROUP', { parseJSON: false })) {
      this.needAuth = true
      this.fetching = false
      return
    }

    if (!this.TOKEN) { this.TOKEN = await this.globalGetData('TOKEN', { parseJSON: false }) } // remove this line
    if (!this.GROUP) { this.GROUP = await this.globalGetData('GROUP', { parseJSON: false }) }
    if (!this.config) { this.config = { headers: { 'PRIVATE-TOKEN': this.TOKEN } } }
    const blacklist = await this.globalGetData('BLACKLIST') || []

    if (!this.projectList) {
      const tmp = (await this.$axios.get(`https://gitlab.com/api/v4/groups/${this.GROUP}/projects?per_page=50&archived=false`, this.config))
        .data.map(v => ({ id: v.id, name: v.name, url: v.web_url })).sort((a, b) => a.name.localeCompare(b.name)).filter(v => !blacklist.includes(v.name))
      this.projectList = tmp.filter((v, i, a) => a.findIndex(w => w.id === v.id) === i)
    }

    const pool = this.projectList.map(p => this.$axios.get(`https://gitlab.com/api/v4/projects/${p.id}/jobs?per_page=10&per_page=10&scope[]=running`, this.config))

    const projectPromise = await Promise.all(pool)
    for (const p of projectPromise) {
      const i = projectPromise.indexOf(p)
      p.name = this.projectList[i].name
      p.id = this.projectList[i].id
      p.url = this.projectList[i].url
      p.lastTag = this.projects[i] && this.projects[i].lastTag
      p.nbCommitsSinceLastTag = this.projects[i] && this.projects[i].nbCommitsSinceLastTag
      p.commitsByType = this.projects[i] && this.projects[i].commitsByType
    }
    this.projects = projectPromise

    this.fetching = false
    this.$nextTick(() => {
      this.callAfter()
    })
  },
  computed: {
    iconColor () {
      return this.filtered ? 'green' : 'red'
    },
    computedProjects () {
      let tmp = [...this.projects].sort((a, b) => a.name.localeCompare(b.name))
      tmp = tmp.sort((a, b) => {
        if (!a.data || (a.data && a.data.length === 0)) { return 1 }
        if (!b.data || (b.data && b.data.length === 0)) { return -1 }
        return 0
      })
      if (this.filtered) { return tmp.filter(v => v?.data.length || v.nbCommitsSinceLastTag) }
      return tmp
    }
  },
  watch: {
    async filtered () {
      await this.globalSetData('GITLAB_ONLY', this.filtered, { maxAge: 60 * 60 * 24 * 365 })
    }
  },
  mounted () {
    this.interval = setInterval(() => {
      this.$fetch()
    }, process.env.NODE_ENV === 'production' ? 30000 : 10000)
  },
  destroyed () {
    clearInterval(this.interval)
  },
  methods: {
    async addToBlacklist (name) {
      await this.globalSetData('BLACKLIST', [...await this.globalGetData('BLACKLIST') || [], name], { maxAge: 60 * 60 * 24 * 365 })
      const tmpBLACKLIST = await this.globalGetData('BLACKLIST') || []
      this.projectList = this.projectList.filter(v => !tmpBLACKLIST.includes(v.name))
      this.projects = this.projects.filter(v => !tmpBLACKLIST.includes(v.name))
      this.$nextTick(() => {
        this.$fetch()
      })
    },
    commitByTypes (types) {
      return Object.entries(types).map(([key, value]) => `${value} ${key}`).sort((a, b) => (a?.split(' ')?.[1] || '').localeCompare((b?.split(' ')?.[1] || ''))).join(', ')
    },
    commitType (commit) {
      if (commit?.title?.toUpperCase()?.includes('FEAT')) return 'feat'
      if (commit?.title?.toUpperCase()?.includes('FIX')) return 'fix'
      else return 'other'
    },
    callAfter () {
      const setCommits = async (project) => {
        try {
          const lastTag = (await this.$axios.get(`https://gitlab.com/api/v4/projects/${project.id}/repository/tags?sort=desc&per_page=1`, this.config)).data[0]
          this.$set(project, 'lastTag', lastTag.name)
          const commits = (await this.$axios.get(`https://gitlab.com/api/v4/projects/${project.id}/repository/commits?sort=desc`, this.config)).data
          const nbCommitsSinceLastTag = commits.findIndex(c => c.id === lastTag.commit.id)
          this.$set(project, 'nbCommitsSinceLastTag', nbCommitsSinceLastTag)
          const newCommitsTypes = commits.splice(0, nbCommitsSinceLastTag).map(this.commitType)
          const commitsByType = newCommitsTypes.reduce((acc, cur) => {
            acc[cur] = (acc[cur] || 0) + 1
            return acc
          }, {})
          this.$set(project, 'commitsByType', commitsByType)
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
    async login () {
      await this.globalSetData('TOKEN', this.TOKEN, { maxAge: 60 * 60 * 24 * 365 })
      await this.globalSetData('GROUP', this.GROUP, { maxAge: 60 * 60 * 24 * 365 })
      await this.globalSetData('BLACKLIST', this.tmpBlacklist, { maxAge: 60 * 60 * 24 * 365 })
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

<style scoped>
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
