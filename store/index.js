export const state = () => ({
  carousel: true,
  cycle: true
})

export const mutations = {
  activateCarousel (state, payload) {
    state.carousel = payload
  },
  activateCycle (state, payload) {
    state.cycle = payload
  }
}
