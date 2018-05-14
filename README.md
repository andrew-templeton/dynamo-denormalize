

# dynamo-denormalize


### Purpose

When building DynamoDB-based applications, you may build them with foreign keys to other data.

This can cause performance issues as you move on from normalized thinking, and want to access only one object, without having to do application-level joins to get enough data.

This tool scans your tables, and inserts new fields with the denormalized data for everything in the table, in a batch format.

Future support may also include online-reindexing, where this system deploys stream trigger detectors and performs the denormalization on an ongoing basis to your data, before you have a chance to edit your application code to do the denormalization during normal operation.



### Example

Laywers's office application with multiple offices running it (multi-tenant), allowing Users at many Firms to make Payments on their legal Bills from stored Accounts online.

5 Tables:
- Firm (this is a laywer's office / practice / company)
- User (has an firm_id field)
- Bill (has a user_id field, but no firm_id field)
- Payment (has a user_id field, but no firm_id field)
- Account (has a user_id field, but no firm_id field)

In the above, you cannot get which Institution the Payment, Bill, or Account belongs to, without doing an application-level join, in two serial requests for each data type:
- Get the Payment / Bill / Account by id
- Get the User by user_id from one of the above three types
- Read the firm_id on the User

The denormalizer pulls the Bills, Payments, Accounts, and Users, indexes the data in memory, traverses along those keys (you as the user define the keys to traverse), and writes the Bills, Payments, and Accounts back to the tables. For this example, we will want to be to directly tell what Firm a Payment, Bill, or Account belongs to, by adding a `firm_id` property directly to each of these table's objects.

It changes your data model to include the additional keys, and prevent needing traversal in the future.



### Setup

```
git clone https://github.com/andrew-templeton/dynamo-denormalize
npm install
export AWS_PROFILE=<your named profile>
export AWS_REGION=<region with the tables>
```


### Usage

##### Invocation
```
DynamoDenormalize(denormalizations, callback)
```

##### Required IAM Policy Permissions
For each table being manipulated or used as a source of data:
```
dynamodb:BatchGetItem
dynamodb:BatchWriteItem
dynamodb:DescribeTable
dynamodb:Scan
```

##### Denormalizations
An array of denormalization elements, like the following:
```
// Single denormalization format
const denormalization = {
  mutatedTable: 'YOUR DYNAMO TABLE NAME',
  algorithm: someDenormalizationAlgorithm
}
```

##### Denormalization Algorithms
An array of algorithm step elements, like the following:

###### `traverse` Step
A step which starts moves from the current context object, to another table, via a key. The following moves from a table context which has a `user_id` field, then finds the corresponding item in `User`, which has an `id` equal to the starting table's `user_id`.
```
const traversalStepExample = {
  // Always this value for traverse
  type: 'traverse',
  // The key on the current context object to use as lookup on another table (foreign key)
  sourceKey: 'user_id',
  // The table to traverse to
  table: 'User',
  // The field to use on the destination table and match with the foreign key / sourceKey from source table
  targetKey: 'id'
}
```

###### `copy` Step
A step which copies a data value from the presently-visited object in the algorithm, to the object within the table receiving mutations by the algorithm. The following copies the value at `firm_id` of the visited object, and puts it as `firm_id` on the object receiving mutations.
```
{
  // Always this value for copy
  type: 'copy',
  // The name of the key on the presently-visited object in the algorithm to copy FROM
  from: 'firm_id',
  // The name of the key on the object within the mutable table to save TO
  to: 'firm_id'
  // Often times, it will make sense to name them the same thing - if you're doing Foreign Key denormalization across object types/tables.
}
```

###### Most Common: Traverse + Copy
The following goes from a type of object which has a `user_id` field on it, then traverses to the `User` table by finding an object in the `User` with an `id` that matches the `user_id` on the starting object (like a Bill, for example), then once it has traversed to the corresponding User object, copies the User's `firm_id` into the Bill's object as `firm_id` (using the same key name in this example).

```
[
  {
    type: 'traverse',
    sourceKey: 'user_id',
    table: 'User',
    targetKey: 'id'
  },
  {
    type: 'copy',
    from: 'firm_id',
    to: 'firm_id'
  }
]
```



### Usage Example
This one follows along with the Example use-case above, adding the `firm_id` to each table type.
```
const DynamoDenormalize = require('dynamo-denormalize')
const addInstitutionIdAlgo = [
  {
    type: 'traverse',
    sourceKey: 'user_id',
    table: 'User',
    targetKey: 'id'
  },
  {
    type: 'copy',
    from: 'firm_id',
    to: 'firm_id'
  }
]
const denormalizations = [
  'Bill',
  'Account',
  'Payment'
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
```
