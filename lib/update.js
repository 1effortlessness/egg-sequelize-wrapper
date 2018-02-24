'use strict';

const updateOrCreate = require('./components/updateOrCreate');
const kindOf = require('kind-of');

module.exports = update;
/**
 * 针对update 方法的封装, 支持关联数据创建
 * @param {Object|Array} values - 待更新参数
 * @param {Object} opts - 更新时传入的参数
 * @param {Array} [opts.include] - 关联数据的更新或者创建
 * @param {Object} [opts.include[].model] - 关联的sequelize model
 * @return {Promise.<Object|Array>} 更新后的数组的集合或者对象
 */
async function update(values, opts) {
  let result;

  if (kindOf(values) === 'object') {
    result = await this.update(values, opts);
    if (values.id && opts.include) {
      const t = opts.transaction;

      const source = await this.findById(values.id, { attributes: [ 'id' ] });

      for (const foreign of opts.include) {
        await updateOrCreate.call(this, source, values, foreign, t);
      }

      result = await this.findById(values.id, {
        transaction: t,
        include: opts.include,
      });
    }

    return result;
  }

  if (kindOf(values) !== 'array') return;

  result = [];
  for (const value of values) {
    result.push(await update.call(this, value, opts));
  }

  return result;
}
