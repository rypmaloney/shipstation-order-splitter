//DEV IMPORTS
import * as dotenv from 'dotenv';
dotenv.config();

// require('dotenv').config();
// const _ = require('lodash/core');
// const groupBy = require('lodash/groupby');
// const axios = require('axios');

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
    console.log(bulkOrders.length);
    let mixedOrders = [];
    for (let i = 0; i < bulkOrders.length; i++) {
        const grouped = _.groupBy(bulkOrders[i]['items'], (item) =>
            item['sku'].slice(0, 4)
        );
        console.log(grouped);
        Object.keys(grouped).length > 1
            ? mixedOrders.push(bulkOrders[i])
            : null;
    }
    return mixedOrders;
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
        return response.data;
    } catch (err) {
        throw new Error(err);
    }
};

(async () => {
    console.log('RUNNING');
    let allShipStationOrders = await shipstationApiCall('orders/', 'get', null);
    console.log(allShipStationOrders.orders.length);
    let mixedOrders = findOrderGroups(allShipStationOrders.orders);
    //console.log(mixedOrders);
    // createShipstationOrder(order_object);
})();
