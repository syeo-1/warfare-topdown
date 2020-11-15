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