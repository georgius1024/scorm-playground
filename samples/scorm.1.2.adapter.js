function LMSAPI(objName, sessionId, debug, callbackUrl) 
{
  this.objName = objName;
  this.sessionId = sessionId;
  this.isInitialized = false;
  this.isFinished = false;
  this.isChanged = false;
  this.errorCode = 0;
  this.errorText = '';
  this.debug = debug;
  this.callbackUrl = callbackUrl;
  this.variables = {sessionId: sessionId}; 
  this.changes = {vars: {}};
  this.isWaiting = false;
  this.validator = new scorm12validatorPrototype();

  if (this.debug)
    this.debugMessage('LMSAPI constructor called');
}

LMSAPI.prototype.raiseError = function(code, message)
{
  if (this.debug)
    this.debugMessage('Error #' + code + ' raised with message "' + message + '""');
  this.errorCode = code;
  this.errorText = message;
  if (this.errorCode)
    return "false";
  else
    return "true";
}

LMSAPI.prototype.clearError = function(code, message)
{
  this.errorCode = 0;
  this.errorText = null;
  return "true";
}


LMSAPI.prototype.commAction = function(data)
{
  if (this.debug)
    this.debugMessage('commAction called');
  if (this.callbackUrl)
  {
    data.sessionId = this.sessionId; /// Один элемент в объекте является обязательным
    // Взвожу IsWaiting
    this.isWaiting = true;
    this.requestData = data;
    var r =       
    {
      url: this.callbackUrl, 
      async: false,
      data: data,
      method: 'POST',
      timeout: 10000,
      context: this,
      success: function(data)
      {
        if (this.debug)
          this.debugMessage('commAction successful');
        this.variables = data.vars;
        delete this.requestData;
        this.isWaiting = false;
        if (data.action == 'reload')
        {
          var iX = setTimeout(
            function() 
            {
              clearTimeout(iX);
              location.reload(); //// Тихо перезагружается страница
            }, 
            20
          );
        }
      },
      error: function(XHR, Status)
      {
        this.raiseError(101, 'Request failed. Status: ' + Status );
        if (confirm('Потеряна связь с сервером. Подождать еще 10 секунд?'))
        {
          this.commAction(this.requestData)
        }
      }
    }
    $.ajax(r);
  }
  return "true";
}

LMSAPI.prototype.LMSInitialize = function()
{
  this.clearError();
  if (this.debug)
    this.debugMessage('LMSInitialize called');
  if (this.isInitialized)
    return this.raiseError(101, 'Already Initialized');
  if (this.isFinished)
    return this.raiseError(101, 'Content Instance Terminated');
    
  this.isInitialized = true;
    
  /// Первичная коммуникация, получение начального вектора переменных  
  this.commAction({action:'initialize'});  
  // Дополнительные поля, которые не требуется передавать на сервер и обратно
  this.variables['cmi.core._children'] = 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,exit,session_time';
  this.variables['cmi.core.score._children'] = 'min,max,raw'; 
  this.variables['student.data._children'] = 'mastery_score, max_time_allowed, time_limit_action'; 
  this.variables['cmi.objectives._children'] = 'id,score,status';
  this.variables['cmi.interactions._children'] = '(id,objectives,time,type,correct_responses,weighting,student_response,result,latency';
    
  if (!this.isInitialized)
    return this.raiseError(101, 'General Initialization Failure');
  this.changes = { vars: {}};
  this.isChanged = false;
  return "true";
}

LMSAPI.prototype.LMSFinish = function()
{
  this.clearError();
  if (this.debug)
    this.debugMessage('LMSFinish called');
  if (!this.isInitialized)
    return this.raiseError(301, 'Not initialized');
  if (this.isFinished)
    return "true"; /// Уже закрылись
    
  if (this.isChanged) /// Закрытие сессии с измененными переменными сопровождается их отпракой на сервер
  {
    this.changes.action = 'finalize'
    this.commAction(this.changes); /// Список изменений уходит на сервер вместе с финализацией
    this.isChanged = false;  
    this.changes = { vars: {}};
  }
  else
    this.commAction({action:'finalize'});  /// Первичная коммуникация, получение начального вектора переменных
  this.isFinished = true;
  return "true";
}

