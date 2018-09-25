let production = {
  DEBUG: false,
  APP_NAME: 'SCORM Playground',
  APP_ID: 'scorm',
  API_URL: '/api/',
  APP_VERSION: '0.0.0.0',
  APP_COPYRIGHT: '© 1999, 2018 Агентство ВЭП'
}

let development = Object.assign({}, production, {
  DEBUG: true,
  API_URL: 'http://localhost:3300/api/'
})

let test = Object.assign({}, development)

let config = {
  development,
  test,
  production
}

let env = process.env.NODE_ENV || 'development'
export default config[env]
