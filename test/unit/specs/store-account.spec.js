import Vue from 'vue'
import config from '@/config'
import { hasStored, getStored, putStored, deleteStored, deleteAll } from '@/lib/local-storage'
import {} from '../mocks/local-storage.mock'

const user = {
  id: 1,
  name: 'Super-user-barabuser'
}

const token = 'token-token-nigger-broken'
describe('store-account.js', () => {

  putStored(config.APP_ID + '-' + 'user', user)
  putStored(config.APP_ID + '-' + 'token', token)
  const accountModule = require('@/store/modules/account').default

  it('Restore from previously stored state', () => {
    expect(accountModule.state).toBeTruthy()
    expect(accountModule.state.user).toEqual(user)
    expect(accountModule.state.token).toBe(token)
  })

  it('Getters works', () => {
    expect(accountModule.state.user).toEqual(accountModule.getters.user(accountModule.state))
    expect(accountModule.state.token).toEqual(accountModule.getters.token(accountModule.state))
    expect(accountModule.getters.isAuthenticated(accountModule.state)).toBe(true)
  })

  it('SetUser works', () => {
    const another = {
      id: 2,
      name: 'Another'
    }
    accountModule.mutations.setUser(accountModule.state, another)
    expect(accountModule.state.user).toEqual(another)
  })

  it('Logout works', () => {
    accountModule.mutations.logout(accountModule.state)
    expect(accountModule.getters.user(accountModule.state)).toEqual({})
    expect(accountModule.getters.token(accountModule.state)).toEqual('')
    expect(accountModule.getters.isAuthenticated(accountModule.state)).toBe(false)
  })

  it('Login works', () => {
    accountModule.mutations.login(accountModule.state, { user, token })
    expect(accountModule.state.user).toEqual(user)
    expect(accountModule.state.token).toBe(token)
  })

})
