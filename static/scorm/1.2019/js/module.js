/*
SDO BBT Learning Module Controller.
Copyright (c) 2016, VEP LLC. All rights reserved.
Created by Yuri Timofeev, it@vep.ru
This is a commercial software, can be distributed 
as a part of SCORM modules, created with SDO BBT.
SCORM version: 1.2
*/

// 1) Global SCORM controller
var config = {};
config.version = "1.2";
config.debug = false;
config.useCompression = true;
var scorm = pipwerks.SCORM;

// 2) Global module sequence data
var module;
var moduleSequence = new Array();
var currentSlideNo = 0;
var globalStatusExpected = 'incomplete'

// 3) Persistent data storage
var persistentData = {};
var latencyCookie  = 'insavedLatency';
var testingAutosavePeriod = 3;

// 4) Variables for testing procedure 
var currentTestingSlide     = false;
var testingSequence         = new Array();
var currentQuestionNo       = -1;
var testingSessionStarted   = 0;
var testingSessionTimeUsed  = 0;
var sessionMaximalDuration  = 0;
var sessionInfoTimer        = 0;
var lastPersistentStateTime = 0;

// 5) Status text constants
var passedStr = 'passed';
var failedStr = 'failed';
var completeStr = 'complete';
var incompleteStr = 'incomplete';
var not_attemptedStr = 'not attempted';


function initModule(moduleXmlUrl)
{
  $.ajax(
  {
    type: "GET",
    url: moduleXmlUrl,
    dataType: "xml",
    async: false,
    success: xmlParser
  }
  );
  latencyCookie += module.id;
  globalStatusExpected = scorm.get('cmi.core.lesson_status');
  
  // Convert structure to moduleSequence
  if (!$.isArray(persistentData['main']))
    persistentData['main'] = new Array();
  for(var sectionNo = 0; sectionNo < module.section.length; sectionNo++)
  {
    var section = module.section[sectionNo];
    for(var slideNo = 0; slideNo < section.content.length; slideNo++)
    {
      var slide = section.content[slideNo];
      slide.sectionId = section.id;
      slide.sectionNo = sectionNo;
      moduleSequence.push(slide);
    }
  }
  var lessonLocation =  parseInt('0' + scorm.get("cmi.core.lesson_location"), 10); 
  if (isNaN(lessonLocation))
   lessonLocation = 0;
  gotoSlide(lessonLocation)
}


function showContentSlide(currentSlide)
{
  setupModuleNavgation();
  $('#testingOverlay').hide();
  $('#testingContainer').hide();
  if (currentSlide.href)
    $('#slideContents').load(currentSlide.href)
  else
    $('#slideContents').html(currentSlide.body)
  $('#slideContainer').show();
  if (currentSlide.objective_id)
    objectives.setStatus(currentSlide.objective_id, passedStr);
  checkModuleObjectives();
}

function showTestingSlide(currentSlide)
{
  setupModuleNavgation();
  $('#testingOverlay').hide();
  $('#testingContainer').show();
  $('#testingIntroContainer').hide();
  $('#questionContainer').hide();
  $('#testingReportContainer').hide();
  $('#slideContainer').hide();
  
  currentTestingSlide = currentSlide;
  testingSessionStarted = new Date().getTime();  

  if (currentTestingSlide.config.time_limit > 0 )
    sessionMaximalDuration = currentTestingSlide.config.time_limit * 1000; // Сколько мы имеем времени в миллисекундах
  else
    sessionMaximalDuration = 0;
  
  // Testing procedure depends on current testing ststus (stored in objectives)
  var testObjectiveId = currentTestingSlide.objective_id;
  var status = objectives.getStatus(testObjectiveId);
  
  switch(status)
  {
    case '':
      status = not_attemptedStr;
      objectives.setStatus(testObjectiveId, status);
    case not_attemptedStr:
      createNewTestingSession();
      showTestingIntro() 
      break;
    case incompleteStr:
      resumeTestingSession() 
      findNextQuestion(); 
      startTestingTimers(); 
      break;
    case passedStr:
    case failedStr:
      stopTestingTimers();
      showTestingReport(); 
      break;
  }
  checkModuleObjectives();
}

function createNewTestingSession()
{
  testingSequence = new Array();
  currentQuestionNo = -1;
  for(var sectionNo = 0; sectionNo < currentTestingSlide.testsection.length; sectionNo++)
  {
    section = currentTestingSlide.testsection[sectionNo];
    for(var itemNo = 0; itemNo < section.testquestion.length; itemNo++)
    {
      var question = section.testquestion[itemNo];
      question.sectionId = section.id;
      question.sectionNo = sectionNo;
      question.hasBeenExposed  = false;
      question.hasBeenAnswered = false;
      question.answerMask      = -1;
      question.latency         = 0;
      testingSequence.push(question);
    }
  }

  // Sorting & slicing
  if (currentTestingSlide.config.size_limit > 0 || currentTestingSlide.config.shuffle == '1') 
  {
    testingSequence.shuffle();
    if (currentTestingSlide.config.size_limit && currentTestingSlide.config.size_limit < testingSequence.length)
      testingSequence = testingSequence.slice(0, currentTestingSlide.config.size_limit); // Take a part of whole array as testingSequence
  }
  
  if (testingSequence.length == 0)
    handleError('Тест пустой, нет вопросов. Тестирование невозможно');
  
  // Reset testing time
  testingSessionTimeUsed = 0;
  deleteCookie(latencyCookie);
}

function makeTestingSessionPersistent()
{
  // Store to persistent data
  persistentData[currentTestingSlide.id] = new Array();
  for (var i = 0; i < testingSequence.length; i++)
  {
    var o = [testingSequence[i].id, testingSequence[i].answerMask, testingSequence[i].latency]
    persistentData[currentTestingSlide.id].push(o);
  }
  // Save time used
  var currentTime = new Date().getTime()
  var latency = currentTime - testingSessionStarted + testingSessionTimeUsed;
  var o = ['stu', '', latency]
  persistentData[currentTestingSlide.id].push(o);

  lastPersistentStateTime = new Date().getTime();
  deleteCookie(latencyCookie);
  
  savePersistent(true);
}

function showTestingIntro() 
{
  var message = new Array();
  message.push('<p>Сейчас Вам предстоит пройти тестирование <b>"' + currentTestingSlide.title + '"</b></p>');
  if (currentTestingSlide.testsection.length > 1)
  {
    message.push('<p>В ходе тестирования Вам будут заданы ' + testingSequence.length + ' вопроса(-ов) по следующим темам:');

    var sections = new Array();
    for(var sectionNo = 0; sectionNo < currentTestingSlide.testsection.length; sectionNo++)
    {
      section = currentTestingSlide.testsection[sectionNo];
      sections.push('<li>' + section.title + '</li>');
    }
    message.push('<ul>' + sections.join("\n") + '</ul></p>');
  }
  else
    message.push('<p>В ходе тестирования Вам будут заданы ' + testingSequence.length + ' вопроса(-ов)</p>');
  if (currentTestingSlide.config.master_rate)
  {
    var minQuestions = Math.ceil(currentTestingSlide.config.master_rate * testingSequence.length / 100);
    message.push('<p>Для успешного прохождения этого тестирования <b>необходимо</b> правильно ответить не менее, чем на ' + minQuestions + ' вопроса(-ов).</p>');
  }
  if (module.config.master_rate && module.config.master_rate != currentTestingSlide.config.master_rate)
  {
    var minQuestions = Math.ceil(module.config.master_rate * testingSequence.length / 100);
    message.push('<p>Для успешного прохождения всего модуля <b>рекомендуется</b> правильно ответить не менее, чем на ' + minQuestions + ' вопроса(-ов).</p>');
  }
  if (currentTestingSlide.config.time_limit > 0)
  {
    var minutes = Math.floor(currentTestingSlide.config.time_limit / 60)
    var seconds = currentTestingSlide.config.time_limit % 60;
    if (currentTestingSlide.config.time_limit >= 180 || seconds == 0)
      message.push('<p>В Вашем распоряжении ' + minutes + ' мин.</p>');
    else if (currentTestingSlide.config.time_limit > 60)
      message.push('<p>В Вашем распоряжении ' + minutes + ' мин. ' + seconds + ' сек.</p>');
    else 
      message.push('<p>В Вашем распоряжении ' + seconds + ' сек.</p>');
  }
  if (currentTestingSlide.config.hints == '1')
    message.push('<p>В ходе тестирования Вам будут доступны подсказки. Пользуйтесь этим.</p>');

  if (currentTestingSlide.config.attempts == 0)  
    message.push('<p>Количество попыток неограничено.</p>');
  else if (currentTestingSlide.config.attempts == 1)  
    message.push('<p>У Вас будет одна попытка.</p>');
  else if (currentTestingSlide.config.attempts > 1)  
    message.push('<p>Вам предоставлено попыток: ' + currentTestingSlide.config.attempts + '</p>');
  var usedAttempts = getUsedAttempts(currentTestingSlide.id)
  if (usedAttempts > 0)
    message.push('<p>Вами было использовано попыток: ' + usedAttempts + '</p>');
  
    
  $('#testingIntroContents').html(message.join("\n"));
  $('#testingIntroContainer').show();
  setupModuleNavgation();
  setNextButtonStartTesting(); 
}

