
const async = require('async')
const AWS = require('aws-sdk')

const DynamoDB = new AWS.DynamoDB.DocumentClient()

const MAX_WRITE_SIZE = 25

module.exports = batchWrite

function batchWrite (table, items, next, quiet) {

  const begin = Date.now()
  const sec = 1000
  var lastPrint = begin
  var lastCount = 0

  const printer = setInterval(printProgress, sec)

  function printProgress () {
    const completed = items.length - buffer.length
    const now = Date.now()
    const rate = Math.floor((completed - lastCount) / ((now - lastPrint) / sec))
    const overallRate = Math.floor(completed / ((now - begin) / sec))
    console.log('Write progress for table %s: Completed: %s; Rate: %s; Overall Rate: %s; Estimated Completion: %s sec',
      table, completed, rate, overallRate, Math.floor(buffer.length / overallRate))
    lastPrint = now
    lastCount = completed
  }

  if (!quiet) {
    console.log('Writing %s items to table %s: %j', items.length, table, items)
  }
  const buffer = items.slice()
  async.whilst(bufferHasElements, function (chunkDone) {
    const chunk = buffer.splice(0, MAX_WRITE_SIZE)
    if (!quiet) {
      console.log('Writing chunk of %s items to %s table: %j', chunk.length, table, chunk)
    }
    DynamoDB.batchWrite(makeBatchRequest(table, chunk), (err, chunkWriteResult) => {
      if (err) {
        console.error('Fatal error on batch write attempt: %j', err)
        return chunkDone(err)
      }
      if (!quiet) {
        console.log('Batch chunk request complete: %j', chunkWriteResult)
      }
      const unprocessedItems = (chunkWriteResult.UnprocessedItems[table] || []).map(function (req) {
        return req.PutRequest.Item
      })
      if (unprocessedItems.length) {
        console.log('Could not write %s items from chunk, pushing back into buffer...', unprocessedItems.length)
        buffer.push.apply(buffer, unprocessedItems)
      } else if (!quiet) {
        console.log('Was able to write all %s items from chunk to table %s', chunk.length, table)
      }
      if (!quiet) {
        console.log('Continuing to next chunk, if applicable...')
      }
      chunkDone()
    })
  }, (err) => {
    clearInterval(printer)
    if (err) {
      console.error('Could not perform buffered batch write to %s', table)
      return next(err)
    }
    console.log('Done with batched write of %s items to table %s', items.length, table)
    next()
  })



  function bufferHasElements () {
    return !!buffer.length
  }
}

function makeBatchRequest (table, chunk) {
  return {
    RequestItems: {
      [table]: chunk.map(function (item) {
        return {
          PutRequest: {
            Item: item
          }
        }
      })
    }
  }
}
