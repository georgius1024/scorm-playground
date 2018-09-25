/**
 * Created by georgius on 06.09.18.
 */
import axios from 'axios'
// import get from 'lodash.get'
const index = [
  '532.1', '1.2019', '1.2549', 'ContentPackagingOneFilePerSCO_SCORM12'
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

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(response.data, 'text/xml')
  console.log(xmlDoc)
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

  /*
  manifest.data = parser.xml2js(response.data)
  const root = get(manifest, 'data.elements.0.elements')
  manifest.meta = root.find(e => e.name === 'metadata')
  manifest.organizations = root.find(e => e.name === 'organizations')
  manifest.resources = root.find(e => e.name === 'resources')
  manifest.version = manifest.meta
  get(manifest, 'data.elements.0.elements.0.elements.1.elements.0.text')
  manifest.id = get(manifest, 'data.elements.0.attributes.identifier')
  return manifest
  */
  return result
}

export default {
  index,
  manifest
}
