export function hasStored (key) {
  return Boolean(localStorage.getItem(key))
}

export function getStored (key, defVal) {
  if (hasStored(key)) {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch (e) {
      console.log(`Error parsing "{$key}": ${e}`)
      return defVal
    }
  } else {
    return defVal
  }
}

export function putStored (key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function deleteStored (key) {
  localStorage.setItem(key, null)
}

export function deleteAll (key) {
  localStorage.clear()
}