function getUsedAttempts(id)
{
  if (typeof(persistentData['attempts']) == 'undefined')
    persistentData['attempts'] = {};
  if (typeof(persistentData['attempts'][id]) == 'undefined')  
    persistentData['attempts'][id] = 0
  return persistentData['attempts'][id];
}

function addUsedAttempts(id)
{
  var lastValue = getUsedAttempts(id);
  persistentData['attempts'][id] += 1;
  return lastValue;
}

function startTesting()
{
  $('#testingIntroContainer').hide();
  testingSessionStarted = new Date().getTime();  
  makeTestingSessionPersistent(); 
  addUsedAttempts(currentTestingSlide.id);
  var testObjectiveId = currentTestingSlide.objective_id;
  objectives.setStatus(testObjectiveId, incompleteStr); // Testing status is now incomplete
  globalStatusExpected = incompleteStr; // Set module status to incomplete and awaiting for testing result
  showTestingSlide(currentTestingSlide);
}

function startNewAttempt()
{
  var testObjectiveId = currentTestingSlide.objective_id;
  // Testing objective, partial section objectives is now not attempted
  objectives.setStatus(testObjectiveId, not_attemptedStr);
  for(var sectionNo = 0; sectionNo < currentTestingSlide.testsection.length; sectionNo++)
  {
    var section = currentTestingSlide.testsection[sectionNo];
    var sectionObjectiveId = section.objective_id;
    var objectiveStatus = objectives.getStatus(sectionObjectiveId);
    if (objectiveStatus !== '') // Only if objective status has been already set
      objectives.setStatus(sectionObjectiveId, not_attemptedStr);
  }
  // global module status is now incomplete
  globalStatusExpected = incompleteStr; 
  persistentData['savedSession'] =  persistentData[currentTestingSlide.id]; // Make a copy of current session data
  showTestingSlide(currentTestingSlide);
}

function resumeTestingSession()
{
  if (testingSequence.length == 0) // Only if current sequence is empty, because page is reloaded or new attempt started
  {
    testingSequence        = new Array();
    currentQuestionNo      = -1;
    // All testing session data stored in module persistent object. 
    var list = persistentData[currentTestingSlide.id];
    if (!$.isArray(list))
      list = new Array();
    for(i = 0; i < list.length; i++)
    {
      var item = list[i];
      var questionId = item[0];
      var answerMask = item[1];
      var latency    = item[2]

      if (questionId == 'stu') // Session time, msec
        testingSessionTimeUsed = latency;
      else // Reqular question
      {
        var found = false;
        for(var sectionNo = 0; sectionNo < currentTestingSlide.testsection.length; sectionNo++)
        {
          section = currentTestingSlide.testsection[sectionNo];
          for(var itemNo = 0; itemNo < section.testquestion.length; itemNo++)
          {
            var question = section.testquestion[itemNo];
            if (question.id == questionId)
            {
              question.answerMask = answerMask;
              question.latency    = latency;
              question.hasBeenAnswered = (question.answerMask !== -1)
              
              question.sectionId = section.id;
              question.sectionNo = sectionNo;
              testingSequence.push(question);
              found = true; //
            }
            if (found)
              break;
          } /// section.testquestion
          if (found)
            break;
        } // currentTestingSlide.testsection
      }
    }
    
    var currentTime = new Date().getTime();
    var unsavedLatency = parseInt(getCookie(latencyCookie));
    if (!isNaN(unsavedLatency)) // Unsaved period stored in cookies.
    {
      testingSessionTimeUsed += unsavedLatency;
      makeTestingSessionPersistent(); // Immediatelly save session
    }
    lastPersistentStateTime = currentTime;
  }
}

function findNextQuestion()
{
  // Pass 1 from current positon to the end
  for (var next = currentQuestionNo + 1; next < testingSequence.length; next++)
  {
    if (!testingSequence[next].hasBeenAnswered)
      return gotoQuestion(next); 
  }
  // Pass 2 from begin to current positon
  for (var next = 0; next < currentQuestionNo; next++)
  {
    if (!testingSequence[next].hasBeenAnswered)
      return gotoQuestion(next); 
  }
  // In this point there no unanswered questions before and after current positon. Let's try check current one
  if (currentQuestionNo == -1 || testingSequence[currentQuestionNo].hasBeenAnswered)
    return testingComplete(); // 
}

function gotoQuestion(no)
{
  hideResponseMessageInstantly() // Remove instant response
  currentQuestionNo = no;
  currentQuestion = testingSequence[currentQuestionNo];
  if (!currentQuestion.hasBeenExposed)
  {
    currentQuestion.hasBeenExposed = true;
    currentQuestion.firstExposed = new Date().getTime();
  }
  
  $('#questionHeader').html(currentQuestion.title);
  // Html addon to question 
  if (currentQuestion.addon_href || currentQuestion.addon_body)
  {
    if (currentQuestion.addon_href)
      $('#questionAddon').load(currentQuestion.addon_href);
    if (currentQuestion.addon_body)
      $('#questionAddon').html(currentQuestion.addon_body);
    $('#questionAddon').removeClass('hidden');
  }
  else
    $('#questionAddon').addClass('hidden');
  
  // List of options to choose (radio)
  var options = new Array();
  for(var answerNo = 0; answerNo < currentQuestion.answer.length; answerNo++)
  {
    var option = 
      '<label ACCESSKEY="' + (answerNo + 1) + '" ' + (currentQuestion.hasBeenAnswered?'disabled':'') + ' ' + 
          'ondblclick="saveAnswer(' + (answerNo) + ')"> ' + 
        '<input id="A' + (answerNo) + '" type=radio name="ANSWER" ' + (currentQuestion.answerMask == answerNo?'checked':'') +  ' ' + 
          (currentQuestion.hasBeenAnswered?'disabled':'') + ' ' + 
            'value="' + (answerNo) + '"> ' + 
         (currentQuestion.answer[answerNo]) + 
      '</label>';
    options.push(option)
  }
  $('#questionAnswers').html(options.join('<br>'));
  // Take care about hint 
  if (currentTestingSlide.config.hints == 1  && (currentQuestion.hint_href || currentQuestion.hint_body))
  {
    $('#questionHintPanel').removeClass('hidden');
    if (currentQuestion.hint_href)
      $('#questionHint').load(currentQuestion.hint_href);
    if (currentQuestion.hint_body)
      $('#questionHint').html(currentQuestion.hint_body);
  }
  else
  {
    $('#questionHintPanel').addClass('hidden');
  }
  
  displayCurrentTestingPosition()
  
  if (currentTestingSlide.config.skip_questions == 1)
    $('#btnSkip').removeClass('hidden');
  
  $('#questionContainer').show();
  $('#testingOverlay').show();
  $('#testingContainer').show();
  
  document.onEnterKeyUp = saveAnswerIfAny;
  document.onEscKeyUp = skipQuestion;
}

