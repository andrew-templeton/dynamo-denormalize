

/*
{
  tableName: elements,
  table2: elements2
}
*/

const async = require('async');
const batchWrite = require('./batchWrite')

module.exports = multiTableWrite

function multiTableWrite (writeSet, next) {
  const tables = Object.keys(writeSet)
  async.each(tables, (table, tableDone) => {
    batchWrite(table, writeSet[table], tableDone, true)
  }, (err, result) => {
    if (err) {
      return next(err)
    }
    console.log('Completed all multi-table writes!')
    next(null, result)
  })
}
