'use strict'

let delay = (ms) => {
    return (result) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(result);
            }, ms);
        });
    };
}

let retry = (func) => {
    return (ms) => {
        func()
            .then((r) => {
                console.log(r);
                resolve(r);
            })
            .catch((err) => {
                delay(ms)('retry').then((result) => {
                    retry(func)(ms);
                });
            });
    }
}

let cidrize = (subnet_mask) => {
    let cidr_bits = 0;

    subnet_mask.split('.').forEach(function(octet) {
        cidr_bits+=((octet >>> 0).toString(2).match(/1/g) || []).length;
    });

    return cidr_bits;
}

let subnetize = (cidr) => {
  let bits = [];

  while ( bits.length < cidr ) { bits.push(1); }
  while ( bits.length < 32 ) { bits.push(0); }

  let octets = []

  octets.push(parseInt(bits.slice(0,8).join(''),2 ));
  octets.push(parseInt(bits.slice(8,16).join(''), 2));
  octets.push(parseInt(bits.slice(16,24).join(''), 2));
  octets.push(parseInt(bits.slice(24,32).join(''), 2));

  return octets.join('.');
}


let getRandomIntInclusive = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}

export { delay, retry, cidrize, subnetize, getRandomIntInclusive };
