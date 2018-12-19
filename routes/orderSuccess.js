const express = require('express');
const router = express.Router();

router.get('/', function(request, response) {
    let user = request.session.user;
    if (user) {
        let today = new Date();
        let dd = today.getDate();
        let mm = today.getMonth()+1;
        let yyyy = today.getFullYear();
        let hh = today.getHours();
        let mi = today.getMinutes();
        let ss = today.getSeconds();

        if(dd<10) {
            dd = '0'+dd
        }

        if(mm<10) {
            mm = '0'+mm
        }
        console.log('stocks: ', request.session.stocks);
        let items = request.session.stocks;
        today = dd+ '-' + mm + '-' + yyyy + ' ' + hh + ':' + mi + ':' + ss;
        let data = {
            warehouse: user.c_w_id,
            district: user.c_d_id,
            customer: user.c_id,
            date: today,
            name: user.c_first + ' ' + user.c_last,
            credit: user.c_credit,
            discount: user.c_discount,
            order_number: request.session.order_number,
            no_lines: request.session.stocks.length,
            w_tax: request.session.w_tax,
            d_tax: request.session.d_tax,
            order_total: request.session.order_total,
            stocks: JSON.stringify(request.session.stocks)
        };
        let i = 0;
        items.forEach(function (item) {
            let list = ['_Supp_W', '_Item_Id', '_Item_Name', '_Qty', '_Stock', '_B_G', '_Price', '_Amount'];
            let values = [item.s_w_id, item.s_i_id, item.i_name, item.i_quantity, item.s_quantity,
                item.b_g, item.i_price, item.i_total_price ];
            let j = 0;
            list.forEach(function (element) {
                let key = 'item' + (i+1) + element;
                let value = values[j++];
                data[key] = value;
            });
            i++;
        });
        console.log('data: ', data);
        response.render('orderSuccess', data);
    }
    else {
        response.redirect('/login');
    }
});

module.exports = router;
