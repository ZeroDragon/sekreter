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
const output = document.getElementById('output')
const copy = document.getElementById('copy')

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
})

decryptBtn.addEventListener('click', async () => {
  const { input, key, iv } = getValues()
  const decrypted = await parseError(decryptText(input, key, iv))
  output.textContent = decrypted
})

copy.addEventListener('click', () => {
  const text = output.textContent
  navigator.clipboard.writeText(text).then(() => {
    console.log('Text copied to clipboard')
  }).catch(err => {
    console.error('Failed to copy text: ', err)
  })
})
