import crypto from 'crypto'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const [, , decrypt, secret, pair, ...args] = process.argv

const key = crypto.scryptSync(secret, 'salt', 32)
const iv = crypto.scryptSync(pair, 'salt', 8).toString('hex')

const [flag, value] = args
let contents
let fileName
switch (flag) {
  case '-f':
    contents = fs.readFileSync(path.join(__dirname, value), 'utf8')
    fileName = `${path.basename(value)}`.replace(/\s|\./ig, '')
    break
  default:
    contents = value
    break
}

const outputDir = path.join(__dirname, '/output/')
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)

const algorithm = 'aes256'

let result
if (decrypt === '1') {
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  result = decipher.update(contents, 'hex', 'utf8') + decipher.final('utf8')
  console.log(result)
} else {
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  result = cipher.update(contents, 'utf8', 'hex') + cipher.final('hex')
  fs.writeFileSync(path.join(outputDir, `${fileName}.enc`), result)
}

console.log('done')
