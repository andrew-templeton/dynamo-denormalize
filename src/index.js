
const multiTableScan = require('./multiTableScan')
const processMutations = require('./processMutations')
const multiTableWrite = require('./multiTableWrite')

module.exports = DynamoDenormalize

function DynamoDenormalize (denormalizations, next) {
  const tableFlags = {}
  denormalizations.forEach((denorm) => {
    tableFlags[denorm.mutatedTable] = true
    denorm.algorithm.forEach((step) => {
      if (step.table) {
        tableFlags[step.table] = true
      }
    })
  })
  const tables = Object.keys(tableFlags)
  console.log('Algorithms require scan of tables: %j', tables)
  multiTableScan(tables, (err, results) => {
    if (err) {
      console.error(err)
      next(err)
    }
    console.log('All scans complete, executing denormalization algorithms...')
    processMutations(results, denormalizations)
    console.log('Denormalization complete.')
    const writes = {}
    denormalizations.forEach((denorm) => {
      writes[denorm.mutatedTable] = results[denorm.mutatedTable]
    })
    console.log('Algorithms require writing to tables: %j', Object.keys(writes))
    multiTableWrite(writes, next)
  })
}
