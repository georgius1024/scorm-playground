import Api from '@/api'
import mockAxios from '../mocks/axios.mock'

'use strict'


const testApi = 'https://reqres.in/api' // https://reqres.in/
const token = 'QpwL5tke4Pnpja7X'
const message = 'Ololololololo'


describe('Api client', () => {
  Api.http = mockAxios
  it('Can set Base Url', () => {
    Api.setBaseUrl(testApi)
    expect(Api.http.defaults.baseURL).toBe(testApi)
  })
  it('Can set token', () => {
    Api.setToken(token)
    expect(Api.http.defaults.headers.common['Authorization']).toBe('Bearer ' + token)
  })

  it('Can clear token', () => {
    Api.clearToken()
    expect(Api.http.defaults.headers.common['Authorization']).toBeFalsy()
  })

  it('can subscribe and unsubscribe event listener with key', () => {
    Api.subscribe('error', jest.fn(), 'key1')
    Api.subscribe('error', jest.fn(), 'key2')
    expect(Api.subscriptions.error).toHaveLength(2)
    expect(Api.unsubscribe('error', 'key1')).toBe(true)
    expect(Api.subscriptions.error).toHaveLength(1)
    expect(Api.unsubscribe('error', 'key2')).toBe(true)
    expect(Api.subscriptions.error).toBeFalsy()
    expect(Api.unsubscribe('error')).toBe(false)

  })

  it('can subscribe and unsubscribe event listener without key', () => {
    Api.subscribe('error', jest.fn())
    Api.subscribe('error', jest.fn())
    expect(Api.subscriptions.error).toHaveLength(2)
    Api.unsubscribe('error')
    expect(Api.subscriptions.error).toBeFalsy()
  })

  it('can subscribe and unsubscribe event listener within ON function', () => {
    Api.on('error', jest.fn())
    Api.on('error', jest.fn())
    expect(Api.subscriptions.error).toHaveLength(2)
    Api.on('error', false)
    expect(Api.subscriptions.error).toBeFalsy()
  })

  it('can subscribe and catch event', () => {
    const onError = jest.fn()
    let error  = token
    Api.on('error', error => {
      onError(error)
    })
    Api.emit('error', error)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(error)
    Api.on('error', false)
  })

  it('Can GET', async () => {
    let onCompleteCalled = 0
    Api.on('complete', response => {
      response.data.auth = { token }
      onCompleteCalled++
    })
    let onAuthCalled = 0
    Api.on('auth', () => {
      onAuthCalled++
    })

    mockAxios.mockResponse = {
      data: {
        message,
        token
      },
      status: 200
    }
    const response = await Api.get('users')
    expect(response).toEqual(mockAxios.mockResponse.data)
    expect(Api.request.method).toBe('get')
    expect(onCompleteCalled).toBe(1)
    expect(onAuthCalled).toBe(1)
    Api.on('complete', false)
    Api.on('auth', false)
  })

  it('Can POST', async () => {
    mockAxios.mockResponse = {
      data: {
        message,
        token
      },
      status: 201
    }
    const user = {
      'name': 'morpheus',
      'job': 'leader'
    }
    const response = await Api.post('users', user)
    expect(response).toEqual(mockAxios.mockResponse.data)
    expect(Api.status).toBe(201)
    expect(Api.message).toBe(message)

    expect(Api.request.method).toBe('post')
    expect(Api.request.data).toEqual(user)
  })

  it('Can PUT', async () => {
    mockAxios.mockResponse = {
      data: {
        token
      },
      status: 202
    }
    const response = await Api.put('users')
    expect(response).toEqual(mockAxios.mockResponse.data)
    expect(Api.status).toBe(202)
    expect(Api.message).toBeFalsy()

    expect(Api.request.method).toBe('put')
  })

  it('Can DELETE', async () => {
    mockAxios.mockResponse = {
      data: {
        message,
        token
      },
      status: 200
    }
    const response = await Api.delete('users')
    expect(response).toEqual(mockAxios.mockResponse.data)
    expect(Api.request.method).toBe('delete')
  })

  it('Can GET error', async () => {
    let onErrorCalled = 0
    Api.on('error', () => {
      onErrorCalled++
    })

    mockAxios.mockError = {
      response: {
        data: {
          message,
          token
        },
        status: 404
      },
      message: token
    }
    let errors = 0
    try {
      await Api.get('users/200')
    } catch (error) {
      errors++
      expect(error.response.status).toBe(404)
      expect(error.message).toBe(token)
    }
    expect(Api.status).toBe(404)
    expect(Api.message).toBe(message)
    expect(errors).toBe(1)
    expect(onErrorCalled).toBe(1)

    Api.on('error', false)
    mockAxios.mockError = false
    /*
    const response = await Api.get('users')
    console.log(response)
    expect(response).toEqual(mockAxios.mockResponse.data)
    */
    // expect(Api.request.method).toBe('get')

  })
  /*
  it('Can GET list', async () => {
    const response = await Api.get('users')
    expect(response.data).toHaveLength(3)
  })
  it('Can GET single', async () => {
    const response = await Api.get('users/2')
    expect(response.data.id).toBe(2)
  })

  it('Can GET error', async () => {
    let errors = 0
    try {
      await Api.get('users/200')
    } catch (error) {
      errors++
      expect(error.response.status).toBe(404)
    }
    expect(Api.status).toBe(404)
    expect(Api.message).toBe('Request failed with status code 404')
    expect(errors).toBe(1)
  })

  it('Can POST data', async () => {
    const response = await Api.post('users', {
      'name': 'morpheus',
      'job': 'leader'
    })
    expect(Api.status).toBe(201)
    expect(response.name).toBe('morpheus')
    expect(response.job).toBe('leader')
    expect(response.createdAt).toBeTruthy()
  })

  it('Can PUT data', async () => {
    const response = await Api.put('users', {
      'name': 'morpheus',
      'job': 'zion resident'
    })
    expect(Api.status).toBe(200)
    expect(response.name).toBe('morpheus')
    expect(response.job).toBe('zion resident')
    expect(response.updatedAt).toBeTruthy()
  })

  it('Can DELETE data', async () => {
    await Api.delete('users/2')
    expect(Api.status).toBe(204)
  })

  it('Can GET error message from server', async () => {
    let onErrorCalled = 0
    Api.on('errorCatch', error => {
      onErrorCalled++
      error.response.status = -404
      error.response.data = {
        message
      }
    })
    expect(Api.subscriptions.errorCatch).toBeTruthy()
    let errors = 0
    try {
      await Api.get('users/200')
    } catch (error) {
      errors++
      error.response.status = -404
    }
    expect(errors).toBe(1)
    expect(onErrorCalled).toBe(1)
    expect(Api.status).toBe(-404)
    expect(Api.message).toBe(message)
    Api.on('errorCatch', false)
    expect(Api.subscriptions.errorCatch).toBeFalsy()
  })

  it('Can GET message from server', async () => {
    Api.on('complete', response => {
      response.data.message = message
    })
    let onMessageCalled = 0
    Api.on('message', newMessage => {
      onMessageCalled++
      expect(newMessage).toBe(message)
    })
    expect(Api.subscriptions.message).toBeTruthy()
    await Api.get('users')
    expect(onMessageCalled).toBe(1)
    expect(Api.message).toBe(message)
    Api.on('complete', false)
    Api.on('message', false)
  })

  it('Can GET auth from server', async () => {
    expect(axios.defaults.headers.common['Authorization']).toBeFalsy()

    Api.on('complete', response => {
      response.data.auth = { token }
    })
    let onAuthCalled = 0
    Api.on('auth', data => {
      onAuthCalled++
      expect(data.auth.token).toBe(token)
    })
    expect(Api.subscriptions.auth).toBeTruthy()
    await Api.get('users')
    expect(onAuthCalled).toBe(1)

    expect(axios.defaults.headers.common['Authorization']).toBe('Bearer ' + token)

    Api.on('complete', false)
    Api.on('auth', false)
  })
  */

})
