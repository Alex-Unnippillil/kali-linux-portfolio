import { generateSignedMagnet } from '../utils/magnet.js'

const [,, file, key, mirror] = process.argv

if (!file || !key) {
  console.error('Usage: node scripts/generate-signed-magnet.mjs <file> <privateKey> [mirrorUrl]')
  process.exit(1)
}

try {
  const { sha256, magnet, signature, mirrorMatch } = await generateSignedMagnet(file, key, mirror)
  console.log('SHA-256:', sha256)
  console.log('Magnet URI:', magnet)
  console.log('Signature (base64):', signature)
  if (mirror) {
    console.log(`HTTP mirror hash ${mirrorMatch ? 'matches' : 'does not match'} local hash`)
    if (!mirrorMatch) process.exit(1)
  }
} catch (err) {
  console.error(err)
  process.exit(1)
}
