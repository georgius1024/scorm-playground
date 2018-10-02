import Scorm12Validator from './scorm.1.2.validator'

class Scorm12Adapter {
  constructor (objName, sessionId, debug, callback) {
    this.objName = objName
    this.sessionId = sessionId
    this.isInitialized = false
    this.isFinished = false
    this.isChanged = false
    this.errorCode = 0
    this.errorText = ''
    this.debug = debug
    this.callback = callback
    this.variables = {sessionId}
    this.changes = {vars: {}}
    this.validator = new Scorm12Validator()

    if (this.debug) {
      this.debugMessage('LMSAPI constructor called')
    }
  }

  raiseError (code, message) {
    if (this.debug) {
      this.debugMessage('Error #' + code + ' raised with message "' + message + '""')
    }
    this.errorCode = code
    this.errorText = message
    if (this.errorCode) {
      return 'false'
    } else {
      return 'true'
    }
  }

  clearError () {
    this.errorCode = 0
    this.errorText = null
    return 'true'
  }

  commAction (action, data) {
    if (this.debug) {
      this.debugMessage('commAction called')
    }
    if (this.callback) {
      const newVars = this.callback(this.objName, this.sessionId, action, data)
      this.variables = Object.assign(this.variables, newVars)
    }
    return 'true'
  }

  LMSInitialize () {
    this.clearError()
    if (this.debug) {
      this.debugMessage('LMSInitialize called')
    }
    if (this.isInitialized) {
      return this.raiseError(101, 'Already Initialized')
    }
    if (this.isFinished) {
      return this.raiseError(101, 'Content Instance Terminated')
    }
    this.isInitialized = true

    // Первичная коммуникация, получение начального вектора переменных
    this.commAction('initialize')
    // Дополнительные поля, которые не требуется передавать на сервер и обратно
    this.variables['cmi.core._children'] = 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,exit,session_time'
    this.variables['cmi.core.score._children'] = 'min,max,raw'
    this.variables['student.data._children'] = 'mastery_score, max_time_allowed, time_limit_action'
    this.variables['cmi.objectives._children'] = 'id,score,status'
    this.variables['cmi.interactions._children'] = '(id,objectives,time,type,correct_responses,weighting,student_response,result,latency'

    if (!this.isInitialized) {
      return this.raiseError(101, 'General Initialization Failure')
    }
    this.changes = {vars: {}}
    this.isChanged = false
    return 'true'
  }

  LMSFinish () {
    this.clearError()
    if (this.debug) {
      this.debugMessage('LMSFinish called')
    }
    if (!this.isInitialized) {
      return this.raiseError(301, 'Not initialized')
    }
    if (this.isFinished) {
      return 'true' /// Уже закрылись
    }

    if (this.isChanged) { /// Закрытие сессии с измененными переменными сопровождается их отпракой на сервер
      this.LMSCommit()
    }
    this.commAction('finalize')  /// Первичная коммуникация, получение начального вектора переменных
    this.isFinished = true
    return 'true'
  }

  LMSGetValue (element) {
    this.clearError()
    if (this.debug) {
      this.debugMessage('LMSGetValue("' + element + '") called (=' + this.variables[element] + ')')
    }
    if (!this.isInitialized) {
      return this.raiseError(301, 'Not initialized')
    }
    if (this.isFinished) {
      return this.raiseError(101, 'Content Instance Terminated')
    }
    if (!this.validator.getDataType(element)) {
      return this.raiseError(201, 'Invalid GetValue argument ' + element)
    }
    if (!this.validator.getDataAvail(element, 'R')) {
      return this.raiseError(404, 'Element is write only ' + element)
    }
    if (typeof this.variables[element] !== 'undefined') {
      return this.variables[element]
    } else if (element === 'cmi.objectives._count') { // Обращение ко счетчику objectives
      let maxObjNo = 0
      for (let elem in this.variables) { // Просто проверяю все objectives
        if (this.variables.hasOwnProperty(elem)) {
          const match = elem.match(/^cmi.objectives.(\d+).id$/)
          if (match) {
            const objNo = parseInt('0' + match[1], 10)
            if (maxObjNo <= objNo) {
              maxObjNo = objNo + 1
            }
          }
        }
      }
      return maxObjNo
    } else if (element.match(/^cmi.objectives.(\d+).score._children$/)) {
      return 'min,max,raw'
    } else if (element === 'cmi.interactions._count') { // Обращение ко счетчику interactions
      let maxObjNo = 0
      for (let elem in this.variables) { // Просто проверяю все interactions
        if (this.variables.hasOwnProperty(elem)) {
          const match = elem.match(/^cmi.interactions.(\d+).id$/)
          if (match) {
            const objNo = parseInt('0' + match[1], 10)
            if (maxObjNo <= objNo) {
              maxObjNo = objNo + 1
            }
          }
        }
      }
      return maxObjNo
    } else {
      return ''
    }
  }

  LMSSetValue (element, value) {
    this.clearError()
    if (this.debug) {
      this.debugMessage('LMSSetValue("' + element + '", "' + value + '") called')
    }
    if (!this.isInitialized) {
      return this.raiseError(301, 'Not initialized')
    }
    if (this.isFinished) {
      return this.raiseError(101, 'Content Instance Terminated')
    }
    if (!this.validator.getDataType(element)) {
      return this.raiseError(201, 'Invalid SetValue argument ' + element)
    }
    if (!this.validator.getDataAvail(element, 'W')) {
      return this.raiseError(404, 'Element is read only ' + element)
    }
    if (!this.validator.checkDataValid(element, value)) {
      return this.raiseError(405, 'Incorrect value "' + value + '" for ' + element)
    }
    this.isChanged = true
    this.variables[element + ''] = value + ''
    this.changes.vars[element + ''] = value + ''
    return 'true'
  }

  LMSGetLastError () {
    if (this.debug) {
      this.debugMessage('LMSGetLastError called')
    }
    return this.errorCode
  }

  LMSGetErrorString () {
    if (this.debug) {
      this.debugMessage('LMSGetErrorString called')
    }
    return this.errorText
  }

  LMSCommit () {
    this.clearError()
    if (this.debug) {
      this.debugMessage('LMSCommit called')
    }
    if (!this.isInitialized) {
      return this.raiseError(301, 'Not initialized')
    }
    if (this.isFinished) {
      return this.raiseError(101, 'Content Instance Terminated')
    }
    this.commAction('commit', this.changes.vars) /// Список изменений уходит на сервер
    this.isChanged = false
    this.changes = {vars: {}}
    return 'true'
  }

  LMSGetDiagnostic () {
    if (this.debug) {
      this.debugMessage('LMSGetDiagnostic called')
    }
    return this.errorCode + ' ' + this.errorText
  }

  debugMessage (message) {
    console.log(message)
  }

  /// 2004 API WRAPAROUND
  Initialize () {
    return this.LMSInitialize()
  }

  Terminate () {
    return this.LMSFinish()
  }

  GetValue (element) {
    return this.LMSGetValue(element)
  }

  SetValue (element, value) {
    return this.LMSSetValue(element, value)
  }

  GetLastError () {
    return this.LMSGetLastError()
  }

  GetErrorString () {
    return this.LMSGetErrorString()
  }

  GetDiagonstic () {
    return this.LMSGetDiagnostic()
  }
}

export default Scorm12Adapter
