// Process User
var numberpools = [];
var counts = {};
// var annots = {};

for (var i = 0; i < users.length; i++) {
    var dss = new Date(users[i].created_at);
    const month = dss.getMonth() < 10 ? '0' + (dss.getMonth() + 1) : (dss.getMonth() + 1);
    var ds = dss.getFullYear() + '-' + month + '-' + dss.getDate();
    if (!numberpools.includes(ds)) {
        numberpools.push(ds);
    }

    if (!counts[ds]) counts[ds] =0;
    counts[ds]++;
}

// for (i = 0; i < annotations.length; i++) {
//     dss = new Date(annotations[i].time);
//     const month = dss.getMonth() < 10 ? '0' + (dss.getMonth() + 1) : (dss.getMonth() + 1);
//     ds = dss.getFullYear() + '-' + month + '-' + dss.getDate();
//     if (!numberpools.includes(ds)) {
//         numberpools.push(ds);
//     }
//
//     if (!annots[ds]) annots[ds] = '';
//         annots[ds] += annotations[i].info + ',';
// }

var orderCounts = [];
var annotSorted = [];

for (i = 0; i < numberpools.length; i++) {
    if (!counts[numberpools[i]]) counts[numberpools[i]] = 0;
    orderCounts.push(counts[numberpools[i]]);
    // if (!annots[numberpools[i]]) annots[numberpools[i]] = '';
    // annotSorted.push(annots[numberpools[i]]);
    // console.log(counts[numberpools[i]]);
}

numberpools.unshift('x');
orderCounts.unshift('Users registered');
// annotSorted.unshift('Events');

var chart = c3.generate({
    bindto: "#chart",
    data: {
        x: 'x',
//        xFormat: '%Y%m%d', // 'xFormat' can be used as custom format of 'x'
        columns: [
            numberpools,
            orderCounts,
            // annotSorted,
        ],
        labels: true
    },
    axis: {
        x: {
            type: 'timeseries',
            tick: {
                format: '%Y-%m-%d'
            }
        }
    },
    size: {
        width: 1000
    }
});

// Display annotations as a list for now
function makeUL(array) {
    // Create the list element:
    var list = document.createElement('ul');

    for(var i = 0; i < array.length; i++) {
        // Create the list item:
        var item = document.createElement('li');

        const time = new Date(array[i].time);

        // Set its contents:
        item.appendChild(document.createTextNode(array[i].info + ' (' + time.getFullYear() + '-' + (time.getMonth() + 1) + '-' + time.getDate() + ')'));

        // Add it to the list:
        list.appendChild(item);
    }

    // Finally, return the constructed list:
    return list;
}

// Add the contents of options[0] to #foo:
document.getElementById('annotationlist').appendChild(makeUL(annotations));