function displayCurrentTestingPosition()
{
  $('#testPositionInfo').removeClass('hidden');
  var testingStatus = new Array();
  var usedAttempts = getUsedAttempts(currentTestingSlide.id);

  testingStatus.push('Идет тестирование "' + currentTestingSlide.title + '"');
  
  if (currentTestingSlide.config.attempts != 0)  
    testingStatus.push('попытка ' + usedAttempts + ' из ' + currentTestingSlide.config.attempts);
  else
    testingStatus.push('попытка ' + usedAttempts);
  
  testingStatus.push('вопрос ' + (currentQuestionNo + 1) +  ' из ' + testingSequence.length);
  $('#testPositionInfo').html(testingStatus.join('; '))
}


function skipQuestion()
{
  if (currentTestingSlide.config.skip_questions == 1)
    findNextQuestion();
}

function saveAnswerIfAny()
{
  var no = parseInt(document.forms['question'].ANSWER.value);
  saveAnswer(no);
}

function saveAnswer(no)
{
  hideResponseMessageInstantly() // Remove instant response
  if (no < 0 || isNaN(no) || no > 10)
  {
    no = parseInt(document.forms['question'].ANSWER.value);
    if (isNaN(no))
    {
      $('#responseMessage').html('Пожалуйста, выберите вариант ответа!');
      $('#responseDialog').modal('show');
      hideResponseTimeout = setTimeout(hideResponseMessage, 3000)
      return;
    }
  }
  currentQuestion = testingSequence[currentQuestionNo];
  if (!currentQuestion.hasBeenAnswered) /// Accept and register answer
  {
    if (currentQuestion.hasBeenExposed)
    {
      var currentTime = new Date().getTime()
      currentQuestion.latency = currentTime - currentQuestion.firstExposed;
    }
    // Mark question as answerer and store data
    currentQuestion.hasBeenAnswered = true;
    currentQuestion.answerMask = no;
    makeTestingSessionPersistent();
    if (currentQuestion.objective_id)
    {
      if (currentQuestion.answerMask == currentQuestion.mask)
        objectives.setStatus(currentQuestion.objective_id, passedStr);
      else
        objectives.setStatus(currentQuestion.objective_id, failedStr);
    }

    // If immediate response is configured so feedback is may ne required
    if (
         currentTestingSlide.config.immediate_response_when_correct == 1 && 
         currentQuestion.answerMask == currentQuestion.mask
       )
    {
      if (currentTestingSlide.config.immediate_response_correct_message)
        return showResponseMessage(currentTestingSlide.config.immediate_response_correct_message) //Ай нанэ, нанэ!
      else
        return showResponseMessage('Правильно!')
    }
    // If immediate response is configured so feedback is may ne required
    if (
         currentTestingSlide.config.immediate_response_when_wrong == 1 && 
         currentQuestion.answerMask != currentQuestion.mask
       )
    {
      if (currentTestingSlide.config.immediate_response_wrong_message)
        return showResponseMessage(currentTestingSlide.config.immediate_response_wrong_message) //Ой, батюшки!
      else
        return showResponseMessage('Неправильно!')
    }
  }
  findNextQuestion();
}
var hideResponseTimeout;
function showResponseMessage(msg)
{
  $('#responseDialog').on('hide.bs.modal', function (e) 
  {
    findNextQuestion();
  })
  $('#responseMessage').html(msg);
  $('#responseDialog').modal('show');
  hideResponseTimeout = setTimeout(hideResponseMessage, 3000)
}

function hideResponseMessage()
{
  clearTimeout(hideResponseTimeout);
  $('#responseDialog').modal('hide');  
  $('#responseDialog').off('hide.bs.modal');
}

function hideResponseMessageInstantly() // Remove instant response right now
{
  clearTimeout(hideResponseTimeout);
  $('#responseDialog').off('hide.bs.modal');
  $('#responseDialog').modal('hide');  
}

function hideResponseMessageSoftly() // Remove instant response after delay
{
  clearTimeout(hideResponseTimeout);
  $('#responseDialog').off('hide.bs.modal');
}

function computeTestingHitsandMisses() // Sum results of wrong/correcnt answers to session and its sections
{
  // Initializing score variables in slide and sections
  currentTestingSlide.hits    = 0;
  currentTestingSlide.misses  = 0;
  currentTestingSlide.skipped = 0;
  for(var sectionNo = 0; sectionNo < currentTestingSlide.testsection.length; sectionNo++)
  {
    var section = currentTestingSlide.testsection[sectionNo];
    section.hits    = 0;
    section.misses  = 0;
    section.skipped = 0;
  }
  
  // Summarize answers
  for (var i = 0; i < testingSequence.length; i++)
  {
    section = currentTestingSlide.testsection[testingSequence[i].sectionNo];
    if (testingSequence[i].answerMask == testingSequence[i].mask)
    {
      section.hits++;
      currentTestingSlide.hits++;
    }
    else
    {
      section.misses++;
      currentTestingSlide.misses++;
    }
    if (testingSequence[i].answerMask == -1)
    {
      section.skipped++;
      currentTestingSlide.skipped++;
    }
  }
}

function computeTestingObjectivesStatus()
{
  // Compare score for whole testing andf sections with master rate and choose new objective status
  var minRate = currentTestingSlide.config.master_rate;
  // Main testing objective
  var testObjectiveId = currentTestingSlide.objective_id;
  var total = currentTestingSlide.hits + currentTestingSlide.misses;
  var rate = currentTestingSlide.hits * 100 / total;
  if (minRate <= rate)
    objectives.setStatus(testObjectiveId, passedStr);
  else
    objectives.setStatus(testObjectiveId, failedStr);
  objectives.setScore(testObjectiveId, 0, total, currentTestingSlide.hits);
  
  // Section objectives
  for(var sectionNo = 0; sectionNo < currentTestingSlide.testsection.length; sectionNo++)
  {
    var section = currentTestingSlide.testsection[sectionNo];
    var sectionObjectiveId = section.objective_id
    var total = section.hits + section.misses;
    var rate = section.hits * 100 / total;
    if (minRate <= rate)
      objectives.setStatus(sectionObjectiveId, passedStr);
    else
      objectives.setStatus(sectionObjectiveId, failedStr);
    objectives.setScore(sectionObjectiveId, 0, total, section.hits);
  }

}

function testingComplete()
{
  var minRate = currentTestingSlide.config.master_rate;
  
  // Save last attempt score
  var testObjectiveId = currentTestingSlide.objective_id;
  lastScoreRaw = parseInt('0' + objectives.getScore(testObjectiveId), 10);
  lastScoreMax = parseInt('0' + objectives.getScoreMax(testObjectiveId), 10);
  
  computeTestingHitsandMisses(); 
  
  // Compare present and previous score
  if (lastScoreMax && currentTestingSlide.hits <= lastScoreRaw) // Not improved
  {
    // Restore everithyng (except attempts counter)
    persistentData[currentTestingSlide.id] = persistentData['savedSession']; // Restore previous session 
    testingSequence = []; 
    resumeTestingSession(); // ...and questions
    computeTestingHitsandMisses();  // ...and scores
    computeTestingObjectivesStatus(); // ...and objective status
    scorm.computeSessionTime();
    scorm.save(); // ...save everything
    showTestingSlide(currentTestingSlide);
    shortPopupMessage('Прежний результат не был улучшен - неудачная попытка не засчитывается.') // ...notify user on unsuccessful attempt
    return; // ...and exit
  }
  delete persistentData['savedSession']; // Remove a stored copy of current session
  computeTestingObjectivesStatus();
  scorm.computeSessionTime();
  scorm.save();
  showTestingSlide(currentTestingSlide);
}

