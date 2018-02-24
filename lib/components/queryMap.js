'use strict';
const _ = require('lodash');
const Op = require('sequelize').Op;

module.exports = {
  gt: {
    name: Op.gt,
    handler: x => x,
  },
  gte: {
    name: Op.gte,
    handler: x => x,
  },
  lt: {
    name: Op.lt,
    handler: x => x,
  },
  lte: {
    name: Op.lte,
    handler: x => x,
  },
  ne: {
    name: Op.ne,
    handler: x => x,
  },
  eq: {
    name: Op.eq,
    handler: x => x,
  },
  not: {
    name: Op.not,
    handler: x => x,
  },
  between: {
    name: Op.between,
    handler: x => (_.isArray(x) ? x : x.split(',')),
  },
  notBetween: {
    name: Op.notBetween,
    handler: x => (_.isArray(x) ? x : x.split(',')),
  },
  in: {
    name: Op.in,
    handler: x => (_.isArray(x) ? x : x.split(',')),
  },
  notIn: {
    name: Op.notIn,
    handler: x => (_.isArray(x) ? x : x.split(',')),
  },
  like: {
    name: Op.like,
    handler: x => `%${x.split(' ').join('%')}%`,
  },
  notLike: {
    name: Op.notLike,
    handler: x => `%${x.split(' ').join('%')}%`,
  },
};

