import files from './files.js'

const WEBMASTER = process.env.WEBMASTER_GROUP || 'webmaster'

export default (ctx) => {
  const { express, auth, app, DATA_FOLDER } = ctx
  const { required, requireMembership } = auth
  const JSONBodyParser = express.json()

  app.get('/componentlist', 
    required, 
    requireMembership(WEBMASTER), 
    (req, res, next) => {
      const domain = process.env.DOMAIN || req.hostname
      files.fileList(domain, '_service/components', '*.js', DATA_FOLDER)
        .then(list => res.json(list))
        .catch(next)
    })

  app.get('/layoutlist', 
    required, 
    requireMembership(WEBMASTER), 
    (req, res, next) => {
      const domain = process.env.DOMAIN || req.hostname
      files.fileList(domain, '_service/layouts', '*.html', DATA_FOLDER)
        .then(list => res.json(list))
        .catch(next)
    })

  app.post('/',
    required,
    JSONBodyParser,
    (req, res, next) => {
      const domain = process.env.DOMAIN || req.hostname
      files.create(domain, req.body, auth.getUID(req), DATA_FOLDER)
        .then(created => { res.json({ content: created }) })
        .catch(next)
    })

  app.put('/',
    required,
    JSONBodyParser,
    (req, res, next) => {
      const domain = process.env.DOMAIN || req.hostname
      files.update(domain, req.query.file, req.query.id, req.body, DATA_FOLDER)
        .then(updated => { res.json('ok') })
        .catch(next)
    })

  app.put('/file',
    required, 
    requireMembership(WEBMASTER),
    JSONBodyParser, 
    (req, res, next) => {
      const domain = process.env.DOMAIN || req.hostname
      files.writeFile(domain, req.query.file, req.body, DATA_FOLDER)
        .then(updated => { res.json('ok') })
        .catch(next)
    })

  return app
}
