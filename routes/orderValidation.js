const express = require('express');
const cassandra = require('cassandra-driver');
const waitUntil = require('wait-until');

const router = express.Router();
const connect = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'drug_warehouse'});

function handle_connection_Error (response, err) {
    response.send('<b>Database Connection Error</b>');
    throw new Error(err);
}

function new_Transaction (request, response, warehouse, district, user, items, today) {
    let o_all_local = 1, o_id = user.c_id + new Date().toISOString(), stocks = [], queries = [], count = 0, order_total = 0;
    request.session.order_total = 0;
    items.forEach(function (item) {
        if (item.supplywarehouse !== user.c_w_id) {
            o_all_local = 0;
        }
        let stock_query = 'SELECT * FROM stock  WHERE s_i_id = ? AND s_w_id = ?;';
        connect.execute(stock_query, [item.i_id.toString(), item.supplywarehouse], function (err, result) {
            if(err) {
                handle_connection_Error(response, err);
            }
            else if (!result.rows.length) {
                // console.log(stock_query, item.i_id.toString(), item.supplywarehouse);
                response.send('Stocks not found!!')
            }
            else {
                let stock = result.rows[0], updated_s_quantity, updated_s_order_cnt, updated_s_ytd, updated_s_remote_cnt, b_g;
                updated_s_quantity = stock.s_quantity - item.quantity >= 10 ? stock.s_quantity - item.quantity:
                    (stock.s_quantity - item.quantity) + 91;
                updated_s_ytd = stock.s_ytd + item.quantity;
                updated_s_order_cnt = stock.s_order_cnt + 1;
                updated_s_remote_cnt = stock.s_w_id !== user.c_w_id ? stock.s_remote_cnt + 1:stock.s_remote_cnt;
                b_g = (stock.s_data === item.i_data === 'ORIGINAL') ? 'B':'G';
                count++;
                queries.push({
                    query: 'UPDATE stock SET s_quantity = ?, s_ytd = ?, s_order_cnt = ?, s_remote_cnt = ? ' +
                        'WHERE s_i_id = ? AND s_w_id = ?;',
                    params: [updated_s_quantity, parseInt(updated_s_ytd), updated_s_order_cnt, updated_s_remote_cnt,
                        item.i_id.toString(), item.supplywarehouse]
                });
                queries.push({
                    query: 'INSERT INTO order_line (ol_w_id, ol_d_id, ol_o_id, ol_number, ol_amount, ' +
                        'ol_dist_info, ol_i_id, ol_quantity, ol_supply_w_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    params: [user.c_w_id, user.c_d_id, o_id, count.toString(), item.i_total_price, '', item.i_id.toString(),
                        item.quantity, item.supplywarehouse]
                });
                order_total = order_total + item.i_total_price;
                stocks.push({
                    s_i_id: stock.s_i_id,
                    s_w_id: stock.s_w_id,
                    i_name: item.name,
                    i_quantity: item.quantity,
                    s_quantity: stock.s_quantity,
                    updated_s_quantity: updated_s_quantity,
                    s_ytd: stock.s_ytd,
                    updated_s_ytd: updated_s_ytd,
                    s_order_cnt: stock.s_order_cnt,
                    updated_s_order_cnt: updated_s_order_cnt,
                    s_remote_cnt: stock.s_remote_cnt,
                    updated_s_remote_cnt: updated_s_remote_cnt,
                    b_g: b_g,
                    i_price: item.i_price,
                    i_total_price: item.i_total_price
                });
            }
        });
    });
    waitUntil()
        .interval(500)
        .times(10)
        .condition(function() {
            return (items.length === stocks.length);
        })
        .done(function() {
            queries.push({
                query: 'INSERT INTO orders (o_w_id, o_d_id, o_id, o_all_local, o_c_id, o_carrier_id, o_entry_d, o_ol_cnt) values ' +
                    '(?, ?, ?, ?, ?, ?, ?, ?)',
                params: [ user.c_w_id, user.c_d_id, o_id, o_all_local, user.c_id, '', new Date, items.length ]
            });
            queries.push({
                query: 'INSERT INTO new_order (no_w_id, no_d_id, no_o_id) values (?, ?, ?)',
                params: [ user.c_w_id, user.c_d_id, o_id ]
            });
        });
    waitUntil()
        .interval(500)
        .times(2)
        .condition(function () {
            // console.log('checking condition: ', request.session.order_total);
            return (request.session.order_total)
        })
        .done(function () {
            connect.batch(queries, { prepare: true })
                .then(result => console.log('Order Database Transaction Done\nQueries Executed: ', queries));
            order_total = order_total * (1 - user.c_discount) * (1 + warehouse.w_tax + district.d_tax);
            request.session.w_tax = warehouse.w_tax;
            request.session.d_tax = district.d_tax;
            request.session.stocks = stocks;
            request.session.order_total = order_total;
            request.session.order_number = o_id;
            console.log('final: ', items, stocks, queries, order_total);
            response.redirect('/home/newOrder/orderSuccess');
        });
    let end = new Date();
    console.log('end time: ', end.getMinutes(),end.getSeconds(), end.getMilliseconds());
    console.log((end.getTime() - today.getTime()) / 1000);
}

