'use strict';

const _ = require('lodash');
const queryMap = require('./queryMap');
const { or, eq, and } = require('sequelize').Op;

const queryRegStr = Object.keys(queryMap).map(k => k).join('|');
const regOr = new RegExp(`_or_(${queryRegStr})$`);
const regOrAnd = new RegExp(`_or_and_(${queryRegStr})$`);
const reg = new RegExp(`_(${queryRegStr})$`);

module.exports = where;

/**
 * 处理自定义的where参数, 将其转化为适配sequelize where string
 * @param {Object} opts sequelize find options
 * @param {Object} args the condition of selection
 * @return {void}
 */
function where(opts, args) {
  if (!opts.hasOwnProperty('where')) opts.where = {};
  if (!opts.hasOwnProperty('include')) opts.include = [];

  Object.keys(args).forEach(key => {
    if (key.match(/\.\w+/)) {
      _includeFiled.call(this, opts, key, args[key]);
      return;
    }
    _queryField.call(this, opts, key, args[key]);
  });
}

/**
 * 处理查询条件字段, 将其转换成 sequleize 可识别的格式
 * 支持后缀为 _gt|gte|lt|lte....等
 *
 * @param {Object} opts select options
 * @param {String} key 未处理字段
 * @param {*} value 条件
 * @private
 */
function _queryField(opts, key, value) {
  let field,
    query;

  if (!opts.where) opts.where = {};
  if (reg.test(key) && !regOr.test(key) && !regOrAnd.test(key)) {
    field = key.replace(reg, '');
    query = key.match(reg)[1];

    if (!_.isEmpty(opts.where[field])) {
      const tempValue = opts.where[field];

      opts.where[field] = { [or]: {} };
      opts.where[field][or][queryMap[query].name] = queryMap[query].handler(value);
      _.isObject(tempValue) ? _.assign(opts.where[field][or], tempValue) : opts.where[field][or][eq] = tempValue;
      return;
    }

    opts.where[field] = {};
    opts.where[field][queryMap[query].name] = queryMap[query].handler(value);
    return;
  }

  if (regOr.test(key)) {
    field = key.replace(key, '');
    query = key.match(regOr)[1];
    const childCondition = {};

    childCondition[field] = {
      [queryMap[query].name]: queryMap[query].handler(value),
    };
    _.isArray(opts.where[or]) ? opts.where[or].push(childCondition) : opts.where[or] = [ childCondition ];
    return;
  }

  if (regOrAnd.test(key)) {
    field = key.replace(key, '');
    query = key.match(regOrAnd)[1];
    const childCondition = {};

    childCondition[field] = {
      [queryMap[query].name]: queryMap[query].handler(value),
    };

    if (_.isArray(opts.where[or])) {
      const condition = _.find(opts.where[or], i => _.has(i, and));

      _.isEmpty(condition) ? condition[and].push(childCondition) : opts.where[or].push({ [and]: [ childCondition ] });
      return;
    }

    opts.where[or] = [{ [and]: [ childCondition ] }];
    return;
  }

  opts.where[key] = value;
}

/**
 * 处理include中的where
 * 如果没有相关的model, 则创建一个新的model
 * @param {Object} opts select wherestring
 * @param {String} key 未处理的field
 * @param {String} value 值
 * @private
 */
function _includeFiled(opts, key, value) {
  const mds = key.split('.');
  const field = mds.pop();

  _includeModel.call(this, opts.include, mds, field, value);
}

function _includeModel(include, mds, field, value) {
  if (include.length === 0) {
    include.push(_includeModelFactory.call(this, {}, mds, field, value));
    return;
  }
  // include.length > 0
  const md = mds.shift();
  const model = _.find(include, existModel => existModel.model.name === md);

  if (!model) {
    include.push(_includeModelFactory.call(this, {}, mds, field, value));
    return;
  }

  if (mds.length === 0) {
    _queryField.call(this, model, field, value);
    return;
  }

  if (!model.include) {
    model.include = [];
  }

  _includeModel.call(this, model.include, mds, field, value);
}

/**
 * 处理include 中的对象, 更新where 和 include属性
 * @param {Object} model .
 * @param {Array} mds models 组
 * @param {String} field 待处理对象
 * @param {String} value 待处理值
 * @return {Promise.<*>} 返回model 对象
 * @private
 */
function _includeModelFactory(model, mds, field, value) {
  const md = mds.shift();
  const models = this.sequelize.models;
  let Field = field;

  if (reg.test(field) && !regOr.test(field) && !regOrAnd.test(field)) {
    Field = field.replace(reg, '');
  } else if (regOr.test(field)) {
    Field = field.replace(regOr, '');
  } else if (regOrAnd.test(field)) {
    Field = field.replace(regOrAnd, '');
  }

  model.model = models[md];
  if (mds.length === 0) {
    model.attributes = [ 'id', Field ];
    model.where = {};
    _queryField.call(this, model, field, value);
    return model;
  }

  if (mds.length > 0) {
    model.attributes = [ 'id' ];
    const includeModel = {};

    model.include = [ includeModel ];
    _includeModelFactory.call(this, includeModel, mds, field, value);
  }

  return model;
}

