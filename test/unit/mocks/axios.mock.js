/**
 * Created by georgius on 22.08.18.
 */
const mockAxios = function () {
  if (mockAxios.mockError) {
    return Promise.reject(mockAxios.mockError)
  } else {
    return Promise.resolve(mockAxios.mockResponse)
  }

}
mockAxios.defaults = {
  baseURL: '',
  headers: {
    common: {
    }
  }
}
mockAxios.mockResponse = {
  status: 200
}
mockAxios.mockError = false

export default mockAxios