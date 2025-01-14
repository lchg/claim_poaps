let allEvents = [];
let lastCheckedDelivery;
const rollbackCheck = 20;
let hasPoapClaimed = false;
let hasRaffleDisplayed = false;
// let ifStartFromBeginning = false;
// function getAllDeliveries(address) {
//     return new Promise((resolve) => {
//         allEvents = [];
//         axios.get('https://frontend.poap.tech/deliveries?limit=100&offset=0').then(res => {
//             let events = [];
//             if (lastCheckedDelivery < res.data.deliveries[0].id) {
//                 window.localStorage.setItem(address, res.data.deliveries[0].id);
//                 for (let event of res.data.deliveries) {
//                     if (lastCheckedDelivery < event.id) {
//                         events.push(event);
//                         allEvents.push(event.id);
//                     } else {
//                         break;
//                     }
//                 }
//             }
//             resolve(events)
//         }).catch(err => {
//             resolve([])
//         })
//     })
// }

function isValidDelivery(slug) {
    return new Promise((resolve) => {
        axios.get(`https://anyplace-cors.herokuapp.com/https://poap.delivery/${slug}`).then(res => {
            resolve(true)
        }).catch(err => {
            resolve(false);
        })
    })
}
function getAddress(ens) {
    return new Promise((resolve) => {
        axios.get(`https://api.po-ap.com/ens_resolve?name=${ens}`).then(res => {
            if (res.data.valid) {
                resolve(res.data.address)
            } else {
                resolve('');
            }

        })
    })
}

// function getAllRaffles(poaps, raffles = [], api = 'https://anyplace-cors.herokuapp.com/https://api-ro.poap.fun/api/v1/raffles/') {
//     return new Promise((resolve, reject) => {
//         axios.get(api).then(res => {
//             let page = res.data.next;
//             if (page) {
//                 let results = res.data.results;
//                 for (let result of results) {
//                     let current = new Date();
//                     let drawTime = new Date(result.draw_datetime);
//                     let name = result.name;
//                     if (current < drawTime && !name.toLowerCase().includes('please ignore') && !name.toLowerCase().includes('removed')) {
//                         for (let event of result.events) {
//                             if (poaps.includes(event.event_id)) {
//                                 displayRaffle(result);
//                                 hasRaffleDisplayed = true;
//                                 break;
//                             }
//                         }
//                     }
//                 }
//                 getAllRaffles(poaps, raffles, "https://anyplace-cors.herokuapp.com/" + page).then(resolve).catch(reject);;
//             } else {
//                 resolve(true);
//             }
//         }).catch(err => {
//             reject(err);
//         })
//     });
// }

function getAllPoaps(address) {
    return new Promise((resolve, reject) => {
        let poapList = [];
        axios.get(`https://anyplace-cors.herokuapp.com/https://api.poap.xyz/actions/scan/${address.toLowerCase()}`).then(async (res) => {
            for (let token of res.data) {
                poapList.push("" + token.event.id)
            }
            resolve(poapList)
        }).catch(err => {
            reject(err);
        });
    });

}

function claim(event, address) {
    return new Promise((resolve) => {
        axios.post(`https://api.po-ap.com/claim-delivery-v2`, {
            address: address,
            id: event.id
        }).then(res => {
            resolve(res.data.queue_uid);
        }).catch(err => {
            resolve('');
        })
    });
}

function getQueueIdStatus(event, queueId) {
    return new Promise((resolve) => {
        axios.get(`https://api.po-ap.com/queue-message/${queueId}`).then((res) => {
            let status = res.data.status;
            if (status == 'FINISH') {
                let transactionId = res.data.result.tx_hash;
                $(`#${event.id}`).html(`<a href='https://blockscout.com/xdai/mainnet/tx/${transactionId}' target="_blank" class="btn btn-success">CLAIMED</a>`);
                resolve(true)
            } else {
                $(`#${event.id}`).html(`<a href='https://poap.delivery/${event.slug}' target="_blank" class="btn btn-warning">${status}</a>`);
                resolve(false)
            }
        }).catch(err => {
            resolve(true)
        })
    });
}

// function displayRaffle(raffle) {
//     let header = `
//     <div class="row mt-5">
//         <div class="col-md-12">
//             <div class="title-header text-center">
//                 <h5>Your POAP Raffle Tickets</h5>
//             </div>
//         </div>
//     </div>
//     <div class="row" id="raffleCards"></div>`;
//     if (!hasRaffleDisplayed) {
//         $('#raffles').html(header);
//     }
//     document.getElementById('raffleCards').innerHTML += `<div class="col-lg-4 col-md-4 col-sm-4 col-xs-12">
//         <div class="box-part text-center">
//             <a href="https://poap.fun/raffle/${raffle.id}">
//                 <img src="./images/raffle.png" style="width:100px;height:100px;border-radius: 50%;">
//             </a>
//             <div class="title">
//                 <h4>${raffle.name}</h4>
//             </div>
//             <a href='https://poap.fun/raffle/${raffle.id}' target="_blank" class="btn btn-success">Join</a>
//         </div>
//     </div>`;
// }

