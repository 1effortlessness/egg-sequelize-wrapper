'use strict';
const moment = require('moment');
const _ = require('lodash');

exports.typeMap = {
  integer: i => parseInt(i),
  number: i => _.toNumber(i),
  datetime: i => moment(i).format('YYYY-MM-DD HH:mm'),
  date: i => moment(i).format('YYYY-MM-DD'),
  array: i => (_.isString(i) ? i.split(',') : _.toArray(i)),
  object: i => JSON.parse(i),
  string: i => JSON.stringify(i),
  empty: () => null,
};

/**
 * 如果嵌套数组, 则提取出来
 * @param {Array} array - 待转化数组
 * @return {Array} 返回一个新的数组
 */
exports.innerConcat = array => Array.prototype.concat.apply([], array);
