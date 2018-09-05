import config from '@/config'

import { hasStored, getStored, putStored, deleteStored, deleteAll } from '@/lib/local-storage'
import {} from '../mocks/local-storage.mock'

const user = {
  id: 1,
  name: 'Super-user-barabuser'
}
const token = 'token-token-user-broken'
const message = 'Ololololo!'
describe('store-account.js', () => {

  putStored(config.APP_ID + '-' + 'user', user)
  putStored(config.APP_ID + '-' + 'token', token)
  const store = require('@/store').default

  it('Restore from previously stored state', () => {
    expect(store.getters.user).toEqual(user)
    expect(store.getters.isAuthenticated).toBe(true)
  })

  it('setMessage mutation works', () => {
    store.commit('setMessage', message)
    expect(store.getters.message).toEqual({'level': '', 'text': 'Ololololo!'})
    store.commit('setMessage', false)
  })

  it('setError mutation works', () => {
    store.commit('setError', message)
    expect(store.getters.message).toEqual({'level': 'error', 'text': 'Ololololo!'})
    store.commit('setError', false)
  })

  it('setLoading mutation works', () => {
    store.commit('setLoading', true)
    expect(store.getters.loading).toBe(true)
    store.commit('setLoading', false)
    expect(store.getters.loading).toBe(false)
  })

})
