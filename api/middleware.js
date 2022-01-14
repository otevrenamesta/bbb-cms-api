import readdirp from 'readdirp'
import mkdirp from 'mkdirp'
import path from 'path'
import fs from 'fs'
import _ from 'underscore'
import yaml from 'yaml'
import { DATA_FOLDER } from '../consts'

export default { listPages, listMetaInfo, update, create, fileList, writeFile }

async function listPages (filePath) {
  const files = await readdirp.promise(filePath, { fileFilter: '*.yaml' })
  return JSON.stringify(files
    .filter(i => i.basename !== '404.yaml' && i.path.indexOf('_service') < 0)
    .map(i => {
      return {
        path: '/' + i.path.replace(/.yaml$/g, '').replace(/index$/g, ''),
        data: i.path
      }
    }))
}

// This is used only for admin routes
async function fileList (domain, folder, filter, datafolder) {
  const filePath = path.join(datafolder, domain, folder)
  const files = await readdirp.promise(filePath, { fileFilter: filter })
  return _.map(files, i => {
    return i.path
  })
}

async function listMetaInfo (filePath) {
  const files = await readdirp.promise(filePath, { fileFilter: '*.yaml' })
  const data = {}
  function _filterFn (i) {
    return i.basename !== '404.yaml' && i.basename.indexOf(':') === -1
  }
  await Promise.all(files.filter(_filterFn).map(i => {
    return fs.promises.readFile(i.fullPath, 'utf8').then(fileContent => {
      try {
        const tree = yaml.parse(fileContent)
        data[i.path] = { title: tree.title, desc: tree.desc }
      } catch (e) {
        data[i.path] = { title: 'invalid YAML', desc: e }
      }
    })
  }))
  return JSON.stringify(data)
}

function writeFile (webid, file, body) {
  if (!file.match(/^_service\/.*/)) throw new Error('forbidden file')
  const filePath = path.join(datafolder, webid, file)
  return fs.promises.writeFile(filePath, body.content, 'utf8')
}

async function update (webid, file, id, body, ctx) {
  const pathParts = id.split('.')
  // const filename = pathParts[0] === '/' ? 'index.yaml' : `${pathParts[0]}.yaml`
  const filePath = path.join(DATA_FOLDER, webid, file)

  const src = await fs.promises.readFile(filePath, 'utf8')
  const tree = yaml.parse(src)
  const subTree = _.get(tree, pathParts)
  if (!subTree) throw new ctx.ErrorClass(`Nothing found on path: ${id}`)
  Object.assign(subTree, body)
  const newSrc = yaml.stringify(tree)
  await fs.promises.writeFile(filePath, newSrc, 'utf8')
}

async function create (webid, body, UID, ctx) {
  const filePath = path.join(DATA_FOLDER, webid, body.path)
  function _writePage () {
    const now = (new Date()).toISOString()
    const data = `UID: ${UID}\ncreated_at: ${now}\nlayout: page\nchildren:`
    return fs.promises.writeFile(filePath, data, 'utf8')
  }
  try {
    await fs.promises.stat(filePath)
    throw new ctx.ErrorClass(400, 'already exists')
  } catch (e) {
    if (e.code !== 'ENOENT') throw new ctx.ErrorClass(400, e)
    try {
      await _writePage()
    } catch (e) {
      if (e.code !== 'ENOENT') throw new ctx.ErrorClass(400, e)
      const parent = path.dirname(filePath)
      await mkdirp(parent)
      return _writePage()
    }
  }
}