function getMyDeliveries(event, address) {
    axios.get(`https://api.po-ap.com/delivery-addresses/${event.id}/address/${address}`).then(async (res) => {
        if (!hasPoapClaimed) {
            $('#deliveriesHeader').html(`<div class="row mt-5">
                <div class="col-md-12">
                    <div class="title-header text-center">
                        <h5>Your Availabe POAP Deliveries</h5>
                    </div>
                </div>
            </div>
            <div class="row" id="deliveries">`);
        }
        document.getElementById('deliveries').innerHTML += `<div class="col-lg-4 col-md-4 col-sm-4 col-xs-12">
                <div class="box-part text-center">
                    <a href="https://poap.delivery/${event.slug}">
                        <img src="${event.image}" style="width:100px;height:100px;border-radius: 50%;">
                    </a>
                    <div class="title">
                        <h4>${event.card_title}</h4>
                    </div>
                    <div id='${event.id}'>
                    <a href='https://poap.delivery/${event.slug}' target="_blank" class="btn btn-warning">CLAIMING</a>
                    </div>
            </div>`;
        hasPoapClaimed = true;
        let queueId = await claim(event, res.data.address);
        await getQueueIdStatus(event, queueId);
        const status = setInterval(async function checkStatus() {
            let isCompleted = await getQueueIdStatus(event, queueId);
            if (isCompleted) {
                clearInterval(status);
            }
        }, 3000);
    }).catch(err => {
        allEvents = allEvents.filter(item => item != event.id);
        $('#checkMsg').html(allEvents.length > 0 ? `<p>${allEvents.length} Deliveries Remaining to Check...</p>` : '');
        if (allEvents.length == 0 && !hasPoapClaimed) {
            $('#deliveriesHeader').html(`<div class="row mt-5">
            <div class="col-md-12">
                <div class="title-header text-center">
                    <h5>Your Availabe POAP Deliveries</h5>
                </div>
            </div>
        </div>
        <br/>
        <center><h5>No unclaimed POAPs found. Please check back next time.</h5></center>`);
        }
    })
}

async function startRaffles(address) {
    let poaps = await getAllPoaps(address);
    $('#checkRaffleMsg').html(`<p>Working hard to find the raffles you can join...</p>`);
    await getAllRaffles(poaps);
    $('#checkRaffleMsg').html(``);

}
function getMyDeliveriesFromAPI(address) {
    return new Promise((resolve) => {
        axios.get(`https://api.po-ap.com/delivery?address=${address}`).then(res => {
            let deliveries = res.data;
            resolve(deliveries);
        }).catch(err => {
            console.log(err);
            resolve([]);
        })
    })
}

async function startDeliveries(address) {
    let validDeliveries = [];
    let deliveries = await getMyDeliveriesFromAPI(address);
    if (deliveries.length > 0) {
        $('#checkMsg').html(`<p>Working hard to find your Deliveries...</p>`);
    }
    for (let delivery of deliveries) {
        let deliveryInfo = await getMyDeliveryInfo(delivery.delivery_id);
        let isValid = await isValidDelivery(deliveryInfo.slug);
        if (isValid) {
            validDeliveries.push(deliveryInfo);
        }

    }
    for (let validDelivery of validDeliveries) {
        getMyDeliveries(validDelivery, address);
    }
    if (validDeliveries.length == 0) {
        $('#deliveriesHeader').html(`<div class="row mt-5">
        <div class="col-md-12">
            <div class="title-header text-center">
                <h5>Your Availabe POAP Deliveries</h5>
            </div>
        </div>
    </div>
    <br/>
    <center><h5>No unclaimed POAPs found. Please check back next time.</h5></center>`);
    }
    $('#checkMsg').html(``);
}

function getMyDeliveryInfo(deliveryId) {
    return new Promise((resolve) => {
        axios.get(`https://api.po-ap.com/delivery/${deliveryId}`).then(res => {
            resolve(res.data)
        })
    })
}

$(document).ready(function () {
    // $('input[type=checkbox][name="fromStart"]').change(function () {
    //     if (this.checked) {
    //         ifStartFromBeginning = true;

    //     } else {
    //         ifStartFromBeginning = false;

    //     }
    // });
    $('#claimButton').submit(async function (e) {
        e.preventDefault();
        let address = $('#address').val().toLowerCase().trim();
        address = await getAddress(address);
        if (!address) {
            alert("Please Enter a valid Ethereum Address or ENS Name!");
            $("#address").focus();
            return;
        }
        $('#deliveriesHeader').html('');
        $('#raffles').html('');
        hasPoapClaimed = false;
        // hasRaffleDisplayed = false;
        // startRaffles(address);
        startDeliveries(address);
    });
});