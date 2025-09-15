/* global Peer */
let conn
let connOpen

// Registro del Service Worker para modo offline
function registerServiceWorker () {
  if ('serviceWorker' in navigator) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Never register service worker on localhost
      return
    }
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js')
        .then(function (_registration) {
          // Registro exitoso
          // console.log('ServiceWorker registrado con éxito:', registration.scope)
        })
        .catch(function (error) {
          // Fallo en el registro
          console.log('ServiceWorker no pudo registrarse:', error)
        })
    })
  }
}
registerServiceWorker()
// helpers
async function bufferToHex (buffer) {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hexToBuffer (hex) {
  const bytes = hexToBytes(hex)
  return bytes.buffer
}

async function createHash (text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer)).slice(0, 16)
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes (hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

async function parseError (prom) {
  return prom.catch(_err => {
    return '500: Internal server error'
  })
}

async function encryptText (plainText, keyText, ivText) {
  const keyTextPadded = await createHash(keyText)
  const ivTextPadded = await createHash(ivText)

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(keyTextPadded),
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  )
  const iv = hexToBytes(ivTextPadded)

  const encoder = new TextEncoder()
  const data = encoder.encode(plainText)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    data
  )
  return bufferToHex(encrypted)
}

async function decryptText (cipherTextBase64, keyText, ivText) {
  const keyTextPadded = await createHash(keyText)
  const ivTextPadded = await createHash(ivText)

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(keyTextPadded),
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  )
  const iv = hexToBytes(ivTextPadded)

  const encrypted = await hexToBuffer(cipherTextBase64)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    key,
    encrypted
  )
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

// Plain vanilla JavaScript to handle UI interactions
const encryptBtn = document.getElementById('encrypt')
const decryptBtn = document.getElementById('decrypt')
const connectBtn = document.getElementById('connect')
const reloadBtn = document.getElementById('reload')
const output = document.getElementById('output')
const copy = document.getElementById('copy')
const type = document.getElementById('cbx-3')

const getValues = () => {
  const input = document.getElementById('input').value
  const key = document.getElementById('key').value
  const iv = document.getElementById('iv').value
  return { input, key, iv }
}

encryptBtn.addEventListener('click', async () => {
  const { input, key, iv } = getValues()
  const encrypted = await parseError(encryptText(input, key, iv))
  output.textContent = encrypted
  if (connOpen) {
    conn.send(JSON.stringify({ type: 'secret', message: `${key}:${iv}` }))
  }
})

decryptBtn.addEventListener('click', async () => {
  const { input, key, iv } = getValues()
  const decrypted = await parseError(decryptText(input, key, iv))
  output.textContent = decrypted
})

copy.addEventListener('click', () => {
  const text = output.textContent
  navigator.clipboard.writeText(text).then(() => {
    copy.classList.add('copied')
    copy.textContent = 'Copied!'
    setTimeout(() => {
      copy.classList.remove('copied')
      copy.textContent = 'Copy to clipboard'
    }, 2000)
  }).catch(err => {
    console.error('Failed to copy text: ', err)
  })
})

connectBtn.addEventListener('click', () => {
  const id = document.getElementById('remoteID').value
  if (id) {
    window.connectTo(id)
    document.getElementById('connect').innerText = 'Connecting...'
  }
})

type.addEventListener('change', async () => {
  const onlyOnRemote = document.querySelectorAll('.onlyOnRemote')
  if (type.checked) {
    await loadRTC()
    setupConnection()
    onlyOnRemote.forEach(el => el.classList.add('show'))
  } else {
    closeConnection()
    onlyOnRemote.forEach(el => el.classList.remove('show'))
  }
})

let rtcLoaded = false
const loadRTC = async _ => {
  if (rtcLoaded) return
  const script = document.createElement('script')
  script.src = 'https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js'
  document.getElementsByTagName('head')[0]
    .appendChild(script)
  return new Promise((resolve) => {
    script.onload = () => {
      rtcLoaded = true
      resolve()
    }
  })
}

const closeConnection = () => {
  const localID = document.getElementById('localID')
  const remoteID = document.getElementById('remoteID')
  document.getElementById('connect').innerText = 'Connect'
  conn && conn.close()
  localID.value = ''
  remoteID.value = ''
  window.RTCid = null
  conn = null
  connOpen = false
}

const setupConnection = () => {
  const peer = new Peer()
  window.connectTo = (id) => {
    conn = peer.connect(id)
    conn.on('open', function () {
      conn.send(JSON.stringify({ type: 'greeting', message: window.RTCid }))
    })
  }

  peer.on('open', function (id) {
    const localID = document.getElementById('localID')
    localID.value = id
    window.RTCid = id
  })

  peer.on('connection', function (conn) {
    conn.on('data', function (data) {
      const { type, message } = JSON.parse(data)
      const remoteId = document.getElementById('remoteID').value
      if (type === 'greeting') {
        if (message !== remoteId) {
          document.getElementById('remoteID').value = message
          window.connectTo(message)
        }
        document.getElementById('connect').innerText = 'Connected'
        document.getElementById('connect').disabled = true
        connOpen = true
      } else {
        console.log('Received', type, message)
        if (type === 'secret') {
          const [key, iv] = message.split(':')
          document.getElementById('key').value = key
          document.getElementById('iv').value = iv
        }
      }
    })
  })
}

reloadBtn.addEventListener('click', () => {
  // kill service worker and reload
  if (!('serviceWorker' in navigator)) {
    window.location.reload()
    return
  }
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    if (registrations.length) {
      for (const registration of registrations) {
        registration.unregister()
      }
    }
  })
  window.location.reload()
})
