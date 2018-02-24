'use strict';

const inflection = require('inflection');
const kindOf = require('kind-of');
const { Op } = require('sequelize');

module.exports = updateOrCreate;

/**
 * 创建或者更新关系表中的数据
 * @param {Object} source - sequelize Instance 实例
 * @param {Object} body - 待更新的数据
 * @param {Object} foreign - 关系声明
 * @param {Object} foreign.model - sequelize model 实例
 * @param {Array} [foreign.include] - 嵌套关系声明
 * @param {Object} [t] - 事务对象
 */
async function updateOrCreate(source, body, foreign, t) {
  const association = this.associations[foreign.model.name] || this.associations[inflection.pluralize(foreign.model.name)];
  if (!association) return;

  switch (association.associationType) {
    case 'HasOne':
      await one2one.call(this, source, body, association, foreign, t);
      break;
    case 'HasMany':
      await one2many.call(this, source, body, association, foreign, t);
      break;
    case 'BelongsToMany':
      await many2many.call(this, source, body, association, foreign, t);
      break;
    default:
      // const err = new Error(`Association Error: found no relation with ${foreign.model.name}`);
      // err.code = 422;
      // err.status = 200;
      // throw err;
      break;
  }
}

/**
 * 处理一对一的关系表, 如果body中存在id, 则更新
 * 否则删除之前的数据, 创建一条新数据
 * @param {Object} source - 主表数据对象
 * @param {Object} body - 待更新的数据载体
 * @param {Object} association - 关系对象
 * @param {Object} foreign - 关系声明
 * @param {Object} t - 事务对象
 */
async function one2one(source, body, association, foreign, t) {
  const childBody = body[association.as];
  if (!childBody) return;

  await foreign.model.destroy({
    where: { [association.foreignKey]: source.id },
    transaction: t,
  });

  childBody[association.foreignKey] = source.id;
  const childSource = await foreign.model.create(childBody, { transaction: t });

  if (kindOf(foreign.include) !== 'array') return;

  for (const childForeign of foreign.include) {
    await updateOrCreate.call(this, childSource, childBody, childForeign, t);
  }
}


/**
 * 处理一对多关系, 之前的source的链接关系全部删除
 * 建立新的的数据
 * @param {Object} source - 主表数据对象
 * @param {Object} body - 待更新的数据载体
 * @param {Object} association - 关系对象
 * @param {Object} foreign - 关系声明
 * @param {Object} t - 事务对象
 */
async function one2many(source, body, association, foreign, t) {
  const childBody = body[association.as];
  if (!childBody || kindOf(childBody) !== 'array') return;

  await foreign.model.destroy({
    where: { [association.foreignKey]: source.id },
    transaction: t,
  });

  for (const item of childBody) {
    item[association.foreignKey] = source.id;
    const childSource = await foreign.model.create(item, { transaction: t });

    if (kindOf(foreign.include) !== 'array') continue;

    for (const childForeign of foreign.include) {
      await updateOrCreate.call(this, childSource, item, childForeign, t);
    }
  }
}

/**
 * 处理多对多关系, 有id的upsert, 没有的创建,
 * 最后拿到所有的对应的sequelize instance, 更新多对多关系
 * 注: 不支持嵌套创建
 * @param {Object} source - 主表数据对象
 * @param {Object} body - 待更新的数据载体
 * @param {Object} association - 关系对象
 * @param {Object} foreign - 关系声明
 * @param {Object} t - 事务对象
 */
async function many2many(source, body, association, foreign, t) {
  const childBody = body[association.as];
  if (!childBody || kindOf(childBody) !== 'array') return;

  const waitToCreate = childBody.filter(i => !i.id);
  const waitToUpdate = childBody.filter(i => i.id);
  for (const item of waitToUpdate) {
    await foreign.model.upsert(item, { transaction: t });
  }
  const created = await foreign.model.bulkCreate(waitToCreate, { transaction: t });
  const allRelatedIds = [ ...waitToUpdate.map(i => i.id), ...created.map(i => i.id) ];
  const allRelatedInstance = await foreign.model.findAll({
    where: { id: { [Op.in]: allRelatedIds } },
    transaction: t,
  });

  await source[association.accessors.set](allRelatedInstance, { transaction: t });
}

