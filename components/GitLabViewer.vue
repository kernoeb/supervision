<template>
  <v-card
    class="rounded-lg"
    elevation="0"
    style="border: 2px solid #9b9b9b; overflow-y: auto"
  >
    <client-only>
      <v-dialog v-model="needAuth" persistent width="50vw">
        <v-card class="rounded-lg" elevation="0" style="border: 2px solid red">
          <v-card-title> Connexion</v-card-title>
          <v-card-text>
            <a
              href="https://gitlab.com/-/profile/personal_access_tokens?name=monitor&scopes=read_user,read_registry,read_api"
              target="_blank"
            >
              Générer une clé d'API GitLab
            </a>
            <v-form v-model="valid">
              <v-text-field
                v-model="GROUP"
                :rules="[(v) => !!v || 'Veuillez entrer votre groupe']"
                label="Groupe"
              />
              <v-text-field
                v-model="TOKEN"
                :rules="[(v) => !!v || 'Veuillez entrer votre token GitLab']"
                label="Token GitLab"
                type="password"
              />
              <v-text-field
                v-model="tmpBlacklist"
                :rules="[(v) => isJson(v)]"
                label="Blacklist"
                type="text"
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn :disabled="!valid" color="primary" @click="login">
              Valider
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </client-only>
    <v-progress-linear v-if="$fetchState.pending" absolute indeterminate />
    <v-card-title class="d-flex justify-center">
      <v-img :src="require('@/assets/gitlab.png')" contain height="45" />
      <div class="subtitle-2 text--disabled">
        Groupe <a :href="`https://gitlab.com/${GROUP}`" target="_blank">{{ GROUP }}</a>
      </div>
      <v-tooltip top>
        <template #activator="{ on, attrs }">
          <v-btn
            small
            style="position: absolute; right: 15px"
            v-bind="attrs"
            @click="filtered = !filtered; $nextTick(() => $fetch()) "
            v-on="on"
          >
            <v-icon :color="iconColor" small>
              {{ filtered ? 'mdi-filter' : 'mdi-filter-off' }}
            </v-icon>
          </v-btn>
        </template>
        <span v-if="filtered">Cliquez pour <strong>ne plus afficher</strong> les projets sans activité</span>
        <span v-else>Cliquez pour <strong>afficher</strong> les projets sans activité</span>
      </v-tooltip>
    </v-card-title>
    <v-card-text>
      <div class="mb-4" />
      <div v-if="!firstFetch">
        <transition-group name="list-complete" tag="div">
          <div
            v-for="project in computedProjectsData"
            :key="`jobs_data_${project.id}`"
            class="list-complete-item v-row"
          >
            <v-card
              class="text-h6 text-center rounded-lg"
              elevation="0"
              style="border: 1px solid #313131; background-color: #fafafa"
            >
              <span class="text--disabled" style="font-size: 12px; position: absolute; left: 9px">
                {{ project.lastTag }}
              </span>
              <span v-if="project.coverage">
                {{ project.coverage }}%
              </span>
              <span>{{ project.name }}</span>
              <span
                class="text--disabled"
                style="font-size: 12px; position: absolute; right: 9px"
              >
                {{ project.id }}
                <v-btn
                  icon
                  small
                  @click="addToBlacklist(project.name)"
                ><v-icon size="15">mdi-trash-can</v-icon></v-btn>
              </span>
            </v-card>
            <div v-if="project.nbCommitsSinceLastTag != null && project.lastTag != null">
              <span v-if="project.nbCommitsSinceLastTag === 0" class="text--disabled">
                Aucun commit depuis {{ project.lastTag }}
              </span>
              <span v-else>
                <span>
                  <a :href="project.url + '/-/commits/master'" target="_blank">
                    <strong>{{
                      project.nbCommitsSinceLastTag === -1 ? '> 10' : project.nbCommitsSinceLastTag
                    }}</strong>
                  </a>
                  depuis {{ project.lastTag }}
                </span>
                <span
                  v-if="project.commitsByType &&typeof project.commitsByType === 'object'"
                  class="float-right"
                >
                  {{ commitByTypes(project.commitsByType) }}
                </span>
              </span>
            </div>
            <br>
            <v-row class="mb-4 container pt-0">
              <v-col
                v-for="job in project.data"
                :key="`job_${job.id}`"
                class="pb-0 pr-1 pl-1"
                cols="6"
              >
                <v-sheet
                  class="fill-height"
                  color="transparent"
                  min-height="100"
                >
                  <v-hover v-slot="{ hover }">
                    <v-card
                      :elevation="hover ? 2 : 0"
                      :href="job.web_url"
                      class="rounded-lg fill-height"
                      style="border: 1px solid lightgrey"
                      target="_blank"
                    >
                      <v-card-text>
                        <div class="pb-1">
                          <v-chip class="mr-1" color="primary">
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
                            </v-icon>
                            Pipeline : {{ job.pipeline.id }}
                          </v-chip>
                        </div>
                      </v-card-text>
                      <v-card-actions>
                        <v-list-item class="grow">
                          <v-list-item-avatar color="grey darken-3">
                            <v-img :src="job.user.avatar_url" />
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
        <v-row>
          <transition-group name="list-complete-nodata" tag="col">
            <v-col
              v-for="project in computedProjectsNoData"
              :key="`jobs_nodata_${project.id}`"
              class="pa-2 list-complete-nodata-item"
              cols="3"
            >
              <v-card
                class="rounded-lg"
                style="height: 100%"
              >
                <v-card-title class="subtitle-2">
                  <v-tooltip top>
                    <template #activator="{ on, attrs }">
                      <div v-bind="attrs" v-on="on">
                        <span>{{ project.name }}</span>
                      </div>
                    </template>
                    <span>{{ project.id }}</span>
                  </v-tooltip>
                </v-card-title>
                <v-card-text>
                  <div>
                    <v-chip :color="coverageColor(project.coverage)" small>
                      {{ project.coverage || 0 }} %
                    </v-chip>
                    <v-chip
                      v-if="project.lastTag"
                      small
                    >
                      {{ project.lastTag }}
                      {{ new Date(project.lastTagDate) > new Date() - 86400000 ? '🎉' : '' }}
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </transition-group>
        </v-row>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import StorageManagement from '../mixins/StorageManagement.js'

