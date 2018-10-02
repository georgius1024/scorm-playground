/**
 * Created by georgius on 25.09.18.
 * scorm 1.2 dictionary validation
 */
/* eslint-disable */
class Scorm12Validator {
  isValid (aType, aData) {
    aData = String(aData)
    if (!Array.isArray(aType)) {
      return false
    }
    for (let i = 0; i < aType.length; i++) {
      let typeItem = aType[i]
      if (typeItem === 'CMIString255') {
        return (aData.length < 255)
      } else if (typeItem === 'CMIString4096') {
        return (aData.length < 4096)
      } else if (typeItem === 'CMIIdentifier') {
        return (aData.search(/^[a-zA-Z0-9_\-\.]{1,255}$/) > -1)
      } else if (typeItem === 'CMITimespan') {
        return (aData.search(/^\d{1,4}\:\d{2}\:\d{2}(\.\d{0,2}){0,1}$/) > -1)
      } else if (typeItem === 'CMITime') {
        return (aData.search(/^\d{2}\:\d{2}\:\d{2}(\.\d{0,2}){0,1}$/) > -1)
      } else if (typeItem === 'CMIDecimal') {
        return (aData.search(/^[0-9\.]+$/) > -1) && (!isNaN(parseFloat(aData)))
      } else if (typeItem === 'CMISInteger') {
        return (!isNaN(parseInt(aData)))
      } else if (typeItem === 'CMIInteger') {
        return (!isNaN(parseInt(aData)))
      } else if (typeItem === aData) { // Found in dictionary
        return true
      }
    }
    return false
  }

  buildRule (aType, aAvail) {
    return {
      type: aType,
      avail: aAvail
    }
  }