function showTestingReport() 
{
  checkModuleObjectives();
  
  hideResponseMessageSoftly() // Remove instant response
  
  $('#testingReportContainer').show();  
  $('#questionContainer').hide();
  $('#testingIntroContainer').hide();

  resumeTestingSession();

  var testObjectiveId = currentTestingSlide.objective_id;
  currentTestingSlide.hits = parseInt(objectives.getScore(testObjectiveId));
  currentTestingSlide.misses = parseInt(objectives.getScoreMax(testObjectiveId)) - currentTestingSlide.hits;
  currentTestingSlide.objectiveStatus = objectives.getStatus(testObjectiveId);
  currentTestingSlide.skipped = 0;
  for (var i = 0; i < testingSequence.length; i++)
  {
    if (!testingSequence[i].hasBeenAnswered)
      currentTestingSlide.skipped++;
  }

  for(var sectionNo = 0; sectionNo < currentTestingSlide.testsection.length; sectionNo++)
  {
    var section = currentTestingSlide.testsection[sectionNo];
    var sectionObjectiveId = section.objective_id
    section.hits    = parseInt(objectives.getScore(sectionObjectiveId));
    section.misses  = parseInt(objectives.getScoreMax(sectionObjectiveId)) - section.hits;
    section.objectiveStatus = objectives.getStatus(sectionObjectiveId);
    section.skipped = 0;
  }

  var report = new Array();
  
  function addFact(factTitle, factText, className)
  {
    if (!className)
      className = '';
    report.push('<dt>' + factTitle + '</dt><dd class="' + className + '">' + factText + '</dd>');
  }
  report.push('<dl class="dl-horizontal">');
  if (currentTestingSlide.config.show_report == 'off')
  {
    if (currentTestingSlide.objectiveStatus == passedStr)
      addFact('Результат', '<i class="glyphicon glyphicon-ok"></i> пройдено', 'text-primary')
    else
      addFact('Результат', '<i class="glyphicon glyphicon-remove"></i> не пройдено', 'text-warning')
  }
  else if (
      currentTestingSlide.config.show_report == 'score' || 
      currentTestingSlide.config.show_report == 'errors')
  {
    var score = Math.floor(currentTestingSlide.hits * 100 / (currentTestingSlide.hits + currentTestingSlide.misses));
    report.push('<dl class="dl-horizontal">');
    addFact('Всего вопросов', currentTestingSlide.hits + currentTestingSlide.misses);
    addFact('Правильные ответы', currentTestingSlide.hits);
    addFact('Неправильные ответы', currentTestingSlide.misses);
    if (currentTestingSlide.skipped)
      addFact('Из них пропущеные', currentTestingSlide.skipped);
    
    addFact('Рейтинг', score + '%');
    var minRate = currentTestingSlide.config.master_rate;
    if (minRate)
      addFact('Условие прохождения', minRate + '%');
    if (currentTestingSlide.objectiveStatus == passedStr)
      addFact('Результат', '<i class="glyphicon glyphicon-ok"></i> пройдено', 'text-primary')
    else
      addFact('Результат', '<i class="glyphicon glyphicon-remove"></i> не пройдено', 'text-warning')
    
    if (currentTestingSlide.testsection.length > 1)
    { 
      report.push('</dl>');
      report.push('<h4>Результаты по подразделам</h4>');
      report.push('<dl class="dl-horizontal">');
      for(var sectionNo = 0; sectionNo < currentTestingSlide.testsection.length; sectionNo++)
      {
        var section = currentTestingSlide.testsection[sectionNo];
        if (section.objectiveStatus == passedStr)
          addFact(section.title, '<i class="glyphicon glyphicon-ok"></i> пройдено: ' + section.hits + ' из ' + (section.hits + section.misses), 'text-primary')
        else
          addFact(section.title, '<i class="glyphicon glyphicon-remove"></i> не пройдено: ' + section.hits + ' из ' + (section.hits + section.misses), 'text-warning')
      }
    }
  }
  report.push('</dl>');
  
  
  if (currentTestingSlide.config.show_report == 'errors' && currentTestingSlide.misses > currentTestingSlide.skipped) // Список ошибок
  {
    report.push('<h4>Вопросы, на которые не были даны правильные ответы</h4>');
    report.push('<ul>');
    for (var i = 0; i < testingSequence.length; i++)
    {
      if (testingSequence[i].answerMask != testingSequence[i].mask && testingSequence[i].hasBeenAnswered)
      {
        report.push('<li>' + testingSequence[i].title +'</li>');
      }
    }
    report.push('</ul>');
  }
  
  if (currentTestingSlide.misses) // Deal with attempts only if there some errors, so score may be improved
  {
    var usedAttempts = getUsedAttempts(currentTestingSlide.id)
    if (
        currentTestingSlide.config.attempts == 0 || 
        usedAttempts < currentTestingSlide.config.attempts
        )
    {
      report.push('<h4>Попытки</h4>');
      report.push('<p>Вы можете пройти тестирование снова, попытавшись улучшить достигнутый результат</p>');
      if (currentTestingSlide.config.attempts > 1)
      {
        var unusedAttemts = currentTestingSlide.config.attempts - usedAttempts;
        report.push('<p>У Вас остались неиспользованные попытки: ' + unusedAttemts + '</p>');
      }
      report.push('<p><button type="button" onclick="startNewAttempt()" class="btn btn-primary btn-lg"><i class="glyphicon glyphicon-ok-sign"></i> Новая попытка</button></p>');
    }
    else if (currentTestingSlide.config.attempts)  
    {
      report.push('<h4>Попытки</h4>');
      report.push('<p>Все Ваши попытки исчерпаны</p>');
    }
  }
  else if (currentTestingSlide.skipped == 0)
    report.push('<h4>Отличный результат! <small>Вы прошли тестирование без ошибок</small></h4>');
  
  $('#testingReport').html(report.join(' '));
  setupModuleNavgation();
}

function startTestingTimers()
{
  sessionInfoTimer  = setInterval(testingTimerEvent, 1000 * 1);
  testingTimerEvent();
}

function stopTestingTimers()
{
  if (sessionInfoTimer)
  {
    clearInterval(sessionInfoTimer);
    sessionInfoTimer = 0;
  }
}

