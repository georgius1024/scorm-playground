'use strict'
import axios from 'axios'

const Api = {
  http: axios,
  status: '',
  message: false,
  error: false,
  request: false,
  response: false,
  subscriptions: {
  }
}

Api.subscribe = (event, listener, key = '') => {
  if (!Api.subscriptions[event]) {
    Api.subscriptions[event] = []
  }
  Api.subscriptions[event].push({
    listener,
    key
  })
  return true
}

Api.unsubscribe = (event, key = '') => {
  if (!Api.subscriptions[event]) {
    return false
  }
  Api.subscriptions[event] = Api.subscriptions[event].filter(e => e.key !== key)
  if (Api.subscriptions[event].length === 0) {
    delete Api.subscriptions[event]
  }
  return true
}

Api.on = (event, listener, key = '') => {
  if (listener) {
    Api.subscribe(event, listener, key)
  } else {
    Api.unsubscribe(event, key)
  }
}

Api.emit = (event, payload) => {
  if (!Api.subscriptions[event]) {
    return false
  }
  Api.subscriptions[event].forEach(subscription => subscription.listener(payload))
  return true
}

Api.setBaseUrl = (url) => {
  Api.http.defaults.baseURL = url
}

Api.setToken = (token) => {
  Api.http.defaults.headers.common['Authorization'] = 'Bearer ' + token
}

Api.clearToken = () => {
  delete Api.http.defaults.headers.common['Authorization']
}

Api.execute = (request) => {
  return new Promise((resolve, reject) => {
    Api.request = request
    Api.error = false
    Api.message = ''
    Api.status = null
    Api.response = null
    Api.emit('request', request)
    Api.http(request)
      .then(response => {
        Api.response = response
        Api.status = response.status
        Api.emit('complete', response)
        if (response.data) {
          if (response.data.message) {
            Api.emit('message', response.data.message)
            Api.message = response.data.message
          }
          if (response.data.auth) {
            Api.emit('auth', response.data)
            Api.setToken(response.data.auth.token)
          }
        }
        resolve(response.data)
      })
      .catch(error => {
        Api.emit('errorCatch', error)
        Api.message = error.message || 'Общая ошибка'
        Api.status = 900
        if (error.response) {
          if (error.response.data && error.response.data.message) {
            Api.message = error.response.data.message
          }
          Api.status = error.response.status
        }
        Api.error = error
        Api.response = error.response
        Api.emit('error', error)
        reject(error)
      })
  })
}

Api.get = (url) => {
  const request = {
    url,
    method: 'get'
  }
  return Api.execute(request)
}

Api.post = (url, data) => {
  const request = {
    url,
    data,
    method: 'post'
  }
  return Api.execute(request)
}

Api.put = (url, data) => {
  const request = {
    url,
    data,
    method: 'put'
  }
  return Api.execute(request)
}

Api.delete = (url, data) => {
  const request = {
    url,
    data,
    method: 'delete'
  }
  return Api.execute(request)
}

export default Api
