import App from '@/App'

import {
  createLocalVue,
  shallowMount
} from '@vue/test-utils'
import VueRouter from 'vue-router'

import Api from '@/api'
import mockAxios from '../mocks/axios.mock'

const localVue = createLocalVue()
localVue.use(VueRouter)
const router = new VueRouter()
const message = 'olololololo'

describe('App.vue', () => {
  Api.http = mockAxios

  it('should run', async() => {
    const wrapper = shallowMount(App, {
      localVue,
      router
    })
    const raiseMessage = jest.fn()
    const raiseError = jest.fn()
    const startSpinner = jest.fn()
    const stopSpinner = jest.fn()

    wrapper.setMethods({
      raiseMessage,
      raiseError,
      startSpinner,
      stopSpinner
    })

    mockAxios.mockResponse = {
      data: {
        message,
      },
      status: 200
    }
    await Api.get('users')
    expect(startSpinner).toHaveBeenCalledTimes(1)
    expect(stopSpinner).toHaveBeenCalledTimes(1)
    expect(raiseMessage).toHaveBeenCalledTimes(1)
    expect(raiseMessage).toHaveBeenCalledWith(message)

    mockAxios.mockError = {
      response: {
        status: 500
      },
      message: 101
    }
    try {
      await Api.get('users')
    } catch(error) {
      // console.log(error)
    }

    expect(startSpinner).toHaveBeenCalledTimes(2)
    expect(stopSpinner).toHaveBeenCalledTimes(2)
    expect(raiseError).toHaveBeenCalledTimes(1)
    expect(raiseError).toHaveBeenCalledWith(101)

  })
})
