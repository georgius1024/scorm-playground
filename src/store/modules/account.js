import config from '@/config'

import { getStored, putStored, deleteAll } from '@/lib/local-storage'

const stored = (key, defVal) => {
  return getStored(config.APP_ID + '-' + key, defVal)
}

const store = (key, value) => {
  return putStored(config.APP_ID + '-' + key, value)
}

const state = {
  user: stored('user', {}),
  token: stored('token')
}

const getters = {
  user: state => state.user,
  token: state => state.token,
  isAuthenticated: state => Boolean(state.token)
}

const mutations = {
  setUser: (state, user) => {
    state.user = user
    store('user', state.user)
  },
  login: (state, { user, token }) => {
    state.user = user
    state.token = token
    store('user', state.user)
    store('token', state.token)
  },
  logout: state => {
    state.user = {}
    state.token = ''
    deleteAll()
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations}