  dictionary (element) {
    if (element === 'cmi.core._children') {
      return this.buildRule(['keyword'], 'RO')
    } else if (element === 'cmi.core.student_id') {
      return this.buildRule(['CMIIdentifier'], 'RO')
    } else if (element === 'cmi.core.student_name') {
      return this.buildRule(['CMIString255'], 'RO')
    } else if (element === 'cmi.core.lesson_location') {
      return this.buildRule(['CMIString255'], 'RW')
    } else if (element === 'cmi.core.credit') {
      return this.buildRule(['CMIString255'], 'RO')
    } else if (element === 'cmi.core.lesson_status') {
      return this.buildRule(['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'], 'RW')
    } else if (element === 'cmi.core.entry') {
      return this.buildRule(['CMIString255'], 'RO')
    } else if (element === 'cmi.core.score_children') {
      return this.buildRule(['keyword'], 'RO')
    } else if (element === 'cmi.core.score.raw') {
      return this.buildRule(['CMIDecimal', ''], 'RW')
    } else if (element === 'cmi.core.score.max') {
      return this.buildRule(['CMIDecimal', ''], 'RW')
    } else if (element === 'cmi.core.score.min') {
      return this.buildRule(['CMIDecimal', ''], 'RW')
    } else if (element === 'cmi.core.total_time') {
      return this.buildRule(['CMITimespan'], 'RO')
    } else if (element === 'cmi.core.lesson_mode') {
      return this.buildRule(['CMIString255'], 'RO')
    } else if (element === 'cmi.core.exit') {
      return this.buildRule(['time-out', 'suspend', 'logout', ''], 'WO')
    } else if (element === 'cmi.core.session_time') {
      return this.buildRule(['CMITimespan'], 'WO')
    } else if (element === 'cmi.core.session_time') {
      return this.buildRule(['CMITimespan'], 'WO')
    } else if (element === 'cmi.suspend_data') {
      return this.buildRule(['CMIString4096'], 'RW')
    } else if (element === 'cmi.core.suspend_data') {
      return this.buildRule(['CMIString4096'], 'RW')
    } else if (element === 'cmi.core.launch_data') {
      return this.buildRule(['CMIString4096'], 'RO')
    } else if (element === 'cmi.core.comments') {
      return this.buildRule(['CMIString4096'], 'RO')
    } else if (element === 'cmi.core.comments_from_lms') {
      return this.buildRule(['CMIString4096'], 'RO')
    } else if (element === 'cmi.objectives._children') {
      return this.buildRule(['keyword'], 'RO')
    } else if (element === 'cmi.objectives._count') {
      return this.buildRule(['CMIInteger'], 'RO')
    } else if (element.substring(0, 15) === 'cmi.objectives.') {
      const vars = String(element).split('.')
      if (vars.length === 4) {
        const objectiveNo = vars[2]
        if (isNaN(objectiveNo)) {
          return undefined
        }
        const kwd = vars[3]
        if (kwd === 'id') { // cmi.objectives.n.id
          return this.buildRule(['CMIIdentifier'], 'RW')
        } else if (kwd === 'status') { // cmi.objectives.n.status
          return this.buildRule(['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'], 'RW')
        } else {
          return undefined
        }
      } else if (vars.length === 5) {
        const objectiveNo = vars[2]
        if (isNaN(objectiveNo)) {
          return undefined
        }
        const kwd = vars[3] + '.' + vars[4]
        if (kwd === 'score._children') { // cmi.objectives.n.score._children
          return this.buildRule(['keyword'], 'RO')
        } else if (kwd === 'score.min') { // cmi.objectives.n.score.min
          return this.buildRule(['CMIDecimal'], 'RW')
        } else if (kwd === 'score.max') { // cmi.objectives.n.score.max
          return this.buildRule(['CMIDecimal', ''], 'RW')
        } else if (kwd === 'score.raw') { // cmi.objectives.n.score.raw
          return this.buildRule(['CMIDecimal', ''], 'RW')
        } else {
          return undefined
        }
      } else {
        return undefined
      }
    } else if (element === 'cmi.student_data._children') {
      return this.buildRule(['keyword'], 'RO')
    } else if (element === 'cmi.student_data.mastery_score') {
      return this.buildRule(['CMIDecimal'], 'RO')
    } else if (element === 'cmi.student_data.max_time_allowed') {
      return this.buildRule(['CMITimespan'], 'RO')
    } else if (element === 'cmi.student_data.time_limit_action') {
      return this.buildRule(['CMIString255'], 'RO')
    } else if (element === 'cmi.student_preference._children') {
      return this.buildRule(['keyword'], 'RO')
    } else if (element === 'cmi.student_preference.audio') {
      return this.buildRule(['CMISInteger'], 'RW')
    } else if (element === 'cmi.student_preference.language') {
      return this.buildRule(['CMIString255'], 'RW')
    } else if (element === 'cmi.student_preference.speed') {
      return this.buildRule(['CMISInteger'], 'RW')
    } else if (element === 'cmi.student_preference.text') {
      return this.buildRule(['CMISInteger'], 'RW')
    } else if (element === 'cmi.interactions._children') {
      return this.buildRule(['keyword'], 'RO')
    } else if (element === 'cmi.interactions._count') {
      return this.buildRule(['CMIInteger'], 'RO')
    } else if (element.substring(0, 17) === 'cmi.interactions.') {
      const vars = String(element).split('.')
      if (vars.length === 4) {
        const interactionNo = vars[2]
        if (isNaN(interactionNo)) {
          return undefined
        }
        const kwd = vars[3]
        if (kwd === 'id') { // cmi.interactions.n.id
          return this.buildRule(['CMIIdentifier'], 'WO')
        } else if (kwd === 'time') {
          return this.buildRule(['CMITime'], 'WO')
        } else if (kwd === 'type') {
          return this.buildRule(['true-false', 'choice', 'fill-in', 'matching', 'performance', 'sequencing', 'likert', 'numeric'], 'WO')
        } else if (kwd === 'weighting') {
          return this.buildRule(['CMIDecimal'], 'WO')
        } else if (kwd === 'student_response') {
          return this.buildRule(['CMIString255'], 'WO')
        } else if (kwd === 'result') {
          return this.buildRule(['correct', 'wrong', 'unanticipated', 'neutral', 'CMIDecimal'], 'WO')
        } else if (kwd === 'latency') {
          return this.buildRule(['CMITimespan'], 'WO')
        } else {
          return undefined
        }
      } else if (vars.length === 5) {
        const interactionNo = vars[2]
        if (isNaN(interactionNo)) {
          return undefined
        }
        const kwd = vars[3] + '.' + vars[4]
        if (kwd === 'objectives._count') { // cmi.interactions.n.objectives._count
          return this.buildRule(['CMIInteger'], 'RO')
        } else if (kwd === 'correct_responses._count') { // cmi.interactions.n.correct_responses._count
          return this.buildRule(['CMIInteger'], 'RO')
        } else {
          return undefined
        }
      } else if (vars.length === 6) {
        const interactionNo = vars[2]
        if (isNaN(interactionNo)) {
          return undefined
        }
        const anotherNo = vars[4]
        if (isNaN(anotherNo)) {
          return undefined
        }
        if (vars[3] === 'objectives' && vars[5] === 'id') { // cmi.interactions.n.objectives.n.id
          return this.buildRule(['CMIIdentifier'], 'WO')
        } else if (vars[3] === 'correct_responses' && vars[5] === 'pattern') { // cmi.interactions.n.correct_responses.n.pattern
          return this.buildRule(['CMIString255'], 'WO')
        } else {
          return undefined
        }
      } else {
        return undefined
      }
    } else {
      return undefined
    }
  }

  getDataType (element) {
    let rule = this.dictionary(element)
    if (typeof rule === 'undefined') {
      return undefined
    } else {
      return rule.type
    }
  }

  getDataAvail (element, access) {
    let rule = this.dictionary(element)
    if (typeof rule === 'undefined') {
      return false
    } else {
      return String(rule.avail).search(access) >= 0
    }
  }

  checkDataValid (element, data) {
    let rule = this.dictionary(element)
    if (typeof rule === 'undefined') {
      return false
    } else if (String(rule.avail).search('W') === -1) {
      return false
    } else {
      return this.isValid(rule.type, data)
    }
  }
}

export default Scorm12Validator
