require('debugs/init')

const d1 = require('debug')('peer1')
const d2 = require('debug')('peer2')
const d2a = require('debug')('peer2-standalone')

d1('alive')
d2('alive')
d2a('alive')