
const async = require('async')

const fullTableScan = require('./fullTableScan')


module.exports = multiTableScan


function multiTableScan (tables, done) {
  async.map(tables, fullTableScan, (err, scannedObjects) => {
    if (err) {
      return done(err)
    }
    const scanHash = tables.reduce((hash, nextTable, index) => {
      hash[nextTable] = scannedObjects[index]
      return hash
    }, {})
    done(null, scanHash)
  })
}
