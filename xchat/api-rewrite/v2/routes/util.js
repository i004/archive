import express from 'express';
import User from '../objects/User.js';
import Session from '../objects/Session.js';
import { APIError, AdvancedAPIError } from '../objects/Error.js';

/**
 * 
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @returns {Promise<User>}
 */
export async function resolveAuth (req, res) {
    if (!req.headers['x-session-id'])
        throw new APIError('Unauthorized', 401, req, res);

    const session = await Session.fetch(req.headers['x-session-id']);
    const user = await User.fetch(session.privateId);

    return user;
}

/**
 * @typedef {'string' | 'number' | 'boolean' | 'object'} ExtractParamsTypeNames
 * @typedef {string | number | boolean | object | Array} ExtractParamsTypes
 * @typedef {{
 *  required?: boolean,
 *  type?: ExtractParamsTypeNames,
 *  arrayOf?: ExtractParamsTypeNames,
 *  range?: [number, number],
 *  choice?: ExtractParamsTypes[],
 *  keys?: Record<string, ExtractParamsValidationConfig>
 * }} ExtractParamsValidationConfig
 */

/**
 * 
 * @template T
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {T extends Record<string, ({
 *  from: 'param' | 'body' | 'query',
 *  format?: (ExtractParamsTypes) => any,
 *  predicate?: (ExtractParamsTypes) => [boolean, string, any]
 * } & ExtractParamsValidationConfig)>} params
 * @returns {Record<T, ExtractParamsTypeNames>}
 */
export function extractParams (req, res, params={}) {
    const result = {};
    const error = [];

    /**
     * 
     * @param {string} name
     * @param {ExtractParamsTypes} value 
     * @param {ExtractParamsValidationConfig} config 
     */
    function _verifyKey (name, value, config) {
        if (!value && config.required)
            return [name, 'FIELD_REQUIRED'];

        if (config.type && typeof value != config.type)
            return [name, 'TYPE_MISMATCH', config.type];

        if (config.arrayOf && (!Array.isArray(value) || value.find(x => typeof x != config.arrayOf)))
            return [name, 'TYPE_MISMATCH', `Array<${config.type}>`];

        if (config.range && (value < config.range[0] || value > config.range[1]))
            return [name, 'VALUE_NOT_IN_RANGE', config.range];

        if (config.choice && !config.choice.includes(value))
            return [name, 'INVALID_CHOICE', config.choice];

        if (config.keys) {
            const sub = [];

            for (let k in config.keys)
                sub.push(_verifyKey(k, value[k], config.keys[k]));
            
            if (sub.find(x => x != true))
                return [name, sub];
        }

        return true;
    }

    for (let key in params) {
        const config = params[key];
        const value = req[config.from][key];
        const res = _verifyKey(key, value, config);

        if (res != true)
            error.push(res);
        else {
            const formatted = config.format ? config.format(value) : value;

            if (config.predicate) {
                const check = config.predicate(formatted);
                if (!check[0]) {
                    error.push([key, ...check.slice(1)]);
                    continue;
                }
            }

            result[key] = formatted;
        }
    }

    if (error.length > 0)
        throw new AdvancedAPIError(400, req, res).addErrors(error);

    return result;
}

/**
 * 
 * @param {express.Request & { test: number }} req 
 * @param {express.Response} res 
 * @param {express.NextFunction} next 
 */
export default function middleware (req, res, next) {
    req.resolveAuth = () => resolveAuth(req, res);
    req.extractParams = (params={}) => extractParams(params);
    req.error = (message, code=400) => { throw new APIError(message, code, req, res) };

    next();
}