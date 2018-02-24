'use strict';

const find = require('./lib/find');
const create = require('./lib/create');
const update = require('./lib/update');

module.exports = app => {
  const Model = app.model.Sequelize.Model;


  Model.$findAll = async function(queryOpts, returnOpts) {
    const result = await find.call(this, 'findAll', queryOpts, returnOpts);
    return result;
  };

  Model.$findOne = async function(queryOpts, returnOpts) {
    const result = await find.call(this, 'findOne', queryOpts, returnOpts);
    return result;
  };

  Model.$findAndCount = async function(queryOpts, returnOpts) {
    const result = await find.call(this, 'findAndCount', queryOpts, returnOpts);
    return result;
  };

  Model.$create = async function(values, opts) {
    const result = await create.call(this, values, opts);
    return result;
  };

  Model.$update = async function(values, opts) {
    const result = await update.call(this, values, opts);
    return result;
  };
};
