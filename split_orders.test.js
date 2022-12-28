import {
    findOrderGroups,
    packageSplitOrder,
    cancelSplitParent,
} from './split_orders';
import {
    all_orders,
    split_order_two_sku,
    split_order_one_sku,
} from './mock_json.js';

test('Finds correct number of orders', () => {
    //Two orders after selected date
    let something = findOrderGroups(all_orders);
    expect(something.length).toBe(2);
});

test('Package three items, two SKU', () => {
    let packaged = packageSplitOrders(split_order_two_sku);
    expect(packaged.length).toBe(2);
    // first order has two items
    expect(packaged[0].items.length).toBe(2);
    // second order has two items
    expect(packaged[1].items.length).toBe(1);
    //different order numbers
    expect(packaged[0].orderNumber).not.toEqual(packaged[1].orderNumber); //to not equal order number 2
});

test('Package three items, one SKU', () => {
    let packaged = packageSplitOrders(split_order_one_sku);
    expect(packaged.length).toBe(1);
    // first order has two items
    expect(packaged[0].items.length).toBe(3);
});

test('Package three items, two SKU', () => {
    let cancelled = cancelSplitParent(split_order_two_sku);
    expect(cancelled.orderNumber.slice(-8)).toBe('-retired');
    expect(cancelled.orderStatus).toBe('cancelled');
});
