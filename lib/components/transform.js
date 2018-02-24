'use strict';

const _ = require('lodash');
const kindOf = require('kind-of');
const { typeMap, innerConcat } = require('./util');

module.exports = transform;

/**
 * sequelize instance to json and transform deep level field to shallow level field
 * get the exact fields without dumped fields
 *
 * @param {Object|Array} obj - the instances of model
 * @param {Array} rules - the transformed rule
 * @param {String} rules[].origin - the origin field of instance e.x: product.tags.name
 * @param {String} rules[].field - the new name of previous field e.x: item.title
 * @param {String} [rules[].type] - set type of the value, include: string|datetime|date|integer|float|object|array
 * @param {*} [rules[].default] - if the target field is undefined, set default value
 * @param {String} [rules[].single = false] - if the value is a array and single = true, pick the first value of the array
 * @param {Function} [rules[].translate] - target field handler, e.x: value = 2, x => 2x, final value = 4
 * @param {Function} [rules[].filter] - filter value
 * @param {Boolean} fat = true - cop the entire obj and handle next if set fat to true, else set empty obj and add field to it
 * @return {Array|Object} box
 */
function transform(obj, rules, fat = true) {
  let box;

  if (kindOf(obj) === 'array') {
    box = [];
    for (const item of obj) {
      box.push(transform(item, rules, fat));
    }

    return box;
  }

  box = fat ? box = { ...obj } : box = {};

  for (const rule of rules) {
    if (!rule.field) rule.field = rule.origin;
    const splitPaths = rule.field.split('.');
    const filed = splitPaths.pop();

    if (!fat) _createPath(box, obj, splitPaths); // 复制骨架
    // 如果origin 和 field 路径有重叠的部分, 则会从重叠之后的部分开始
    if (!_.isEmpty(splitPaths) && rule.origin.includes(splitPaths.join('.'))) {
      _handleOverlapPathObj(box, obj, splitPaths, rule, fat);
      continue;
    }

    // 其他情况
    const value = {
      values: [],
      single: true,
    };

    _obtainValues(obj, rule.origin.split('.'), value); // 拿到所有的值
    value.values = _.compact(value.values); // 去除所有空的值
    value.values = innerConcat(value.values); // 去除嵌套数组

    // 过滤value
    if (rule.filter && kindOf(rule.filter) === 'function') {
      value.values = value.values.filter(rule.filter);
    }

    // 处理value
    if (rule.translate && kindOf(rule.translate) === 'function') {
      value.values = value.values.map(rule.translate);
    }

    // 类型转化
    if (rule.type) {
      value.values = value.values.map(v => typeMap[rule.type](v));
    }

    _assignValues(box, obj, rule, splitPaths, filed, value);
  }

  return box;
}

/**
 * 复制骨架, 但是没有具体的值
 * @param {Object} box - 待返回的结果
 * @param {Object} obj - 原始数据
 * @param {Array} splitPaths - 路径
 * @return {void}
 * @private
 */
function _createPath(box, obj, splitPaths) {
  if (splitPaths.length === 0) return;
  const paths = [ ...splitPaths ];
  const tier = paths.shift();
  const field = paths[0];

  if (paths.length === 0 && kindOf(obj[tier]) === 'array') {
    if (_.isEmpty(box[tier]) || kindOf(box[tier]) !== 'array') box[tier] = [];

    for (let index = 0; obj[tier].length > index; index++) {
      if (_.isEmpty(box[tier][index])) box[tier][index] = {};
    }
    return;
  }

  if (paths.length === 0 && kindOf(obj[tier]) === 'object') {
    if (_.isEmpty(box[tier]) || kindOf(box[tier]) !== 'object') box[tier] = {};

    return;
  }

  if (paths.length === 1 && kindOf(obj[tier]) === 'array') {
    if (_.isEmpty(box[tier]) || kindOf(box[tier]) !== 'array') box[tier] = [];

    for (const item of obj[tier]) {
      if (kindOf(item[field]) === 'object') {
        box[tier].push({ [field]: {} });
      }

      if (kindOf(item[field]) === 'array') {
        box[tier].push({ [field]: new Array(item[field].length).fill({}) });
      }
    }
    return;
  }

  if (paths.length === 1 && kindOf(obj[tier]) === 'object') {
    if (_.isEmpty(box[tier]) || kindOf(box[tier]) !== 'object') box[tier] = {};

    if (kindOf(obj[tier][field]) === 'object') box[tier][field] = {};
    if (kindOf(obj[tier][field]) === 'array') box[tier][field] = new Array(obj[tier][field].length).fill({});
    return;
  }


  if (kindOf[obj[tier]] === 'array') {
    if (_.isEmpty(box[tier]) || kindOf(box[tier]) !== 'array') box[tier] = [];

    for (const item of obj[tier]) {
      const nextTier = {};

      box[tier].push(nextTier);
      _createPath(nextTier, item, paths);
    }
    return;
  }

  if (kindOf(obj[tier] === 'object')) {
    if (_.isEmpty(box[tier]) || kindOf(box[tier]) !== 'object') box[tier] = {};

    _createPath(box[tier], obj[tier], paths);

  }
}

