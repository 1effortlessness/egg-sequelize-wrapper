'use strict';

const kindOf = require('kind-of');

module.exports = create;
/**
 * 针对create|bulkCreate方法的封装
 * @param {Object|Array} values - 待创建的数据
 * @param {Object} opts - 更新时的参数
 * @return {Promise.<Array|Object>} 创建后的数据
 */
async function create(values, opts) {
  let result;

  if (kindOf(values) === 'object') {
    result = await this.create(values, opts);
    return result;
  }

  if (kindOf(values) === 'array' && !opts.include) {
    result = await this.bulkCreate(values, opts);
    return result;
  }

  if (kindOf(values) === 'array' && opts.include) {
    result = [];
    for (const value of values) {
      result.push(await this.create(value, opts));
    }
  }

  return result;
}
