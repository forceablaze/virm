'use strict'

let delay = (ms) => {
    return (result) => {
        return new Promise((resolve, reject) => {
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

export { delay, retry };