/**
 * 处理重叠部分
 * @param {Object} box - 存放处理后的数据
 * @param {Object} obj - 原始数据
 * @param {Array} splitPaths - 路径
 * @param {Object} rule - 规则
 * @param {Boolean} fat - fat 模式
 * @return {void}
 * @private
 */
function _handleOverlapPathObj(box, obj, splitPaths, rule, fat) {
  const container = [];
  const overlapPath = `${splitPaths.join('.')}.`;
  const cloneRule = { ...rule };

  cloneRule.origin = rule.origin.replace(overlapPath, '');
  cloneRule.field = rule.field.replace(overlapPath, '');

  _overlapPath(box, obj, splitPaths, container); // 拿到重叠的对象集合
  for (const item of container) {
    Object.assign(item.box, transform(item.origin, [ cloneRule ], fat));
  }
}

/**
 * 获取重叠部分的object, 继续再每个object上执行transform处理
 * @param {Object} box - 存放处理后的数据
 * @param {Object} obj - 原始数据
 * @param {Array} splitPaths - 路径
 * @param {Array} container - 存放重叠object的array
 * @return {void}
 * @private
 */
function _overlapPath(box, obj, splitPaths, container) {
  const paths = [ ...splitPaths ];
  const tier = paths.shift();

  if (paths.length === 0 && kindOf(obj[tier]) === 'array') {
    for (let index = 0; obj[tier].length > index; index++) {
      container.push({
        origin: obj[tier][index],
        box: box[tier][index],
      });
    }
    return;
  }

  if (paths.length === 0 && kindOf(obj[tier]) === 'object') {
    container.push({
      origin: obj[tier],
      box: box[tier],
    });
    return;
  }

  if (kindOf(obj[tier]) === 'array') {
    for (let index = 0; obj[tier].length > index; index++) {
      _overlapPath(box[tier][index], obj[tier][index], paths, container);
    }
    return;
  }

  if (kindOf(obj[tier]) === 'object') {
    _overlapPath(box[tier], obj[tier], paths, container);
  }


}

/**
 * 获取深层的字段的值
 * @param {Array|Object} obj - sequleize 返回的json结果
 * @param {Array} origin - 深层的属性
 * @param {Object} result - 存放结果的容器
 * @return {void}
 * @private
 */
function _obtainValues(obj, origin, result) {
  const source = [ ...origin ];
  const [ key, field ] = source;

  if (source.length === 1 && obj[key]) {
    result.values.push(obj[key]);
    if (!result.single) return;
    result.single = true;
    return;
  }

  if (source.length === 2 && _.isEmpty(obj[key])) {
    return;
  }
  if (source.length === 2 && kindOf(obj[key]) === 'object') {
    result.values.push(obj[key][field]);
    if (!result.single) return;
    result.single = true;
    return;
  }

  if (source.length === 2 && kindOf(obj[key]) === 'array') {
    obj[key].forEach(i => result.values.push(i[field]));
    result.single = false;
    return;
  }

  const tier = source.shift();

  if (_.isEmpty(obj[tier])) {
    return;
  }

  if (kindOf(obj[tier]) === 'array') {
    result.single = false;
    for (const item of obj[tier]) {
      _obtainValues(item, source, result);
    }
    return;
  }

  if (kindOf(obj[tier]) === 'object') {
    _obtainValues(obj[tier], source, result);

  }


}

/**
 * 将得到的values 分配到目标field中, 支持多级path
 * @param {Object} box - 存放处理后的数据
 * @param {Object} obj - 原始数据
 * @param {Array} rule - 处理规则
 * @param {Array} splitPaths - 多级路径
 * @param {String} field - 重新分配的字段名
 * @param {String} value - 所有的value
 * @return {void}
 * @private
 */
function _assignValues(box, obj, rule, splitPaths, field, value) {
  const source = [ ...splitPaths ];
  const [ tier, ...rest ] = source;

  if (source.length === 0) {
    box[field] = _assignHepler(value, rule);
  }

  if (kindOf(obj[tier]) === 'array') {
    if (_.isEmpty(box[tier]) || kindOf(box[tier]) !== 'array') box[tier] = [];

    for (let index = 0; index < obj[tier].length; index++) {
      let nextTier = {};

      if (_.isEmpty(box[tier])) box[tier].push(nextTier);
      else nextTier = box[tier][index];

      _assignValues(nextTier, obj[tier][index], rule, rest, field, value);
    }
    return;
  }

  if (kindOf(obj[tier]) === 'object') {
    if (_.isEmpty(box[tier]) || kindOf(box[tier] !== 'object')) box[tier] = {};

    let nextTier = {};

    if (_.isEmpty(box[tier])) box[tier] = nextTier;
    else nextTier = box[tier];

    _assignValues(nextTier, obj[tier], rule, rest, field, value);
  }


}

function _assignHepler(value, rule) {
  let v;

  if (_.isEmpty(value.values) && !_.isEmpty(rule.default)) value.values = [ rule.default ];

  if (rule.single || value.single) v = value.values[0];
  else v = value.values;

  return v;
}
