/** @jest-environment node */
import fs from 'fs'
import path from 'path'
import { createHash, createVerify, generateKeyPairSync } from 'crypto'
import { generateSignedMagnet } from '../utils/magnet.js'

test('generateSignedMagnet produces valid hash and signature', async () => {
  const tmpFile = path.join(__dirname, 'tmp.txt')
  fs.writeFileSync(tmpFile, 'test')
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const privPath = path.join(__dirname, 'tmp.key')
  fs.writeFileSync(privPath, privateKey.export({ type: 'pkcs1', format: 'pem' }))
  const { sha256, magnet, signature } = await generateSignedMagnet(tmpFile, privPath)
  const expectedHash = createHash('sha256').update('test').digest('hex')
  expect(sha256).toBe(expectedHash)
  const verifier = createVerify('sha256')
  verifier.update(magnet)
  verifier.end()
  const valid = verifier.verify(publicKey.export({ type: 'pkcs1', format: 'pem' }), Buffer.from(signature, 'base64'))
  expect(valid).toBe(true)
  fs.unlinkSync(tmpFile)
  fs.unlinkSync(privPath)
})
