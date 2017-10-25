// DEBUG=$(node ../index.js --c) node ./index.js
// "prestart": "node ../index.js init",

const debug_api = require('debug')('api')
const debug_api_user = require('debug')('api:user')
const debug_db = require('debug')('db')
const debug_cache = require('debug')('cache:2')

debug_db('debug_db')
debug_api('debug_api')
debug_api_user('debug_api_user')
debug_cache('debug_cache')

return