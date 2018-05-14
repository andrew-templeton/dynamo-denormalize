
const async = require('async')
const AWS = require('aws-sdk')

const DynamoDB = new AWS.DynamoDB()
const DocumentClient = new AWS.DynamoDB.DocumentClient()


module.exports = fullTableScan

// Single thread / worker method
function fullTableScan (table, next) {
  var startKey = null
  const items = []

  const begin = Date.now()
  const sec = 1000
  var lastPrint = begin
  var lastCount = 0

  var itemEstimate = null

  DynamoDB.describeTable({
    TableName: table
  }, (err, description) => {
    if (err) {
      return next(err)
    }
    itemEstimate = description.Table.ItemCount
    const printer = setInterval(printProgress, sec)
    async.doWhilst(scanPage, startKeyExists, function (err) {
      clearInterval(printer)
      if (err) {
        console.error('Problem scanning runs: %j', err)
        return next(err)
      }
      console.log('Scan done for table %s got: %s', table, items.length)
      next(null, items)
    })
  })

  function scanPage (scanDone) {
    DocumentClient.scan({
      TableName: table,
      ExclusiveStartKey: startKey
    }, function (err, data) {
      if (err) {
        console.error('Problem with scan: %j', err)
        return scanDone(err)
      }
      data.Items.forEach((item) => {
        items.push(item)
      })
      startKey = data.LastEvaluatedKey
      scanDone()
    })
  }

  // invoked synchronously after the scanPage ops finish
  function startKeyExists () {
    // !! coerces anything to boolean
    return !!startKey
  }

  function printProgress () {
    const now = Date.now()
    const rate = Math.floor((items.length - lastCount) / ((now - lastPrint) / sec))
    const overallRate = Math.floor(items.length / ((now - begin) / sec))
    console.log('Scan prog for table %s: Scanned: %s; Rate: %s, Overall Rate: %s; Estimated Completion: %s sec',
      table, items.length, rate, overallRate, Math.floor((itemEstimate - items.length) / overallRate))
    lastPrint = now
    lastCount = items.length
  }
}
