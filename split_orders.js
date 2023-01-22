import * as dotenv from 'dotenv';
dotenv.config();
import { sample_order } from './mock_json.js';
import _ from 'lodash';
import axios from 'axios';

/**
 *  Return bulk orders, after specific date, that are not cancelled. Exclude already split orders.
 * @param {*} objectList list of shipstation order objects.
 * @returns bulk orders
 */
const findOrderGroups = (objectList) => {
    /*

    */
    const start = new Date('12/15/22'); // Arbitrary start date for new orders
    let bulkOrders = objectList
        .filter((order) => order.items.length > 1)
        .filter((order) => new Date(order.orderDate) > start)
        .filter((order) => order.orderStatus != 'cancelled')
        .filter((order) => order.orderNumber.includes('-') == false); // ignore already split orders
    let mixedOrders = [];
    for (let i = 0; i < bulkOrders.length; i++) {
        const grouped = _.groupBy(bulkOrders[i]['items'], (item) =>
            item['sku'].slice(0, 4)
        );
        Object.keys(grouped).length > 1
            ? mixedOrders.push(bulkOrders[i])
            : null;
    }
    return mixedOrders;
};

/**
 * Create array of orders from given order object
 * @param {*} orderObject shipstation object.
 * @returns  list of repackaged orders
 */
const packageSplitOrder = (orderObject) => {
    const coupon_codes = ['AV10'];
    const grouped = _.groupBy(orderObject.items, (item) =>
        item['sku'].slice(0, 4)
    );
    let orderList = [];
    for (const property in grouped) {
        if (!coupon_codes.includes(property)) {
            // Don't make coupon code orders
            let newOrder = JSON.parse(JSON.stringify(orderObject));
            newOrder.items = grouped[property];
            newOrder.orderNumber = orderObject.orderNumber + '-' + property;
            delete newOrder.orderKey;
            delete newOrder.orderId;
            orderList.push(newOrder);
        }
    }
    return orderList;
};

/**
 * Cancels the parent to split order. Relabels parent order as split parent.
 * @param {*} orderObject shipstation object.
 * @returns
 */
const cancelSplitParent = (orderObject) => {
    /*

    */
    let oldOrder = JSON.parse(JSON.stringify(orderObject));
    oldOrder.orderNumber = oldOrder.orderNumber + '-split';
    oldOrder.orderStatus = 'cancelled';
    return oldOrder;
};

const shipstationApiCall = async (path, method, body) => {
    /* DEV KEYS */
    const KEY = process.env.SHIPSTATION_KEY;
    const SECRET = process.env.SHIPSTATION_SECRET;
    const API_ADDRESS = process.env.SHIPSTATION_API_ADDRESS;
    /* LIVE KEYS
    const KEY = await getSecret('SHIPSTATION_KEY');
    const SECRET = await getSecret('SHIPSTATION_SECRET');
    const API_ADDRESS = await getSecret('SHIPSTATION_API_ADDRESS');
    */

    const encoded_pass = Buffer.from(`${KEY}:${SECRET}`).toString('base64');
    const message = `${path} failed to ${method} on Shipstation API.`;
    try {
        const config = {
            method: method || 'get',
            url: API_ADDRESS + path,
            headers: {
                Authorization: `Basic ${encoded_pass}`,
                'Content-Type': 'application/json',
            },
        };

        if (body && method.toLowerCase() === 'post') {
            config['data'] = JSON.stringify(body);
        }

        const res = await axios(config);

        if (res.status != 200) {
            throw new Error(message);
        }
        return res.data;
    } catch (err) {
        console.error(err);
    }
};

export async function split_orders() {
    console.log('Running split order script.');
    try {
        // Find all orders awaiting shipment
        let allShipStationOrders = await shipstationApiCall(
            'orders/?orderStatus=awaiting_shipment',
            'get',
            null
        );

        let mixedOrders = findOrderGroups(allShipStationOrders.orders);

        for (let i = 0; i < mixedOrders.length; i++) {
            console.log(`Splitting order ${mixedOrders[i].orderNumber}.`);
            // Post new list of split orders
            const packaged = packageSplitOrder(mixedOrders[i]);
            const cancelled = cancelSplitParent(mixedOrders[i]);
            // Post one list of updates
            packaged.push(cancelled);

            let res = await shipstationApiCall(
                '/orders/createorders/',
                'post',
                packaged
            );
        }
    } catch (err) {
        console.error(err);
        throw new Error(err);
    }
    console.log('Complete.');
}

(async () => {
    /*
    let res = await shipstationApiCall(
        '/orders?orderStatus=awaiting_shipment',
        'get',
        null
    );
    console.log(res);
     */

    split_orders();
})();

export { findOrderGroups, packageSplitOrder, cancelSplitParent };
