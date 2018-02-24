# egg-sequelize-wrapper

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-sequelize-wrapper.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-sequelize-wrapper
[travis-image]: https://img.shields.io/travis/eggjs/egg-sequelize-wrapper.svg?style=flat-square
[travis-url]: https://travis-ci.org/eggjs/egg-sequelize-wrapper
[codecov-image]: https://img.shields.io/codecov/c/github/eggjs/egg-sequelize-wrapper.svg?style=flat-square
[codecov-url]: https://codecov.io/github/eggjs/egg-sequelize-wrapper?branch=master
[david-image]: https://img.shields.io/david/eggjs/egg-sequelize-wrapper.svg?style=flat-square
[david-url]: https://david-dm.org/eggjs/egg-sequelize-wrapper
[snyk-image]: https://snyk.io/test/npm/egg-sequelize-wrapper/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/egg-sequelize-wrapper
[download-image]: https://img.shields.io/npm/dm/egg-sequelize-wrapper.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-sequelize-wrapper

<!--
Description here.
-->

## Install

```bash
$ npm i egg-sequelize-wrapper --save
```

## Usage

```js
// {app_root}/config/plugin.js
exports.sequelizeWrapper = {
  enable: true,
  package: 'egg-sequelize-wrapper',
};
```

## Example

<!-- example here -->
* find

```js
// {app_root}/app/service/account.js

const accouts = await this.app.model.Account.$findAndCount({
  where: {
    username_like: 'dev',
    'role.description_or_like': '超级',
    'role.description_or_ne': '2018',
    'role.description_or_and_eq': '上班'
  },
  attributes: [ 'id', 'username', 'password', 'createdAt', 'updatedAt' ],
  order: [[ 'createdAt', 'DESC' ]],
  limit: 10,
  offset: 0,
  include: [
    {
      model: model.Role,
      attributes: [ 'id', 'description' ],
      where: {
        status_in: '1,0',
        createdAt_gte: '2018-01-01',
      },
      required: false,
      through: {
        attributes: [],
        where: { status: 1 },
      },
    },
  ],
}, {
  json: true,
  fields: [
    { origin: 'createdAt', type: 'date' },
    { origin: 'password', type: 'empty' },
    {
      origin: 'roles.id',
      field: 'roles',
    },
  ],
  fat: true,
});

```
it separate the opts into query options and return options
the most import change of query options is where, u can use `_(between|like|ne...)` / `_or_(like|ne..)` / `_or_and_(like)` to simplify the query conditions
other attributes which set in `sequelize.model.find` can also be used in query opts, the detail info u can check `lib/components/where.js`

in the return options, there are three parameters: `json` | `fields` | `fat`
`json = true` means the returns had been processed by `JSON.stringify`
if `json = true`, then u can specify every props of the instance, set the rule and return the handled prop, `origin` is necessary, e.x: `companies.staffs.name`
field is the name of the handled prop, it also support nest set. the detail info u can check `lib/components/transform.js`

```js
// qeury result
{
    name: 'company name',
    staffs: [
        {
            name: '小a',
            age: 22,
        },
        {
            name: '小b',
            age: 33,
        }
    ],
    header: {
        name: '小c',
        age: '1966-10-10 00:00:00+8:00',
        role: {
            title: 'CEO'
        }
    }
}

const fields = [
    { origin: 'staffs.name', field: 'staffNames' },
    { origin: 'staffs.age', field: 'doubleStaffName', filter: x => x > 30, translate: x => x * 2},
    { origin: 'header.role.title', field: 'headerTitle'},
    { origin: 'header.age', type: 'date' }
]

// if fat = false

return = { 
   staffNames: [ '小a', '小b' ],
   doubleStaffName: [ 66 ],
   headerTitle: 'CEO',
   header: { age: '1966-10-10' } 
}

// else

return = 
{ name: 'company name',
  staffs: [ { name: '小a', age: 22 }, { name: '小b', age: 33 } ],
  header: { name: '小c', age: '1966-10-10', role: { title: 'CEO' } },
  staffNames: [ '小a', '小b' ],
  doubleStaffName: [ 66 ],
  headerTitle: 'CEO' }

```

* create

it also separate args and return options
the args is same like `sequelize.model.create`, but if the args is array, the function automatically call `bulkCreate`
the return options support relative create

```js

await models.account.$create(
    [
        {
            name: 'a',
            age: 22,
            role: {
                name: 'student'
            }
        }
    ],
    {
        include: [
            {
                model: models.role
            }
        ]
    }
)
```

* update

it receive updateOpts and queryOpts, updateOpts can be object or array, queryOpts support include update
be careful, include need precondition: id & transaction

```js
await models.account.$update(
    {
        name: 'update a',
        role: {
            name: 'senior student'
        }
    },
    {
        where: {name: 'a'},
        include: [{model: models.role}],
        transaction: t
    }
)
```
## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)