var ticks = 0;
function testingTimerEvent()
{
  var currentTime = new Date().getTime()
  var latency = currentTime - testingSessionStarted + testingSessionTimeUsed;
  var unsavedLatency = Math.floor(currentTime - lastPersistentStateTime)
  // Проверка таймаута 
  if (currentTestingSlide.config.time_limit > 0 && latency > sessionMaximalDuration)
    testingComplete();
  setCookie(latencyCookie, unsavedLatency);
  
  var TimeMsg = '';
  if (currentTestingSlide.config.time_limit > 0) // Check and show remained time
  {
    var timeRemained = Math.floor((sessionMaximalDuration - latency) / 1000);
    if (timeRemained >= 180)
      TimeMsg = 'Осталось ' + Math.floor(timeRemained / 60) + ' мин.';
    else if (timeRemained > 60)
      TimeMsg = 'Осталось ' + Math.floor(timeRemained / 60) + ' мин. ' + (timeRemained % 60) + ' сек.';
    else 
      TimeMsg = 'Осталось ' + timeRemained + ' сек.';
  }
  else  // Show elapsed time
  {
    var timeElapsed = Math.floor(latency / 1000);
    if (timeElapsed >= 180)
      TimeMsg = 'Прошло ' + Math.floor(timeElapsed / 60) + ' мин.';
    else if (timeElapsed > 60)
      TimeMsg = 'Прошло ' + Math.floor(timeElapsed / 60) + ' мин. ' + (timeElapsed % 60) + ' сек.';
    else 
      TimeMsg = 'Прошло ' + timeElapsed + ' сек.';
  }

  $('#sessionTimer').removeClass('hidden');
  $('#sessionTimer').html(TimeMsg)
  
  // Every %testingAutosavePeriod% minutes we should store session
  ticks ++;
  if (ticks % (60 * testingAutosavePeriod) == 0)
     makeTestingSessionPersistent();
}

function gotoSlide(slideNo)
{
  currentSlideNo = slideNo;
  var currentSlide = moduleSequence[currentSlideNo];
  displayCurrentModulePosition()
  if (currentSlide.type == 'test')
    showTestingSlide(currentSlide)
  else
    showContentSlide(currentSlide);
  
  // Make state persist and store lesson_location
  scorm.set("cmi.core.lesson_location", currentSlideNo + "");
  if (!$.isArray(persistentData['main']))
    persistentData['main'] = new Array();
  if (persistentData['main'].indexOf(currentSlideNo) == -1)
    persistentData['main'].push(currentSlideNo);
  savePersistent(true);
}

function displayCurrentModulePosition()
{
  $('#modulePositionInfo').text('Слайд ' + (currentSlideNo + 1) + ' / ' + moduleSequence.length ); 
}

function restorePersistent()
{
  var s = scorm.get('cmi.suspend_data');
  if (s.length > 0)
  {
    try
    {
      if (config.useCompression)
        var temp = JSON.parse(LZString.decompressFromBase64(s));
      else
        var temp = JSON.parse(s);
      if (temp)
        persistentData = temp; 
    }
    catch (err)
    {
      console.log('persistent data has been damaged')
      persistentData = {}; // No data stored
    }
  }
  else
    persistentData = {}; // No data stored
  lastPersistentStateTime = new Date().getTime(); 
}

function savePersistent(doSave)
{
  
  scorm.set('cmi.core.exit', 'suspend');
  if (config.useCompression)
    scorm.set('cmi.suspend_data', LZString.compressToBase64(JSON.stringify(persistentData)));
  else
    scorm.set('cmi.suspend_data', JSON.stringify(persistentData));
  if (doSave)
  {
    scorm.computeSessionTime();
    scorm.save();
  }
}

function checkModuleObjectives()
{
  // Checking "browse" task
  var objectiveStatus = objectives.getStatus('browse');
  if (objectiveStatus == '' || objectiveStatus == not_attemptedStr)  // Check - does all slides has been exposed
  {
    var allExposed = true;
    for(var slideCnt = 0; slideCnt < moduleSequence.length; slideCnt++)
    {
      var slide = moduleSequence[slideCnt];
      if (slide['type'] == 'test')
      {
        // Testing slide is actually exposed only when testing is completed
        var objectiveId = slide.objective_id;
        var objectiveStatus = objectives.getStatus(objectiveId);
        hasBeenExposed = objectiveStatus == passedStr || objectiveStatus == failedStr; 
      }
      else 
        var hasBeenExposed = persistentData['main'].indexOf(slideCnt) !== -1;
      if (!hasBeenExposed)
      {
        allExposed = false;
        break;
      }
    }
    if (allExposed)
      objectives.setStatus('browse', passedStr);
  }
  computeGlobalObjectiveScores(); 

  if (globalStatusExpected == incompleteStr)
  {
    var allPassed = true;
    var oneFailed = false;
    for(var objectiveNo = 0; objectiveNo < module.config.master_objective.length; objectiveNo++)
    {
      var objectiveId = module.config.master_objective[objectiveNo];
      objectiveStatus = objectives.getStatus(objectiveId);
      if (objectiveStatus == failedStr)
        oneFailed = true;
      if (objectiveStatus !== passedStr)
        allPassed = false;
    }
    if (allPassed)
    {
      globalStatusExpected = passedStr;
      scorm.computeSessionTime();
      scorm.save();
      shortPopupMessage('Вы успешно выполнили все задачи. Нажмите кнопку "Завершение" для выхода')
    }
    else if (oneFailed)
    {
      globalStatusExpected = failedStr;
      scorm.computeSessionTime();
      scorm.save();
      shortPopupMessage('Вы не смогли выполнилить одну или несколько задач. Нажмите кнопку "Завершение" для выхода')
    }
  }
  displayCurrentModuleProgress();
}

function displayCurrentModuleProgress()
{
  var objectivesTotal = module.config.master_objective.length;
  var objectivesCompleted = 0;
  for(var objectiveNo = 0; objectiveNo < module.config.master_objective.length; objectiveNo++)
  {
    var objectiveId = module.config.master_objective[objectiveNo];
    objectiveStatus = objectives.getStatus(objectiveId);
    if (objectiveStatus == passedStr)
      objectivesCompleted++;
  }
  $('#moduleObjectivesInfo').text('Задачи ' + objectivesCompleted + ' / ' + objectivesTotal);
  // So, is the "Close" button available???
  if (globalStatusExpected == passedStr)
  {
    $('#closeButtonContainer').addClass('active');
    $('#closeButtonContainer').removeClass('disabled');
    $('#closeButton').on('click', closeModule);
  }  
  else if (globalStatusExpected == failedStr)
  {
    $('#closeButtonContainer').addClass('active');
    $('#closeButtonContainer').removeClass('disabled');
    $('#closeButton').on('click', closeModule);
  }
  else  
  {
    $('#closeButtonContainer').addClass('disabled');
    $('#closeButtonContainer').removeClass('active');
    $('#closeButton').off('click');
  }
}

function computeGlobalObjectiveScores()
{
  // Global score is a sum of testing scores, wich are scored globally
  globalScoreMax = 0;
  globalScoreRaw = 0;
  var allTestingCompleted = true;
  for(var slideNo = 0; slideNo < moduleSequence.length; slideNo++)
  {
    var slide = moduleSequence[slideNo];
    if ((slide.type == 'test') && slide.config.add_to_global_score) // This testing is scored globally
    {
      objectiveId = slide.objective_id;
      if (!(objectives.getStatus(objectiveId) == passedStr || objectives.getStatus(objectiveId) == failedStr)) 
        allTestingCompleted = false;
      else // objective completed, can score to global
      {
        var objectiveScoreMax = parseInt('0' + objectives.getScoreMax(objectiveId), 10);
        var objectiveScoreRaw = parseInt('0' + objectives.getScore(objectiveId), 10);
        globalScoreMax += objectiveScoreMax;
        globalScoreRaw += objectiveScoreRaw;
      }
    }
  }
  // Set LMS score vars
  scorm.set('cmi.core.score.min', "0")
  scorm.set('cmi.core.score.max', globalScoreMax)
  scorm.set('cmi.core.score.raw', globalScoreRaw)
  
  // When all testing is completed, global objective 'score' can be computed
  if (allTestingCompleted) 
  {
    var globalScoreRaw = parseInt('0' + scorm.get('cmi.core.score.raw'), 10);
    var globalScoreRate = Math.ceil(100 * globalScoreRaw * 100 / globalScoreMax) / 100 ;
    if (globalScoreRate >= module.config.master_rate)
      objectives.setStatus('score', passedStr);
    else
      objectives.setStatus('score', failedStr);
    
    objectives.setScore('score', 0, globalScoreMax, globalScoreRaw); 
  }
  else
    objectives.setStatus('score', incompleteStr);
}

