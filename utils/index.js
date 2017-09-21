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

export { delay };
