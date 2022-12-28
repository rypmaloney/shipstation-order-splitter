//DEV IMPORTS
import * as dotenv from 'dotenv';
dotenv.config();

// Live exports
import _ from 'lodash';
import axios from 'axios';

const findOrderGroups = (list) => {
    /*
    Return bulk orders,
    after specific date, that are not cancelled.
    Returns an object with
    */
    const start = new Date('12/15/22'); // Arbitrary start date for new orders
    let bulkOrders = list
        .filter((order) => order.items.length > 1)
        .filter((order) => new Date(order.orderDate) > start)
        .filter((order) => order.orderStatus != 'cancelled');
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

const packageSplitOrder = (orderObject) => {
    /*
    Create array of orders from given order object
    */
    const grouped = _.groupBy(orderObject.items, (item) =>
        item['sku'].slice(0, 4)
    );
    let orderList = [];
    for (const property in grouped) {
        let newOrder = JSON.parse(JSON.stringify(orderObject));
        newOrder.items = grouped[property];
        newOrder.orderNumber = orderObject.orderNumber + '-' + property;
        orderList.push(newOrder);
    }
    return orderList;
};

const cancelSplitParent = (orderObject) => {
    /*
    Cancel the parent to split order.
    Relabel as split parent.
    */
    let oldOrder = JSON.parse(JSON.stringify(orderObject));
    oldOrder.orderNumber = oldOrder.orderNumber + '-retired';
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

        const response = await axios(config);

        if (response.status != 200) {
            console.error(message);
            throw new Error(message);
        }
        return response.data;
    } catch (err) {
        throw new Error(message);
    }
};

(async () => {
    console.log('RUNNING');
    try {
        let allShipStationOrders = await shipstationApiCall(
            'orders/s',
            'get',
            null
        );
        let mixedOrders = findOrderGroups(allShipStationOrders);
        for (let i = 0; i < mixedOrders.length; i++) {
            // Post new list of split orders
            const packaged = packageSplitOrder(mixedOrders[i]);
            res = await shipstationApiCall(
                '/orders/createorders',
                post,
                packaged
            );
            // post update on cancelled order
            const cancelled = cancelSplitParent(mixedOrders[i]);
            res = await shipstationApiCall(
                '/orders/createorder',
                post,
                cancelled
            );
        }
    } catch (err) {
        console.error(err);
    }
})();

export { findOrderGroups, packageSplitOrders, cancelSplitParent };