function shortPopupMessage(text, duration)
{
  if (!duration || typeof(duration) == 'undefined')
    duration = 5000
  $('#shortPopupText').html(text);
  $('#shortPopupModal').modal('show');
  setTimeout("$('#shortPopupModal').modal('hide')", duration)
}

function showModuleReport()
{
  var report = new Array();
  report.push('<table class="table">')
  for(var objectiveNo = 0; objectiveNo < module.config.master_objective.length; objectiveNo++)
  {
    var objectiveId = module.config.master_objective[objectiveNo];
    var objectiveName = 'название задачи';
    switch(objectiveId)
    {
      case 'browse':
        objectiveName = 'Дойти до конца';
        break;
      case 'score':
        objectiveName = 'Набрать ' + module.config.master_rate + '% правильных ответов';
        break;
      default:
        var found = false;
        for(var slideNo = 0; slideNo < moduleSequence.length; slideNo++)
        {
          var slide = moduleSequence[slideNo];
          if (slide.type == 'test')
          {
            if (slide.objective_id == objectiveId)
            {
              objectiveName = 'Пройти тестирование "' + slide.title + '"';
              found = true;
              break;
            }
            if (!found)
            {
              for(var sectionNo = 0; sectionNo < slide.testsection.length; sectionNo++)
              {
                var section = slide.testsection[sectionNo];
                if (section.objective_id && objectiveId == section.objective_id)
                {
                  objectiveName = 'Пройти раздел "' +  section.title + '"';
                  found = true;
                  break;
                }
                if (!found)
                {
                  for(var itemNo = 0; itemNo < section.testquestion.length; itemNo++)
                  {
                    var question = section.testquestion[itemNo];
                    if (question.objective_id && objectiveId == question.objective_id)
                    {
                      objectiveName = 'Ответить на вопрос "' +  question.title + '"';
                      found = true;
                      break;
                    }
                  }
                }
              }
            }
          } 
          else if (slide.objective_id == objectiveId)
          {
            objectiveName = 'Открыть слайд "' + slide.title + '"'; 
            found = true;
            break;
          }
          if (found)
            break;
        }
    }
    objectiveStatus = objectives.getStatus(objectiveId);
    var objectiveProgress = '';
    if (objectiveId == 'score')
    {
      var objectiveScoreMax = parseInt('0' + objectives.getScoreMax(objectiveId), 10);
      var objectiveScoreRaw = parseInt('0' + objectives.getScore(objectiveId), 10);
      if (objectiveScoreMax)
        objectiveProgress = '(' + Math.ceil((objectiveScoreRaw * 100 / objectiveScoreMax) * 100) / 100 + '%)';
    }

    var trClass, objectiveMessage;
    if (objectiveStatus == passedStr)
    {
      trClass = '';
      objectiveMessage = '<i class="glyphicon glyphicon-ok"></i> пройдено ' + objectiveProgress;
    }  
    else if (objectiveStatus == failedStr)
    {
      trClass = 'danger';
      objectiveMessage = '<i class="glyphicon glyphicon-remove"></i> провалено ' + objectiveProgress;
    }
    else 
    {
      trClass = '';
      objectiveMessage = 'не завершено';
    }
    report.push('<tr  class="' + trClass + '"><td>' + objectiveName + '</td><td>' + objectiveMessage + '</td></tr>')
  }
  report.push('</table>')
  
  if (globalStatusExpected == passedStr) 
  {
    report.push('<div class="alert alert-success" role="alert">' + 
    '<b>Пройдено!</b><br>Вы успешно выполнили все задачи.'
     +'</div>');
  }
  else if (globalStatusExpected == failedStr) 
  {
    report.push('<div class="alert alert-warning" role="alert">' + 
    '<b>Провалено!</b><br>Вы не смогли выполнилить одну или несколько задач.'
     + '</div>');
  }
  else
  {
    if (globalScoreMax)
    {
      var globalScoreRaw = parseInt('0' + scorm.get('cmi.core.score.raw'), 10);
      var globalScoreRate = Math.ceil(100 * globalScoreRaw * 100 / globalScoreMax) / 100 ;
      report.push('<div class="alert alert-info" role="alert">' + 
      'Текущий счет правильных ответов: ' + globalScoreRate + '%'
       + '</div>');
    }
    else
      var globalScoreRate = false;
    
  }
  report.push('</table>')
  
  $('#moduleReport').html(report.join("\n"));
  $('#moduleReportDialog').modal('show');
}

function setupModuleNavgation()
{
  $('#moduleNavigationPanel').show();
  $('#selectSlideDialog').modal('hide')  
  
  if (currentSlideNo == 0) // first slide 
    $('#pagerPrev').addClass('disabled');
  else
    $('#pagerPrev').removeClass('disabled');
  
  if (currentSlideNo == moduleSequence.length - 1) // last slide
    $('#pagerNext').addClass('disabled');
  else
    $('#pagerNext').removeClass('disabled');
  
  document.onEnterKeyUp = navigateNext;
  document.onEscKeyUp = navigatePrev;
  setNextButtonNextSlide() /// Set default next button
  
}

function setNextButtonNextSlide() // Hide GoTesting show Next
{
  $('#pagerNext').removeClass('hidden');
  $('#pagerGoTesting').addClass('hidden');
  document.onEnterKeyUp = navigateNext;
}

function setNextButtonStartTesting() // Hide Next show GoTesting
{
  $('#pagerGoTesting').removeClass('hidden');
  $('#pagerNext').addClass('hidden');
  document.onEnterKeyUp = startTesting;
}

function navigateNext()
{
  if (currentSlideNo < moduleSequence.length - 1)
    gotoSlide(currentSlideNo + 1)
}

function navigatePrev()
{
  if (currentSlideNo > 0)
    gotoSlide(currentSlideNo - 1)
}

function selectSlide()
{
  var freeNav = (module.config.navigation == 'free');  
  var navTree = new Array();
  navTree.push('<ol>');
  var slideCnt = 0;
  function pushLink(title, enabled, seen) /// Format list item for slide list
  {
    var content, onClick, className, listItemClass, isSelected;
    content = title;
    if (enabled)
      onClick = 'onclick="gotoSlide(' + slideCnt + ')"';
    else
      onClick = '';
    if (seen || enabled)
      className = ''
    else
      className = 'text-muted'
    isSelected = currentSlideNo == slideCnt;
    if (isSelected) 
      listItemClass =  'activeItem bg-info'
    else
      listItemClass = className
    navTree.push('<li class="' + listItemClass + '">' + 
      '<a href="javascript:void(0)" ' + onClick + ' class="' + className + '" >' + content + '</a></li>')
    slideCnt++;
  }
  
  for(var sectionNo = 0; sectionNo < module.section.length; sectionNo++)
  {
    var section = module.section[sectionNo];
    if (section.singleton) 
    {
      hasBeenExposed = persistentData['main'].indexOf(slideCnt) !== -1;
      pushLink(section.title, freeNav || hasBeenExposed, hasBeenExposed)
    }
    else
    {
      navTree.push('<h4>' + section.title + '</h4>')
      for(var slideNo = 0; slideNo < section.content.length; slideNo++)
      {
        var slide = section.content[slideNo];
        hasBeenExposed = persistentData['main'].indexOf(slideCnt) !== -1;
        pushLink(slide.title, freeNav || hasBeenExposed, hasBeenExposed) 
      }
    }
  }
  navTree.push('</ol>');
  $('#navigationTreeContainer').html(navTree.join("\n"));
  
  $('#selectSlideDialog').modal('show');
}

