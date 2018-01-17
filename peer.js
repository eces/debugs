const path = require('path')

module.exports.base_from_pkg = (pkg) => {
  let max_peer_depths = Infinity
  let offset = ''

  require_debugs = (extra_path, base_path = process.cwd()) => {
    const current_path = path.join(base_path, extra_path)
    const pkg = require(current_path)
    if (pkg.debugs) {
      const list = []
      pkg.debugs.forEach(e => {
        if (e.endsWith('.json')) {
          // recursively
          list.push(...require_debugs(e, path.dirname(current_path)))
        } else {
          list.push(current_path)
        }
      })
      return list
    } else {
      return []
    }
  }

  const list = require_debugs(pkg)

  list.forEach(e => {
    let l = e.split(path.sep).length
    if (max_peer_depths > l) {
      offset = path.dirname(e)
      max_peer_depths = l
    }
  })
  return offset
}

module.exports.max_depths_from_pkg = (pkg) => {
  let max_peer_depths = 0

  pkg.debugs.forEach(e => {
    if (max_peer_depths > e.split(path.sep).length)
    max_peer_depths = Math.max(max_peer_depths, e.split(path.sep).length)
  })
  return max_peer_depths
}

module.exports.offset_from_depths = (depths) => {
  return Array(depths).fill('..').join(path.sep)
}