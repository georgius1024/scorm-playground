// scorm 1.2 dictionary for vars validation
var scorm12validatorPrototype = function () 
{
  var isValid = function(aType, aData) 
  {
    aData = String(aData);
    if (!$.isArray(aType))
      return false;
    for (var i = 0; i < aType.length; i++) 
    {
      var typeItem = aType[i];
      if (typeItem == 'CMIString255')
        return (aData.length < 255);
      else if (typeItem == 'CMIString4096')
        return (aData.length < 4096);
      else if (typeItem == 'CMIIdentifier')
        return (aData.search(/^[a-zA-Z0-9_\-\.]{1,255}$/) > -1);
      else if (typeItem == 'CMITimespan')
        return (aData.search(/^\d{1,4}\:\d{2}\:\d{2}(\.\d{0,2}){0,1}$/) > -1);
      else if (typeItem == 'CMITime')
        return (aData.search(/^\d{2}\:\d{2}\:\d{2}(\.\d{0,2}){0,1}$/) > -1);
      else if (typeItem == 'CMIDecimal')
        return (aData.search(/^[0-9\.]+$/) > -1) && (!isNaN(parseFloat(aData)));
      else if (typeItem == 'CMISInteger')
        return (!isNaN(parseInt(aData)) );
      else if (typeItem == 'CMIInteger')
        return (!isNaN(parseInt(aData)) );
      else if (typeItem === aData)  // Found in dictionary
        return true;
    }
    return false;
  }
  
  var buildRule = function(aType, aAvail)
  {
    return {
      type: aType,
      avail: aAvail
    }
  }
  var dictionary = function(element)
  {
    if (element == 'cmi.core._children')
      return buildRule(['keyword'], 'RO')
    else if (element == 'cmi.core.student_id')
      return buildRule(['CMIIdentifier'], 'RO')
    else if (element == 'cmi.core.student_name')
      return buildRule(['CMIString255'], 'RO')
    else if (element == 'cmi.core.lesson_location')
      return buildRule(['CMIString255'], 'RW')
    else if (element == 'cmi.core.credit')
      return buildRule(['CMIString255'], 'RO')
    else if (element == 'cmi.core.lesson_status')
      return buildRule(['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'], 'RW')
    else if (element == 'cmi.core.entry')
      return buildRule(['CMIString255'], 'RO')
    else if (element == 'cmi.core.score_children')
      return buildRule(['keyword'], 'RO')
    else if (element == 'cmi.core.score.raw')
      return buildRule(['CMIDecimal', ''], 'RW')
    else if (element == 'cmi.core.score.max')
      return buildRule(['CMIDecimal', ''], 'RW')
    else if (element == 'cmi.core.score.min')
      return buildRule(['CMIDecimal', ''], 'RW')
    else if (element == 'cmi.core.total_time')
      return buildRule(['CMITimespan'], 'RO')
    else if (element == 'cmi.core.lesson_mode')
      return buildRule(['CMIString255'], 'RO')
    else if (element == 'cmi.core.exit')
      return buildRule(['time-out', 'suspend', 'logout', ''], 'WO')
    else if (element == 'cmi.core.session_time')
      return buildRule(['CMITimespan'], 'WO')
    else if (element == 'cmi.core.session_time')
      return buildRule(['CMITimespan'], 'WO')
    else if (element == 'cmi.suspend_data')
      return buildRule(['CMIString4096'], 'RW')
    else if (element == 'cmi.core.suspend_data')
      return buildRule(['CMIString4096'], 'RW')
    else if (element == 'cmi.core.launch_data')
      return buildRule(['CMIString4096'], 'RO')
    else if (element == 'cmi.core.comments')
      return buildRule(['CMIString4096'], 'RO')
    else if (element == 'cmi.core.comments_from_lms')
      return buildRule(['CMIString4096'], 'RO')
    else if (element == 'cmi.objectives._children')
      return buildRule(['keyword'], 'RO')
    else if (element == 'cmi.objectives._count')
      return buildRule(['CMIInteger'], 'RO')
    else if (element.substring(0, 15) == 'cmi.objectives.')
    {
      var vars = String(element).split('.');
      if (vars.length == 4)
      {
        var objectiveNo = vars[2];
        if (isNaN(objectiveNo))
          return;
        var kwd = vars[3];
        if (kwd == 'id') // cmi.objectives.n.id 
          return buildRule(['CMIIdentifier'], 'RW')
        else if (kwd == 'status') // cmi.objectives.n.status
          return buildRule(['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'], 'RW')
        else
          return;
      }
      else if (vars.length == 5)
      {
        var objectiveNo = vars[2];
        if (isNaN(objectiveNo))
          return;
        var kwd = vars[3] + '.' + vars[4];
        if (kwd == 'score._children') // cmi.objectives.n.score._children
          return buildRule(['keyword'], 'RO')
        else if (kwd == 'score.min') // cmi.objectives.n.score.min
          return buildRule(['CMIDecimal'], 'RW')
        else if (kwd == 'score.max') // cmi.objectives.n.score.max
          return buildRule(['CMIDecimal', ''], 'RW')
        else if (kwd == 'score.raw') // cmi.objectives.n.score.raw
          return buildRule(['CMIDecimal', ''], 'RW')
        else
          return;
      }
      else
        return;
    }
    else if (element == 'cmi.student_data._children')
      return buildRule(['keyword'], 'RO')
    else if (element == 'cmi.student_data.mastery_score')
      return buildRule(['CMIDecimal'], 'RO')
    else if (element == 'cmi.student_data.max_time_allowed')
      return buildRule(['CMITimespan'], 'RO')
    else if (element == 'cmi.student_data.time_limit_action')
      return buildRule(['CMIString255'], 'RO')
    else if (element == 'cmi.student_preference._children')
      return buildRule(['keyword'], 'RO')
    else if (element == 'cmi.student_preference.audio')
      return buildRule(['CMISInteger'], 'RW')
    else if (element == 'cmi.student_preference.language')
      return buildRule(['CMIString255'], 'RW')
    else if (element == 'cmi.student_preference.speed')
      return buildRule(['CMISInteger'], 'RW')
    else if (element == 'cmi.student_preference.text')
      return buildRule(['CMISInteger'], 'RW')
    else if (element == 'cmi.interactions._children')
      return buildRule(['keyword'], 'RO')
    else if (element == 'cmi.interactions._count')
      return buildRule(['CMIInteger'], 'RO')
    else if (element.substring(0, 17) == 'cmi.interactions.')
    {
      var vars = String(element).split('.');
      if (vars.length == 4)
      {
        var interactionNo = vars[2];
        if (isNaN(interactionNo))
          return;
        var kwd = vars[3];
        if (kwd == 'id') // cmi.interactions.n.id 
          return buildRule(['CMIIdentifier'], 'WO')
        else if (kwd == 'time')
          return buildRule(['CMITime'], 'WO')
        else if (kwd == 'type')
          return buildRule(['true-false', 'choice', 'fill-in', 'matching', 'performance', 'sequencing', 'likert', 'numeric'], 'WO')
        else if (kwd == 'weighting')
          return buildRule(['CMIDecimal'], 'WO')
        else if (kwd == 'student_response')
          return buildRule(['CMIString255'], 'WO')
        else if (kwd == 'result')
          return buildRule(['correct', 'wrong', 'unanticipated', 'neutral', 'CMIDecimal'], 'WO')
        else if (kwd == 'latency')
          return buildRule(['CMITimespan'], 'WO')
        else
          return;
      }
      else if (vars.length == 5)
      {
        var interactionNo = vars[2];
        if (isNaN(interactionNo))
          return;
        var kwd = vars[3] + '.' + vars[4];
        if (kwd == 'objectives._count') // cmi.interactions.n.objectives._count
          return buildRule(['CMIInteger'], 'RO')
        else if (kwd == 'correct_responses._count') // cmi.interactions.n.correct_responses._count
          return buildRule(['CMIInteger'], 'RO')
        else
          return;
      }
      else if (vars.length == 6)
      {
        var interactionNo = vars[2];
        if (isNaN(interactionNo))
          return;
        var anotherNo = vars[4];
        if (isNaN(anotherNo))
          return;
        if (vars[3] == 'objectives' && vars[5] == 'id') // cmi.interactions.n.objectives.n.id
          return buildRule(['CMIIdentifier'], 'WO')
        else if (vars[3] == 'correct_responses' && vars[5] == 'pattern') ///cmi.interactions.n.correct_responses.n.pattern
          return buildRule(['CMIString255'], 'WO')
        else
          return;
      }
      else
        return;
    }
    else
      return; 
  }
  var getDataType = function(element)
  {
    var rule = dictionary(element);
    if (typeof(rule) == 'undefined')
      return;
    else
      return rule.type;
  }
  
  var getDataAvail = function (element, access)
  {
    var rule = dictionary(element);
    if (typeof(rule) == 'undefined')
      return false;
    else
      return String(rule.avail).search(access) >= 0;
  }
  
  var checkDataValid = function(element, data)
  {
    var rule = dictionary(element);
    if (typeof(rule) == 'undefined')
      return false;
    else if (String(rule.avail).search('W') == -1)
      return false;
    else
      return isValid(rule.type, data) 
  }
  var interface = 
  {
    getDataType: getDataType,
    getDataAvail: getDataAvail,
    checkDataValid: checkDataValid
  }
  return interface;
};
