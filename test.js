const DynamoDenormalize = require('./index')
const addInstitutionIdAlgo = [
  {
    type: 'traverse',
    sourceKey: 'user_id',
    table: 'qa-UserTable',
    targetKey: 'id'
  },
  {
    type: 'copy',
    from: 'institution_id',
    to: 'institution_id'
  }
]
const denormalizations = [
  'qa-LoanTable',
  'qa-AccountTable',
  'qa-PaymentTable'
].map((table) => {
  return {
    mutatedTable: table,
    algorithm: addInstitutionIdAlgo
  }
})

DynamoDenormalize(denormalizations, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log('Denormalized!')
  process.exit(0)
})
