import Vue from 'vue'
import Vuex from 'vuex'
import config from '@/config'
import account from './modules/account'

Vue.use(Vuex)

const state = {
  loading: false,
  message: {
    text: '',
    level: ''
  }
}
const getters = {
  user: state => state.account.user,
  message: state => state.message,
  isAuthenticated: state => Boolean(state.account.token),
  loading: state => state.loading
}
const mutations = {
  setError: (state, error) => {
    state.message.text = error
    state.message.level = 'error'
  },
  setMessage: (state, message) => {
    state.message.text = message
    state.message.level = ''
  },
  setLoading: (state, loading) => {
    state.loading = loading
  }
}

const actions = {
}

export default new Vuex.Store({
  modules: {
    account
  },
  state,
  getters,
  mutations,
  actions,
  strict: config.DEBUG
})