export default {
  name: 'GitLabViewer',
  mixins: [StorageManagement],
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
      fetching: false,
      firstFetch: true
    }
  },
  async fetch () {
    if (this.fetching) return

    this.fetching = true
    this.filtered = this.globalGetData('GITLAB_ONLY') || false

    if (!this.globalGetData('TOKEN', { parseJSON: false })) {
      this.needAuth = true
      this.fetching = false
      return
    }
    if (!this.globalGetData('GROUP', { parseJSON: false })) {
      this.needAuth = true
      this.fetching = false
      return
    }

    if (!this.TOKEN) {
      this.TOKEN = this.globalGetData('TOKEN', { parseJSON: false })
    }
    if (!this.GROUP) {
      this.GROUP = this.globalGetData('GROUP', { parseJSON: false })
    }
    if (!this.config) {
      this.config = { headers: { 'PRIVATE-TOKEN': this.TOKEN } }
    }
    const blacklist = this.globalGetData('BLACKLIST') || []

    if (!this.projectList) {
      const tmp = (
        await this.$axios.get(
          `https://gitlab.com/api/v4/groups/${this.GROUP}/projects?per_page=50&archived=false`,
          this.config
        )
      ).data
        .map(v => ({ id: v.id, name: v.name, url: v.web_url }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter(v => !blacklist.includes(v.name))
      this.projectList = tmp.filter(
        (v, i, a) => a.findIndex(w => w.id === v.id) === i
      )
    }

    const pool = this.projectList.map(p =>
      this.$axios.get(
        `https://gitlab.com/api/v4/projects/${p.id}/jobs?per_page=10&per_page=10&scope[]=running`,
        this.config
      )
    )

    const projectPromise = await Promise.all(pool)
    for (const p of projectPromise) {
      const i = projectPromise.indexOf(p)
      p.name = this.projectList[i].name
      p.id = this.projectList[i].id
      p.url = this.projectList[i].url
      p.lastTag = this.projects[i] && this.projects[i].lastTag
      p.lastTagDate = this.projects[i] && this.projects[i].lastTagDate
      p.nbCommitsSinceLastTag =
        this.projects[i] && this.projects[i].nbCommitsSinceLastTag
      p.commitsByType = this.projects[i] && this.projects[i].commitsByType
      p.coverage = this.projects[i] && this.projects[i].coverage
    }
    this.projects = projectPromise

    this.fetching = false
    this.$nextTick(async () => {
      await this.callAfter()
      this.firstFetch = false
    })
  },
  computed: {
    iconColor () {
      return this.filtered ? 'green' : 'red'
    },
    computedProjectsData () {
      let tmp = [...this.projects].filter(p => p.data.length)

      // sort by most recent last tag
      tmp = tmp.sort((a, b) => {
        if (!a.lastTagDate) {
          return 1
        }
        if (!b.lastTagDate) {
          return -1
        }
        return new Date(b.lastTagDate) - new Date(a.lastTagDate)
      })

      if (this.filtered) {
        return tmp.filter(v => v?.data.length || v.nbCommitsSinceLastTag)
      }
      return tmp
    },
    computedProjectsNoData () {
      let tmp = [...this.projects].filter(p => !p.data.length)
      // sort by most recent last tag
      tmp = tmp.sort((a, b) => {
        if (!a.lastTagDate) {
          return 1
        }
        if (!b.lastTagDate) {
          return -1
        }
        return new Date(b.lastTagDate) - new Date(a.lastTagDate)
      })
      if (this.filtered) {
        return tmp.filter(v => v?.data.length || v.nbCommitsSinceLastTag)
      }
      return tmp
    }
  },
  watch: {
    filtered () {
      this.globalSetData('GITLAB_ONLY', this.filtered, {
        maxAge: 60 * 60 * 24 * 365
      })
    }
  },
  mounted () {
    this.interval = setInterval(
      () => {
        this.$fetch()
      },
      process.env.NODE_ENV === 'production' ? 30000 : 10000
    )
  },
  destroyed () {
    clearInterval(this.interval)
  },
  methods: {
    addToBlacklist (name) {
      this.globalSetData(
        'BLACKLIST',
        [...(this.globalGetData('BLACKLIST') || []), name],
        { maxAge: 60 * 60 * 24 * 365 }
      )
      const tmpBLACKLIST = this.globalGetData('BLACKLIST') || []
      this.projectList = this.projectList.filter(
        v => !tmpBLACKLIST.includes(v.name)
      )
      this.projects = this.projects.filter(
        v => !tmpBLACKLIST.includes(v.name)
      )
      this.$nextTick(() => {
        this.$fetch()
      })
    },
    commitByTypes (types) {
      return Object.entries(types)
        .map(([key, value]) => `${value} ${key}`)
        .sort((a, b) =>
          (a?.split(' ')?.[1] || '').localeCompare(b?.split(' ')?.[1] || '')
        )
        .join(', ')
    },
    commitType (commit) {
      if (commit?.title?.toUpperCase()?.includes('FEAT')) return 'feat'
      if (commit?.title?.toUpperCase()?.includes('FIX')) return 'fix'
      else return 'other'
    },
    async callAfter () {
      const setCommits = async (project) => {
        try {
          const lastTag = (
            await this.$axios.get(
              `https://gitlab.com/api/v4/projects/${project.id}/repository/tags?sort=desc&per_page=1`,
              this.config
            )
          ).data[0]

          // Get commit of last tag and then pipeline of this commit to retreive coverage information
          const commitOfLastTag = (
            await this.$axios.get(
              `https://gitlab.com/api/v4/projects/${project.id}/repository/commits/${lastTag.commit.id}`,
              this.config
            )
          ).data

          const pipOfCOLT = (
            await this.$axios.get(
              `https://gitlab.com/api/v4/projects/${project.id}/pipelines/${commitOfLastTag.last_pipeline.id}`,
              this.config
            )
          ).data

          const coverage = pipOfCOLT?.coverage || undefined

          this.$set(project, 'coverage', coverage)

          this.$set(project, 'lastTag', lastTag.name)
          this.$set(project, 'lastTagDate', lastTag.commit.committed_date)
          const commits = (
            await this.$axios.get(
              `https://gitlab.com/api/v4/projects/${project.id}/repository/commits?sort=desc`,
              this.config
            )
          ).data
          const nbCommitsSinceLastTag = commits.findIndex(
            c => c.id === lastTag.commit.id
          )
          this.$set(project, 'nbCommitsSinceLastTag', nbCommitsSinceLastTag)
          const newCommitsTypes = commits
            .splice(0, nbCommitsSinceLastTag)
            .map(this.commitType)
          const commitsByType = newCommitsTypes.reduce((acc, cur) => {
            acc[cur] = (acc[cur] || 0) + 1
            return acc
          }, {})
          this.$set(project, 'commitsByType', commitsByType)
        } catch (e) {
        }
      }
      await Promise.all(this.projects.map(setCommits))
    },
    isJson (v) {
      if (v) {
        try {
          const j = JSON.parse(v)
          if (j && j.constructor === Array) {
            return true
          } else {
            return "Ce n'est pas un tableau..."
          }
        } catch (e) {
          return 'Veuillez saisir un JSON valide (tableau séparé par des virgules)'
        }
      }
      return true
    },
    login () {
      this.globalSetData('TOKEN', this.TOKEN, { maxAge: 60 * 60 * 24 * 365 })
      this.globalSetData('GROUP', this.GROUP, { maxAge: 60 * 60 * 24 * 365 })
      this.globalSetData('BLACKLIST', this.tmpBlacklist, {
        maxAge: 60 * 60 * 24 * 365
      })
      this.tmpBlacklist = null
      this.needAuth = false
      this.$nextTick(() => {
        this.$fetch()
      })
    },
    coverageColor (coverage) {
      if (coverage < 60) return 'red accent-2'
      if (coverage < 70) return 'orange accent-2'
      if (coverage < 85) return 'yellow accent-2'
      if (coverage < 90) return 'green accent-2'
      if (coverage === 100) return 'blue accent-2'
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

.list-complete-enter,
.list-complete-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.list-complete-leave-active {
  position: absolute;
}

.list-complete-nodata-item {
  transition: all 1s;
  display: inline-block;
}

.list-complete-nodata-enter,
.list-complete-nodata-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.list-complete-nodata-leave-active {
  position: absolute;
}
</style>