router.post('/', function(request, response) {
    // console.log('new order validation page: ',request.session.user);
    let today = new Date();
    console.log('Start time: ', today.getMinutes(),today.getSeconds(), today.getMilliseconds());
    let user = request.session.user;
    if (user) {
        let body = request.body;
        let itemCount_in = parseInt(body.itemCount);
        let items = [];
        // Validate warehouse
        let query_warehouse = 'SELECT * FROM warehouse WHERE w_id = ? ALLOW FILTERING;';
        let params_warehouse = [ user.c_w_id ];
        connect.execute(query_warehouse, params_warehouse, function(err, result) {
            try {
                if(err) {
                    handle_connection_Error(response, err);
                }
                else {
                    let warehouse = result.rows[0];
                    let query_district = 'SELECT * FROM district WHERE d_w_id = ? AND d_id = ? ALLOW FILTERING;';
                    let params_district = [ user.c_w_id,  user.c_d_id ];
                    // console.log('warehouse entered', warehouse, params_district);
                    connect.execute(query_district, params_district, function(err, result) {
                        if(err) {
                            handle_connection_Error(response, err);
                        }
                        else {
                            let district = result.rows[0];
                            let step;
                            let item_query = 'SELECT * FROM item where i_name = ? ALLOW FILTERING;';
                            for (step = 0; step < 10; step++ ) {
                                let item = 'Item' + (step + 1);
                                let name = item + 'Name';
                                let supplywarehouse = item + 'SupplyWarehouse';
                                let quantity = item + 'Quantity';
                                if (!body[name]) {
                                    break;
                                }
                                connect.execute(item_query, [body[name]], function (err, result) {
                                    if(err) {
                                        handle_connection_Error(response, err);
                                    }
                                    else if (!result.rows.length) {
                                        // response.send('Item ', body[name], ' is not valid!! Please enter a valid drug name!')
                                    }
                                    else {
                                        items.push({
                                            'name': body[name],
                                            'supplywarehouse': body[supplywarehouse],
                                            'quantity': body[quantity],
                                            'i_id': result.rows[0].i_id.low,
                                            'i_price': result.rows[0].i_price,
                                            'i_total_price': parseInt(result.rows[0].i_price) * parseInt(body[quantity]),
                                            'i_data': result.rows[0].i_data
                                        });
                                    }
                                });
                            }
                            waitUntil()
                                .interval(500)
                                .times(10)
                                .condition(function() {
                                        return (items.length === itemCount_in);
                                    })
                                .done(async function() {
                                    await new_Transaction(request, response, warehouse, district, user, items, today);
                                });
                        }
                    });
                }
            }
            catch(ex) {
                console.log(ex);
            }
        });
        // response.send('Order Validated'+JSON.stringify(body));
    }
    else {
        response.redirect('/login');
    }
});

module.exports = router;
