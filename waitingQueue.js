// This file is responsible for monitoring the number of users that are waiting to play (4) max.
// This avoids an excess amount of database queries

var size = 0

module.exports = {
    getSize: function getSize() {
        return size
    },
    enQueue: function increment(){
        size++;
    },
    deQueue: function decrement() {
        size--;
    }
}