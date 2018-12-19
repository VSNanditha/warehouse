function data(items) {
    // let items = request.session.stocks;
    let table = document.getElementById("table");
    console.log('data: ', items, table);
    let i = 0;
    items.forEach(function (item) {
        let j=0;
        table.insertRow(i);
        table.insertCell(j++).innerHTML = item.supplywarehouse;
        table.insertCell(j++).innerHTML = item.i_id;
        table.insertCell(j++).innerHTML = item.i_name;
        table.insertCell(j++).innerHTML = item.i_quantity;
        table.insertCell(j++).innerHTML = item.s_quantity;
        table.insertCell(j++).innerHTML = item.b_g;
        table.insertCell(j++).innerHTML = item.i_price;
        table.insertCell(j).innerHTML = item.i_total_price;
        i++;
    });
}