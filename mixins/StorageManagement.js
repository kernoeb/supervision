/**
 * This mixin provides the functionality to manage the storage of the application.
 * Before, it allowed Neutralino's storage to be used, but this is now deprecated.
 */
export default {
  methods: {
    globalGetData (key, opts) {
      return this.$cookies.get(key, opts)
    },
    globalSetData (key, value, opts) {
      this.$cookies.set(key, value, opts)
    }
  }
}
