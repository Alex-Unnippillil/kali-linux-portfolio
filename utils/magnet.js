const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const http = require('http')
const https = require('https')
const { URL } = require('url')

const sha256File = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })

const magnetURI = (filePath, sha256) => {
  const name = path.basename(filePath)
  return `magnet:?dn=${encodeURIComponent(name)}&xt=urn:sha256:${sha256}`
}

const signMagnet = (magnet, privateKey) => {
  const signer = crypto.createSign('sha256')
  signer.update(magnet)
  signer.end()
  return signer.sign(privateKey).toString('base64')
}

const fetchSha256 = (url) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const parsed = new URL(url)
    const getter = parsed.protocol === 'https:' ? https.get : http.get
    getter(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      res.on('data', (d) => hash.update(d))
      res.on('end', () => resolve(hash.digest('hex')))
      res.on('error', reject)
    }).on('error', reject)
  })

const generateSignedMagnet = async (filePath, keyPath, mirrorUrl) => {
  const sha256 = await sha256File(filePath)
  const magnet = magnetURI(filePath, sha256)
  const privateKey = fs.readFileSync(keyPath, 'utf8')
  const signature = signMagnet(magnet, privateKey)
  let mirrorMatch
  if (mirrorUrl) {
    const mirrorHash = await fetchSha256(mirrorUrl)
    mirrorMatch = mirrorHash === sha256
  }
  return { sha256, magnet, signature, mirrorMatch }
}

module.exports = {
  sha256File,
  magnetURI,
  signMagnet,
  fetchSha256,
  generateSignedMagnet,
}
