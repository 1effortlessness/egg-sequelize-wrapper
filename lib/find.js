'use strict';
const _ = require('lodash');
const kindOf = require('kind-of');
const where = require('./components/where');
const include = require('./components/include');
const transform = require('./components/transform');

module.exports = find;
/**
 * 批量查询, 升级版的find的查询
 *
 * @param {String} method - 查询方法
 * @param {Object} queryOpts - 各种查询参数
 * @param {Object} [queryOpts.where] - 查询条件
 * @param {Object|Array} [queryOpts.attributes] - 返回字段
 * @param {Array|Function} [queryOpts.order] - 排序
 // * @param {Number} [queryOpts.limit} - limit 字段
 // * @param {Number} [queryOpts.offset} - offset 字段
 * @param {Object} [queryOpts.transaction] - 事务
 * @param {Boolean} [queryOpts.raw] - return the raw result
 * @param {Boolean} [queryOpts.logging] - 是否打印select 语句
 * @param {Array} [queryOpts.group] - 设置 group by 属性
 * @param {Object} returnOpts - 返回结果的处理
 * @param {Array} [returnOpts.fields] - 设定或者加工要返回的字段
 * @param {Boolean} [returnOpts.fat] - 如果fields 不为空的条件下, 设定返回贪婪数据(尽量返回多的字段)还是非贪婪数据
 * @param {Boolean} [returnOpts.json] - 如果为true, 返回json化的数据
 * @return {Promise.<Object|Array>} 返回查询的结果
 */
async function find(method, queryOpts = {}, returnOpts = { json: true }) {
  const opts = { ...queryOpts, include: [], where: {} };

  if (!_.isEmpty(queryOpts.where)) {
    where.call(this, opts, queryOpts.where);
  }

  if (!_.isEmpty(queryOpts.include)) {
    include.call(this, opts, queryOpts.include);
  }

  const result = await this[method](opts);

  if (kindOf(returnOpts.json) === 'boolean' && !returnOpts.json) return result;

  let rows = method === 'findAndCount' ? result.rows : result;

  if (method === 'findAndCount') {
    rows = result.rows.map(i => i.toJSON());
  }

  if (method === 'findAll') {
    rows = result.map(i => i.toJSON());
  }

  if (method === 'findOne') {
    rows = result.toJSON();
  }

  if (!_.isEmpty(returnOpts.fields)) {
    rows = transform(rows, returnOpts.fields, returnOpts.fat);
  }

  if (method === 'findAndCount') {
    return { rows, count: result.count };
  }

  return rows;
}