function suspendSession()
{
  scorm.set('cmi.core.exit', 'suspend');
  scorm.quit();
  $('#slideContainer').hide();
  $('#testingContainer').hide();
  $('#moduleNavigationPanel').hide();
  $('#slidePaused').show();
}

function resumeSession()
{
  location.reload(true)  
  parent.location.reload(true)  
}

function saveInteractions()
{
  var interactionNo = 0;
  for(var slideNo = 0; slideNo < moduleSequence.length; slideNo++)
  {
    var slide = moduleSequence[slideNo];
    if (slide.type == 'test') 
    {
      // All answers are stored in persistent data
      var list = persistentData[slide.id];
      if (!$.isArray(list))
        list = new Array();
      for(i = 0; i < list.length; i++)
      {
        var item = list[i];
        var questionId = item[0];
        var answerMask = item[1];
        var latency    = item[2]

        if (questionId != 'stu') 
        {
          var found = false;
          for(var sectionNo = 0; sectionNo < slide.testsection.length; sectionNo++)
          {
            var section = slide.testsection[sectionNo];
            for(var itemNo = 0; itemNo < section.testquestion.length; itemNo++)
            {
              var question = section.testquestion[itemNo];
              if (question.id == questionId)
              {
                scorm.set('cmi.interactions.' + interactionNo + '.id', question.id);
                scorm.set('cmi.interactions.' + interactionNo + '.type', 'choice');
                scorm.set('cmi.interactions.' + interactionNo + '.correct_responses.0.pattern', question.mask);
                scorm.set('cmi.interactions.' + interactionNo + '.student_response', answerMask);
                if (answerMask == question.mask)
                  scorm.set('cmi.interactions.' + interactionNo + '.correct_responses.0.result', 'correct');
                else
                  scorm.set('cmi.interactions.' + interactionNo + '.correct_responses.0.result', 'wrong');
                scorm.set('cmi.interactions.' + interactionNo + '.objectives.0.id',  section.id)
                if (typeof(latency) !== 'undefined')
                  scorm.set('cmi.interactions.' + interactionNo + '.latency', scorm.formatTimeSpan(latency));
                interactionNo ++;
                found = true; //
              }
              if (found)
                break;
            } /// section.testquestion
            if (found)
              break;
          } // slide.testsection
        }
      }
    }
  }
  
}

function closeModule()
{
  var isCompleted = (globalStatusExpected == passedStr || globalStatusExpected == failedStr);
  if (isCompleted)
  {
    saveInteractions();
    scorm.set('cmi.core.lesson_status', globalStatusExpected);
    scorm.set('cmi.core.exit', '');
    scorm.quit();
  }
  location.href="goodbye.html";
}

function xmlParser(xml) 
{
  var x = xmlToJson(xml);
  module = x.module;
  x = undefined;
  xml = undefined;

  removeCrop(module);

  // Checking config, setting defaults
  var defaults = {navigation: 'tied', master_rate: 0};
  for (var defVar in defaults)
  {
     if (typeof(module.config[defVar])  == 'undefined')
     {
       module.config[defVar] = defaults[defVar];
     }
  }
  
  if (typeof(module.config.master_objective) == 'undefined') // There's at least one default objective - reach the end (browse)
    module.config.master_objective = 'browse'
  
  if (!$.isArray(module.config.master_objective))
  {
    var temp = module.config.master_objective;
    module.config.master_objective = new Array();
    if (temp)
      module.config.master_objective.push(temp);
  }

  if (!$.isArray(module.section))
  {
    var temp = module.section;
    module.section = new Array();
    if (temp)
      module.section.push(temp);
  }

  for(sectionNo = 0; sectionNo < module.section.length; sectionNo++)
  {
    var section = module.section[sectionNo];
    removeCrop(section);
    if (!$.isArray(section.content))
    {
      var temp = section.content;
      section.content = new Array();
      if (temp)
        section.content.push(temp);
    }
    if ((section.type == 'singleton') && (section.content.length > 0))
      section.singleton = section.content[0]
    else
      section.singleton = false;

    for (slideNo = 0; slideNo < section.content.length; slideNo++)
    {
      var content = section.content[slideNo];
      removeCrop(content);
      if (content.type == 'slide') 
        content.body = nodeText(content.body);
      if (content.type == 'test') 
      {
        // Checking config, setting defaults
        var defaults = 
        {
          skip_questions:0, size_limit:0, hints:0, 
          immediate_response_when_correct:0, immediate_response_when_wrong: 0, 
          show_report:'score', time_limit:0, master_rate:0, 
          shuffle:1, add_to_global_score:0, attempts:1
        };
        for (var defVar in defaults)
        {
           if (typeof(content.config[defVar]) == 'undefined')
           {
             content.config[defVar] = defaults[defVar];
           }
        }
        content.objective_id = content.objective_id?content.objective_id:content.id;
        if (!$.isArray(content.testsection))
        {
          var temp = content.testsection;
          content.testsection = new Array();
          if(temp)
            content.testsection.push(temp);
        }
        // Pass 1
        for(sectioNo = 0; sectioNo < content.testsection.length; sectioNo++)
        {
          var testSection = content.testsection[sectioNo];
          removeCrop(testSection);
          testSection.objective_id = testSection.objective_id?testSection.objective_id:testSection.id;
          if (!$.isArray(testSection.testquestion))
          {
            var temp = testSection.testquestion;
            testSection.testquestion = new Array();
            if(temp)
              testSection.testquestion.push(temp)
          }
          for(questNo = 0; questNo < testSection.testquestion.length; questNo++)
          {
            var testQuestion = testSection.testquestion[questNo];
            removeCrop(testQuestion);
            testQuestion.mask = nodeText(testQuestion.mask);
            testQuestion.addon_body = nodeText(testQuestion.addon_body);
            testQuestion.hint_body = nodeText(testQuestion.hint_body);
            for(answerNo = 0; answerNo < testQuestion.answer.length; answerNo++)
            {
              var answer = testQuestion.answer[answerNo];
              testQuestion.answer[answerNo] = nodeText(answer);
            }
          }
        }
        // Pass 2 - cleaning empty sections
        for(sectioNo = content.testsection.length-1; sectioNo >= 0; sectioNo--)
        {
          var testSection = content.testsection[sectioNo];
          if (testSection.testquestion.length == 0)
            content.testsection.splice(sectionNo, 1);
        }
      }
    }
  }
  // Cleaning empty sections
  for(sectionNo = module.section.length - 1; sectionNo >=0; sectionNo--)
  {
    var section = module.section[sectionNo];
    if (typeof(section.content) == 'undefined' || section.content.length == 0)
      module.section.splice(sectionNo, 1);
  }
};

// Get node text (may be in #text or in #cdata)
function nodeText(node)
{
  if (typeof(node) == 'undefined')
    return '';
  else if (typeof(node['#cdata-section']) !== 'undefined')
    return node['#cdata-section'];
  else if (typeof(node['#text']) !== 'undefined')
    return node['#text'];
  else
    return '';
}

// Clear object from convertation traces
function removeCrop(object)
{
  object.title = nodeText(object.title)
  for (attr in object["@attributes"])
  {
    if (typeof(object[attr]) !== 'undefined')
      object["_" + attr] = object["@attributes"][attr]
    else
      object[attr] = object["@attributes"][attr]
  }

  delete object['#text'];
  delete object['#cdata-section'];
  delete object['@attributes'];

  if (typeof(object.config) !== 'undefined')
  {
    for (elem in object.config)
    {
      if ($.isArray(object.config[elem]))
      {
        for (subElem in object.config[elem])
        {
          object.config[elem][subElem] = nodeText(object.config[elem][subElem])
        }
      }
      else
        object.config[elem] = nodeText(object.config[elem]);
      
    }
    delete object.config['#text'];
    delete object['#cdata-section'];
    delete object.config['@attributes'];
  }
  else
    object.config = {};

  if (typeof(object.meta) !== 'undefined')
  {
    for (elem in object.meta)
      object.meta[elem] = nodeText(object.meta[elem]['#text']);
    delete object.meta['#text'];
    delete object.meta['#cdata-section'];
    delete object.meta['@attributes'];
  }
  else
    object.meta = {}
  
}

