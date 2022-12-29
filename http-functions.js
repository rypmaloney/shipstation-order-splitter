import { ok, badRequest } from 'wix-http-functions';
import { split_orders } from './split_orders';

export function post_shippstationhook(request) {
    //responds to _functions/shippstationhook/
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    //split_orders()
    options.body = { status: 'success' };
    return ok(options);
}
