export default {
  methods: {
    async globalGetData (key, opts) {
      if (typeof Neutralino !== 'undefined' && Neutralino) {
        try {
          if (!opts || (opts && opts.parseJson)) {
            return JSON.parse(await Neutralino.storage.getData(key))
          }
          return await Neutralino.storage.getData(key)
        } catch (err) {
          console.log(err)
          return undefined
        }
      } else {
        return this.$cookies.get(key, opts)
      }
    },
    async globalSetData (key, value, opts) {
      if (typeof Neutralino !== 'undefined' && Neutralino) {
        await Neutralino.storage.setData(key, value)
      } else {
        this.$cookies.set(key, value, opts)
      }
    }
  }
}
