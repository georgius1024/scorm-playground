/**
 * Created by georgius on 06.09.18.
 */
import axios from 'axios'
import Scorm12Adapter from './scorm.1.2.adapter'
import { getStored, putStored } from '../lib/session-storage'
const index = [
  '532.1',
  '1.2019',
  '1.2549',
  'pi',
  'pi-1',
  'uno',
  'uno-1',
  '1000002477',
  'ContentPackagingOneFilePerSCO_SCORM12'
]

const getTitle = (node) => {
  'use strict'
  for (let c = 0; c < node.childNodes.length; c++) {
    if (node.childNodes[c].nodeName === 'title') {
      return node.childNodes[c].textContent
    }
  }
}

const manifest = async (id) => {
  'use strict'
  const response = await axios.get('./static/scorm/' + id + '/imsmanifest.xml')

  // const parser = new DOMParser()
  const result = {}
  result.raw = response.data
  result.id = id

  const parser = new DOMParser()
  let xmlDoc
  xmlDoc = parser.parseFromString(response.data, 'text/xml')

  const attributesToJson = (node) => {
    const result = {}
    if (node.attributes) {
      for (let a = 0; a < node.attributes.length; a++) {
        result[node.attributes[a].nodeName] = node.attributes[a].textContent
      }
    }
    if (node['#text']) {
      result.text = node['#text'].trim()
    }
    return result
  }

  const islandsToJson = (node) => {
    const result = {}
    for (let a = 0; a < node.childNodes.length; a++) {
      result[node.childNodes[a].nodeName] = node.childNodes[a].textContent
    }
    if (result['#text']) {
      result.text = result['#text'].trim()
    }
    delete result['#text']
    return result
  }

  const organizationsToJson = (organizations) => {
    const items = []
    const traverseItems = (node, path = '') => {
      for (let c = 0; c < node.childNodes.length; c++) {
        if (node.childNodes[c].nodeName === 'item') {
          const item = attributesToJson(node.childNodes[c])
          const title = getTitle(node.childNodes[c])
          item.title = path ? path + ' / ' + title : title
          items.push(item)
          traverseItems(node.childNodes[c], item.title)
        }
      }
    }
    const orgNode = organizations[0]
    const organization = attributesToJson(orgNode)
    organization.title = getTitle(orgNode)
    traverseItems(orgNode)
    organization.items = items
    return organization
  }

  const resourcesToJson = (resources) => {
    const result = []
    for (let a = 0; a < resources.length; a++) {
      const resource = attributesToJson(resources[a])
      result.push(resource)
    }
    return result
  }

  result.manifest = attributesToJson(xmlDoc.getElementsByTagName('manifest')[0])
  result.meta = islandsToJson(xmlDoc.getElementsByTagName('metadata')[0])
  result.organization = organizationsToJson(xmlDoc.getElementsByTagName('organization'))
  result.resources = resourcesToJson(xmlDoc.getElementsByTagName('resource'))
  result.organization.items = result.organization.items.map(org => {
    const res = result.resources.find(res => res.identifier === org.identifierref)
    if (res) {
      org.url = res.href + (org.parameters ? org.parameters : '')
    }
    return org
  })
  return result
}

const initializeSession = async (manifest, session, onCompleted) => {
  function initSessionData (session) {
    const newSessionData = {}
    newSessionData['cmi.core.session_time'] = '0000:00:00.00'

    newSessionData['cmi.core.lesson_status'] = 'not attempted'
    newSessionData['cmi.core.entry'] = 'ab-initio'
    newSessionData['cmi.core.credit'] = 'credit'
    newSessionData['cmi.core.lesson_mode'] = 'normal'

    newSessionData['cmi.core.student_id'] = '101'
    newSessionData['cmi.core.student_name'] = 'SCORM User'

    newSessionData['cmi.core.total_time'] = '0000:00:00'

    newSessionData['cmi.core.lesson_location'] = ''
    newSessionData['cmi.suspend_data'] = ''
    newSessionData['cmi.launch_data'] = ''
    putStored(session, newSessionData)
    return newSessionData
  }

  window.API = new Scorm12Adapter(manifest.id, session, false, (obj, session, action, changes) => {
    const oldSessionData = getStored(session)
    let newSessionData = Object.assign({}, oldSessionData, changes)
    switch (action) {
      case 'initialize':
        newSessionData = initSessionData(session)
        break
      case 'finalize':
        /// Вычисление cmi.core.total_time
        let time = newSessionData['cmi.core.session_time'].split(':')
        let sessionTime = time[0] * 3600 + time[1] * 60 + time[2]
        time = newSessionData['cmi.core.total_time'].split(':')
        let totalTime = time[0] * 3600 + time[1] * 60 + time[2]
        totalTime += sessionTime

        let h = Math.floor(totalTime / 3600)
        let s = totalTime % 60
        let m = Math.floor((totalTime % 3600) / 60)
        if (h < 10) {
          h = '0' + h
        }
        if (s < 10) {
          s = '0' + s
        }
        if (m < 10) {
          m = '0' + m
        }
        newSessionData['cmi.core.total_time'] = [h, m, s].join(':')
        newSessionData['cmi.core.session_time'] = '0000:00:00.00'
        if (newSessionData['cmi.core.lesson_status'] === 'not attempted') {
          newSessionData['cmi.core.lesson_status'] = 'incomplete'
        }
        /// Если есть score и установлено правило для masteryscore, идет сравнение
        if (newSessionData['adlcp:masteryscore'] && newSessionData['cmi.core.score.raw']) {
          if (newSessionData['cmi.core.score.raw'] >= newSessionData['adlcp:masteryscore']) {
            newSessionData['cmi.core.lesson_status'] = 'passed'
          } else {
            newSessionData['cmi.core.lesson_status'] = 'failed'
          }
        }
        if (newSessionData['cmi.core.exit'] !== 'suspend') { /// Не требуется сохранять итоги
          newSessionData['cmi.core.lesson_location'] = ''
          newSessionData['cmi.suspend_data'] = ''
        }
        if (
          (newSessionData['cmi.core.lesson_status'] === 'passed') ||
          (newSessionData['cmi.core.lesson_status'] === 'failed') ||
          (newSessionData['cmi.core.lesson_status'] === 'completed')) {
          newSessionData['LMS.closed'] = true
        }

        if (onCompleted) {
          onCompleted(newSessionData)
        }

        break
    }
    putStored(session, newSessionData)
    return newSessionData
  })
}

export default {
  index,
  initializeSession,
  manifest
}