LMSAPI.prototype.LMSGetValue = function(element)
{
  this.clearError();
  if (this.debug)
    this.debugMessage('LMSGetValue("' + element + '") called (=' + this.variables[element] + ')');
  if (!this.isInitialized)
    return this.raiseError(301, 'Not initialized');
  if (this.isFinished)
    return this.raiseError(101, 'Content Instance Terminated');
  if (!this.validator.getDataType(element))
    return this.raiseError(201, 'Invalid GetValue argument ' + element);
  if (!this.validator.getDataAvail(element, 'R'))
    return this.raiseError(404, 'Element is write only ' + element);
  if (typeof(this.variables[element]) !== 'undefined')
    return this.variables[element];
  else if (element == 'cmi.objectives._count') /// Обращение ко счетчику objectives
  {
    var maxObjNo = 0;
    for (elem in this.variables) // Просто проверяю все objectives
    {
      var match = elem.match(/^cmi.objectives.(\d+).id$/)
      if (match)
      {
        var objNo = parseInt('0' + match[1], 10);
        if (maxObjNo <= objNo)
          maxObjNo = objNo + 1
      }
    }
    return maxObjNo;
  }
  else if (element.match(/^cmi.objectives.(\d+).score._children$/))
    return 'min,max,raw';
  else if (element == 'cmi.interactions._count') /// Обращение ко счетчику interactions
  {
    var maxObjNo = 0;
    for (elem in this.variables) // Просто проверяю все interactions
    {
      var match = elem.match(/^cmi.interactions.(\d+).id$/)
      if (match)
      {
        var objNo = parseInt('0' + match[1], 10);
        if (maxObjNo <= objNo)
          maxObjNo = objNo + 1
      }
    }
    return maxObjNo;
  }

  else 
    return "";
}

LMSAPI.prototype.LMSSetValue = function(element, value)
{
  this.clearError();
  if (this.debug)
    this.debugMessage('LMSSetValue("' + element + '", "' + value + '") called');
  if (!this.isInitialized)
    return this.raiseError(301, 'Not initialized');
  if (this.isFinished)
    return this.raiseError(101, 'Content Instance Terminated');
  if (!this.validator.getDataType(element))
    return this.raiseError(201, 'Invalid SetValue argument ' + element);
  if (!this.validator.getDataAvail(element, 'W'))
    return this.raiseError(404, 'Element is read only ' + element);
  if (!this.validator.checkDataValid(element, value))
    return this.raiseError(405, 'Incorrect value "' + value + '" for ' + element);
    
  this.isChanged = true;
  this.variables[element + ""] = value + "";
  this.changes.vars[element + ""] = value + "";
  return "true";
}

LMSAPI.prototype.LMSGetLastError = function()
{
  if (this.debug)
    this.debugMessage('LMSGetLastError called');
  return this.errorCode;
}

LMSAPI.prototype.LMSGetErrorString = function()
{
  if (this.debug)
    this.debugMessage('LMSGetErrorString called');
  return this.errorText;
}

LMSAPI.prototype.LMSCommit = function()
{
  this.clearError();
  if (this.debug)
    this.debugMessage('LMSCommit called');
  if (!this.isInitialized)
    return this.raiseError(301, 'Not initialized');
  if (this.isFinished)
    return this.raiseError(101, 'Content Instance Terminated');
  this.commAction(this.changes); /// Список изменений уходит на сервер
  this.isChanged = false;  
  this.changes = { vars: {}};
  return "true";
}


LMSAPI.prototype.LMSGetDiagnostic = function(errorCode)
{
  if (this.debug)
    this.debugMessage('LMSGetDiagnostic called');
  return this.errorCode + ' ' + this.errorText;
}

LMSAPI.prototype.debugMessage = function(message)
{
  console.log(message);
}

/// 2004 API WRAPAROUND
LMSAPI.prototype.Initialize = function()
{
  return this.LMSInitialize();
}

LMSAPI.prototype.Terminate = function()
{
  return this.LMSFinish();
}

LMSAPI.prototype.GetValue = function(element)
{
  return this.LMSGetValue(element);
}

LMSAPI.prototype.SetValue = function(element, value)
{
  return this.LMSSetValue(element, value)
}

LMSAPI.prototype.GetLastError = function()
{
  return this.LMSGetLastError(element);
}

LMSAPI.prototype.GetErrorString = function()
{
  return this.LMSGetDiagnostic(element);
}

LMSAPI.prototype.GetDiagonstic = function()
{
  return this.LMSGetErrorString(element);
}
