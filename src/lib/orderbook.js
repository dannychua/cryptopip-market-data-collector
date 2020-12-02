class Orderbook {
    constructor(snapshot) {
        this.sequenceId = snapshot.sequenceId;
        this.asks = {};
        this.bids = {};
        this._applySnapshot(snapshot)
    }

    _applySnapshot(snapshot) {
        // Empty asks/bids
        this.asks = {};
        this.bids = {};

        this._applyUpdate(snapshot);
    }

    _applyUpdate(update) {
        ['asks', 'bids'].forEach(sideName => {
            const u = JSON.parse(update[sideName]);
            for (let [price, size] of Object.entries(u)) {
                size = parseFloat(size)
                if (size == 0) {
                    // Remove price level
                    delete this[sideName][price];
                } else {
                    // Update price level
                    this[sideName][price]= size;
                }
            }
        });
    }

    apply(data, isSnapshot) {
        if (isSnapshot) {
            this._applySnapshot(data);
        } else {
            this._applyUpdate(data);
        }
    }
}

module.exports = Orderbook;