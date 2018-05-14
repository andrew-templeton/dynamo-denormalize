

module.exports = processMutations


function processMutations (tableData, denormalizations) {
  const indexed = indexedTableData(tableData, denormalizations)
  denormalizations.forEach((denorm) => {
    tableData[denorm.mutatedTable].forEach((tableElement) => {
      processAlgorithm(tableElement, indexed, denorm.algorithm)
    })
  })
}

function processAlgorithm (tableElement, indices, algorithm) {
  var workingObject = null
  algorithm.forEach((step) => {
    switch (step.type) {
      case 'traverse':
        workingObject = indices[step.table][step.targetKey][tableElement[step.sourceKey]]
        break;
      case 'copy':
        if (tableElement && workingObject) {
          tableElement[step.to] = workingObject[step.from]
        }
        break;
    }
  })
}

function indexedTableData (tableData, denormalizations) {
  const indices = getIndices(denormalizations)
  return indices.reduce((tableHash, nextIndex) => {
    const tableHashElement = tableHash[nextIndex.table] || {}
    tableHash[nextIndex.table] = tableHashElement
    tableHashElement[nextIndex.key] = index(tableData[nextIndex.table], nextIndex.key)
    return tableHash
  }, {})
}

function index (collection, key) {
  const hash = {}
  collection.forEach((elem) => {
    hash[elem[key]] = elem
  })
  return hash
}

function flatten (nested) {
  return [].concat.apply([], nested)
}

function unique (vals) {
  return Object.keys(vals.reduce((hash, next) => {
    hash[next] = true
    return hash
  }, {}))
}

function getIndices (denormalizations) {
  const allAlgoSteps = flatten(denormalizations.map((denorm) => {
    return denorm.algorithm
  }))
  const allIndexingRequests = allAlgoSteps.filter((step) => {
    return step.type === 'traverse'
  }).map((traverseStep) => {
    return traverseStep.table + '::' + traverseStep.targetKey
  })
  const indices = unique(allIndexingRequests).map((identifier) => {
    const parts = identifier.split('::')
    return {
      table: parts.shift(),
      key: parts.join('::')
    }
  })
  return indices
}
