import { ok, badRequest } from 'wix-http-functions';
import { split_orders } from './split_orders';

export function post_shippstationhook(request) {
    //responds to _functions/shippstationhook/
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    options.body = { status: 'success' };
    try {
        split_orders();
    } catch (err) {
        console.error(err);
        options.body = { status: err };
    }

    return ok(options);
}