function xmlToJson(xml) {
  
  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
    obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  } else if (xml.nodeType == 4) { // cdata
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for(var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof(obj[nodeName]) == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof(obj[nodeName].push) == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
};

// array.shuffle - перемешивание массива и array.indexOf, которого может не быть в старом браузере
if (!Array.prototype.shuffle) 
{
  Array.prototype.shuffle = function() 
  {
    var i = this.length, j, temp;
    if ( i == 0 ) return this;
    while ( --i ) 
    {
       j = Math.floor( Math.random() * ( i + 1 ) );
       temp = this[i];
       this[i] = this[j];
       this[j] = temp;
    }
    return this;
  }
}

if (!Array.prototype.indexOf) 
{
    Array.prototype.indexOf = function(obj, start) 
    {
         for (var i = (start || 0), j = this.length; i < j; i++) 
         {
             if (this[i] === obj) 
             { 
               return i; 
             }
         }
         return -1;
    }
}

// Convert time interval in milliseconds to CMITimespan 
pipwerks.SCORM.formatTimeSpan = function(diff)
{
  var seconds = Math.floor(diff / 1000);
  var msec    = Math.round((diff % 1000) / 10); // up to 0.01
  var minutes = Math.floor(seconds / 60);
  var hours   = Math.floor(seconds / 3600);
  if (hours > 9999) // Maximal time reached
    hours = 9999;
  // roundup  
  minutes = minutes % 60; // minutes of hour
  seconds = seconds % 60; // seconds of minute

  // Zero padding
  if (hours < 1)
    hours = "00"
  else if (hours < 10)
    hours = "0" + hours;
  if (minutes < 10)
    minutes = "0" + minutes; 
  if (seconds < 10)
    seconds = "0" + seconds;

  return hours + ':' + minutes + ':' + seconds + '.' + msec;
}

// Named intervals support
pipwerks.SCORM.startInterval = function(name) // Start time measure
{
  var scorm = pipwerks.SCORM;
  if (typeof(scorm.intervals) == 'undefined')
    scorm.intervals = new Array();
  scorm.intervals[name] = new Date().getTime();
}
  
pipwerks.SCORM.getIntervalStartTime = function(name) // Get initial time
{
  var scorm = pipwerks.SCORM;
  if (typeof(scorm.intervals) == 'undefined')
    scorm.intervals = new Array();
  if (typeof(scorm.intervals[name]) == 'undefined') /// If named interval does not exists, start it anyway
    scorm.intervals[name] = new Date().getTime();

  return scorm.intervals[name];
}

pipwerks.SCORM.getInterval = function(name) // Get milliseconds between interval start time and current moment
{
  var currentTime = new Date().getTime();
  var scorm = pipwerks.SCORM;
  return currentTime - scorm.getIntervalStartTime(name);
}

// Session time support
pipwerks.SCORM.init = function()
{
  var retVal = pipwerks.SCORM.connection.initialize();
  pipwerks.SCORM.startInterval('SCORM_SESSION_TIME');
  return retVal;
}

pipwerks.SCORM.quit = function()
{
  pipwerks.SCORM.computeSessionTime();
  return pipwerks.SCORM.connection.terminate();
}

pipwerks.SCORM.computeSessionTime = function() // Compute session time? format it and save
{
  var scorm = pipwerks.SCORM;
  var timeSpan = scorm.formatTimeSpan(scorm.getInterval('SCORM_SESSION_TIME'))
  scorm.set('cmi.core.session_time', timeSpan);
}

// objectives
var objectives = {}
objectives.indexOf = function(id)
{
  var scorm = pipwerks.SCORM;
  var MAX_OBJECTIVE_NO = scorm.get('cmi.objectives._count');
  if (MAX_OBJECTIVE_NO === '') /// LMS don't support cmi.objectives._count
  {
    // Iterate from 0 to 255 trying to find obj or first empty
    MAX_OBJECTIVE_NO = 255;
    for(i = 0; i < MAX_OBJECTIVE_NO; i++)
    {
      var objId = scorm.get('cmi.objectives.' + i + '.id');
      if (objId == id || objId == '')
        return i;
    }
    return -1; /// Not found - return erroneous value
  }
  else /// LMS support cmi.objectives._count, we have numeric value
    MAX_OBJECTIVE_NO = parseInt('0' + MAX_OBJECTIVE_NO, 10);
  
  for(i = 0; i < MAX_OBJECTIVE_NO; i++)
  {
    var objId = scorm.get('cmi.objectives.' + i + '.id');
    if (objId == id || objId == '')
      return i;
  }
  return MAX_OBJECTIVE_NO; // Not found - return first free number
}

objectives.setScore = function(id, min, max, raw)
{
  var idx = objectives.indexOf(id);
  scorm.set('cmi.objectives.' + idx + '.id', id);
  scorm.set('cmi.objectives.' + idx + '.score.min', min);
  scorm.set('cmi.objectives.' + idx + '.score.max', max);
  return scorm.set('cmi.objectives.' + idx + '.score.raw', raw);
}

objectives.setStatus = function(id, status)
{
  var idx = objectives.indexOf(id);
  scorm.set('cmi.objectives.' + idx + '.id', id);
  return scorm.set('cmi.objectives.' + idx + '.status', status);
}

objectives.getScore = function(id)
{
  var idx = objectives.indexOf(id);
  return scorm.get('cmi.objectives.' + idx + '.score.raw');
}

objectives.getScoreMax = function(id)
{
  var idx = objectives.indexOf(id);
  return scorm.get('cmi.objectives.' + idx + '.score.max');
}

objectives.getStatus = function(id)
{
  var idx = objectives.indexOf(id);
  return scorm.get('cmi.objectives.' + idx + '.status');
}

/// Style helper
function getStyleRuleValue(style, selector, sheet) {
    var sheets = typeof sheet !== 'undefined' ? [sheet] : document.styleSheets;
    for (var i = 0, l = sheets.length; i < l; i++) {
        var sheet = sheets[i];
        if( !sheet.cssRules ) { continue; }
        for (var j = 0, k = sheet.cssRules.length; j < k; j++) {
            var rule = sheet.cssRules[j];
            if (rule.selectorText && rule.selectorText.split(',').indexOf(selector) !== -1) {
                return rule.style[style];
            }
        }
    }
    return null;
}

// parse url parameters
function getParameterFromUrl(key)
{
  var a = new RegExp(key + "=([^&#=]*)");
  var b = a.exec(window.location.search);
  if (b && $.isArray(b) && b.length > 0)
    return decodeURIComponent(b[1]);
  else
    return '';
}

// cookies support
function getCookie(name) {
  var matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

function setCookie(name, value, options) {
  options = options || {};

  var expires = options.expires;

  if (typeof expires == "number" && expires) {
    var d = new Date();
    d.setTime(d.getTime() + expires * 1000);
    expires = options.expires = d;
  }
  if (expires && expires.toUTCString) {
    options.expires = expires.toUTCString();
  }

  value = encodeURIComponent(value);

  var updatedCookie = name + "=" + value;

  for (var propName in options) {
    updatedCookie += "; " + propName;
    var propValue = options[propName];
    if (propValue !== true) {
      updatedCookie += "=" + propValue;
    }
  }

  document.cookie = updatedCookie;
}

function deleteCookie(name) {
  setCookie(name, "", {
    expires: -1
  })
} 
