'use strict';

const _ = require('lodash');
const kindOf = require('kind-of');
const where = require('./where');

module.exports = include;

/**
 * 处理sequelize include 属性
 * @param {Object} opts sequelize find options
 * @param {array<Object>} [args] include 参数
 * @param {String|Object} args[].model The model you want to eagerly load
 * @param {String} [args[].as] 别名
 * @param {Object} [args[].where] Where clauses to apply to the child models.
 * @param {Boolean} [args[].or] Whether to bind the ON and WHERE clause together by OR instead of AND.
 * @param {Array} [args[].attributes] A list of attributes to select from the child mode
 * @param {Boolean} [args[].required] true inner/ false outer
 * @param {Boolean} [args[].separate] If true, runs a separate query to fetch the associated instances, only supported for hasMany associations
 * @param {Number} [args[].limit] Limit the joined rows, only supported with include.separate=true
 * @param {Object} [args[].through.where] 中间表的筛选条件
 * @param {Array} [args[].through.attributes] A list of attributes to select from the join model for belongsToMany relations
 * @param {Array<Object>} [args[].include] 嵌套的include
 */
function include(opts, args) {
  if (!opts.hasOwnProperty('include')) opts.include = [];

  for (const arg of args) {
    const model = _.find(opts.include, existModel => existModel.model.name === (kindOf(arg.model) === 'string' ? arg.model : arg.model.name));

    if (!model) {
      opts.include.push(_model.call(this, {}, arg));
      continue;
    }
    _model.call(this, model, arg);
  }
}

function _model(model, arg) {
  const models = this.sequelize.models;

  if (_.isString(arg.model)) model.model = models[arg.model];
  if (arg.where && _.isObject(arg.where)) {
    where.call(this, model, arg.where);
  }
  if (arg.include) {
    include.call(this, model, arg.include);
  }

  return model;
}

