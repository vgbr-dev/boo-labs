/**
 * @file Defines shared symbols used to brand application objects.
 *
 * @module Brands
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Symbol used to brand server transport adapter instances.
 *
 * The symbol provides a stable, collision-resistant property that can be
 * used to identify objects implementing the transport adapter contract
 * without relying on their concrete class or constructor.
 *
 * @private
 * @type {symbol}
 */
const TRANSPORT_ADAPTER_BRAND = Symbol.for('server.transport.adapter');

/**
 * Symbol used to brand router instances.
 *
 * The symbol provides a stable, collision-resistant property that can be
 * used to identify objects implementing the router contract without relying
 * on their concrete class or constructor.
 *
 * @private
 * @type {symbol}
 */
const ROUTER_BRAND = Symbol.for('server.router');

/**
 * Symbol used to brand server configuration instances.
 *
 * The symbol provides a stable, collision-resistant property that can be
 * used to identify objects implementing the server configuration contract
 * without relying on their concrete class or constructor.
 *
 * @private
 * @type {symbol}
 */
const SERVER_CONFIGURATION_BRAND = Symbol.for('server.configuration');

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export { TRANSPORT_ADAPTER_BRAND, ROUTER_BRAND, SERVER_CONFIGURATION_BRAND };
